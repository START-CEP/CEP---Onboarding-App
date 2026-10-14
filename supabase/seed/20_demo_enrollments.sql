-- Datos de demo: Pedro y Andrea en el paso 9 del proceso de pareja (igual que la maqueta),
-- y Mónica en terapia individual. Solo local.

do $$
declare
  pedro  uuid := 'b0000000-0000-4000-8000-000000000001';
  andrea uuid := 'b0000000-0000-4000-8000-000000000002';
  monica uuid := 'b0000000-0000-4000-8000-000000000003';
  emilia uuid := 'a0000000-0000-4000-8000-000000000002';
  psico  uuid := 'a0000000-0000-4000-8000-000000000003';
  diego  uuid := 'a0000000-0000-4000-8000-000000000004';
  yasna  uuid := 'a0000000-0000-4000-8000-000000000005';
  u_pa uuid := '0a000000-0000-4000-8000-000000000001';
  u_mo uuid := '0a000000-0000-4000-8000-000000000002';
  e uuid;
  s1 uuid;
  i int;
  s_staff uuid[];
begin
  insert into public.client_units (id, kind, display_name) values
    (u_pa, 'couple', 'Pedro y Andrea'),
    (u_mo, 'individual', 'Mónica Vidal');
  insert into public.client_unit_members (unit_id, profile_id, member_index) values
    (u_pa, pedro, 1), (u_pa, andrea, 2), (u_mo, monica, 1);

  e := public.enroll_unit(u_pa, '5e100000-0000-4000-8000-000000000001', date '2026-09-01',
         jsonb_build_object('lead_therapist', emilia, 'psychologist', psico,
                            'disc_specialist', diego, 'coordinator', yasna));

  -- Pasos 1–2: entrevista y onboarding hechos por el equipo
  update public.staff_task_progress set done_at = timestamptz '2026-09-01 10:00', done_by = yasna
  where enrollment_activity_id in (select id from public.enrollment_activities where enrollment_id = e and type = 'staff_task');

  -- Contrato firmado por ambos
  insert into public.contract_signatures (enrollment_id, contract_template_id, profile_id, signed_at, signer_name)
  select e, ea.contract_template_id, p.id, timestamptz '2026-09-02 09:00', p.full_name
  from public.enrollment_activities ea, public.profiles p
  where ea.enrollment_id = e and ea.key = 'CON' and p.id in (pedro, andrea);

  -- Bienvenida y módulos 0–3 vistos por ambos
  insert into public.activity_progress (enrollment_activity_id, profile_id, status, started_at, completed_at)
  select ea.id, p.id, 'completed', ea.suggested_on, ea.suggested_on + 1
  from public.enrollment_activities ea, public.profiles p
  where ea.enrollment_id = e and ea.key in ('WEL', 'M0', 'M1', 'M2', 'M3') and p.id in (pedro, andrea);

  -- Radiografía: parte individual de cada uno + parte en pareja
  insert into public.form_submissions (enrollment_id, enrollment_activity_id, form_version_id, response_scope, submitted_by, answers, status)
  select e, ea.id, ea.form_version_id, 'individual', p.id,
         case when p.id = pedro
              then '{"edad": 44, "ocupacion": "Empresario", "como_te_sientes": 5, "inicio": "Nos conocimos en la agencia."}'
              else '{"edad": 39, "ocupacion": "Diseñadora gráfica", "como_te_sientes": 4, "inicio": "Empezamos trabajando juntos."}' end::jsonb,
         'submitted'
  from public.enrollment_activities ea, public.profiles p
  where ea.enrollment_id = e and ea.key = 'RAD_IND' and p.id in (pedro, andrea);

  with sub as (
    insert into public.form_submissions (enrollment_id, enrollment_activity_id, form_version_id, response_scope, submitted_by, answers, status)
    select e, ea.id, ea.form_version_id, 'shared', pedro,
           '{"distinto": "Poder hablar de decisiones de trabajo sin terminar discutiendo.", "conexion": 5,
             "temas": ["Comunicación", "Acuerdos", "Trabajo y pareja", "Valoración"]}'::jsonb, 'submitted'
    from public.enrollment_activities ea where ea.enrollment_id = e and ea.key = 'RAD_PAR'
    returning id)
  insert into public.submission_participants (submission_id, profile_id, confirmed_at)
  select sub.id, p, now() from sub, unnest(array[pedro, andrea]) p;

  -- Tareas de los módulos 0–2 entregadas por ambos (la del Módulo 3 falta)
  insert into public.form_submissions (enrollment_id, enrollment_activity_id, form_version_id, response_scope, submitted_by, answers, status)
  select e, ea.id, ea.form_version_id, 'individual', p.id,
         jsonb_build_object('reflexion', case when p.id = pedro
           then 'Cuando discutimos cierro el tema rápido, con datos.'
           else 'Respondo antes de pensarlo y después me arrepiento.' end, 'identifica', 4),
         'submitted'
  from public.enrollment_activities ea, public.profiles p
  where ea.enrollment_id = e and ea.key in ('M0', 'M1', 'M2') and p.id in (pedro, andrea);

  -- Sesiones S1–S4 hechas
  s_staff := array[emilia, psico, psico, diego];
  for i in 1..4 loop
    insert into public.enrollment_sessions (enrollment_id, enrollment_activity_id, scheduled_at, staff_profile_id, status)
    select e, ea.id, (date '2026-09-02' + 7 * i) + time '18:00', s_staff[i], 'completed'
    from public.enrollment_activities ea where ea.enrollment_id = e and ea.key = 'S' || i;
  end loop;

  select s.id into s1 from public.enrollment_sessions s
  join public.enrollment_activities ea on ea.id = s.enrollment_activity_id
  where s.enrollment_id = e and ea.key = 'S1';
  insert into public.session_notes (enrollment_session_id, author_id, body)
  values (s1, emilia, 'Notas clínicas de la S1 (demo): metas acordadas y lectura de la radiografía.');

  -- "Qué veremos": S5 (de la pareja) y S2 (individual de Pedro, Andrea no debe verla)
  insert into public.session_agenda_items (enrollment_activity_id, body, position, created_by)
  select ea.id, x.body, x.pos, emilia
  from public.enrollment_activities ea
  join (values ('S5', 'Definir por primera vez su ciclo negativo', 1),
               ('S5', 'Conectar el ciclo con lo que vieron en el DISC', 2),
               ('S2', 'Historia de vida de Pedro: familia de origen', 1)) x(k, body, pos) on x.k = ea.key
  where ea.enrollment_id = e;

  -- Coaching grupal: asistieron a los dos primeros y Pedro dejó una pregunta para el tercero
  insert into public.group_session_attendance (group_session_id, profile_id)
  select g.id, p from public.group_sessions g, unnest(array[pedro, andrea]) p where g.status = 'completed';
  insert into public.group_session_questions (group_session_id, enrollment_id, profile_id, body)
  select g.id, e, pedro, '¿Cómo pedir una pausa sin que la otra persona lo sienta como rechazo?'
  from public.group_sessions g where g.status = 'scheduled' order by g.scheduled_at limit 1;

  -- Mónica: terapia individual con Emilia como responsable (la psicóloga no está asignada)
  perform public.enroll_unit(u_mo, '5e100000-0000-4000-8000-000000000002', date '2026-10-01',
                             jsonb_build_object('psychologist', emilia));
end $$;
