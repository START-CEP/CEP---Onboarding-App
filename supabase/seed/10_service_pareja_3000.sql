-- Plantilla: Proceso de pareja $3.000 (documento "Camino 1 · Arquitectura por pasos", Emilia, 14 oct 2026).
-- 14 pasos (el 1 es el formulario de onboarding) · 10 sesiones (Emilia S1/S5/S8, psicóloga S2/S3/S6/S7/S9/S10, Diego S4) · 9 módulos (0–8).
-- Es solo datos: el mismo motor sirve para cualquier otro servicio.

do $$
declare
  v_service uuid := '5e000000-0000-4000-8000-000000000001';
  v_version uuid := '5e100000-0000-4000-8000-000000000001';
  r_lead uuid := (select id from public.care_roles where key = 'lead_therapist');
  r_psy  uuid := (select id from public.care_roles where key = 'psychologist');
  r_disc uuid := (select id from public.care_roles where key = 'disc_specialist');
  r_coord uuid := (select id from public.care_roles where key = 'coordinator');
  b uuid[];          -- bloques
  t_ini uuid; t_mod uuid; t_ter uuid; t_cg uuid;
  f_onb uuid; f_rad_ind uuid; f_rad_par uuid; f_task uuid;
  c_tpl uuid;
  a_welcome uuid;
  i int;
  mod_titles text[] := array['Responsabilidad y validación emocional','Historia de vida','Lo que cada uno trae a la relación',
    'Personalidad: por qué somos distintos','El ciclo negativo','Puntos sensibles','Necesidades profundas',
    'Plan de acción y frases poderosas','Heridas'];
  mod_offset int[] := array[0, 7, 14, 21, 35, 49, 63, 77, 91];
  -- Sesiones: título, rol, participantes, offset (días), ritmo sugerido (días)
  s_title text[] := array['Devolución de la Radiografía Inicial','Historia de vida · persona 1','Historia de vida · persona 2',
    'DISC: entender la personalidad','Definir el ciclo negativo','El ciclo desde los puntos sensibles',
    'El ciclo desde las necesidades profundas','Plan de acción y frases poderosas','Heridas','Metas y cierre del proceso'];
  s_summary text[] := array[
    'Devolución de la Radiografía Inicial, explicación del proceso, metas y qué se va a trabajar',
    'Sesión individual de la persona 1: historia de vida',
    'Sesión individual de la persona 2: historia de vida',
    'DISC: entender la personalidad de cada uno',
    'Se define por primera vez el ciclo negativo',
    'Profundizar el ciclo negativo desde los puntos sensibles',
    'Profundizar el ciclo negativo desde las necesidades profundas',
    'Plan de acción, hasta las frases poderosas',
    'Heridas',
    'Metas y cierre del proceso'];
  s_role text[] := array['lead','psy','psy','disc','lead','psy','psy','lead','psy','psy'];
  s_part public.participants[] := array['all','member_1','member_2','all','all','all','all','all','all','all']::public.participants[];
  s_offset int[] := array[7, 14, 21, 28, 42, 56, 70, 84, 98, 112];
  s_gap int[] := array[null, 7, 7, 7, 14, 14, 14, 14, 14, 14];
  s_block int[] := array[1, 2, 2, 2, 3, 3, 3, 4, 4, 5];
  st uuid;
  a_res uuid;
