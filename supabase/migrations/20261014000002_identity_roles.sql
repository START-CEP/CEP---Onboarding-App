-- Personas, roles del equipo y unidades (pareja / individuo / grupo).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_path text,
  timezone text not null default 'America/Mexico_City',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Cada usuario nuevo de Auth obtiene su perfil.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create table public.staff_members (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  title text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.staff_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.staff_role not null,
  primary key (profile_id, role)
);

-- Roles clínicos configurables a los que apuntan las plantillas ("terapeuta principal", "psicóloga"...).
create table public.care_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.client_units (
  id uuid primary key default gen_random_uuid(),
  kind public.unit_kind not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- member_index estable: persona 1, persona 2 (S2 / S3 individuales dependen de esto).
create table public.client_unit_members (
  unit_id uuid not null references public.client_units (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  member_index smallint not null check (member_index >= 1),
  primary key (unit_id, profile_id),
  unique (unit_id, member_index)
);
create index on public.client_unit_members (profile_id);
