-- Tercera ronda de la revisión de seguridad.
-- unit_has_enrollment ignoraba las inscripciones canceladas y ventas podía cambiar el estado de las que
-- vendió: cancelar → añadir una cuenta propia a la pareja → reactivar daba acceso a todo el proceso.
-- Ahora cualquier inscripción (en cualquier estado) bloquea cambios de miembros, y el estado solo lo
-- cambia el equipo que gestiona la inscripción; reactivar una cancelada es solo de admin.

create or replace function private.unit_has_enrollment(p_unit uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments where unit_id = p_unit);
$$;

-- Ventas ya no actualiza inscripciones: las crea (enroll_unit) y el equipo las gestiona.
drop policy enrollments_update on public.enrollments;
create policy enrollments_update on public.enrollments for update to authenticated
  using (private.can_manage_enrollment(id)) with check (private.can_manage_enrollment(id));

create or replace function private.guard_enrollment_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    if new.unit_id is distinct from old.unit_id
       or new.service_version_id is distinct from old.service_version_id
       or new.starts_on is distinct from old.starts_on
       or new.sold_by is distinct from old.sold_by then
      raise exception 'Solo un admin puede cambiar la unidad, la versión o el inicio de una inscripción.'
        using errcode = '42501';
    end if;
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      raise exception 'Solo un admin puede reactivar una inscripción cancelada.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
