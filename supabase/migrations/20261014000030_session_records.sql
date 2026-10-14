-- Registro clínico de cada sesión: transcripción completa (Plaud), resumen que entrega Plaud y el reporte del equipo.
-- Una fila por sesión. Solo lo ven y editan el clínico asignado a la pareja y admin; la pareja nunca.
create table public.session_records (
  enrollment_session_id uuid primary key references public.enrollment_sessions (id) on delete restrict,
  transcript text check (transcript is null or char_length(transcript) <= 400000),
  brief text check (brief is null or char_length(brief) <= 40000),
  report text check (report is null or char_length(report) <= 40000),
  updated_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger session_records_updated_at before update on public.session_records
  for each row execute function private.set_updated_at();
create trigger session_records_audit after insert or update or delete on public.session_records
  for each row execute function private.audit();

alter table public.session_records enable row level security;

create function private.can_write_session_record(p_session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollment_sessions s
                 where s.id = p_session
                   and (private.is_admin() or private.is_assigned_clinician(s.enrollment_id)));
$$;
revoke execute on function private.can_write_session_record(uuid) from public, anon;
grant execute on function private.can_write_session_record(uuid) to authenticated, service_role;

create policy session_records_select on public.session_records for select to authenticated
  using (private.can_write_session_record(enrollment_session_id));
create policy session_records_insert on public.session_records for insert to authenticated
  with check (updated_by = (select auth.uid()) and private.can_write_session_record(enrollment_session_id));
create policy session_records_update on public.session_records for update to authenticated
  using (private.can_write_session_record(enrollment_session_id))
  with check (updated_by = (select auth.uid()) and private.can_write_session_record(enrollment_session_id));
create policy session_records_delete on public.session_records for delete to authenticated
  using (private.is_admin());

revoke all on public.session_records from anon;
