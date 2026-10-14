-- Endurecimiento de autorización (revisión de seguridad del primer commit).

-- 1. Miembros de una unidad: ventas solo puede añadir pacientes (no personal) a unidades sin inscripción
--    activa; cambiar o quitar miembros es solo de admin. Evita que alguien se añada a una pareja para ver sus datos.
drop policy client_unit_members_write on public.client_unit_members;
create policy client_unit_members_sales_insert on public.client_unit_members for insert to authenticated
  with check (
    private.has_role('sales')
    and not exists (select 1 from public.staff_roles sr where sr.profile_id = client_unit_members.profile_id)
    and (private.is_admin() or not exists (
      select 1 from public.enrollments e
      where e.unit_id = client_unit_members.unit_id and e.status in ('active', 'paused', 'completed'))));
create policy client_unit_members_admin on public.client_unit_members for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- 2. Inscripciones: ventas solo actualiza las que vendió; unidad, versión y fecha de inicio no se cambian
--    salvo admin (o sin sesión: seed / service role).
drop policy enrollments_update on public.enrollments;
create policy enrollments_update on public.enrollments for update to authenticated
  using (private.can_manage_enrollment(id) or (private.has_role('sales') and sold_by = (select auth.uid())))
  with check (private.can_manage_enrollment(id) or (private.has_role('sales') and sold_by = (select auth.uid())));

create function private.guard_enrollment_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin()
     and (new.unit_id is distinct from old.unit_id
          or new.service_version_id is distinct from old.service_version_id
          or new.starts_on is distinct from old.starts_on
          or new.sold_by is distinct from old.sold_by) then
    raise exception 'Solo un admin puede cambiar la unidad, la versión o el inicio de una inscripción.'
      using errcode = '42501';
  end if;
  return new;
end $$;
create trigger enrollments_identity_guard before update on public.enrollments
  for each row execute function private.guard_enrollment_identity();

-- Las filas copiadas no cambian de inscripción.
create function private.guard_enrollment_fk() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.enrollment_id is distinct from old.enrollment_id then
    raise exception 'No se puede mover un registro a otra inscripción.' using errcode = '42501';
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['enrollment_activities','enrollment_steps','enrollment_requirements','enrollment_sessions'] loop
    execute format('create trigger %I before update on public.%I for each row execute function private.guard_enrollment_fk()',
                   t || '_enrollment_guard', t);
  end loop;
end $$;

-- 3. Borradores de respuestas: al editar se exigen las mismas condiciones que al crear,
--    y autor, inscripción, actividad y ámbito no cambian.
drop policy form_submissions_update on public.form_submissions;
create policy form_submissions_update on public.form_submissions for update to authenticated
  using (status = 'draft' and (submitted_by = (select auth.uid())
         or (response_scope = 'shared' and private.is_enrollment_member(enrollment_id))))
  with check (private.is_enrollment_member(enrollment_id)
              and private.can_see_activity(enrollment_activity_id)
              and (response_scope = 'shared' or submitted_by = (select auth.uid())));

create or replace function private.guard_submission() returns trigger
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
  if new.submitted_by is distinct from old.submitted_by
     or new.enrollment_id is distinct from old.enrollment_id
     or new.enrollment_activity_id is distinct from old.enrollment_activity_id
     or new.response_scope is distinct from old.response_scope then
    raise exception 'No se puede cambiar el autor, la inscripción, la actividad ni el ámbito de una respuesta.'
      using errcode = '42501';
  end if;
  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;

-- 4. Firmas: la evidencia la pone el servidor (fecha, IP, user agent) y la plantilla debe ser la del
--    contrato de esa inscripción. El cliente no puede retrofechar ni firmar otra plantilla.
create function private.stamp_signature() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
begin
  if auth.uid() is not null then
    new.signed_at := now();
    new.provider := 'in_app';
    new.provider_ref := null;
    new.ip := nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), '')::inet;
    new.user_agent := v_headers ->> 'user-agent';
    if not exists (select 1 from public.enrollment_activities ea
                   where ea.enrollment_id = new.enrollment_id and ea.type = 'contract'
                     and ea.contract_template_id = new.contract_template_id) then
      raise exception 'Esa plantilla de contrato no corresponde a esta inscripción.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger contract_signatures_stamp before insert on public.contract_signatures
  for each row execute function private.stamp_signature();

-- 5. Progreso: al actualizar se vuelve a comprobar el acceso a la actividad, y no se puede reapuntar.
drop policy activity_progress_own_update on public.activity_progress;
create policy activity_progress_own_update on public.activity_progress for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()) and private.can_see_activity(enrollment_activity_id));

create function private.guard_progress_target() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.enrollment_activity_id is distinct from old.enrollment_activity_id
     or new.profile_id is distinct from old.profile_id then
    raise exception 'No se puede reasignar un registro de progreso.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger activity_progress_target_guard before update on public.activity_progress
  for each row execute function private.guard_progress_target();

-- 6. Preguntas del coaching: la inscripción indicada debe ser del autor.
drop policy group_questions_insert on public.group_session_questions;
create policy group_questions_insert on public.group_session_questions for insert to authenticated
  with check (profile_id = (select auth.uid())
              and (enrollment_id is null or private.is_enrollment_member(enrollment_id))
              and exists (select 1 from public.group_sessions g
                          where g.id = group_session_id and private.is_group_program_member(g.program_id)));

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
