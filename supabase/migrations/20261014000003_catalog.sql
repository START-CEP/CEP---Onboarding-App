-- Catálogo configurable desde admin: servicios → versiones → bloques, áreas, actividades, pasos, requisitos.
-- Una versión publicada es inmutable; para editar se clona a un borrador (ver migración publish_and_clone).

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  unit_kind public.unit_kind not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  status public.service_status not null default 'active',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.service_versions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  version integer not null check (version >= 1),
  status public.version_status not null default 'draft',
  expected_duration_days integer check (expected_duration_days > 0),
  access_days integer check (access_days > 0),
  welcome_activity_id uuid,
  notes text,
  cloned_from uuid references public.service_versions (id),
  published_at timestamptz,
  published_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (service_id, version)
);
-- Solo un borrador abierto por servicio.
create unique index service_versions_one_draft on public.service_versions (service_id) where status = 'draft';

create table public.service_blocks (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.service_versions (id) on delete cascade,
  name text not null,
  position integer not null,
  color text,
  unique (version_id, position)
);

-- Áreas = filas del cuadro de la home.
create table public.service_tracks (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.service_versions (id) on delete cascade,
  key text not null,
  name text not null,
  position integer not null,
  color text,
  unique (version_id, key)
);

create table public.service_activities (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.service_versions (id) on delete cascade,
  track_id uuid references public.service_tracks (id) on delete set null,
  key text not null,                         -- estable dentro de la versión: 'S5', 'M3', 'RAD'
  type public.activity_type not null,
  title text not null,
  summary text,
  responsible_role_id uuid references public.care_roles (id),
  participants public.participants not null default 'all',
  response_scope public.response_scope not null default 'shared',
  asset_id uuid,                             -- FK en content_forms
  form_version_id uuid,                      -- formulario o tarea asociada (FK en content_forms)
  contract_template_id uuid,                 -- FK en content_forms
  estimated_minutes integer,
  suggested_offset_days integer,             -- días desde el inicio (referencia)
  suggested_gap_days integer,                -- ritmo sugerido respecto a la sesión anterior (nunca bloquea)
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb, -- específico por tipo: checklist, url, group_program_key...
  unique (version_id, key)
);
create index on public.service_activities (version_id, type);

alter table public.service_versions
  add constraint service_versions_welcome_fk foreign key (welcome_activity_id)
  references public.service_activities (id) on delete set null deferrable initially deferred;

-- El camino ordenado ("los 14 pasos"): cada paso lo define una actividad.
create table public.service_steps (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.service_versions (id) on delete cascade,
  block_id uuid references public.service_blocks (id) on delete set null,
  position integer not null,
  title text not null,
  description text,
  activity_id uuid not null references public.service_activities (id) on delete restrict,
  unique (version_id, position)
);

-- "Requisito para entrar": a un paso o a una actividad.
create table public.service_requirements (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.service_versions (id) on delete cascade,
  target_step_id uuid references public.service_steps (id) on delete cascade,
  target_activity_id uuid references public.service_activities (id) on delete cascade,
  required_activity_id uuid not null references public.service_activities (id) on delete cascade,
  criterion public.req_criterion not null,
  is_mandatory boolean not null default true,
  enforcement public.enforcement not null default 'blocks',
  label text,
  check ((target_step_id is null) <> (target_activity_id is null))
);
create index on public.service_requirements (version_id);

create table public.service_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.service_versions (id) on delete cascade,
  activity_id uuid references public.service_activities (id) on delete cascade,
  trigger text not null,          -- 'before_session', 'requirement_pending', 'access_ending'...
  offset_hours integer not null default 0,
  channel text not null default 'email',
  template_key text not null
);

create table public.service_followups (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.service_versions (id) on delete cascade,
  next_service_id uuid not null references public.services (id),
  label text not null
);

-- Inmutabilidad: solo se edita la estructura de un borrador.
create function private.assert_version_draft() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(case when tg_op = 'DELETE' then old.version_id else new.version_id end, old.version_id);
  v_status public.version_status;
begin
  select status into v_status from public.service_versions where id = v_id;
  if v_status is not null and v_status <> 'draft' then
    raise exception 'La versión % está publicada y no se puede modificar. Cree un borrador nuevo.', v_id
      using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

do $$
declare t text;
begin
  foreach t in array array['service_blocks','service_tracks','service_activities','service_steps',
                           'service_requirements','service_reminder_rules','service_followups'] loop
    execute format('create trigger %I before insert or update or delete on public.%I
                    for each row execute function private.assert_version_draft()', t || '_draft_only', t);
  end loop;
end $$;

-- Una versión publicada solo puede pasar a 'retired'.
create function private.guard_version_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'published' and (new.status not in ('published','retired')
     or new.expected_duration_days is distinct from old.expected_duration_days
     or new.access_days is distinct from old.access_days
     or new.welcome_activity_id is distinct from old.welcome_activity_id) then
    raise exception 'Una versión publicada solo puede retirarse.' using errcode = 'P0001';
  end if;
  if old.status = 'retired' and new.status <> 'retired' then
    raise exception 'Una versión retirada no se puede reactivar.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger service_versions_guard before update on public.service_versions
  for each row execute function private.guard_version_update();
