-- Operación (avisos, mensajes, enlaces de un clic, tareas del equipo, informes) y auditoría.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  enrollment_id uuid references public.enrollments (id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (profile_id, read_at);

-- Historial de todo email / WhatsApp enviado.
create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references public.enrollments (id),
  profile_id uuid references public.profiles (id),
  channel text not null check (channel in ('email', 'whatsapp', 'sms')),
  template_key text not null,
  to_address text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

-- "Ya lo completé", confirmar asistencia... (se guarda solo el hash del token).
create table public.action_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  purpose text not null,
  enrollment_id uuid references public.enrollments (id) on delete cascade,
  profile_id uuid references public.profiles (id),
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Seguimiento del equipo (Yasna).
create table public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references public.enrollments (id) on delete cascade,
  assignee_id uuid references public.profiles (id),
  title text not null,
  description text,
  due_on date,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index on public.staff_tasks (assignee_id, status);

create table public.pre_session_reports (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  enrollment_activity_id uuid not null references public.enrollment_activities (id) on delete cascade,
  content jsonb not null,
  generated_by uuid references public.profiles (id),
  generated_at timestamptz not null default now()
);

-- Auditoría: quién cambió qué y cuándo.
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);
create index on public.audit_log (table_name, record_id);

create function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (table_name, record_id, action, actor_id, old_data, new_data)
  values (tg_table_name,
          coalesce(case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> 'id',
                   case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> 'profile_id'),
          tg_op, auth.uid(),
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'services', 'service_versions', 'enrollments', 'enrollment_staff', 'enrollment_steps',
    'enrollment_activities', 'enrollment_requirements', 'activity_progress', 'form_submissions',
    'contract_signatures', 'enrollment_sessions', 'session_notes', 'files', 'staff_roles', 'client_unit_members'
  ] loop
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function private.audit()', t || '_audit', t);
  end loop;
end $$;
