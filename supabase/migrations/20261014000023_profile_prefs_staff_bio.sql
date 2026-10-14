-- Preferencias de avisos del perfil y presentación del equipo (la ven las parejas en «Quién los acompaña»).
alter table public.profiles
  add column prefs jsonb not null default '{"remind_email": true, "remind_whatsapp": true, "app_notices": true}'::jsonb,
  add constraint profiles_prefs_object check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) <= 2048);

alter table public.staff_members
  add column bio text,
  add constraint staff_members_bio_len check (bio is null or char_length(bio) <= 1200);

-- Cada miembro del equipo puede editar su propia presentación (el cargo y el estado, solo admin).
create policy staff_members_self_bio on public.staff_members for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create function private.guard_staff_self_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin()
     and (new.title is distinct from old.title or new.is_active is distinct from old.is_active
          or new.profile_id is distinct from old.profile_id) then
    raise exception 'Solo admin puede cambiar el cargo o el estado.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger staff_members_guard_self before update on public.staff_members
  for each row execute function private.guard_staff_self_update();

-- Los avisos en la app respetan la preferencia «app_notices».
create function private.respect_notice_prefs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.profile_id and (p.prefs ->> 'app_notices') = 'false') then
    return null; -- no se inserta
  end if;
  return new;
end $$;
create trigger notifications_respect_prefs before insert on public.notifications
  for each row execute function private.respect_notice_prefs();
