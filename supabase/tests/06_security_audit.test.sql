-- Auditoría de seguridad (migración 0020): correo del perfil, sesiones individuales, ventas sin acceso clínico,
-- bloqueos impuestos por la base y enlaces seguros. Usa la pareja de demo (Pedro y Andrea).
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

-- Vendedora sin otros roles que vendió la inscripción de demo.
insert into auth.users (id, email, aud, role) values
  ('c0000000-0000-4000-8000-000000000020', 'ventas-auditoria@example.com', 'authenticated', 'authenticated');
insert into staff_roles (profile_id, role) values ('c0000000-0000-4000-8000-000000000020', 'sales');
update enrollments set sold_by = 'c0000000-0000-4000-8000-000000000020'
  where unit_id = '0a000000-0000-4000-8000-000000000001';

select hasnt_column('public', 'enrollments', 'notes_internal', 'Las notas internas ya no están en la inscripción');
select is((select count(*)::int from public.find_auth_user('PEDRO@example.com')), 1, 'find_auth_user encuentra la cuenta sin importar mayúsculas');
select ok(not has_function_privilege('authenticated', 'public.find_auth_user(text)', 'execute'),
          'Un usuario no puede buscar cuentas por correo');

-- Andrea
select pg_temp.as_user('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok($$ update profiles set email = 'otra@example.com' where id = 'b0000000-0000-4000-8000-000000000002' $$,
                 '42501', null, 'Andrea no puede cambiar el correo de su perfil');
select lives_ok($$ update profiles set full_name = 'Andrea Demo' where id = 'b0000000-0000-4000-8000-000000000002' $$,
                'Andrea sí puede cambiar su nombre');
select is((select count(*)::int from enrollment_sessions s join enrollment_activities ea on ea.id = s.enrollment_activity_id
           where ea.key = 'S2'), 0, 'Andrea no ve la sesión individual de Pedro');
select is((select count(*)::int from enrollment_sessions s join enrollment_activities ea on ea.id = s.enrollment_activity_id
           where ea.key = 'S1'), 1, 'Andrea ve la sesión en pareja');
select is((select count(*)::int from enrollment_steps), (select count(*)::int from enrollment_steps where not hidden),
          'Andrea sigue viendo todos sus pasos');
reset role;

-- Pedro
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is((select count(*)::int from enrollment_sessions s join enrollment_activities ea on ea.id = s.enrollment_activity_id
           where ea.key = 'S2'), 1, 'Pedro ve su sesión individual');
select throws_ok($$ insert into activity_progress (enrollment_activity_id, profile_id, status)
                    select id, 'b0000000-0000-4000-8000-000000000001', 'completed' from enrollment_activities where key = 'S2' $$,
                 '42501', null, 'Pedro no puede marcar una sesión de terapia como hecha');
select throws_ok($$ insert into enrollment_sessions (enrollment_id, enrollment_activity_id, scheduled_at, status)
                    select enrollment_id, id, now() - interval '1 day', 'requested' from enrollment_activities where key = 'S2' $$,
                 'P0001', null, 'Pedro no puede pedir una sesión en el pasado');
select lives_ok($$ insert into enrollment_sessions (enrollment_id, enrollment_activity_id, scheduled_at, status, meeting_url, duration_min)
                   select enrollment_id, id, now() + interval '3 days', 'requested', 'https://malicioso.example', 240
                   from enrollment_activities where key = 'S2' $$,
                'Pedro pide una sesión con fecha futura');
select is((select meeting_url from enrollment_sessions s join enrollment_activities ea on ea.id = s.enrollment_activity_id
           where ea.key = 'S2' and s.status = 'requested'), null, 'El enlace que propone el paciente se descarta');
select throws_ok($$ insert into enrollment_sessions (enrollment_id, enrollment_activity_id, scheduled_at, status)
                    select enrollment_id, id, now() + interval '4 days', 'requested' from enrollment_activities where key = 'S2' $$,
                 'P0001', null, 'No se pueden pedir dos sesiones abiertas a la vez');
select throws_ok($$ insert into files (bucket, path, uploaded_by)
                    values ('submissions', 'no/existe.pdf', 'b0000000-0000-4000-8000-000000000001') $$,
                 '42501', null, 'No se registra un archivo que no existe en Storage');
reset role;

-- Ventas
select pg_temp.as_user('c0000000-0000-4000-8000-000000000020');
set local role authenticated;
select is((select count(*)::int from enrollments), 1, 'Ventas ve la inscripción que vendió');
select is((select count(*)::int from contract_signatures) + (select count(*)::int from enrollment_sessions)
          + (select count(*)::int from activity_progress), 0, 'Ventas no ve firmas, sesiones ni progreso');
select throws_ok($$ insert into enrollments (unit_id, service_version_id, status, starts_on)
                    select unit_id, service_version_id, 'active', current_date from enrollments limit 1 $$,
                 '42501', null, 'Ventas no puede crear inscripciones a mano');
select throws_ok($$ insert into notifications (profile_id, title, link)
                    values ('b0000000-0000-4000-8000-000000000001', 'Aviso', '/') $$,
                 '42501', null, 'Ventas no puede mandar avisos');
reset role;

-- Admin: los avisos solo llevan rutas internas.
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$ insert into notifications (profile_id, title, link)
                    values ('b0000000-0000-4000-8000-000000000001', 'Aviso', 'https://phishing.example') $$,
                 '23514', null, 'Un aviso no puede llevar un enlace externo');
reset role;

select * from finish();
rollback;
