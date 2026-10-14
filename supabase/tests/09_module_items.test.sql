-- Contenido extra de los módulos (migración 0029): lo ve quien ve el módulo, nadie más.
begin;
set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(3);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

insert into content_assets (id, kind, title, storage_path) values ('d0000000-0000-4000-8000-000000000001', 'video', 'Validación emocional (prueba)', 'd0000000-0000-4000-8000-000000000001/prueba.mp4');
update enrollment_activities ea set config = config || jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('asset_id', 'd0000000-0000-4000-8000-000000000001', 'title', 'Validación emocional')))
from enrollments e
where ea.enrollment_id = e.id and e.unit_id = '0a000000-0000-4000-8000-000000000001' and e.status = 'active' and ea.key = 'M0';
insert into auth.users (id, email, aud, role) values ('c0000000-0000-4000-8000-000000000041', 'otra-pareja@example.com', 'authenticated', 'authenticated');

select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is((select count(*)::int from content_assets where id = 'd0000000-0000-4000-8000-000000000001'), 1, 'Pedro ve el contenido extra de su Módulo 0');
reset role;

select pg_temp.as_user('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from content_assets where id = 'd0000000-0000-4000-8000-000000000001'), 1, 'Andrea también');
reset role;

select pg_temp.as_user('c0000000-0000-4000-8000-000000000041');
set local role authenticated;
select is((select count(*)::int from content_assets where id = 'd0000000-0000-4000-8000-000000000001'), 0, 'Alguien de otra pareja no lo ve');
reset role;

select * from finish();
rollback;
