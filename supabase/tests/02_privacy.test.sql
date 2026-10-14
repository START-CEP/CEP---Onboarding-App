-- Privacidad (RLS) con usuarios reales del seed.
begin;
set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(17);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

-- Andrea
select pg_temp.as_user('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*) from form_submissions
           where submitted_by = 'b0000000-0000-4000-8000-000000000001' and response_scope = 'individual'), 0::bigint,
          'Andrea no ve las respuestas individuales de Pedro');
select is((select count(*) from form_submissions where response_scope = 'shared'), 1::bigint,
          'Andrea ve la respuesta compartida');
select is((select count(*) from form_submissions where submitted_by = 'b0000000-0000-4000-8000-000000000002'), 4::bigint,
          'Andrea ve sus 4 respuestas');
select is((select count(*) from session_agenda_items ai join enrollment_activities ea on ea.id = ai.enrollment_activity_id
           where ea.key = 'S2'), 0::bigint, 'Andrea no ve el detalle de la sesión individual de Pedro');
select is((select count(*) from session_agenda_items ai join enrollment_activities ea on ea.id = ai.enrollment_activity_id
           where ea.key = 'S5'), 2::bigint, 'Andrea ve "Qué veremos" de la S5');
select throws_ok($$ insert into form_submissions (enrollment_id, enrollment_activity_id, response_scope, submitted_by)
                    select enrollment_id, id, 'individual', 'b0000000-0000-4000-8000-000000000001'
                    from enrollment_activities where key = 'M3' $$,
                 '42501', null, 'Andrea no puede responder en nombre de Pedro');
reset role;

-- Pedro
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is((select current_step_position from v_enrollment_state), 9, 'Pedro ve su estado (paso 9) a través de las vistas');
select is((select count(*) from session_agenda_items ai join enrollment_activities ea on ea.id = ai.enrollment_activity_id
           where ea.key = 'S2'), 1::bigint, 'Pedro ve el detalle de su sesión individual');
select is((select count(*) from service_activities), 0::bigint, 'Un paciente no ve el catálogo interno');
select is((select count(*) from enrollments), 1::bigint, 'Pedro solo ve su inscripción');
select is((select count(*) from resources), 2::bigint, 'Pedro ve los recursos de sus coachings');
prepare upd as update form_submissions set answers = '{}' where submitted_by = 'b0000000-0000-4000-8000-000000000001' returning id;
select is_empty('upd', 'Pedro no puede editar lo que ya envió');
reset role;

-- Yasna (asistente): operativa sí, notas clínicas no
select pg_temp.as_user('a0000000-0000-4000-8000-000000000005');
set local role authenticated;
select is((select count(*) from session_notes), 0::bigint, 'La asistente no ve notas clínicas');
select is((select count(*) from form_submissions where response_scope = 'individual'), 0::bigint,
          'La asistente no ve respuestas individuales');
reset role;

-- Emilia ve las notas; la psicóloga no ve a Mónica (no está asignada)
select pg_temp.as_user('a0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*) from session_notes), 1::bigint, 'Emilia ve sus notas clínicas');
reset role;
select pg_temp.as_user('a0000000-0000-4000-8000-000000000003');
set local role authenticated;
select is((select count(*) from enrollments where unit_id = '0a000000-0000-4000-8000-000000000002'), 0::bigint,
          'La psicóloga no ve inscripciones donde no está asignada');
reset role;

-- Anónimo
set local role anon;
select is((select count(*) from enrollments), 0::bigint, 'Un anónimo no ve nada');
reset role;

select * from finish();
rollback;
