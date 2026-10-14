-- Soporte: quien abrió una consulta solo la sigue viendo mientras sea miembro de esa inscripción.
create or replace function private.can_view_ticket(p_ticket uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = p_ticket
      and (private.can_manage_enrollment(t.enrollment_id)
           or (private.is_enrollment_member(t.enrollment_id)
               and (t.opened_by = auth.uid() or not t.is_private))));
$$;

drop policy support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (private.can_manage_enrollment(enrollment_id)
         or (opened_by = (select auth.uid()) and private.is_enrollment_member(enrollment_id)))
  with check (private.can_manage_enrollment(enrollment_id)
              or (opened_by = (select auth.uid()) and private.is_enrollment_member(enrollment_id)));
