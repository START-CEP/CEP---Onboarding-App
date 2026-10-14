-- 1) La tarea que crea una consulta de soporte no copia el asunto ni el texto: staff_tasks la ve todo el equipo
--    (incluida ventas), y la consulta puede ser privada. El detalle se lee en /equipo/soporte, con su RLS.
create or replace function private.on_support_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t public.support_tickets;
  v_staff boolean := private.is_staff_profile(new.author_id);
  v_coord uuid;
  v_unit text;
begin
  select * into t from public.support_tickets where id = new.ticket_id;
  perform set_config('cep.support_trigger', 'on', true);
  update public.support_tickets set status = case when v_staff then 'answered' else 'open' end, updated_at = now()
  where id = t.id;
  perform set_config('cep.support_trigger', 'off', true);

  if v_staff then
    insert into public.notifications (profile_id, enrollment_id, title, body, link)
    select m.profile_id, t.enrollment_id, 'Respondimos su consulta', t.subject, '/soporte'
    from public.enrollments e join public.client_unit_members m on m.unit_id = e.unit_id
    where e.id = t.enrollment_id and (not t.is_private or m.profile_id = t.opened_by);
  else
    select st.staff_profile_id into v_coord
    from public.enrollment_staff st join public.care_roles cr on cr.id = st.care_role_id
    where st.enrollment_id = t.enrollment_id and cr.key = 'coordinator' limit 1;
    select cu.display_name into v_unit
    from public.enrollments e join public.client_units cu on cu.id = e.unit_id where e.id = t.enrollment_id;
    insert into public.staff_tasks (enrollment_id, assignee_id, title, description, due_on, source, dedupe_key)
    values (t.enrollment_id, v_coord, format('%s: responder consulta de soporte', v_unit),
            'Ver en Soporte (/equipo/soporte).', current_date, 'automatic',
            'support:' || t.id || ':' || to_char(now(), 'YYYYMMDD'))
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end $$;

-- 2) Solo puede estar en el equipo de una pareja quien está activo y tiene rol clínico, de asistente o de admin
--    (la misma regla que enroll_unit, ahora también para cambios directos de responsables).
create function private.guard_enrollment_staff() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.staff_members sm join public.staff_roles sr on sr.profile_id = sm.profile_id
                 where sm.profile_id = new.staff_profile_id and sm.is_active
                   and sr.role in ('clinician', 'assistant', 'admin')) then
    raise exception 'Esa persona no puede atender parejas (necesita rol clínico, de asistente o admin).' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger enrollment_staff_guard before insert or update on public.enrollment_staff
  for each row execute function private.guard_enrollment_staff();
