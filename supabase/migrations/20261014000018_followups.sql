-- Seguimiento automático (sin proveedor de email todavía): cada mañana se crean
--   · tareas de seguimiento para el equipo (coordinación / Yasna) y
--   · avisos en la app para la pareja
-- cuando el paso actual tiene requisitos pendientes y su fecha sugerida está cerca, o el acceso está por terminar.
-- dedupe_key evita duplicar el mismo aviso o tarea.

create extension if not exists pg_cron;

alter table public.staff_tasks add column if not exists dedupe_key text unique;
alter table public.notifications add column if not exists dedupe_key text unique;

create or replace function public.generate_followups() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_count integer := 0;
  v_coord uuid;
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'Solo admin o el sistema.' using errcode = '42501';
  end if;

  -- 1) Requisitos pendientes del paso actual, con la fecha sugerida en 3 días o ya pasada.
  for r in
    select s.enrollment_id, s.step_id, s.title, s.blocking_unmet, ea.suggested_on, cu.display_name
    from public.v_step_state s
    join public.enrollment_activities ea on ea.id = s.activity_id
    join public.enrollments e on e.id = s.enrollment_id
    join public.client_units cu on cu.id = e.unit_id
    where s.state = 'current' and s.blocking_unmet > 0 and e.status = 'active'
      and ea.suggested_on is not null and ea.suggested_on <= current_date + 3
  loop
    select st.staff_profile_id into v_coord
    from public.enrollment_staff st join public.care_roles cr on cr.id = st.care_role_id
    where st.enrollment_id = r.enrollment_id and cr.key = 'coordinator' limit 1;

    insert into public.staff_tasks (enrollment_id, assignee_id, title, description, due_on, source, dedupe_key)
    values (r.enrollment_id, v_coord,
            format('%s: recordar requisitos de «%s»', r.display_name, r.title),
            format('Les faltan %s requisito(s) para entrar. Fecha sugerida: %s.', r.blocking_unmet, to_char(r.suggested_on, 'DD/MM')),
            current_date, 'automatic', 'req:' || r.step_id)
    on conflict (dedupe_key) do nothing;
    get diagnostics v_count = row_count;

    insert into public.notifications (profile_id, enrollment_id, title, body, link, dedupe_key)
    select m.profile_id, r.enrollment_id,
           'Tienen pendiente un requisito',
           format('Para entrar a «%s» les falta completar algo. Revisen «La página de hoy».', r.title),
           '/', 'req:' || r.step_id || ':' || m.profile_id
    from public.enrollments e join public.client_unit_members m on m.unit_id = e.unit_id
    where e.id = r.enrollment_id
    on conflict (dedupe_key) do nothing;
  end loop;

  -- 2) Acceso por terminar (a 21 y a 7 días).
  for r in
    select e.id as enrollment_id, e.access_until, (e.access_until - current_date) as left_days, cu.display_name
    from public.enrollments e join public.client_units cu on cu.id = e.unit_id
    where e.status = 'active' and e.access_until is not null and (e.access_until - current_date) in (21, 7)
  loop
    insert into public.notifications (profile_id, enrollment_id, title, body, link, dedupe_key)
    select m.profile_id, r.enrollment_id,
           format('Les quedan %s días de proceso', r.left_days),
           'Revisen lo pendiente para aprovechar el cierre de su proceso.', '/',
           format('end%s:%s:%s', r.left_days, r.enrollment_id, m.profile_id)
    from public.enrollments e join public.client_unit_members m on m.unit_id = e.unit_id
    where e.id = r.enrollment_id
    on conflict (dedupe_key) do nothing;

    insert into public.staff_tasks (enrollment_id, title, description, due_on, source, dedupe_key)
    values (r.enrollment_id, format('%s: quedan %s días de acceso', r.display_name, r.left_days),
            'Revisar qué les falta y preparar el cierre.', current_date, 'automatic',
            format('end%s:%s', r.left_days, r.enrollment_id))
    on conflict (dedupe_key) do nothing;
  end loop;

  return v_count;
end $$;

revoke execute on function public.generate_followups() from public, anon;
grant execute on function public.generate_followups() to authenticated, service_role;

-- Todos los días a las 13:00 UTC (7:00 en Ciudad de México).
select cron.schedule('cep-followups-diarios', '0 13 * * *', $$select public.generate_followups()$$);
