-- Registro clínico de la sesión (migración 0030): clínico asignado y admin sí; la pareja y otro clínico no.
begin;
set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(5);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

-- S1 de Pedro y Andrea (inscripción activa), con Emilia como terapeuta principal.
create temp table t_s on commit drop as
select s.id from enrollment_sessions s join enrollment_activities ea on ea.id = s.enrollment_activity_id
join enrollments e on e.id = s.enrollment_id
where e.unit_id = '0a000000-0000-4000-8000-000000000001' and e.status = 'active' and ea.key = 'S1' limit 1;
grant select on t_s to authenticated;

select pg_temp.as_user('a0000000-0000-4000-8000-000000000002');
set local role authenticated;
select lives_ok($$insert into session_records (enrollment_session_id, transcript, brief, updated_by)
  select id, 'Transcripción de prueba', 'Resumen', 'a0000000-0000-4000-8000-000000000002' from t_s$$, 'Emilia guarda la transcripción de su pareja');
select is((select count(*)::int from session_records where enrollment_session_id = (select id from t_s)), 1, 'y la puede leer');
reset role;

select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is((select count(*)::int from session_records), 0, 'Pedro (la pareja) no ve la transcripción');
reset role;

select pg_temp.as_user('a0000000-0000-4000-8000-000000000005');
set local role authenticated;
select is((select count(*)::int from session_records), 0, 'Yasna (asistente, sin rol clínico) no la ve');
select throws_ok($$insert into session_records (enrollment_session_id, transcript, updated_by)
  select id, 'x', 'a0000000-0000-4000-8000-000000000005' from t_s$$, '42501', null, 'ni la puede escribir');
reset role;

select * from finish();
rollback;
