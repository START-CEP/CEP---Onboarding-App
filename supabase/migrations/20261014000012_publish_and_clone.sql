-- Publicar (con validación) y clonar versiones: editar un servicio = clonar a borrador, cambiar y publicar.
-- Clonar a otro servicio = "Duplicar servicio".

create function public.publish_service_version(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.service_versions;
  v_problem text;
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'Solo un admin puede publicar.' using errcode = '42501';
  end if;
  select * into v from public.service_versions where id = p_version for update;
  if v.id is null or v.status <> 'draft' then
    raise exception 'Solo se publica un borrador.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.service_steps where version_id = p_version) then
    raise exception 'El servicio no tiene pasos.' using errcode = 'P0001';
  end if;

  select string_agg(a.key, ', ') into v_problem
  from public.service_activities a
  where a.version_id = p_version and a.type = 'therapy_session' and a.responsible_role_id is null;
  if v_problem is not null then
    raise exception 'Sesiones sin responsable: %', v_problem using errcode = 'P0001';
  end if;

  select string_agg(a.key, ', ') into v_problem
  from public.service_activities a
  where a.version_id = p_version and a.type in ('form', 'homework') and a.form_version_id is null;
  if v_problem is not null then
    raise exception 'Formularios o tareas sin formulario asignado: %', v_problem using errcode = 'P0001';
  end if;

  select string_agg(a.key, ', ') into v_problem
  from public.service_activities a
  where a.version_id = p_version and a.type = 'contract' and a.contract_template_id is null;
  if v_problem is not null then
    raise exception 'Contrato sin plantilla: %', v_problem using errcode = 'P0001';
  end if;

  -- Todo lo referenciado debe pertenecer a la misma versión.
  if exists (
    select 1 from public.service_steps s join public.service_activities a on a.id = s.activity_id
    where s.version_id = p_version and a.version_id <> p_version
    union all
    select 1 from public.service_requirements r join public.service_activities a on a.id = r.required_activity_id
    where r.version_id = p_version and a.version_id <> p_version) then
    raise exception 'Hay pasos o requisitos que apuntan a otra versión.' using errcode = 'P0001';
  end if;

  -- Requisitos circulares: arista "actividad requerida → actividad destino".
  with recursive edges as (
    select r.required_activity_id as src, coalesce(r.target_activity_id, s.activity_id) as dst
    from public.service_requirements r
    left join public.service_steps s on s.id = r.target_step_id
    where r.version_id = p_version
  ), walk as (
    select src as origin, dst, array[src, dst] as path, src = dst as cycle from edges
    union all
    select w.origin, e.dst, w.path || e.dst, e.dst = any (w.path)
    from walk w join edges e on e.src = w.dst
    where not w.cycle
  )
  select string_agg(distinct a.key, ', ') into v_problem
  from walk w join public.service_activities a on a.id = w.origin
  where w.cycle and w.dst = w.origin;
  if v_problem is not null then
    raise exception 'Requisitos circulares en: %', v_problem using errcode = 'P0001';
  end if;

  update public.service_versions set status = 'retired'
  where service_id = v.service_id and status = 'published';

  update public.service_versions
  set status = 'published', published_at = now(), published_by = auth.uid()
  where id = p_version;
end $$;

create function public.clone_service_version(p_version uuid, p_target_service uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v public.service_versions;
  v_target uuid;
  v_new uuid;
  m_block jsonb; m_track jsonb; m_act jsonb; m_step jsonb;
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'Solo un admin puede editar servicios.' using errcode = '42501';
  end if;
  select * into v from public.service_versions where id = p_version;
  if v.id is null then raise exception 'Versión no encontrada.' using errcode = 'P0001'; end if;
  v_target := coalesce(p_target_service, v.service_id);

  insert into public.service_versions (service_id, version, status, expected_duration_days, access_days, notes, cloned_from)
  select v_target, coalesce(max(version), 0) + 1, 'draft', v.expected_duration_days, v.access_days, v.notes, v.id
  from public.service_versions where service_id = v_target
  returning id into v_new;

  -- Mapas id viejo → id nuevo
  select coalesce(jsonb_object_agg(id, gen_random_uuid()), '{}') into m_block from public.service_blocks where version_id = p_version;
  select coalesce(jsonb_object_agg(id, gen_random_uuid()), '{}') into m_track from public.service_tracks where version_id = p_version;
  select coalesce(jsonb_object_agg(id, gen_random_uuid()), '{}') into m_act from public.service_activities where version_id = p_version;
  select coalesce(jsonb_object_agg(id, gen_random_uuid()), '{}') into m_step from public.service_steps where version_id = p_version;

  insert into public.service_blocks (id, version_id, name, position, color)
  select (m_block ->> b.id::text)::uuid, v_new, b.name, b.position, b.color
  from public.service_blocks b where b.version_id = p_version;

  insert into public.service_tracks (id, version_id, key, name, position, color)
  select (m_track ->> t.id::text)::uuid, v_new, t.key, t.name, t.position, t.color
  from public.service_tracks t where t.version_id = p_version;

  insert into public.service_activities (id, version_id, track_id, key, type, title, summary, responsible_role_id,
    participants, response_scope, asset_id, form_version_id, contract_template_id, estimated_minutes,
    suggested_offset_days, suggested_gap_days, position, config)
  select (m_act ->> a.id::text)::uuid, v_new, (m_track ->> a.track_id::text)::uuid, a.key, a.type, a.title, a.summary,
    a.responsible_role_id, a.participants, a.response_scope, a.asset_id, a.form_version_id, a.contract_template_id,
    a.estimated_minutes, a.suggested_offset_days, a.suggested_gap_days, a.position, a.config
  from public.service_activities a where a.version_id = p_version;

  insert into public.service_steps (id, version_id, block_id, position, title, description, activity_id)
  select (m_step ->> s.id::text)::uuid, v_new, (m_block ->> s.block_id::text)::uuid, s.position, s.title, s.description,
         (m_act ->> s.activity_id::text)::uuid
  from public.service_steps s where s.version_id = p_version;

  insert into public.service_requirements (version_id, target_step_id, target_activity_id, required_activity_id,
    criterion, is_mandatory, enforcement, label)
  select v_new, (m_step ->> r.target_step_id::text)::uuid, (m_act ->> r.target_activity_id::text)::uuid,
         (m_act ->> r.required_activity_id::text)::uuid, r.criterion, r.is_mandatory, r.enforcement, r.label
  from public.service_requirements r where r.version_id = p_version;

  insert into public.service_reminder_rules (version_id, activity_id, trigger, offset_hours, channel, template_key)
  select v_new, (m_act ->> r.activity_id::text)::uuid, r.trigger, r.offset_hours, r.channel, r.template_key
  from public.service_reminder_rules r where r.version_id = p_version;

  insert into public.service_followups (version_id, next_service_id, label)
  select v_new, next_service_id, label from public.service_followups where version_id = p_version;

  update public.service_versions
  set welcome_activity_id = (m_act ->> v.welcome_activity_id::text)::uuid
  where id = v_new;

  return v_new;
end $$;

revoke execute on function public.publish_service_version(uuid) from public, anon;
revoke execute on function public.clone_service_version(uuid, uuid) from public, anon;
grant execute on function public.publish_service_version(uuid) to authenticated, service_role;
grant execute on function public.clone_service_version(uuid, uuid) to authenticated, service_role;
