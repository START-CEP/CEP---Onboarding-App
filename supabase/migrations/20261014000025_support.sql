-- Soporte: el canal formal para que la pareja deje consultas y quede registro de lo que se respondió.
-- is_private = solo la ve quien la abrió (y el equipo), no su pareja.
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  opened_by uuid not null references public.profiles (id) default auth.uid(),
  subject text not null check (char_length(subject) between 1 and 200),
  is_private boolean not null default false,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references public.profiles (id) default auth.uid(),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index support_tickets_enrollment_idx on public.support_tickets (enrollment_id, updated_at desc);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create function private.can_view_ticket(p_ticket uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = p_ticket
      and (private.can_manage_enrollment(t.enrollment_id)
           or t.opened_by = auth.uid()
           or (not t.is_private and private.is_enrollment_member(t.enrollment_id))));
$$;
revoke execute on function private.can_view_ticket(uuid) from public, anon;
grant execute on function private.can_view_ticket(uuid) to authenticated, service_role;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy support_tickets_select on public.support_tickets for select to authenticated using (private.can_view_ticket(id));
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (opened_by = (select auth.uid()) and private.is_enrollment_member(enrollment_id));
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (private.can_manage_enrollment(enrollment_id) or opened_by = (select auth.uid()))
  with check (private.can_manage_enrollment(enrollment_id) or opened_by = (select auth.uid()));

create policy support_messages_select on public.support_messages for select to authenticated using (private.can_view_ticket(ticket_id));
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (author_id = (select auth.uid()) and private.can_view_ticket(ticket_id)
              and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.status <> 'closed'));

-- Quien no es del equipo solo puede cerrar su consulta (no cambiar asunto, privacidad ni estado a mano).
create function private.guard_ticket_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.can_manage_enrollment(old.enrollment_id)
     and current_setting('cep.support_trigger', true) is distinct from 'on'
     and (new.subject is distinct from old.subject or new.is_private is distinct from old.is_private
          or new.enrollment_id is distinct from old.enrollment_id or new.opened_by is distinct from old.opened_by
          or (new.status is distinct from old.status and new.status <> 'closed')) then
    raise exception 'Solo puedes cerrar tu consulta.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger support_tickets_guard before update on public.support_tickets
  for each row execute function private.guard_ticket_update();

-- Un mensaje mueve el estado y avisa al otro lado: al equipo con una tarea, a la pareja con un aviso.
create function private.on_support_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t public.support_tickets;
  v_staff boolean := private.is_staff_profile(new.author_id);
  v_coord uuid;
begin
  select * into t from public.support_tickets where id = new.ticket_id;
  perform set_config('cep.support_trigger', 'on', true);
  update public.support_tickets set status = case when v_staff then 'answered' else 'open' end, updated_at = now()
  where id = t.id;
  perform set_config('cep.support_trigger', 'off', true);

  if v_staff then
    insert into public.notifications (profile_id, enrollment_id, title, body, link)
    select m.profile_id, t.enrollment_id, 'Respondimos su consulta', t.subject, '/soporte'
    from public.enrollments e join public.client_unit_members m on m.unit_id = e.unit_id
    where e.id = t.enrollment_id and (not t.is_private or m.profile_id = t.opened_by);
  else
    select st.staff_profile_id into v_coord
    from public.enrollment_staff st join public.care_roles cr on cr.id = st.care_role_id
    where st.enrollment_id = t.enrollment_id and cr.key = 'coordinator' limit 1;
    insert into public.staff_tasks (enrollment_id, assignee_id, title, description, due_on, source, dedupe_key)
    values (t.enrollment_id, v_coord, format('Responder consulta: %s', t.subject), left(new.body, 500), current_date, 'automatic',
            'support:' || t.id || ':' || to_char(now(), 'YYYYMMDD'))
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end $$;
create trigger support_messages_after after insert on public.support_messages
  for each row execute function private.on_support_message();

create trigger support_tickets_audit after insert or update or delete on public.support_tickets
  for each row execute function private.audit();
