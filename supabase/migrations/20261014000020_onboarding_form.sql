-- Paso 1 del proceso de pareja: un formulario de onboarding que responde cada uno (más adelante, entrevista con IA).
-- La entrevista de claridad (ENT) sigue existiendo como tarea del equipo y sigue siendo requisito del paso 2.
--
-- La versión publicada no se toca: se clona a la versión 2, se cambia y se publica (la 1 queda retirada).
-- Las inscripciones que ya existen se actualizan en su copia; si ya habían pasado del paso 1, ese paso
-- queda confirmado por el equipo para que no retrocedan, y el formulario les aparece igual para responderlo.

do $$
declare
  v_old uuid := '5e100000-0000-4000-8000-000000000001';
  v_new uuid;
  f_onb uuid;
  a_onb uuid;
  e record;
  ea_onb uuid;
  es_1 uuid;
  es_2 uuid;
begin
  if not exists (select 1 from public.service_versions where id = v_old and status = 'published') then
    raise notice 'Proceso de pareja v1 no está publicado aquí; no se aplica el formulario de onboarding.';
    return;
  end if;

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
  on conflict (form_id, version) do nothing;
  select fv.id into f_onb from public.form_versions fv join public.forms f on f.id = fv.form_id
  where f.key = 'onboarding_pareja' and fv.version = 1;

  -- Plantilla: versión 2
  v_new := public.clone_service_version(v_old);

  insert into public.service_activities (version_id, track_id, key, type, title, summary, participants, response_scope,
    form_version_id, position, suggested_offset_days, estimated_minutes)
  select v_new, t.id, 'ONB_FORM', 'form', 'Formulario de onboarding',
         'Cada uno lo responde por su cuenta; nos ayuda a preparar su proceso', 'each_member', 'individual',
         f_onb, 0, 0, 10
  from public.service_tracks t where t.version_id = v_new and t.key = 'inicio'
  returning id into a_onb;

  update public.service_steps
  set activity_id = a_onb, title = 'Formulario de onboarding',
      description = 'Cuéntennos de ustedes antes de empezar'
  where version_id = v_new and position = 1;

  insert into public.service_requirements (version_id, target_step_id, required_activity_id, criterion, is_mandatory, enforcement, label)
  select v_new, s.id, a_onb, 'form_submitted', true, 'blocks', 'Formulario de onboarding'
  from public.service_steps s where s.version_id = v_new and s.position = 2;

  perform public.publish_service_version(v_new);

  -- Inscripciones existentes (copia por caso)
  for e in select id from public.enrollments where service_version_id = v_old loop
    ea_onb := null;
    insert into public.enrollment_activities (enrollment_id, source_activity_id, key, track_key, track_name, track_position,
      type, title, summary, participants, response_scope, form_version_id, estimated_minutes, suggested_on, position)
    select e.id, a_onb, 'ONB_FORM', ea.track_key, ea.track_name, ea.track_position,
           'form', 'Formulario de onboarding', 'Cada uno lo responde por su cuenta; nos ayuda a preparar su proceso',
           'each_member', 'individual', f_onb, 10, en.starts_on, 0
    from public.enrollments en
    join public.enrollment_activities ea on ea.enrollment_id = en.id and ea.key = 'ENT'
    where en.id = e.id
    on conflict (enrollment_id, key) do nothing
    returning id into ea_onb;
    continue when ea_onb is null;

    select id into es_1 from public.enrollment_steps where enrollment_id = e.id and position = 1;
    select id into es_2 from public.enrollment_steps where enrollment_id = e.id and position = 2;

    -- Ya habían pasado del paso 1: queda confirmado para que no retrocedan.
    update public.enrollment_steps
    set completed_at = coalesce(completed_at, now())
    where id = es_1 and private.step_completed(id);

    update public.enrollment_steps
    set activity_id = ea_onb, title = 'Formulario de onboarding', description = 'Cuéntennos de ustedes antes de empezar'
    where id = es_1;

    -- Solo bloquea a quien todavía no ha pasado del paso 2.
    insert into public.enrollment_requirements (enrollment_id, target_step_id, required_activity_id, criterion, is_mandatory, enforcement, label)
    select e.id, es_2, ea_onb, 'form_submitted', true,
           case when private.step_completed(es_2) then 'reminds' else 'blocks' end::public.enforcement,
           'Formulario de onboarding';
  end loop;
end $$;
