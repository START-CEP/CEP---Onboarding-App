-- Motor genérico: estado de la maqueta, otros servicios, versionado y validación.
begin;
set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- Estado de Pedro y Andrea = maqueta (paso 9)
select is((select current_step_position from v_enrollment_state s join enrollments e on e.id = s.enrollment_id
           where e.unit_id = '0a000000-0000-4000-8000-000000000001'), 9, 'Pareja en el paso 9');
select is((select steps_completed from v_enrollment_state s join enrollments e on e.id = s.enrollment_id
           where e.unit_id = '0a000000-0000-4000-8000-000000000001'), 8::bigint, '8 de 14 pasos completos');
select results_eq(
  $$ select label from v_requirement_status r join enrollments e on e.id = r.enrollment_id
     where e.unit_id = '0a000000-0000-4000-8000-000000000001' and target_step_position = 9 and not is_met
     order by label $$,
  $$ values ('Módulo 3 · obligatorio'), ('Módulo 4') $$,
  'S5 bloqueada por la tarea del Módulo 3 y el Módulo 4');
select is((select activities_completed from v_track_progress t join enrollments e on e.id = t.enrollment_id
           where e.unit_id = '0a000000-0000-4000-8000-000000000001' and track_key = 'terapia'), 4::bigint,
          '4 de 10 sesiones');

select is((select sessions_attended || '/' || sessions_total from v_group_progress g join enrollments e on e.id = g.enrollment_id
           where e.unit_id = '0a000000-0000-4000-8000-000000000001'), '2/9', 'Coaching grupal: asistieron a 2 de 9');

-- Genericidad: inscribir en Intensivo con el mismo motor
insert into client_units (id, kind, display_name) values ('0a000000-0000-4000-8000-0000000000ff', 'couple', 'Test intensivo');
insert into client_unit_members values
  ('0a000000-0000-4000-8000-0000000000ff', 'b0000000-0000-4000-8000-000000000003', 1),
  ('0a000000-0000-4000-8000-0000000000ff', 'b0000000-0000-4000-8000-000000000001', 2);
select isnt(enroll_unit('0a000000-0000-4000-8000-0000000000ff', '5e100000-0000-4000-8000-000000000003', date '2026-11-01',
                        jsonb_build_object('lead_therapist', 'a0000000-0000-4000-8000-000000000002')), null,
            'Se inscribe en el intensivo sin código específico');
select is((select steps_total from v_enrollment_state s join enrollments e on e.id = s.enrollment_id
           where e.unit_id = '0a000000-0000-4000-8000-0000000000ff'), 8::bigint, 'Intensivo: 8 pasos');

-- Firman ambos y responden la parte en pareja → el paso 3 (Día 1) queda actual pero bloqueado por la radiografía individual
insert into contract_signatures (enrollment_id, contract_template_id, profile_id, signer_name)
select ea.enrollment_id, ea.contract_template_id, m.profile_id, 'test'
from enrollment_activities ea join enrollments e on e.id = ea.enrollment_id
join client_unit_members m on m.unit_id = e.unit_id
where e.unit_id = '0a000000-0000-4000-8000-0000000000ff' and ea.key = 'CON';
insert into form_submissions (enrollment_id, enrollment_activity_id, form_version_id, response_scope, submitted_by, status)
select ea.enrollment_id, ea.id, ea.form_version_id, 'shared', 'b0000000-0000-4000-8000-000000000003', 'submitted'
from enrollment_activities ea join enrollments e on e.id = ea.enrollment_id
where e.unit_id = '0a000000-0000-4000-8000-0000000000ff' and ea.key = 'RAD_PAR';
select is((select current_step_position || ':' || current_step_blocking_unmet from v_enrollment_state s
           join enrollments e on e.id = s.enrollment_id where e.unit_id = '0a000000-0000-4000-8000-0000000000ff'),
          '3:1', 'Intensivo: Día 1 actual, bloqueado por 1 requisito');

-- Versionado: editar = clonar a borrador y publicar; la inscripción activa no cambia
select is((select count(*) from enrollment_activities ea join enrollments e on e.id = ea.enrollment_id
           where e.unit_id = '0a000000-0000-4000-8000-000000000001'), 27::bigint, 'La inscripción tiene 27 actividades');
create temp table _v2 as select clone_service_version('5e100000-0000-4000-8000-000000000001') as id;
insert into service_activities (version_id, key, type, title)
select id, 'EXTRA', 'reading', 'Lectura nueva' from _v2;
select lives_ok($$ select publish_service_version((select id from _v2)) $$, 'Se publica la v2');
select is((select status::text from service_versions where id = '5e100000-0000-4000-8000-000000000001'), 'retired',
          'La v1 queda retirada');
select is((select count(*) from enrollment_activities ea join enrollments e on e.id = ea.enrollment_id
           where e.unit_id = '0a000000-0000-4000-8000-000000000001'), 27::bigint,
          'La inscripción en v1 no cambia al publicar la v2');

-- Una versión publicada no se puede editar
select throws_ok($$ update service_activities set title = 'x' where version_id = (select id from _v2) and key = 'S1' $$,
                 'P0001', null, 'Versión publicada inmutable');

-- Requisito circular: publicar lo rechaza
create temp table _v3 as select clone_service_version((select id from _v2)) as id;
insert into service_requirements (version_id, target_activity_id, required_activity_id, criterion)
select v.id, m0.id, s1.id, 'attended'
from _v3 v
join service_activities m0 on m0.version_id = v.id and m0.key = 'M0'
join service_activities s1 on s1.version_id = v.id and s1.key = 'S1';
select throws_like($$ select publish_service_version((select id from _v3)) $$,
                   'Requisitos circulares%', 'Rechaza requisitos circulares');

-- Respuesta enviada inmutable
select throws_ok($$ update form_submissions set answers = '{}' where status = 'submitted' $$,
                 'P0001', null, 'Una respuesta enviada no se puede modificar');

select * from finish();
rollback;
