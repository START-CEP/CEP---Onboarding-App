-- Regresiones de la revisión de seguridad: escalada de ventas/asistente, borradores, firmas, progreso.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

-- Contexto preparado como postgres (las tablas temporales no tienen RLS)
create temp table _ctx as
select e.id as enr,
       (select id from enrollments where unit_id = '0a000000-0000-4000-8000-000000000002') as enr_monica,
       (select id from enrollment_activities where enrollment_id = e.id and key = 'M3') as act_m3,
       (select id from enrollment_activities where enrollment_id = e.id and key = 'M4') as act_m4,
       (select contract_template_id from enrollment_activities
        where enrollment_id = (select id from enrollments where unit_id = '0a000000-0000-4000-8000-000000000002')
          and key = 'CON') as tpl_monica
from enrollments e where e.unit_id = '0a000000-0000-4000-8000-000000000001';
grant select on _ctx to authenticated;

-- Yasna (asistente + ventas)
select pg_temp.as_user('a0000000-0000-4000-8000-000000000005');
set local role authenticated;
select throws_ok($$ insert into client_unit_members (unit_id, profile_id, member_index)
                    values ('0a000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 3) $$,
                 '42501', null, 'Ventas no puede añadirse a una pareja');
select throws_ok($$ update enrollments set unit_id = '0a000000-0000-4000-8000-000000000002'
                    where id = (select enr from _ctx) $$,
                 '42501', null, 'La asistente no puede mover una inscripción a otra unidad');
reset role;

-- Pedro crea un borrador de la tarea del Módulo 3
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$ insert into form_submissions (enrollment_id, enrollment_activity_id, response_scope, submitted_by, answers)
                   select enr, act_m3, 'individual', 'b0000000-0000-4000-8000-000000000001', '{"reflexion":"borrador"}' from _ctx $$,
                'Pedro crea un borrador');
select throws_ok($$ update form_submissions set enrollment_id = (select enr_monica from _ctx)
                    where status = 'draft' and submitted_by = 'b0000000-0000-4000-8000-000000000001' $$,
                 null, null, 'No puede mover su borrador a otra inscripción');
select throws_ok($$ update form_submissions set enrollment_activity_id = (select act_m4 from _ctx)
                    where status = 'draft' and submitted_by = 'b0000000-0000-4000-8000-000000000001' $$,
                 '42501', null, 'No puede cambiar la actividad de su borrador');
-- Progreso: no se puede reapuntar a otra actividad
select throws_ok($$ update activity_progress set enrollment_activity_id = (select act_m4 from _ctx)
                    where profile_id = 'b0000000-0000-4000-8000-000000000001'
                      and enrollment_activity_id = (select act_m3 from _ctx) $$,
                 '42501', null, 'No puede reasignar su progreso');
reset role;

-- Firmas: no se puede firmar la plantilla de otro servicio, y la fecha la pone el servidor
select pg_temp.as_user('b0000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok($$ insert into contract_signatures (enrollment_id, contract_template_id, profile_id, signer_name)
                    select enr_monica, (select contract_template_id from enrollment_activities
                                        where enrollment_id = (select enr from _ctx) and key = 'CON'),
                           'b0000000-0000-4000-8000-000000000003', 'Mónica' from _ctx $$,
                 '42501', null, 'No puede firmar una plantilla que no es de su inscripción');
insert into contract_signatures (enrollment_id, contract_template_id, profile_id, signer_name, signed_at)
select enr_monica, tpl_monica, 'b0000000-0000-4000-8000-000000000003', 'Mónica', timestamptz '2020-01-01' from _ctx;
select ok((select signed_at > now() - interval '1 minute' from contract_signatures
           where profile_id = 'b0000000-0000-4000-8000-000000000003'),
          'La fecha de firma la pone el servidor (no se puede retrofechar)');
reset role;

select * from finish();
rollback;
