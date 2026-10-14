-- Soporte (migración 0025): consultas compartidas y privadas, estado automático y avisos.
begin;
set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;
create temp table t_e as select id from enrollments where unit_id = '0a000000-0000-4000-8000-000000000001' and status = 'active' limit 1;
grant select on t_e to authenticated;

-- Pedro abre una consulta compartida y otra privada.
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$ insert into support_tickets (enrollment_id, subject) select id, 'Factura' from t_e $$, 'Pedro abre una consulta');
select lives_ok($$ insert into support_tickets (enrollment_id, subject, is_private) select id, 'Tema personal', true from t_e $$, 'Pedro abre una consulta privada');
select lives_ok($$ insert into support_messages (ticket_id, body) select id, '¿Me envían la factura?' from support_tickets where subject = 'Factura' $$, 'Pedro escribe el mensaje');
select is((select status from support_tickets where subject = 'Factura'), 'open', 'La consulta queda abierta');
select throws_ok($$ update support_tickets set status = 'answered' where subject = 'Factura' $$, '42501', null, 'Pedro no puede marcarla como respondida');
reset role;
select is((select count(*)::int from staff_tasks where title like '%responder consulta de soporte' and created_at = now()), 1,
          'El equipo recibe una tarea para responder');
select is((select count(*)::int from staff_tasks where created_at = now() and (title like '%Factura%' or description like '%factura%')), 0,
          'La tarea no copia el asunto ni el texto de la consulta');

-- Andrea ve la compartida, no la privada, y no puede editarla.
select pg_temp.as_user('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from support_tickets where subject = 'Factura'), 1, 'Andrea ve la consulta compartida');
select is((select count(*)::int from support_tickets where subject = 'Tema personal'), 0, 'Andrea no ve la consulta privada de Pedro');
select lives_ok($$ update support_tickets set subject = 'otro' where subject = 'Tema personal' $$, 'El intento de Andrea no falla, pero no toca nada');
reset role;
select is((select count(*)::int from support_tickets where subject = 'Tema personal'), 1, 'La consulta privada sigue igual');

-- Responde alguien del equipo asignado.
select pg_temp.as_user((select staff_profile_id from enrollment_staff where enrollment_id = (select id from t_e) limit 1));
set local role authenticated;
select lives_ok($$ insert into support_messages (ticket_id, body) select id, 'Se la enviamos hoy.' from support_tickets where subject = 'Factura' $$, 'El equipo responde');
reset role;
select is((select status from support_tickets where subject = 'Factura'), 'answered', 'La respuesta la marca como respondida');
select is((select count(*)::int from notifications where title = 'Respondimos su consulta' and created_at > now() - interval '1 minute'), 2,
          'Avisa a los dos miembros de la consulta compartida');

-- Quien ya no es miembro de la inscripción pierde el acceso a las consultas que abrió.
insert into auth.users (id, email, aud, role) values ('c0000000-0000-4000-8000-000000000031', 'exmiembro@example.com', 'authenticated', 'authenticated');
insert into support_tickets (enrollment_id, opened_by, subject, is_private)
  select id, 'c0000000-0000-4000-8000-000000000031', 'Privada antes de salir', true from t_e;
create temp table t_tk as select id from support_tickets where subject = 'Privada antes de salir';
grant select on t_tk to authenticated;
select pg_temp.as_user('c0000000-0000-4000-8000-000000000031');
set local role authenticated;
select is((select count(*)::int from support_tickets where subject = 'Privada antes de salir'), 0, 'Quien ya no es miembro no ve sus consultas');
select throws_ok($$ insert into support_messages (ticket_id, body) values ((select id from t_tk), 'hola') $$,
                 '42501', null, 'Quien ya no es miembro no puede escribir');
reset role;

-- Responsables: alguien solo de ventas no puede quedar en el equipo de una pareja.
insert into auth.users (id, email, aud, role) values ('c0000000-0000-4000-8000-000000000032', 'solo-ventas@example.com', 'authenticated', 'authenticated');
insert into staff_members (profile_id, title) values ('c0000000-0000-4000-8000-000000000032', 'Ventas');
insert into staff_roles (profile_id, role) values ('c0000000-0000-4000-8000-000000000032', 'sales');
select throws_ok($$ update enrollment_staff set staff_profile_id = 'c0000000-0000-4000-8000-000000000032'
                    where enrollment_id = (select id from t_e) and care_role_id = (select id from care_roles where key = 'psychologist') $$,
                 '42501', null, 'No se puede asignar a alguien solo de ventas');
select lives_ok($$ update enrollment_staff set staff_profile_id = staff_profile_id where enrollment_id = (select id from t_e) $$,
                'Las asignaciones válidas siguen funcionando');

select * from finish();
rollback;
