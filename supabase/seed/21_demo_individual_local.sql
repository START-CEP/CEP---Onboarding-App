-- Mónica en terapia individual (solo local: prueba que el motor sirve para otros servicios).

do $$
declare
  monica uuid := 'b0000000-0000-4000-8000-000000000003';
  emilia uuid := 'a0000000-0000-4000-8000-000000000002';
  u_mo uuid := '0a000000-0000-4000-8000-000000000002';
begin
  insert into public.client_units (id, kind, display_name) values (u_mo, 'individual', 'Mónica Vidal');
  insert into public.client_unit_members (unit_id, profile_id, member_index) values (u_mo, monica, 1);
  -- Mónica: terapia individual con Emilia como responsable (la psicóloga no está asignada)
  perform public.enroll_unit(u_mo, '5e100000-0000-4000-8000-000000000002', date '2026-10-01',
                             jsonb_build_object('psychologist', emilia));
end $$;
