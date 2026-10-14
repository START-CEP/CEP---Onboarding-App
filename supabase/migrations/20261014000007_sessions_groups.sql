-- Sesiones de terapia (por inscripción) y coaching grupal (compartido entre inscripciones).

create table public.enrollment_sessions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  enrollment_activity_id uuid not null references public.enrollment_activities (id) on delete restrict,
  scheduled_at timestamptz,
  duration_min integer not null default 60,
  staff_profile_id uuid references public.profiles (id),
  meeting_url text,
  status public.session_status not null default 'requested',
  booking_provider text,
  booking_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.enrollment_sessions (enrollment_id);
create index on public.enrollment_sessions (enrollment_activity_id);
create trigger enrollment_sessions_updated_at before update on public.enrollment_sessions
  for each row execute function private.set_updated_at();

-- "Qué veremos": se adjunta a la actividad de la sesión (existe antes de agendar).
create table public.session_agenda_items (
  id uuid primary key default gen_random_uuid(),
  enrollment_activity_id uuid not null references public.enrollment_activities (id) on delete cascade,
  body text not null,
  position integer not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Notas clínicas: solo el clínico asignado y admin (ver RLS).
create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  enrollment_session_id uuid not null references public.enrollment_sessions (id) on delete restrict,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.group_programs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  cadence_days integer not null default 14,
  default_time time not null default '19:00',
  timezone text not null default 'America/Mexico_City',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Un programa grupal puede servir a varios servicios.
create table public.service_group_programs (
  service_id uuid not null references public.services (id) on delete cascade,
  group_program_id uuid not null references public.group_programs (id) on delete cascade,
  primary key (service_id, group_program_id)
);

create table public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.group_programs (id) on delete restrict,
  scheduled_at timestamptz not null,
  title text,
  meeting_url text,
  recording_asset_id uuid references public.content_assets (id),
  status public.session_status not null default 'scheduled',
  created_at timestamptz not null default now()
);
create index on public.group_sessions (program_id, scheduled_at);

create table public.group_session_attendance (
  group_session_id uuid not null references public.group_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id),
  attended boolean not null default true,
  primary key (group_session_id, profile_id)
);

create table public.group_session_questions (
  id uuid primary key default gen_random_uuid(),
  group_session_id uuid not null references public.group_sessions (id) on delete cascade,
  enrollment_id uuid references public.enrollments (id),
  profile_id uuid not null references public.profiles (id),
  body text not null,
  is_anonymous boolean not null default false,
  status text not null default 'new' check (status in ('new', 'selected', 'answered', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  profile_id uuid not null references public.profiles (id),
  downloaded_at timestamptz not null default now()
);
