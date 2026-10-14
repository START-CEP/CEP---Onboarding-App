-- Buckets privados y sus políticas (también declarados en config.toml para el entorno local).
-- Rutas:
--   content/{asset_id}/{archivo}                       → lo sube admin; lo leen quienes pueden ver el asset
--   submissions/{enrollment_id}/{profile_id}/...       → tarea individual (solo su autor y el equipo)
--   submissions/{enrollment_id}/shared/...             → tarea en pareja (ambos miembros y el equipo)
--   contracts/{enrollment_id}/{profile_id}/...         → PDF firmado (inmutable)
--   avatars/{profile_id}/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('content', 'content', false, 524288000,
   array['video/mp4','video/quicktime','application/pdf','audio/mpeg','audio/mp4','image/png','image/jpeg','image/webp']),
  ('submissions', 'submissions', false, 20971520,
   array['application/pdf','image/png','image/jpeg','image/heic','image/webp']),
  ('contracts', 'contracts', false, 20971520, array['application/pdf']),
  ('avatars', 'avatars', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create function private.storage_segment(p_name text, p_index int) returns text
language sql immutable set search_path = '' as $$
  select (string_to_array(p_name, '/'))[p_index];
$$;
grant execute on function private.storage_segment(text, int) to authenticated, service_role;

-- content
create policy content_read on storage.objects for select to authenticated using (
  bucket_id = 'content' and private.can_view_asset(private.try_uuid(private.storage_segment(name, 1))));
create policy content_admin_write on storage.objects for insert to authenticated with check (
  bucket_id = 'content' and private.is_admin());
create policy content_admin_update on storage.objects for update to authenticated using (
  bucket_id = 'content' and private.is_admin());
create policy content_admin_delete on storage.objects for delete to authenticated using (
  bucket_id = 'content' and private.is_admin());

-- submissions
create policy submissions_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'submissions'
  and private.is_enrollment_member(private.try_uuid(private.storage_segment(name, 1)))
  and (private.storage_segment(name, 2) = (select auth.uid())::text or private.storage_segment(name, 2) = 'shared'));
create policy submissions_read on storage.objects for select to authenticated using (
  bucket_id = 'submissions' and (
    private.storage_segment(name, 2) = (select auth.uid())::text
    or private.is_admin()
    or private.is_assigned_clinician(private.try_uuid(private.storage_segment(name, 1)))
    or (private.storage_segment(name, 2) = 'shared'
        and private.can_access_enrollment(private.try_uuid(private.storage_segment(name, 1))))));
-- Sin update/delete para pacientes: lo subido queda respaldado.

-- contracts: solo lectura para la inscripción; escribe el service role (Edge Function de firma).
create policy contracts_read on storage.objects for select to authenticated using (
  bucket_id = 'contracts' and private.can_access_enrollment(private.try_uuid(private.storage_segment(name, 1))));

-- avatars
create policy avatars_read on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy avatars_write on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and private.storage_segment(name, 1) = (select auth.uid())::text);
create policy avatars_update on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and private.storage_segment(name, 1) = (select auth.uid())::text);
