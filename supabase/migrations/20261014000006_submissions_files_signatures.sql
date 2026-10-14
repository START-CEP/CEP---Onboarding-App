-- Todo lo que el paciente entrega queda respaldado: respuestas (inmutables al enviar), archivos y firmas.

create table public.files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  mime text,
  size_bytes bigint,
  checksum_sha256 text,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (bucket, path)
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  enrollment_activity_id uuid not null references public.enrollment_activities (id) on delete restrict,
  form_version_id uuid references public.form_versions (id),
  response_scope public.response_scope not null,
  submitted_by uuid not null references public.profiles (id),
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  revision_of uuid references public.form_submissions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.form_submissions (enrollment_activity_id, status);
create index on public.form_submissions (submitted_by);
-- Un solo borrador vigente por persona (individual) o por actividad (compartido).
create unique index form_submissions_one_draft_individual
  on public.form_submissions (enrollment_activity_id, submitted_by)
  where status = 'draft' and response_scope = 'individual';
create unique index form_submissions_one_draft_shared
  on public.form_submissions (enrollment_activity_id)
  where status = 'draft' and response_scope = 'shared';

-- Lo enviado no se toca: para corregir se crea una revisión (revision_of).
create function private.guard_submission() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'submitted' then
      raise exception 'Una respuesta enviada no se puede borrar.' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if old.status = 'submitted' then
    raise exception 'Una respuesta enviada no se puede modificar. Cree una revisión.' using errcode = 'P0001';
  end if;
  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger form_submissions_guard before update or delete on public.form_submissions
  for each row execute function private.guard_submission();

create function private.stamp_submission() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  return new;
end $$;
create trigger form_submissions_stamp before insert on public.form_submissions
  for each row execute function private.stamp_submission();

-- Quiénes respondieron una respuesta compartida (aparece en la ficha de ambos).
create table public.submission_participants (
  submission_id uuid not null references public.form_submissions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id),
  confirmed_at timestamptz,
  primary key (submission_id, profile_id)
);

create table public.submission_files (
  submission_id uuid not null references public.form_submissions (id) on delete restrict,
  file_id uuid not null references public.files (id) on delete restrict,
  primary key (submission_id, file_id)
);

create table public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  contract_template_id uuid not null references public.contract_templates (id),
  profile_id uuid not null references public.profiles (id),
  signed_at timestamptz not null default now(),
  signer_name text not null,
  ip inet,
  user_agent text,
  signed_file_id uuid references public.files (id),
  provider text not null default 'in_app',
  provider_ref text,
  unique (enrollment_id, contract_template_id, profile_id)
);

create function private.immutable_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% es un registro inmutable.', tg_table_name using errcode = 'P0001';
end $$;
create trigger contract_signatures_immutable before update or delete on public.contract_signatures
  for each row execute function private.immutable_row();

-- Enlace por email para responder en pareja.
create table public.shared_form_invites (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions (id) on delete cascade,
  token_hash text not null unique,
  sent_to text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
