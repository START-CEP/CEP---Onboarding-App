-- Inscripción = instancia de una versión de servicio para una unidad (pareja o persona).
-- enroll_unit() copia el camino, actividades y requisitos para que el equipo pueda adaptarlos a cada caso.

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.client_units (id) on delete restrict,
  service_version_id uuid not null references public.service_versions (id) on delete restrict,
  status public.enrollment_status not null default 'invited',
  starts_on date not null,
  access_until date,
  sold_by uuid references public.profiles (id),
  notes_internal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.enrollments (unit_id);
create trigger enrollments_updated_at before update on public.enrollments
  for each row execute function private.set_updated_at();

-- Quién cubre cada rol clínico en este caso (Emilia = terapeuta principal, etc.).
create table public.enrollment_staff (
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  care_role_id uuid not null references public.care_roles (id),
  staff_profile_id uuid not null references public.profiles (id),
  primary key (enrollment_id, care_role_id)
);
create index on public.enrollment_staff (staff_profile_id);

create table public.enrollment_activities (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  source_activity_id uuid references public.service_activities (id),
  key text not null,
  track_key text,
  track_name text,
  track_position integer,
  type public.activity_type not null,
  title text not null,
  summary text,
  responsible_role_id uuid references public.care_roles (id),
  participants public.participants not null,
  response_scope public.response_scope not null,
  asset_id uuid references public.content_assets (id),
  form_version_id uuid references public.form_versions (id),
  contract_template_id uuid references public.contract_templates (id),
  estimated_minutes integer,
  suggested_on date,
  suggested_gap_days integer,
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  unlocked_at timestamptz,
  hidden boolean not null default false,
  added_by_staff uuid references public.profiles (id),
  unique (enrollment_id, key)
);

create table public.enrollment_steps (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  source_step_id uuid references public.service_steps (id),
  block_name text,
  block_position integer,
  position integer not null,
  title text not null,
  description text,
  activity_id uuid not null references public.enrollment_activities (id) on delete restrict,
  entered_at timestamptz,
  completed_at timestamptz,          -- confirmación manual del equipo ("el avance lo marca Emilia")
  completed_by uuid references public.profiles (id),
  hidden boolean not null default false,
  unique (enrollment_id, position)
);

create table public.enrollment_requirements (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  source_requirement_id uuid references public.service_requirements (id),
  target_step_id uuid references public.enrollment_steps (id) on delete cascade,
  target_activity_id uuid references public.enrollment_activities (id) on delete cascade,
  required_activity_id uuid not null references public.enrollment_activities (id) on delete cascade,
  criterion public.req_criterion not null,
  is_mandatory boolean not null default true,
  enforcement public.enforcement not null default 'blocks',
  label text,
  waived_by uuid references public.profiles (id),   -- el equipo puede dispensar un requisito
  waived_at timestamptz,
  check ((target_step_id is null) <> (target_activity_id is null))
);
create index on public.enrollment_requirements (enrollment_id);

-- profile_id nulo = avance compartido (de la unidad o confirmado por el equipo).
create table public.activity_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_activity_id uuid not null references public.enrollment_activities (id) on delete cascade,
  profile_id uuid references public.profiles (id),
  status public.progress_status not null default 'available',
  video_seconds integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (enrollment_activity_id, profile_id)
);
create trigger activity_progress_updated_at before update on public.activity_progress
  for each row execute function private.set_updated_at();

-- Checklist de tareas del equipo (entrevista, onboarding...).
create table public.staff_task_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_activity_id uuid not null references public.enrollment_activities (id) on delete cascade,
  item_key text not null,
  due_on date,
  done_by uuid references public.profiles (id),
  done_at timestamptz,
  unique (enrollment_activity_id, item_key)
);

-- ---------------------------------------------------------------------------
-- Funciones de rol usadas aquí y en RLS.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles where profile_id = auth.uid() and role = 'admin');
$$;

create function private.has_role(r public.staff_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles where profile_id = auth.uid() and role in (r, 'admin'));
$$;

