-- Documentos (migraciones 0022-0023): la pareja ve lo compartido, cada uno lo suyo; solo el equipo sube.
begin;
set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(11);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

select has_table('public', 'documents', 'Existe la tabla de documentos');
select has_column('public', 'profiles', 'prefs', 'El perfil guarda preferencias');
select has_column('public', 'staff_members', 'bio', 'El equipo tiene presentación');

create temp table t_e as select id from enrollments where unit_id = '0a000000-0000-4000-8000-000000000001' limit 1;
grant select on t_e to authenticated;
insert into documents (enrollment_id, folder, title, storage_path)
  select id, 'legal', 'Contrato firmado', id || '/c-contrato.pdf' from t_e;
insert into documents (enrollment_id, profile_id, folder, title, storage_path)
  select id, 'b0000000-0000-4000-8000-000000000001', 'reports', 'Informe DISC de Pedro', id || '/r-disc-pedro.pdf' from t_e;
insert into storage.objects (bucket_id, name) select 'documents', id || '/r-disc-pedro.pdf' from t_e;

-- Andrea
select pg_temp.as_user('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from documents where title = 'Contrato firmado'), 1, 'Andrea ve el documento de la pareja');
select is((select count(*)::int from documents where title = 'Informe DISC de Pedro'), 0, 'Andrea no ve el informe individual de Pedro');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name like '%r-disc-pedro.pdf'), 0,
          'Andrea no puede descargar el archivo del informe de Pedro');
select throws_ok($$ insert into documents (enrollment_id, folder, title, storage_path)
                    select id, 'resources', 'x', id || '/x.pdf' from t_e $$,
                 '42501', null, 'Andrea no puede subir documentos');
reset role;

-- Pedro
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is((select count(*)::int from documents where title = 'Informe DISC de Pedro'), 1, 'Pedro ve su informe');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name like '%r-disc-pedro.pdf'), 1,
          'Pedro puede descargar su informe');
reset role;

select throws_ok($$ insert into documents (enrollment_id, profile_id, folder, title, storage_path)
                    select id, 'b0000000-0000-4000-8000-000000000099', 'reports', 'x', id || '/y.pdf' from t_e $$,
                 null, null, 'No se puede asignar un documento a alguien ajeno a la inscripción');

-- Preferencia «app_notices»: con los avisos desactivados no se crea el aviso.
update profiles set prefs = prefs || '{"app_notices": false}' where id = 'b0000000-0000-4000-8000-000000000001';
insert into notifications (profile_id, title, link) values ('b0000000-0000-4000-8000-000000000001', 'Silenciado', '/');
select is((select count(*)::int from notifications where title = 'Silenciado'), 0, 'Con avisos desactivados no se crea el aviso');

select * from finish();
rollback;