begin
  insert into public.services (id, slug, name, description, unit_kind, price_cents, currency)
  values (v_service, 'proceso-pareja', 'Proceso de pareja',
          'Proceso original de terapia de pareja en 14 pasos.', 'couple', 300000, 'USD');

  insert into public.service_versions (id, service_id, version, expected_duration_days, access_days, notes)
  values (v_version, v_service, 1, 120, 180, 'Basado en el documento de Emilia del 14 oct 2026.');

  -- Bloques (nombre "Ciclo" pendiente de definir)
  with ins as (
    insert into public.service_blocks (version_id, name, position, color)
    select v_version, n, p, c from (values ('Inicio',1,'#43D3C7'),('Ciclo 1',2,'#7A5AF8'),('Ciclo 2',3,'#0C8F8C'),
                                           ('Ciclo 3',4,'#E8A21E'),('Cierre',5,'#E0662E')) x(n,p,c)
    returning id, position)
  select array_agg(id order by position) into b from ins;

  insert into public.service_tracks (version_id, key, name, position) values
    (v_version, 'inicio', 'Inicio', 1) returning id into t_ini;
  insert into public.service_tracks (version_id, key, name, position) values
    (v_version, 'modulos', 'Módulos', 2) returning id into t_mod;
  insert into public.service_tracks (version_id, key, name, position) values
    (v_version, 'terapia', 'Sesiones de Terapia', 3) returning id into t_ter;
  insert into public.service_tracks (version_id, key, name, position) values
    (v_version, 'coaching', 'Coaching Grupal', 4) returning id into t_cg;

  -- Formularios
  insert into public.forms (key, name, kind) values ('onboarding_pareja', 'Formulario de onboarding', 'profile')
    on conflict (key) do nothing;
  insert into public.form_versions (form_id, version, schema, published_at)
  select id, 1, '{
    "sections": [
      {"key": "sobre_ti", "title": "Sobre ti", "scope": "individual", "questions": [
        {"key": "nombre_preferido", "type": "text", "label": "¿Cómo prefieres que te llamemos?"},
        {"key": "whatsapp", "type": "text", "label": "Tu WhatsApp (con código de país)"},
        {"key": "pais", "type": "text", "label": "¿Desde qué país y ciudad te conectas?"}]},
      {"key": "como_llegan", "title": "Cómo llegaste", "scope": "individual", "questions": [
        {"key": "como_conociste", "type": "single_choice", "label": "¿Cómo conociste Creciendo en Pareja?",
         "options": ["Instagram", "YouTube", "Recomendación", "Google", "Otro"]},
        {"key": "por_que_ahora", "type": "textarea", "label": "¿Qué te hizo decidir empezar el proceso ahora?"}]},
      {"key": "expectativas", "title": "Lo que esperas", "scope": "individual", "questions": [
        {"key": "que_esperas", "type": "textarea", "label": "¿Qué esperas que cambie al terminar el proceso?"},
        {"key": "dudas", "type": "textarea", "label": "¿Hay algo del proceso que te preocupe o te genere dudas?"},
        {"key": "compromiso", "type": "scale", "label": "¿Qué tan comprometido o comprometida te sientes hoy con el proceso?", "min": 1, "max": 10}]},
      {"key": "logistica", "title": "Tus horarios", "scope": "individual", "questions": [
        {"key": "horarios", "type": "multi_choice", "label": "¿En qué horarios te queda mejor tener las sesiones?",
         "options": ["Mañanas", "Mediodía", "Tardes", "Noches", "Fines de semana"]}]}
    ]}'::jsonb, now()
  from public.forms where key = 'onboarding_pareja'
  returning id into f_onb;
  insert into public.forms (key, name, kind) values ('radiografia_individual', 'Radiografía Inicial · individual', 'intake')
    on conflict (key) do nothing;
  insert into public.forms (key, name, kind) values ('radiografia_pareja', 'Radiografía Inicial · en pareja', 'intake')
    on conflict (key) do nothing;
  insert into public.form_versions (form_id, version, schema, published_at)
  select id, 1, '{
    "sections": [
      {"key": "sobre_ti", "title": "Sobre ti", "scope": "individual", "questions": [
        {"key": "edad", "type": "number", "label": "Edad"},
        {"key": "ocupacion", "type": "text", "label": "Ocupación"},
        {"key": "como_te_sientes", "type": "scale", "label": "¿Cómo te sientes en la relación hoy?", "min": 1, "max": 10}]},
      {"key": "historia", "title": "Tu historia de pareja", "scope": "individual", "questions": [
        {"key": "inicio", "type": "textarea", "label": "¿Cómo empezó la relación?"},
        {"key": "terapia_previa", "type": "single_choice", "label": "¿Han ido antes a terapia?", "options": ["Sí", "No"]}]}
    ]}'::jsonb, now()
  from public.forms where key = 'radiografia_individual'
  returning id into f_rad_ind;
  insert into public.form_versions (form_id, version, schema, published_at)
  select id, 1, '{
    "sections": [
      {"key": "motivo", "title": "Lo que les trae aquí", "scope": "shared", "questions": [
        {"key": "distinto", "type": "textarea", "label": "¿Qué les gustaría que fuera distinto al terminar el proceso?"},
        {"key": "conexion", "type": "scale", "label": "Hoy, ¿qué tan conectados se sienten?", "min": 1, "max": 10},
        {"key": "temas", "type": "multi_choice", "label": "¿En qué temas quieren trabajar?",
         "options": ["Comunicación", "Acuerdos", "Trabajo y pareja", "Valoración", "Intimidad", "Familia", "Dinero"]}]},
      {"key": "metas", "title": "Sus metas", "scope": "shared", "questions": [
        {"key": "metas", "type": "textarea", "label": "Escriban sus tres metas para el proceso"}]}
    ]}'::jsonb, now()
  from public.forms where key = 'radiografia_pareja'
  returning id into f_rad_par;

  -- Contrato
  insert into public.contract_templates (service_id, version, title, body_md, summary_points, published_at)
  values (v_service, 1, 'Contrato · Proceso de pareja', '# Contrato\n\n(Texto legal pendiente.)',
    '[{"title":"Qué incluye","body":"10 sesiones de terapia (3 con Emilia, 6 con la psicóloga, 1 con Diego), 9 módulos en video y coaching grupal."},
      {"title":"Cómo avanzan","body":"14 pasos; cada uno tiene un requisito para entrar. El avance clínico lo marca Emilia en sesión."},
      {"title":"Confidencialidad","body":"Sus respuestas individuales no las ve su pareja."},
      {"title":"Su compromiso","body":"Ver los módulos antes de la sesión que los requiere y entregar las tareas."},
      {"title":"Cambios de fecha","body":"Reprogramar con 24 horas de aviso."}]'::jsonb, now())
  returning id into c_tpl;

  -- Actividades del Inicio
  insert into public.service_activities (version_id, track_id, key, type, title, summary, responsible_role_id, position, suggested_offset_days, config)
  values
   (v_version, t_ini, 'ENT', 'staff_task', 'Entrevista de claridad', 'Entrevista de claridad y cierre', r_coord, 1, -3,
    '{"checklist":[{"key":"entrevista","label":"Entrevista de claridad y cierre","due_days":0},
                   {"key":"compra","label":"Compra confirmada","due_days":0}]}'),
   (v_version, t_ini, 'ONB', 'staff_task', 'Onboarding', 'Contrato · accesos · grupo de WhatsApp · perfil · cuestionarios', r_coord, 2, 0,
    '{"checklist":[{"key":"contrato","label":"Enviar contrato","due_days":0},
                   {"key":"accesos","label":"Crear accesos","due_days":0},
                   {"key":"whatsapp","label":"Crear grupo de WhatsApp","due_days":1},
                   {"key":"perfil","label":"Completar perfil","due_days":2},
                   {"key":"cuestionarios","label":"Enviar cuestionarios","due_days":2}]}');

  insert into public.service_activities (version_id, track_id, key, type, title, summary, participants, response_scope, form_version_id, position, suggested_offset_days, estimated_minutes)
  values (v_version, t_ini, 'ONB_FORM', 'form', 'Formulario de onboarding', 'Cada uno lo responde por su cuenta; nos ayuda a preparar su proceso',
          'each_member', 'individual', f_onb, 0, 0, 10);

  insert into public.service_activities (version_id, track_id, key, type, title, summary, participants, response_scope, contract_template_id, position, suggested_offset_days)
  values (v_version, t_ini, 'CON', 'contract', 'Firmar el contrato', 'Qué firman y por qué, en cinco puntos', 'each_member', 'individual', c_tpl, 3, 0);

  insert into public.service_activities (version_id, track_id, key, type, title, position, suggested_offset_days, config)
  values (v_version, t_ini, 'WA', 'external_link', 'Unirse al grupo de WhatsApp', 4, 1, '{"label":"Abrir WhatsApp","url":null}');

  insert into public.content_assets (kind, title, provider, provider_id, duration_seconds)
  values ('video', 'Bienvenida · Emilia y Diego', 'pending', 'bienvenida', 400);
  insert into public.service_activities (version_id, track_id, key, type, title, summary, asset_id, position, suggested_offset_days, estimated_minutes)
  values (v_version, t_ini, 'WEL', 'video_module', 'Video de bienvenida', 'Video que explica el proceso',
          (select id from public.content_assets where provider_id = 'bienvenida'), 5, 2, 7)
  returning id into a_welcome;

  insert into public.service_activities (version_id, track_id, key, type, title, summary, participants, response_scope, form_version_id, position, suggested_offset_days, estimated_minutes)
  values
   (v_version, t_ini, 'RAD_IND', 'form', 'Radiografía Inicial · parte individual', 'Cada uno responde la suya, en privado', 'each_member', 'individual', f_rad_ind, 6, 2, 15),
   (v_version, t_ini, 'RAD_PAR', 'form', 'Radiografía Inicial · parte en pareja', 'La responden juntos; queda en la ficha de ambos', 'all', 'shared', f_rad_par, 7, 2, 15);

  -- Módulos 0–8 (video + tarea individual)
  for i in 0..8 loop
    insert into public.forms (key, name, kind) values ('tarea_m' || i, 'Tarea · Módulo ' || i, 'homework');
    insert into public.form_versions (form_id, version, schema, published_at)
    select id, 1, jsonb_build_object('sections', jsonb_build_array(jsonb_build_object(
      'key', 'tarea', 'title', 'Tarea del Módulo ' || i, 'scope', 'individual', 'questions', jsonb_build_array(
        jsonb_build_object('key', 'reflexion', 'type', 'textarea', 'label', '¿Cómo aparece este tema en su última discusión?'),
        jsonb_build_object('key', 'identifica', 'type', 'scale', 'label', '¿Qué tanto te identificas con lo que viste?', 'min', 1, 'max', 5))))),
      now()
    from public.forms where key = 'tarea_m' || i
    returning id into f_task;

    insert into public.content_assets (kind, title, provider, provider_id)
    values ('video', 'Módulo ' || i || ' · ' || mod_titles[i + 1], 'pending', 'modulo-' || i);

    insert into public.service_activities (version_id, track_id, key, type, title, participants, response_scope,
      asset_id, form_version_id, position, suggested_offset_days, estimated_minutes)
    values (v_version, t_mod, 'M' || i, 'video_module', 'Módulo ' || i || ' · ' || mod_titles[i + 1], 'each_member', 'individual',
      (select id from public.content_assets where provider_id = 'modulo-' || i), f_task, 10 + i, mod_offset[i + 1], 30);
  end loop;

  -- Sesiones S1–S10
  for i in 1..10 loop
    insert into public.service_activities (version_id, track_id, key, type, title, summary, responsible_role_id,
      participants, position, suggested_offset_days, suggested_gap_days, estimated_minutes)
    values (v_version, t_ter, 'S' || i, 'therapy_session', s_title[i], s_summary[i],
      case s_role[i] when 'lead' then r_lead when 'psy' then r_psy else r_disc end,
      s_part[i], 20 + i, s_offset[i], s_gap[i], 60);
  end loop;

  -- Coaching grupal (actividad de área; los encuentros viven en group_sessions)
  insert into public.service_activities (version_id, track_id, key, type, title, position, config)
  values (v_version, t_cg, 'CG', 'group_session', 'Coaching Grupal', 40, '{"group_program_key":"coaching_pareja"}');

  update public.service_versions set welcome_activity_id = a_welcome where id = v_version;

  -- Los 14 pasos
  insert into public.service_steps (version_id, block_id, position, title, description, activity_id)
  select v_version, b[x.blk], x.pos, x.title, x.descr,
         (select id from public.service_activities where version_id = v_version and key = x.akey)
  from (values
    (1, 1, 'Formulario de onboarding', 'Cuéntennos de ustedes antes de empezar', 'ONB_FORM'),
    (2, 1, 'Onboarding', 'Contrato · accesos · grupo de WhatsApp · perfil · cuestionarios', 'ONB'),
    (3, 1, 'Bienvenida', 'Video que explica el proceso + Cuestionario de Radiografía Inicial', 'WEL'),
    (4, 1, 'Módulo 0', 'Responsabilidad y validación emocional', 'M0')
  ) x(pos, blk, title, descr, akey);

  for i in 1..10 loop
    insert into public.service_steps (version_id, block_id, position, title, description, activity_id)
    values (v_version, b[s_block[i]], 4 + i, 'S' || i || ' · ' || s_title[i], s_summary[i],
            (select id from public.service_activities where version_id = v_version and key = 'S' || i));
  end loop;

  -- Requisitos para entrar a cada paso
  insert into public.service_requirements (version_id, target_step_id, required_activity_id, criterion, is_mandatory, enforcement, label)
  select v_version,
         (select id from public.service_steps where version_id = v_version and position = x.step),
         (select id from public.service_activities where version_id = v_version and key = x.req),
         x.crit::public.req_criterion, true, 'blocks', x.label
  from (values
    (2,  'ENT',     'completed',      'Compra confirmada'),
    (2,  'ONB_FORM', 'form_submitted', 'Formulario de onboarding'),
    (3,  'ONB',     'completed',      'Onboarding completo'),
    (5,  'RAD_IND', 'form_submitted', 'Radiografía Inicial (individual)'),
    (5,  'RAD_PAR', 'form_submitted', 'Radiografía Inicial (en pareja)'),
    (5,  'M0',      'viewed',         'Módulo 0'),
    (6,  'M1',      'viewed',         'Módulo 1'),
    (7,  'M2',      'viewed',         'Módulo 2'),
    (8,  'M3',      'viewed',         'Módulo 3'),
    (9,  'M1',      'task_submitted', 'Módulo 1 · obligatorio'),
    (9,  'M2',      'task_submitted', 'Módulo 2 · obligatorio'),
    (9,  'M3',      'task_submitted', 'Módulo 3 · obligatorio'),
    (9,  'M4',      'viewed',         'Módulo 4'),
    (10, 'M5',      'viewed',         'Módulo 5'),
    (11, 'M6',      'viewed',         'Módulo 6'),
    (12, 'M7',      'viewed',         'Módulo 7'),
    (13, 'M8',      'viewed',         'Módulo 8')
  ) x(step, req, crit, label);

  -- Recordatorios
  insert into public.service_reminder_rules (version_id, activity_id, trigger, offset_hours, channel, template_key) values
    (v_version, null, 'requirement_pending', 72, 'email', 'requisito_pendiente'),
    (v_version, null, 'before_session', -48, 'email', 'recordatorio_sesion'),
    (v_version, null, 'access_ending', -336, 'email', 'fin_de_acceso');

  -- Coaching grupal: programa compartido con 9 encuentros cada 15 días
  insert into public.group_programs (key, name, cadence_days, default_time)
  values ('coaching_pareja', 'Coaching Grupal · Parejas', 14, '19:00');
  insert into public.service_group_programs (service_id, group_program_id)
  select v_service, id from public.group_programs where key = 'coaching_pareja';
  insert into public.group_sessions (program_id, scheduled_at, title, status)
  select gp.id, timestamptz '2026-09-09 19:00 America/Mexico_City' + (n * interval '14 days'), x.title,
         case when n < 2 then 'completed' else 'scheduled' end::public.session_status
  from public.group_programs gp,
       unnest(array['Pedir una pausa sin herir','Escuchar para entender','Acuerdos de trabajo y de casa',
                    'Reparar después de discutir','Validar sin estar de acuerdo','Tiempo juntos en semanas intensas',
                    'Pedir lo que necesito','Rituales de conexión','Sostener los cambios']) with ordinality x(title, ord),
       lateral (select (x.ord - 1)::int as n) k
  where gp.key = 'coaching_pareja';

  -- Grabación + recurso descargable de los encuentros ya hechos
  for st in select id from public.group_sessions where status = 'completed' order by scheduled_at loop
    insert into public.content_assets (kind, title, provider, provider_id)
    values ('video', 'Grabación coaching ' || st, 'pending', 'grabacion-' || st);
    update public.group_sessions set recording_asset_id = (select id from public.content_assets where provider_id = 'grabacion-' || st)
    where id = st;
    insert into public.content_assets (kind, title, storage_path, mime, size_bytes)
    values ('pdf', 'Guía del coaching', 'pendiente', 'application/pdf', 900000)
    returning id into a_res;
    -- Ruta en Storage: content/{asset_id}/{archivo}
    update public.content_assets set storage_path = a_res || '/guia.pdf' where id = a_res;
    insert into public.resources (asset_id, title, attach_type, attach_id)
    values (a_res, 'Guía: ' || (select title from public.group_sessions where id = st), 'group_session', st);
  end loop;

  perform public.publish_service_version(v_version);
end $$;

-- Videos aún no subidos a Bunny Stream
update public.content_assets set processing_status = 'pending' where provider = 'pending';