create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles where profile_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- enroll_unit: copia la versión publicada a la inscripción.
-- p_staff: {"lead_therapist": "<uuid>", "psychologist": "<uuid>", ...}
create function public.enroll_unit(
  p_unit_id uuid,
  p_version_id uuid,
  p_starts_on date,
  p_staff jsonb default '{}'::jsonb,
  p_status public.enrollment_status default 'active'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_enrollment uuid;
  v_version public.service_versions;
  v_unit public.client_units;
  v_service public.services;
begin
  -- Sin sesión (seed, service role) o admin / ventas.
  if auth.uid() is not null and not (private.has_role('sales') or private.is_admin()) then
    raise exception 'No tiene permiso para inscribir.' using errcode = '42501';
  end if;

  select * into v_version from public.service_versions where id = p_version_id;
  if v_version.id is null or v_version.status <> 'published' then
    raise exception 'Solo se puede inscribir en una versión publicada.' using errcode = 'P0001';
  end if;
  select * into v_service from public.services where id = v_version.service_id;
  select * into v_unit from public.client_units where id = p_unit_id;
  if v_unit.kind <> v_service.unit_kind then
    raise exception 'El servicio es para % y la unidad es %.', v_service.unit_kind, v_unit.kind using errcode = 'P0001';
  end if;

  insert into public.enrollments (unit_id, service_version_id, status, starts_on, access_until, sold_by)
  values (p_unit_id, p_version_id, p_status, p_starts_on,
          case when v_version.access_days is not null then p_starts_on + v_version.access_days end,
          auth.uid())
  returning id into v_enrollment;

  insert into public.enrollment_staff (enrollment_id, care_role_id, staff_profile_id)
  select v_enrollment, cr.id, (s.value #>> '{}')::uuid
  from jsonb_each(p_staff) s
  join public.care_roles cr on cr.key = s.key;

  insert into public.enrollment_activities (
    enrollment_id, source_activity_id, key, track_key, track_name, track_position, type, title, summary,
    responsible_role_id, participants, response_scope, asset_id, form_version_id, contract_template_id,
    estimated_minutes, suggested_on, suggested_gap_days, position, config)
  select v_enrollment, a.id, a.key, t.key, t.name, t.position, a.type, a.title, a.summary,
         a.responsible_role_id, a.participants, a.response_scope, a.asset_id, a.form_version_id,
         a.contract_template_id, a.estimated_minutes,
         case when a.suggested_offset_days is not null then p_starts_on + a.suggested_offset_days end,
         a.suggested_gap_days, a.position, a.config
  from public.service_activities a
  left join public.service_tracks t on t.id = a.track_id
  where a.version_id = p_version_id;

  insert into public.enrollment_steps (
    enrollment_id, source_step_id, block_name, block_position, position, title, description, activity_id)
  select v_enrollment, s.id, b.name, b.position, s.position, s.title, s.description, ea.id
  from public.service_steps s
  left join public.service_blocks b on b.id = s.block_id
  join public.enrollment_activities ea on ea.enrollment_id = v_enrollment and ea.source_activity_id = s.activity_id
  where s.version_id = p_version_id;

  insert into public.enrollment_requirements (
    enrollment_id, source_requirement_id, target_step_id, target_activity_id, required_activity_id,
    criterion, is_mandatory, enforcement, label)
  select v_enrollment, r.id, es.id, ta.id, ra.id, r.criterion, r.is_mandatory, r.enforcement, r.label
  from public.service_requirements r
  join public.enrollment_activities ra on ra.enrollment_id = v_enrollment and ra.source_activity_id = r.required_activity_id
  left join public.enrollment_steps es on es.enrollment_id = v_enrollment and es.source_step_id = r.target_step_id
  left join public.enrollment_activities ta on ta.enrollment_id = v_enrollment and ta.source_activity_id = r.target_activity_id
  where r.version_id = p_version_id;

  -- Checklist de tareas del equipo con plazo.
  insert into public.staff_task_progress (enrollment_activity_id, item_key, due_on)
  select ea.id, item ->> 'key', p_starts_on + coalesce((item ->> 'due_days')::int, 0)
  from public.enrollment_activities ea
  cross join lateral jsonb_array_elements(coalesce(ea.config -> 'checklist', '[]'::jsonb)) item
  where ea.enrollment_id = v_enrollment and ea.type = 'staff_task';

  return v_enrollment;
end $$;

revoke execute on function public.enroll_unit(uuid, uuid, date, jsonb, public.enrollment_status) from public, anon;
grant execute on function public.enroll_unit(uuid, uuid, date, jsonb, public.enrollment_status) to authenticated, service_role;
