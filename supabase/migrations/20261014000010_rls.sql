-- Seguridad a nivel de fila.
-- Paciente: solo sus inscripciones; respuestas individuales solo las ve su autor; sesiones individuales
--           (member_1 / member_2) solo muestran detalle a su persona.
-- Clínico: inscripciones donde está asignado (enrollment_staff), incluidas notas clínicas.
-- Asistente: datos operativos de todas las inscripciones, sin notas ni respuestas individuales.
-- Ventas: crear unidades e inscripciones. Admin: todo.

-- ---------------------------------------------------------------- helpers
create function private.is_unit_member(p_unit uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.client_unit_members where unit_id = p_unit and profile_id = auth.uid());
$$;

create function private.is_enrollment_member(p_enrollment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments e
                 join public.client_unit_members m on m.unit_id = e.unit_id
                 where e.id = p_enrollment and m.profile_id = auth.uid());
$$;

create function private.is_enrollment_staff(p_enrollment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollment_staff
                 where enrollment_id = p_enrollment and staff_profile_id = auth.uid());
$$;

create function private.is_assigned_clinician(p_enrollment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_enrollment_staff(p_enrollment)
     and exists (select 1 from public.staff_roles where profile_id = auth.uid() and role = 'clinician');
$$;

create function private.can_access_enrollment(p_enrollment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
      or private.is_enrollment_member(p_enrollment)
      or private.is_enrollment_staff(p_enrollment)
      or exists (select 1 from public.staff_roles where profile_id = auth.uid() and role = 'assistant')
      or exists (select 1 from public.enrollments where id = p_enrollment and sold_by = auth.uid());
$$;

-- Puede gestionar (escribir) la inscripción: admin, clínico asignado o asistente.
create function private.can_manage_enrollment(p_enrollment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
      or private.is_enrollment_staff(p_enrollment)
      or exists (select 1 from public.staff_roles where profile_id = auth.uid() and role = 'assistant');
$$;

create function private.my_member_index(p_enrollment uuid) returns smallint
language sql stable security definer set search_path = '' as $$
  select m.member_index from public.enrollments e
  join public.client_unit_members m on m.unit_id = e.unit_id
  where e.id = p_enrollment and m.profile_id = auth.uid();
$$;

-- ¿Puedo ver el detalle de una actividad? (sesión individual de la otra persona: no)
create function private.can_see_activity(p_activity uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollment_activities ea
    where ea.id = p_activity
      and (private.can_manage_enrollment(ea.enrollment_id)
           or (private.is_enrollment_member(ea.enrollment_id) and not ea.hidden
               and (ea.participants in ('all', 'each_member')
                    or (ea.participants = 'member_1' and private.my_member_index(ea.enrollment_id) = 1)
                    or (ea.participants = 'member_2' and private.my_member_index(ea.enrollment_id) = 2)))));
$$;

create function private.can_access_activity(p_activity uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.can_access_enrollment(enrollment_id) from public.enrollment_activities where id = p_activity;
$$;

create function private.can_view_submission_row(p_enrollment uuid, p_scope public.response_scope, p_by uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select p_by = auth.uid()
      or private.is_admin()
      or private.is_assigned_clinician(p_enrollment)
      or (p_scope = 'shared' and (private.is_enrollment_member(p_enrollment)
          or exists (select 1 from public.staff_roles where profile_id = auth.uid() and role = 'assistant')));
$$;

create function private.can_view_submission(p_submission uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.can_view_submission_row(enrollment_id, response_scope, submitted_by)
  from public.form_submissions where id = p_submission;
$$;

create function private.is_enrolled_in_version(p_version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments e
                 join public.client_unit_members m on m.unit_id = e.unit_id
                 where e.service_version_id = p_version and m.profile_id = auth.uid());
$$;

create function private.is_enrolled_in_service(p_service uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments e
                 join public.service_versions v on v.id = e.service_version_id
                 join public.client_unit_members m on m.unit_id = e.unit_id
                 where v.service_id = p_service and m.profile_id = auth.uid()
                   and e.status in ('invited', 'active', 'paused', 'completed'));
$$;

create function private.is_group_program_member(p_program uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.service_group_programs sg
                 where sg.group_program_id = p_program and private.is_enrolled_in_service(sg.service_id));
$$;

create function private.can_view_resource(p_resource uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.resources r
    where r.id = p_resource and r.archived_at is null
      and (private.is_staff()
           or ((r.visible_from is null or r.visible_from <= now()) and (
                (r.attach_type = 'activity' and private.can_see_activity(r.attach_id))
             or (r.attach_type = 'group_session' and exists (
                   select 1 from public.group_sessions g
                   where g.id = r.attach_id and private.is_group_program_member(g.program_id)))
             or (r.attach_type = 'enrollment_session' and exists (
                   select 1 from public.enrollment_sessions s
                   where s.id = r.attach_id and private.can_see_activity(s.enrollment_activity_id)))))));
$$;

create function private.can_view_asset(p_asset uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff()
      or exists (select 1 from public.enrollment_activities ea
                 where ea.asset_id = p_asset and private.can_see_activity(ea.id))
      or exists (select 1 from public.resources r
                 where r.asset_id = p_asset and private.can_view_resource(r.id))
      or exists (select 1 from public.group_sessions g
                 where g.recording_asset_id = p_asset and private.is_group_program_member(g.program_id))
      or exists (select 1 from public.service_versions v
                 join public.service_activities a on a.id = v.welcome_activity_id
                 where a.asset_id = p_asset and private.is_enrolled_in_version(v.id));
$$;

create function private.can_view_file(p_file uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.files f where f.id = p_file and f.uploaded_by = auth.uid())
      or private.is_admin()
      or exists (select 1 from public.submission_files sf
                 where sf.file_id = p_file and private.can_view_submission(sf.submission_id))
      or exists (select 1 from public.contract_signatures cs
                 where cs.signed_file_id = p_file and private.can_access_enrollment(cs.enrollment_id));
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------- activar RLS en todo public
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- personas y roles
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid()) or private.is_staff()
  or exists (select 1 from public.staff_members sm where sm.profile_id = profiles.id)
  or exists (select 1 from public.client_unit_members a join public.client_unit_members b on a.unit_id = b.unit_id
             where a.profile_id = (select auth.uid()) and b.profile_id = profiles.id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or private.is_admin()) with check (id = (select auth.uid()) or private.is_admin());

create policy staff_members_select on public.staff_members for select to authenticated using (true);
create policy staff_members_admin on public.staff_members for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy staff_roles_select on public.staff_roles for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_admin());
create policy staff_roles_admin on public.staff_roles for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy care_roles_select on public.care_roles for select to authenticated using (true);
create policy care_roles_admin on public.care_roles for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy client_units_select on public.client_units for select to authenticated
  using (private.is_unit_member(id) or private.is_staff());
create policy client_units_write on public.client_units for all to authenticated
  using (private.has_role('sales')) with check (private.has_role('sales'));

create policy client_unit_members_select on public.client_unit_members for select to authenticated
  using (private.is_unit_member(unit_id) or private.is_staff());
create policy client_unit_members_write on public.client_unit_members for all to authenticated
  using (private.has_role('sales')) with check (private.has_role('sales'));

-- ---------------------------------------------------------------- catálogo (lo edita admin)
create policy services_select on public.services for select to authenticated
  using (private.is_staff() or private.is_enrolled_in_service(id));
create policy service_versions_select on public.service_versions for select to authenticated
  using (private.is_staff() or private.is_enrolled_in_version(id));

do $$
declare t text;
begin
  foreach t in array array['services','service_versions','service_blocks','service_tracks','service_activities',
                           'service_steps','service_requirements','service_reminder_rules','service_followups',
                           'forms','group_programs','service_group_programs'] loop
    execute format('create policy %I on public.%I for all to authenticated
                    using (private.is_admin()) with check (private.is_admin())', t || '_admin', t);
  end loop;
  foreach t in array array['service_blocks','service_tracks','service_activities','service_steps',
                           'service_requirements','service_reminder_rules','service_followups'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_staff())',
                   t || '_staff_select', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- contenidos
create policy content_assets_select on public.content_assets for select to authenticated
  using (private.can_view_asset(id));
create policy content_assets_admin on public.content_assets for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy forms_select on public.forms for select to authenticated using (
  private.is_staff() or exists (
    select 1 from public.form_versions fv join public.enrollment_activities ea on ea.form_version_id = fv.id
    where fv.form_id = forms.id and private.is_enrollment_member(ea.enrollment_id)));

create policy form_versions_select on public.form_versions for select to authenticated using (
  private.is_staff() or exists (
    select 1 from public.enrollment_activities ea
    where ea.form_version_id = form_versions.id and private.can_see_activity(ea.id)));
create policy form_versions_admin on public.form_versions for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy contract_templates_select on public.contract_templates for select to authenticated using (
  private.is_staff() or exists (
    select 1 from public.enrollment_activities ea
    where ea.contract_template_id = contract_templates.id and private.is_enrollment_member(ea.enrollment_id)));
create policy contract_templates_admin on public.contract_templates for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy resources_select on public.resources for select to authenticated
  using (private.can_view_resource(id));
create policy resources_write on public.resources for all to authenticated
  using (private.has_role('clinician') or private.has_role('assistant'))
  with check (private.has_role('clinician') or private.has_role('assistant'));

-- ---------------------------------------------------------------- inscripciones
create policy enrollments_select on public.enrollments for select to authenticated
  using (private.can_access_enrollment(id));
create policy enrollments_insert on public.enrollments for insert to authenticated
  with check (private.has_role('sales'));
create policy enrollments_update on public.enrollments for update to authenticated
  using (private.can_manage_enrollment(id) or private.has_role('sales'))
  with check (private.can_manage_enrollment(id) or private.has_role('sales'));

create policy enrollment_staff_select on public.enrollment_staff for select to authenticated
  using (private.can_access_enrollment(enrollment_id));
create policy enrollment_staff_admin on public.enrollment_staff for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

do $$
declare t text;
begin
  foreach t in array array['enrollment_activities','enrollment_steps'] loop
    execute format('create policy %I on public.%I for select to authenticated
                    using (private.can_access_enrollment(enrollment_id) and (not hidden or private.is_staff()))',
                   t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (private.can_manage_enrollment(enrollment_id))
                    with check (private.can_manage_enrollment(enrollment_id))', t || '_manage', t);
  end loop;
end $$;

create policy enrollment_requirements_select on public.enrollment_requirements for select to authenticated
  using (private.can_access_enrollment(enrollment_id));
create policy enrollment_requirements_manage on public.enrollment_requirements for all to authenticated
  using (private.can_manage_enrollment(enrollment_id)) with check (private.can_manage_enrollment(enrollment_id));

create policy activity_progress_select on public.activity_progress for select to authenticated
  using (private.can_access_activity(enrollment_activity_id));
create policy activity_progress_own on public.activity_progress for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.can_see_activity(enrollment_activity_id));
create policy activity_progress_own_update on public.activity_progress for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy activity_progress_staff on public.activity_progress for all to authenticated
  using (exists (select 1 from public.enrollment_activities ea
                 where ea.id = enrollment_activity_id and private.can_manage_enrollment(ea.enrollment_id)))
  with check (exists (select 1 from public.enrollment_activities ea
                      where ea.id = enrollment_activity_id and private.can_manage_enrollment(ea.enrollment_id)));

create policy staff_task_progress_select on public.staff_task_progress for select to authenticated
  using (private.can_access_activity(enrollment_activity_id));
create policy staff_task_progress_manage on public.staff_task_progress for all to authenticated
  using (exists (select 1 from public.enrollment_activities ea
                 where ea.id = enrollment_activity_id and private.can_manage_enrollment(ea.enrollment_id)))
  with check (exists (select 1 from public.enrollment_activities ea
                      where ea.id = enrollment_activity_id and private.can_manage_enrollment(ea.enrollment_id)));

-- ---------------------------------------------------------------- respuestas, archivos, firmas
create policy files_select on public.files for select to authenticated using (private.can_view_file(id));
create policy files_insert on public.files for insert to authenticated with check (uploaded_by = (select auth.uid()));

create policy form_submissions_select on public.form_submissions for select to authenticated
  using (private.can_view_submission_row(enrollment_id, response_scope, submitted_by));
create policy form_submissions_insert on public.form_submissions for insert to authenticated
  with check (submitted_by = (select auth.uid())
              and private.is_enrollment_member(enrollment_id)
              and private.can_see_activity(enrollment_activity_id)
              and exists (select 1 from public.enrollment_activities ea
                          where ea.id = enrollment_activity_id and ea.enrollment_id = form_submissions.enrollment_id
                            and ea.response_scope = form_submissions.response_scope));
create policy form_submissions_update on public.form_submissions for update to authenticated
  using (status = 'draft' and (submitted_by = (select auth.uid())
         or (response_scope = 'shared' and private.is_enrollment_member(enrollment_id))))
  with check (response_scope = 'individual' and submitted_by = (select auth.uid())
              or response_scope = 'shared' and private.is_enrollment_member(enrollment_id));
create policy form_submissions_delete on public.form_submissions for delete to authenticated
  using (status = 'draft' and submitted_by = (select auth.uid()));

create policy submission_participants_select on public.submission_participants for select to authenticated
  using (private.can_view_submission(submission_id));
create policy submission_participants_insert on public.submission_participants for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.can_view_submission(submission_id));

create policy submission_files_select on public.submission_files for select to authenticated
  using (private.can_view_submission(submission_id));
create policy submission_files_insert on public.submission_files for insert to authenticated
  with check (private.can_view_submission(submission_id)
              and exists (select 1 from public.files f where f.id = file_id and f.uploaded_by = (select auth.uid())));

create policy contract_signatures_select on public.contract_signatures for select to authenticated
  using (private.can_access_enrollment(enrollment_id));
create policy contract_signatures_insert on public.contract_signatures for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.is_enrollment_member(enrollment_id));

create policy shared_form_invites_staff on public.shared_form_invites for select to authenticated
  using (private.is_staff());

-- ---------------------------------------------------------------- sesiones y grupos
create policy enrollment_sessions_select on public.enrollment_sessions for select to authenticated
  using (private.can_access_enrollment(enrollment_id));
create policy enrollment_sessions_request on public.enrollment_sessions for insert to authenticated
  with check (status = 'requested' and private.can_see_activity(enrollment_activity_id)
              and private.is_enrollment_member(enrollment_id));
create policy enrollment_sessions_manage on public.enrollment_sessions for all to authenticated
  using (private.can_manage_enrollment(enrollment_id)) with check (private.can_manage_enrollment(enrollment_id));

create policy session_agenda_items_select on public.session_agenda_items for select to authenticated
  using (private.can_see_activity(enrollment_activity_id));
create policy session_agenda_items_manage on public.session_agenda_items for all to authenticated
  using (exists (select 1 from public.enrollment_activities ea
                 where ea.id = enrollment_activity_id and (private.is_admin() or private.is_enrollment_staff(ea.enrollment_id))))
  with check (exists (select 1 from public.enrollment_activities ea
                      where ea.id = enrollment_activity_id and (private.is_admin() or private.is_enrollment_staff(ea.enrollment_id))));

create policy session_notes_clinical on public.session_notes for all to authenticated
  using (exists (select 1 from public.enrollment_sessions s
                 where s.id = enrollment_session_id
                   and (private.is_admin() or private.is_assigned_clinician(s.enrollment_id))))
  with check (author_id = (select auth.uid()) and exists (
                 select 1 from public.enrollment_sessions s
                 where s.id = enrollment_session_id
                   and (private.is_admin() or private.is_assigned_clinician(s.enrollment_id))));

create policy group_programs_select on public.group_programs for select to authenticated
  using (private.is_staff() or private.is_group_program_member(id));
create policy service_group_programs_select on public.service_group_programs for select to authenticated
  using (private.is_staff() or private.is_enrolled_in_service(service_id));

create policy group_sessions_select on public.group_sessions for select to authenticated
  using (private.is_staff() or private.is_group_program_member(program_id));
create policy group_sessions_staff on public.group_sessions for all to authenticated
  using (private.is_staff()) with check (private.is_staff());

create policy group_attendance_select on public.group_session_attendance for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_staff());
create policy group_attendance_staff on public.group_session_attendance for all to authenticated
  using (private.is_staff()) with check (private.is_staff());

create policy group_questions_select on public.group_session_questions for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_staff());
create policy group_questions_insert on public.group_session_questions for insert to authenticated
  with check (profile_id = (select auth.uid()) and exists (
    select 1 from public.group_sessions g
    where g.id = group_session_id and private.is_group_program_member(g.program_id)));
create policy group_questions_staff on public.group_session_questions for update to authenticated
  using (private.is_staff()) with check (private.is_staff());

create policy resource_downloads_insert on public.resource_downloads for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.can_view_resource(resource_id));
create policy resource_downloads_select on public.resource_downloads for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_staff());

-- ---------------------------------------------------------------- operación
create policy notifications_own on public.notifications for select to authenticated
  using (profile_id = (select auth.uid()));
create policy notifications_read on public.notifications for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy notifications_staff on public.notifications for insert to authenticated
  with check (private.is_staff());

create policy outbound_messages_staff on public.outbound_messages for select to authenticated
  using (private.is_staff());
create policy staff_tasks_staff on public.staff_tasks for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy pre_session_reports_clinical on public.pre_session_reports for all to authenticated
  using (private.is_admin() or private.is_assigned_clinician(enrollment_id))
  with check (private.is_admin() or private.is_assigned_clinician(enrollment_id));
create policy audit_log_admin on public.audit_log for select to authenticated using (private.is_admin());
-- action_tokens: sin políticas → solo service role (Edge Functions).

-- Las vistas del motor se exponen solo a usuarios autenticados.
revoke all on public.v_requirement_status, public.v_activity_state, public.v_step_state,
              public.v_track_progress, public.v_enrollment_state, public.v_group_progress from anon;
