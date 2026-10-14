-- Motor de requisitos: decide qué está hecho, qué falta y cuál es el paso actual.
-- Es genérico: depende del tipo de actividad, sus participantes y el criterio de cada requisito.
-- Las funciones son security definer (evalúan sobre todos los datos de la inscripción y devuelven solo booleanos);
-- las vistas son security_invoker, así que cada usuario solo ve las filas que su RLS le permite.

-- Miembros que deben cumplir una actividad según sus participantes.
create function private.required_members(p_activity uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.profile_id
  from public.enrollment_activities ea
  join public.enrollments e on e.id = ea.enrollment_id
  join public.client_unit_members m on m.unit_id = e.unit_id
  where ea.id = p_activity
    and (ea.participants in ('all', 'each_member')
         or (ea.participants = 'member_1' and m.member_index = 1)
         or (ea.participants = 'member_2' and m.member_index = 2));
$$;

create function private.criterion_met(p_activity uuid, p_criterion public.req_criterion) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  a public.enrollment_activities;
  v_members int;
begin
  select * into a from public.enrollment_activities where id = p_activity;
  if a.id is null then return false; end if;

  -- Avance compartido confirmado (por la unidad o por el equipo) cumple cualquier criterio de "hecho".
  if p_criterion in ('viewed', 'completed', 'staff_confirmed') and exists (
       select 1 from public.activity_progress
       where enrollment_activity_id = p_activity and profile_id is null and status = 'completed') then
    return true;
  end if;

  select count(*) into v_members from private.required_members(p_activity);

  case p_criterion
    when 'staff_confirmed' then
      return false;

    when 'viewed', 'completed' then
      if a.type = 'staff_task' then
        return exists (select 1 from public.staff_task_progress where enrollment_activity_id = p_activity)
           and not exists (select 1 from public.staff_task_progress
                           where enrollment_activity_id = p_activity and done_at is null);
      end if;
      return v_members > 0 and not exists (
        select 1 from private.required_members(p_activity) rm(pid)
        where not exists (select 1 from public.activity_progress p
                          where p.enrollment_activity_id = p_activity and p.profile_id = rm.pid
                            and p.status = 'completed'));

    when 'task_submitted', 'form_submitted' then
      if a.response_scope = 'shared' then
        return exists (select 1 from public.form_submissions
                       where enrollment_activity_id = p_activity and status = 'submitted');
      end if;
      return v_members > 0 and not exists (
        select 1 from private.required_members(p_activity) rm(pid)
        where not exists (select 1 from public.form_submissions s
                          where s.enrollment_activity_id = p_activity and s.submitted_by = rm.pid
                            and s.status = 'submitted'));

    when 'signed' then
      return v_members > 0 and not exists (
        select 1 from private.required_members(p_activity) rm(pid)
        where not exists (select 1 from public.contract_signatures cs
                          where cs.enrollment_id = a.enrollment_id and cs.profile_id = rm.pid
                            and (a.contract_template_id is null or cs.contract_template_id = a.contract_template_id)));

    when 'attended' then
      return exists (select 1 from public.enrollment_sessions
                     where enrollment_activity_id = p_activity and status = 'completed');
  end case;
  return false;
end $$;

-- Criterio por defecto según el tipo, para saber si una actividad está "hecha".
create function private.default_criterion(t public.activity_type) returns public.req_criterion
language sql immutable set search_path = '' as $$
  select case t
    when 'homework' then 'task_submitted'
    when 'form' then 'form_submitted'
    when 'contract' then 'signed'
    when 'therapy_session' then 'attended'
    when 'group_session' then 'completed'
    when 'staff_task' then 'completed'
    else 'viewed'
  end::public.req_criterion;
$$;

create function private.activity_completed(p_activity uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.criterion_met(id, private.default_criterion(type))
  from public.enrollment_activities where id = p_activity;
$$;

create function private.requirement_met(p_requirement uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select r.waived_at is not null or private.criterion_met(r.required_activity_id, r.criterion)
  from public.enrollment_requirements r where r.id = p_requirement;
$$;

create function private.step_completed(p_step uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select s.completed_at is not null or private.activity_completed(s.activity_id)
  from public.enrollment_steps s where s.id = p_step;
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
create view public.v_requirement_status with (security_invoker = true) as
select r.id,
       r.enrollment_id,
       r.target_step_id,
       ts.position as target_step_position,
       r.target_activity_id,
       ra.id as required_activity_id,
       ra.key as required_key,
       ra.title as required_title,
       ra.type as required_type,
       r.criterion,
       r.is_mandatory,
       r.enforcement,
       r.label,
       r.waived_at is not null as waived,
       private.requirement_met(r.id) as is_met
from public.enrollment_requirements r
join public.enrollment_activities ra on ra.id = r.required_activity_id
left join public.enrollment_steps ts on ts.id = r.target_step_id;

create view public.v_activity_state with (security_invoker = true) as
select ea.id as activity_id,
       ea.enrollment_id,
       ea.key,
       ea.type,
       ea.title,
       ea.track_key,
       ea.track_name,
       ea.track_position,
       ea.participants,
       ea.response_scope,
       ea.responsible_role_id,
       st.staff_profile_id as responsible_staff_id,
       ea.suggested_on,
       ea.estimated_minutes,
       ea.position,
       private.activity_completed(ea.id) as is_completed,
       -- video visto pero tarea pendiente (módulos con tarea)
       (ea.type = 'video_module' and ea.form_version_id is not null
        and private.criterion_met(ea.id, 'viewed')
        and not private.criterion_met(ea.id, 'task_submitted')) as task_pending,
       (select count(*) from public.enrollment_requirements r
        where r.target_activity_id = ea.id and r.enforcement = 'blocks' and r.is_mandatory
          and not private.requirement_met(r.id)) as blocking_unmet
from public.enrollment_activities ea
left join public.enrollment_staff st
  on st.enrollment_id = ea.enrollment_id and st.care_role_id = ea.responsible_role_id
where not ea.hidden;

create view public.v_step_state with (security_invoker = true) as
with s as (
  select es.*, ea.key as activity_key, ea.type as activity_type, ea.responsible_role_id,
         ea.participants, private.step_completed(es.id) as is_completed
  from public.enrollment_steps es
  join public.enrollment_activities ea on ea.id = es.activity_id
  where not es.hidden
), req as (
  select r.target_step_id,
         count(*) as total,
         count(*) filter (where private.requirement_met(r.id)) as met,
         count(*) filter (where r.enforcement = 'blocks' and r.is_mandatory
                            and not private.requirement_met(r.id)) as blocking_unmet
  from public.enrollment_requirements r
  where r.target_step_id is not null
  group by r.target_step_id
), cur as (
  select enrollment_id, min(position) filter (where not is_completed) as position
  from s group by enrollment_id
)
select s.id as step_id,
       s.enrollment_id,
       s.position,
       s.title,
       s.description,
       s.block_name,
       s.block_position,
       s.activity_id,
       s.activity_key,
       s.activity_type,
       s.responsible_role_id,
       s.participants,
       s.is_completed,
       coalesce(req.total, 0) as requirements_total,
       coalesce(req.met, 0) as requirements_met,
       coalesce(req.blocking_unmet, 0) as blocking_unmet,
       case when s.is_completed then 'completed'
            when s.position = cur.position then 'current'
            else 'locked' end as state
from s
join cur on cur.enrollment_id = s.enrollment_id
left join req on req.target_step_id = s.id;

create view public.v_track_progress with (security_invoker = true) as
select enrollment_id,
       track_key,
       track_name,
       track_position,
       count(*) as activities_total,
       count(*) filter (where is_completed) as activities_completed,
       count(*) filter (where task_pending) as tasks_pending
from public.v_activity_state
where type <> 'staff_task'
group by enrollment_id, track_key, track_name, track_position;

create view public.v_enrollment_state with (security_invoker = true) as
select e.id as enrollment_id,
       e.unit_id,
       e.status,
       s.id as service_id,
       s.name as service_name,
       v.version as service_version,
       e.starts_on,
       e.access_until,
       (current_date - e.starts_on) as days_elapsed,
       (e.access_until - current_date) as days_left,
       (select count(*) from public.v_step_state ss where ss.enrollment_id = e.id) as steps_total,
       (select count(*) from public.v_step_state ss where ss.enrollment_id = e.id and ss.is_completed) as steps_completed,
       cs.position as current_step_position,
       cs.title as current_step_title,
       cs.block_name as current_block,
       cs.blocking_unmet as current_step_blocking_unmet
from public.enrollments e
join public.service_versions v on v.id = e.service_version_id
join public.services s on s.id = v.service_id
left join public.v_step_state cs on cs.enrollment_id = e.id and cs.state = 'current';

-- Coaching grupal: encuentros del programa, cuántos se han hecho, a cuántos asistió la unidad y el próximo.
create view public.v_group_progress with (security_invoker = true) as
select e.id as enrollment_id,
       gp.id as program_id,
       gp.name as program_name,
       count(gs.id) as sessions_total,
       count(gs.id) filter (where gs.status = 'completed') as sessions_held,
       count(gs.id) filter (where exists (
         select 1 from public.group_session_attendance a
         join public.client_unit_members m on m.profile_id = a.profile_id
         where a.group_session_id = gs.id and m.unit_id = e.unit_id and a.attended)) as sessions_attended,
       min(gs.scheduled_at) filter (where gs.status = 'scheduled' and gs.scheduled_at > now()) as next_session_at
from public.enrollments e
join public.service_versions v on v.id = e.service_version_id
join public.service_group_programs sg on sg.service_id = v.service_id
join public.group_programs gp on gp.id = sg.group_program_id
left join public.group_sessions gs on gs.program_id = gp.id
group by e.id, gp.id, gp.name;
