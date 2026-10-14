-- Documentos que el equipo comparte con la pareja (informes, recursos, documentos legales…), en carpetas.
-- profile_id null = para la pareja; con valor = solo para ese miembro (p. ej. un informe individual).
create type public.document_folder as enum ('legal', 'process', 'reports', 'resources');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  folder public.document_folder not null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) <= 1000),
  storage_path text not null unique,
  mime text,
  size_bytes bigint,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index documents_enrollment_idx on public.documents (enrollment_id, folder);

create function private.can_view_document(p_doc uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc and d.archived_at is null
      and (private.can_manage_enrollment(d.enrollment_id)
           or (private.is_enrollment_member(d.enrollment_id) and (d.profile_id is null or d.profile_id = auth.uid()))));
$$;
revoke execute on function private.can_view_document(uuid) from public, anon;
grant execute on function private.can_view_document(uuid) to authenticated, service_role;

alter table public.documents enable row level security;
create policy documents_select on public.documents for select to authenticated
  using (private.can_view_document(id) or private.can_manage_enrollment(enrollment_id));
create policy documents_insert on public.documents for insert to authenticated
  with check (private.can_manage_enrollment(enrollment_id));
create policy documents_update on public.documents for update to authenticated
  using (private.can_manage_enrollment(enrollment_id)) with check (private.can_manage_enrollment(enrollment_id));
create policy documents_delete on public.documents for delete to authenticated
  using (private.is_admin());

-- El documento de un miembro tiene que ser de un miembro de esa inscripción, y el archivo, de su carpeta.
create function private.guard_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profile_id is not null and not exists (
    select 1 from public.enrollments e join public.client_unit_members m on m.unit_id = e.unit_id
    where e.id = new.enrollment_id and m.profile_id = new.profile_id) then
    raise exception 'La persona no pertenece a esta inscripción.' using errcode = '23514';
  end if;
  if private.storage_segment(new.storage_path, 1) is distinct from new.enrollment_id::text then
    raise exception 'La ruta del archivo no corresponde a la inscripción.' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger documents_guard before insert or update on public.documents
  for each row execute function private.guard_document();

create trigger documents_audit after insert or update or delete on public.documents
  for each row execute function private.audit();

-- Storage: bucket privado; se lee solo si el documento registrado es visible para quien lo pide.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documents', 'documents', false, 52428800,
   array['application/pdf', 'image/png', 'image/jpeg', 'image/webp',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create policy documents_read on storage.objects for select to authenticated using (
  bucket_id = 'documents' and (
    private.can_manage_enrollment(private.try_uuid(private.storage_segment(name, 1)))
    or exists (select 1 from public.documents d where d.storage_path = name and private.can_view_document(d.id))));
create policy documents_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'documents' and private.can_manage_enrollment(private.try_uuid(private.storage_segment(name, 1))));
create policy documents_remove on storage.objects for delete to authenticated using (
  bucket_id = 'documents' and private.can_manage_enrollment(private.try_uuid(private.storage_segment(name, 1))));
