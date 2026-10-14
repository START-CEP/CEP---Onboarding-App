-- Extensiones, esquema privado y tipos base del motor de servicios.

create extension if not exists pgcrypto with schema extensions;

-- Funciones auxiliares (RLS, motor de requisitos) viven aquí: no se exponen por la API.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create type public.staff_role as enum ('admin', 'clinician', 'assistant', 'sales');
create type public.unit_kind as enum ('couple', 'individual', 'group');
create type public.service_status as enum ('active', 'inactive');
create type public.version_status as enum ('draft', 'published', 'retired');
create type public.activity_type as enum (
  'video_module', 'reading', 'form', 'homework', 'contract',
  'therapy_session', 'group_session', 'staff_task', 'external_link', 'checklist'
);
-- Quién participa: toda la unidad, solo la persona 1, solo la persona 2, o cada miembro por separado.
create type public.participants as enum ('all', 'member_1', 'member_2', 'each_member');
create type public.response_scope as enum ('individual', 'shared');
create type public.req_criterion as enum (
  'viewed', 'task_submitted', 'form_submitted', 'signed', 'attended', 'completed', 'staff_confirmed'
);
create type public.enforcement as enum ('blocks', 'reminds');
create type public.enrollment_status as enum ('invited', 'active', 'paused', 'completed', 'cancelled');
create type public.progress_status as enum ('locked', 'available', 'in_progress', 'submitted', 'completed', 'skipped');
create type public.submission_status as enum ('draft', 'submitted');
create type public.session_status as enum ('requested', 'scheduled', 'completed', 'cancelled', 'no_show');
create type public.asset_kind as enum ('video', 'pdf', 'audio', 'image', 'other');

-- updated_at genérico
create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Conversión segura de texto a uuid (rutas de Storage).
create function private.try_uuid(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;
