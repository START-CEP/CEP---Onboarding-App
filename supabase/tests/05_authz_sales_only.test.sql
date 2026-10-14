-- Un usuario SOLO de ventas (sin rol de asistente) no puede escalar a través de las unidades,
-- y la IP de la firma no se puede falsear con x-forwarded-for.
begin;
set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(9);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

-- Vendedora sin otros roles
insert into auth.users (id, email, aud, role) values
  ('c0000000-0000-4000-8000-000000000001', 'ventas@example.com', 'authenticated', 'authenticated');
insert into staff_roles (profile_id, role) values ('c0000000-0000-4000-8000-000000000001', 'sales');

select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$ insert into client_unit_members (unit_id, profile_id, member_index)
                    values ('0a000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 3) $$,
                 '42501', null, 'Ventas no puede añadir a nadie a una pareja ya inscrita');
select lives_ok($$ insert into client_units (id, kind, display_name)
                   values ('0a000000-0000-4000-8000-0000000000aa', 'couple', 'Pareja nueva') $$,
                'Ventas crea una unidad nueva');
select throws_ok($$ insert into client_unit_members (unit_id, profile_id, member_index)
                    values ('0a000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000002', 1) $$,
                 '42501', null, 'Ventas no puede añadir personal clínico como miembro');
select lives_ok($$ insert into client_unit_members (unit_id, profile_id, member_index)
                   values ('0a000000-0000-4000-8000-0000000000aa', 'b0000000-0000-4000-8000-000000000003', 1) $$,
                'Ventas añade un paciente a una unidad sin inscripción');
-- Camino de ataque: cancelar → añadir una cuenta propia → reactivar
prepare cancel as update enrollments set status = 'cancelled'
  where unit_id = '0a000000-0000-4000-8000-000000000001' returning id;
select is_empty('cancel', 'Ventas no puede cambiar el estado de una inscripción');
reset role;
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
update enrollments set status = 'cancelled' where unit_id = '0a000000-0000-4000-8000-000000000001';
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$ insert into client_unit_members (unit_id, profile_id, member_index)
                    values ('0a000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 3) $$,
                 '42501', null, 'Una inscripción cancelada también bloquea añadir miembros');
reset role;
-- La asistente gestiona inscripciones pero no puede reactivar una cancelada
select pg_temp.as_user('a0000000-0000-4000-8000-000000000005');
set local role authenticated;
select throws_ok($$ update enrollments set status = 'active' where unit_id = '0a000000-0000-4000-8000-000000000001' $$,
                 '42501', null, 'Solo admin reactiva una inscripción cancelada');
reset role;
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
update enrollments set status = 'active' where unit_id = '0a000000-0000-4000-8000-000000000001';
select pg_temp.as_user('c0000000-0000-4000-8000-000000000001');
set local role authenticated;
prepare ren as update client_units set display_name = 'x' where id = '0a000000-0000-4000-8000-000000000001' returning id;
select is_empty('ren', 'Ventas no puede editar una unidad ya inscrita');
reset role;

-- IP de la firma: se ignora la IP inventada al inicio de x-forwarded-for
select pg_temp.as_user('b0000000-0000-4000-8000-000000000003');
select set_config('request.headers', '{"x-forwarded-for": "6.6.6.6, 203.0.113.9", "user-agent": "test"}', true);
set local role authenticated;
insert into contract_signatures (enrollment_id, contract_template_id, profile_id, signer_name)
select e.id, ea.contract_template_id, 'b0000000-0000-4000-8000-000000000003', 'Mónica'
from enrollments e join enrollment_activities ea on ea.enrollment_id = e.id and ea.key = 'CON'
where e.unit_id = '0a000000-0000-4000-8000-000000000002';
select is((select host(ip) from contract_signatures where profile_id = 'b0000000-0000-4000-8000-000000000003'),
          '203.0.113.9', 'Se guarda la IP añadida por el proxy, no la que envía el cliente');
reset role;

select * from finish();
rollback;
