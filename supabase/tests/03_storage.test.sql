-- Storage: rutas privadas por inscripción y persona; recursos solo para quien está inscrito.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

create temp table _ctx as
select e.id as enrollment_id,
       (select r.asset_id from resources r limit 1) as resource_asset
from enrollments e where e.unit_id = '0a000000-0000-4000-8000-000000000001';
grant select on _ctx to authenticated;

-- Un recurso subido por admin
insert into storage.objects (bucket_id, name) select 'content', resource_asset || '/guia.pdf' from _ctx;

select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('submissions', '%s/b0000000-0000-4000-8000-000000000002/tarea.pdf') $$,
         (select enrollment_id from _ctx)),
  '42501', null, 'Pedro no puede subir a la carpeta de Andrea');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('submissions', '%s/b0000000-0000-4000-8000-000000000001/tarea.pdf') $$,
         (select enrollment_id from _ctx)),
  'Pedro sube a su propia carpeta');
select is((select count(*) from storage.objects where bucket_id = 'content'), 1::bigint, 'Pedro puede leer el recurso de su coaching');
reset role;

select pg_temp.as_user('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*) from storage.objects where bucket_id = 'submissions'), 0::bigint,
          'Andrea no ve la tarea individual de Pedro');
reset role;

select pg_temp.as_user('b0000000-0000-4000-8000-000000000003');
set local role authenticated;
select is((select count(*) from storage.objects where bucket_id = 'content'), 0::bigint,
          'Mónica (otro servicio) no puede leer ese recurso');
reset role;

select * from finish();
rollback;
