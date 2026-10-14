-- Biblioteca de contenidos, formularios versionados, contratos y recursos descargables.

create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  kind public.asset_kind not null,
  title text not null,
  storage_bucket text default 'content',
  storage_path text,                 -- content/{asset_id}/{archivo}
  provider text,                     -- 'mux' | 'vimeo' para video en streaming
  provider_id text,
  mime text,
  duration_seconds integer,
  size_bytes bigint,
  checksum_sha256 text,
  replaced_by uuid references public.content_assets (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check (storage_path is not null or provider_id is not null)
);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  kind text not null check (kind in ('intake', 'homework', 'test', 'feedback', 'profile')),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- schema: {"sections":[{"key","title","scope":"individual|shared","questions":[{"key","type","label","options",...}]}],"scoring":{...}}
create table public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete restrict,
  version integer not null,
  schema jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (form_id, version),
  check (jsonb_typeof(schema -> 'sections') = 'array')
);

create function private.guard_form_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.published_at is not null and new.schema is distinct from old.schema then
    raise exception 'El formulario ya está publicado: cree una versión nueva.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger form_versions_guard before update on public.form_versions
  for each row execute function private.guard_form_version();

create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  version integer not null,
  title text not null,
  body_md text,
  pdf_asset_id uuid references public.content_assets (id),
  summary_points jsonb not null default '[]'::jsonb,   -- los "5 puntos importantes"
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (service_id, version)
);

create function private.guard_contract_template() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.published_at is not null and (new.body_md is distinct from old.body_md
     or new.pdf_asset_id is distinct from old.pdf_asset_id) then
    raise exception 'El contrato ya está publicado: cree una versión nueva.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger contract_templates_guard before update on public.contract_templates
  for each row execute function private.guard_contract_template();

alter table public.service_activities
  add constraint service_activities_asset_fk foreign key (asset_id) references public.content_assets (id),
  add constraint service_activities_form_fk foreign key (form_version_id) references public.form_versions (id),
  add constraint service_activities_contract_fk foreign key (contract_template_id) references public.contract_templates (id);

-- Material descargable adjunto a una actividad, a un coaching grupal o a una sesión agendada.
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.content_assets (id),
  title text not null,
  description text,
  attach_type text not null check (attach_type in ('activity', 'group_session', 'enrollment_session')),
  attach_id uuid not null,
  visible_from timestamptz,
  position integer not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index on public.resources (attach_type, attach_id);
