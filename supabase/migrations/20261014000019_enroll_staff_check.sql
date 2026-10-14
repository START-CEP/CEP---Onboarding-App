-- Revisión de seguridad: enroll_unit() aceptaba cualquier perfil como "equipo" de la inscripción.
-- Un perfil en enrollment_staff obtiene permisos de gestión sobre esa pareja, así que solo puede ser
-- personal activo con rol clínico, asistente o admin. Tampoco se reutiliza a alguien con un proceso activo
-- en otra unidad, salvo que lo haga un admin.

create or replace function public.enroll_unit(
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
  v_bad text;
begin
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

  -- Cada persona asignada al equipo debe ser personal activo con rol clínico, asistente o admin.
  select string_agg(s.key, ', ') into v_bad
  from jsonb_each_text(p_staff) s
  where private.try_uuid(s.value) is null
     or not exists (select 1 from public.staff_members sm
                    join public.staff_roles sr on sr.profile_id = sm.profile_id
                    where sm.profile_id = private.try_uuid(s.value) and sm.is_active
                      and sr.role in ('clinician', 'assistant', 'admin'))
     or not exists (select 1 from public.care_roles cr where cr.key = s.key);
  if v_bad is not null then
    raise exception 'Asignación de equipo no válida para: %', v_bad using errcode = '42501';
  end if;

  -- Los miembros no pueden ser personal ni (salvo admin) tener otro proceso activo.
  if exists (select 1 from public.client_unit_members m join public.staff_roles sr on sr.profile_id = m.profile_id
             where m.unit_id = p_unit_id) then
    raise exception 'Una cuenta del equipo no puede inscribirse como paciente.' using errcode = '42501';
  end if;
  if auth.uid() is not null and not private.is_admin() and exists (
    select 1 from public.client_unit_members m
    join public.client_unit_members other on other.profile_id = m.profile_id and other.unit_id <> p_unit_id
    join public.enrollments e on e.unit_id = other.unit_id and e.status in ('invited', 'active', 'paused')
    where m.unit_id = p_unit_id) then
    raise exception 'Alguna de estas personas ya tiene un proceso activo; pídele a un admin que lo revise.' using errcode = '42501';
  end if;

  insert into public.enrollments (unit_id, service_version_id, status, starts_on, access_until, sold_by)
  values (p_unit_id, p_version_id, p_status, p_starts_on,
          case when v_version.access_days is not null then p_starts_on + v_version.access_days end,
          auth.uid())
  returning id into v_enrollment;

  insert into public.enrollment_staff (enrollment_id, care_role_id, staff_profile_id)
  select v_enrollment, cr.id, s.value::uuid
  from jsonb_each_text(p_staff) s
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

  insert into public.staff_task_progress (enrollment_activity_id, item_key, due_on)
  select ea.id, item ->> 'key', p_starts_on + coalesce((item ->> 'due_days')::int, 0)
  from public.enrollment_activities ea
  cross join lateral jsonb_array_elements(coalesce(ea.config -> 'checklist', '[]'::jsonb)) item
  where ea.enrollment_id = v_enrollment and ea.type = 'staff_task';

  return v_enrollment;
end $$;
