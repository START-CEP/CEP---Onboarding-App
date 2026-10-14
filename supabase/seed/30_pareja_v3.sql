-- Proceso de pareja ($3.000) · versión 3: revisión de Emilia (2026-10-14).
-- Clona la versión publicada (v2), aplica los cambios y la publica. Si ya existe una v3, no hace nada.
--   · Orden de inicio: Bienvenida → Onboarding (contrato, accesos, WhatsApp) → Radiografía Inicial → Módulo 0 → S1.
--   · Fuera «Entrevista de claridad» (es de ventas) y el «Formulario de onboarding»: sus preguntas pasan a la
--     Radiografía Inicial individual (sección «Datos básicos»).
--   · Nombres nuevos de los módulos; requisitos acumulados e indispensables (S_n pide M0…M_{n-1}).
--   · Textos de S1, S4, S5 y S8; tipo de sesión; preguntas frecuentes del contrato; qué es el coaching grupal.

do $$
declare
  v_old uuid;
  v_new uuid;
  v_service uuid;
  f_onb uuid; f_rad uuid; fv_rad uuid;
  a record;
  i int;
  k int;
begin
  select v.id, v.service_id into v_old, v_service
  from public.service_versions v join public.services s on s.id = v.service_id
  where s.name = 'Proceso de pareja' and v.status = 'published';
  if v_old is null then raise exception 'No hay una versión publicada de «Proceso de pareja».'; end if;
  if (select version from public.service_versions where id = v_old) >= 3 then
    raise notice 'La versión publicada ya es la 3 o posterior; no se hace nada.';
    return;
  end if;

  v_new := public.clone_service_version(v_old);
  update public.service_versions set notes = 'Revisión de Emilia (2026-10-14)' where id = v_new;

  -- Radiografía individual nueva = datos del formulario de onboarding + radiografía actual.
  select fv.form_id into f_onb from public.service_activities sa join public.form_versions fv on fv.id = sa.form_version_id
  where sa.version_id = v_new and sa.key = 'ONB_FORM';
  select fv.form_id into f_rad from public.service_activities sa join public.form_versions fv on fv.id = sa.form_version_id
  where sa.version_id = v_new and sa.key = 'RAD_IND';
  insert into public.form_versions (form_id, version, schema, published_at)
  select f_rad, (select max(version) + 1 from public.form_versions where form_id = f_rad),
         jsonb_build_object('sections',
           jsonb_build_array(jsonb_build_object(
             'key', 'datos_basicos', 'title', 'Datos básicos', 'scope', rad.schema -> 'sections' -> 0 -> 'scope',
             'questions', (onb.schema -> 'sections' -> 0 -> 'questions') || (rad.schema -> 'sections' -> 0 -> 'questions')))
           || jsonb_path_query_array(onb.schema, '$.sections[1 to last]')
           || jsonb_path_query_array(rad.schema, '$.sections[1 to last]')),
         now()
  from (select schema from public.form_versions where form_id = f_onb order by version desc limit 1) onb,
       (select schema from public.form_versions where form_id = f_rad order by version desc limit 1) rad
  returning id into fv_rad;
  update public.service_activities set form_version_id = fv_rad,
    summary = 'Cada uno responde la suya: datos básicos y su mirada de la relación.'
  where version_id = v_new and key = 'RAD_IND';

  -- Pasos: el que era «Formulario de onboarding» pasa a ser «Radiografía Inicial».
  update public.service_steps st set activity_id = sa.id, title = 'Radiografía Inicial',
    description = 'Cuestionario individual y en pareja: su punto de partida'
  from public.service_activities sa
  where st.version_id = v_new and sa.version_id = v_new and sa.key = 'RAD_IND'
    and st.activity_id = (select id from public.service_activities where version_id = v_new and key = 'ONB_FORM');

  -- Fuera la entrevista de ventas y el formulario de onboarding (con sus requisitos).
  delete from public.service_requirements r using public.service_activities sa
  where r.version_id = v_new and sa.id = r.required_activity_id and sa.key in ('ENT', 'ONB_FORM');
  delete from public.service_activities where version_id = v_new and key in ('ENT', 'ONB_FORM');

  -- Orden: 1 Bienvenida · 2 Onboarding · 3 Radiografía · 4 Módulo 0 (S1… siguen en 5–14).
  update public.service_steps set position = position + 100 where version_id = v_new and position <= 4;
  update public.service_steps st set position = x.pos
  from public.service_activities sa, (values ('WEL', 1), ('ONB', 2), ('RAD_IND', 3), ('M0', 4)) x(k, pos)
  where st.version_id = v_new and sa.id = st.activity_id and sa.key = x.k;
  update public.service_steps st set title = 'Bienvenida', description = 'Video que explica cómo es su proceso'
  from public.service_activities sa where st.version_id = v_new and sa.id = st.activity_id and sa.key = 'WEL';
  update public.service_steps st set description = 'Contrato · accesos · grupo de WhatsApp'
  from public.service_activities sa where st.version_id = v_new and sa.id = st.activity_id and sa.key = 'ONB';
  update public.service_activities set summary = 'Contrato · accesos · grupo de WhatsApp' where version_id = v_new and key = 'ONB';
  -- La Bienvenida ya no espera al onboarding; la Radiografía sí (primero contrato y accesos).
  delete from public.service_requirements r using public.service_steps st, public.service_activities sa
  where r.version_id = v_new and r.target_step_id = st.id and sa.id = st.activity_id and sa.key = 'WEL';
  insert into public.service_requirements (version_id, target_step_id, required_activity_id, criterion, is_mandatory, enforcement, label)
  select v_new, st.id, req.id, 'completed', true, 'blocks', 'Onboarding completo'
  from public.service_steps st join public.service_activities sa on sa.id = st.activity_id
  join public.service_activities req on req.version_id = v_new and req.key = 'ONB'
  where st.version_id = v_new and sa.key = 'RAD_IND';

  -- Orden de «Su inicio» en la Bienvenida.
  update public.service_activities sa set position = x.pos
  from (values ('WEL', 1), ('CON', 2), ('WA', 3), ('RAD_IND', 4), ('RAD_PAR', 5), ('ONB', 6)) x(k, pos)
  where sa.version_id = v_new and sa.key = x.k;

  -- Módulos: nombres de Emilia.
  update public.service_activities sa set title = x.t
  from (values
    ('M0', 'Módulo 0 · Responsabilidad y validación emocional'),
    ('M1', 'Módulo 1 · Identificando el ciclo negativo'),
    ('M2', 'Módulo 2 · Tipos de emociones'),
    ('M3', 'Módulo 3 · El rol de la personalidad'),
    ('M4', 'Módulo 4 · Reconociendo el lugar de la historia de vida'),
    ('M5', 'Módulo 5 · Identificando necesidades profundas'),
    ('M6', 'Módulo 6 · Plan de acción para detener el ciclo negativo'),
    ('M7', 'Módulo 7 · Plan de acción para aumentar conexión'),
    ('M8', 'Módulo 8 · Identificando metas para alcanzar la plenitud')) x(k, t)
  where sa.version_id = v_new and sa.key = x.k;

  -- Sesiones: textos y tipo de sesión.
  update public.service_activities set summary = 'Devolución de la Radiografía Inicial: alinear expectativas y generar metas del proceso y el camino a seguir dentro del proceso.'
  where version_id = v_new and key = 'S1';
  update public.service_activities set summary = 'Sesión para los dos, con Diego: entender la personalidad de cada uno (DISC).'
  where version_id = v_new and key = 'S4';
  update public.service_activities set summary = 'Se inicia a profundizar en el ciclo negativo de la pareja.'
  where version_id = v_new and key = 'S5';
  update public.service_activities set title = 'Frases poderosas y plan de acción', summary = 'Frases poderosas y plan de acción.'
  where version_id = v_new and key = 'S8';
  update public.service_steps st set description = sa.summary,
    title = sa.key || ' · ' || sa.title
  from public.service_activities sa
  where st.version_id = v_new and sa.id = st.activity_id and sa.key in ('S1', 'S4', 'S5', 'S8');
  update public.service_activities sa set config = sa.config || jsonb_build_object('session_label', x.l)
  from (values ('S1', 'Sesión de terapia de pareja'), ('S2', 'Sesión individual'), ('S3', 'Sesión individual'),
               ('S4', 'Sesión de coaching en pareja'), ('S5', 'Sesión de terapia de pareja'), ('S6', 'Sesión de terapia de pareja'),
               ('S7', 'Sesión de terapia de pareja'), ('S8', 'Sesión de terapia de pareja'), ('S9', 'Sesión de terapia de pareja'),
               ('S10', 'Sesión de terapia de pareja')) x(k, l)
  where sa.version_id = v_new and sa.key = x.k;

  -- Requisitos acumulados: S_n pide haber visto y completado M0 … M_{n-1} (indispensables). S1 conserva la Radiografía.
  delete from public.service_requirements r using public.service_steps st, public.service_activities sa, public.service_activities req
  where r.version_id = v_new and r.target_step_id = st.id and sa.id = st.activity_id and sa.key ~ '^S[0-9]+$'
    and req.id = r.required_activity_id and req.key ~ '^M[0-9]+$';
  for i in 1..9 loop
    for k in 0..(i - 1) loop
      insert into public.service_requirements (version_id, target_step_id, required_activity_id, criterion, is_mandatory, enforcement, label)
      select v_new, st.id, m.id, case when m.form_version_id is null then 'viewed' else 'task_submitted' end::public.req_criterion,
             true, 'blocks', 'Módulo ' || k
      from public.service_steps st
      join public.service_activities s on s.id = st.activity_id and s.key = 'S' || i
      join public.service_activities m on m.version_id = v_new and m.key = 'M' || k
      where st.version_id = v_new;
    end loop;
  end loop;
  update public.service_requirements set label = regexp_replace(label, ' · obligatorio', '')
  where version_id = v_new and label like '% · obligatorio';

  -- Preguntas frecuentes del contrato (borrador a validar por Emilia).
  update public.service_activities set config = config || jsonb_build_object('faq', jsonb_build_array(
    jsonb_build_object('q', '¿Por qué el contrato es con una empresa de Estados Unidos si estamos en Costa Rica?',
      'a', 'Creciendo en Pareja trabaja a través de una empresa registrada en Estados Unidos, que nos permite acompañar a parejas de distintos países y recibir pagos internacionales. El equipo que los acompaña es el mismo.'),
    jsonb_build_object('q', '¿Por qué el contrato dice «coaching» y no «terapia»?',
      'a', 'Porque la empresa está en Estados Unidos y allí Emilia no tiene licencia como psicóloga; por eso el servicio figura legalmente como coaching. El proceso es el mismo que les explicamos.'),
    jsonb_build_object('q', '¿Qué significa la cláusula de derechos de imagen?',
      'a', 'Protege el material del programa: videos, recursos y grabaciones del coaching grupal. Su historia y su imagen no se venden ni se publican. Si tienen dudas sobre esta cláusula, escríbannos antes de firmar.')))
  where version_id = v_new and key = 'CON';

  -- Coaching grupal: qué es (se muestra arriba de las fechas; el video se elige en el admin).
  update public.service_activities set summary = 'Son encuentros en línea con otras parejas del programa. No es terapia en vivo: nadie tiene que contar su historia. Trabajamos un tema del proceso y respondemos las preguntas que las parejas dejan antes (pueden ser anónimas). Después queda la grabación y un recurso para descargar.'
  where version_id = v_new and key = 'CG';

  -- Bienvenida de la versión nueva.
  update public.service_versions set welcome_activity_id = (select id from public.service_activities where version_id = v_new and key = 'WEL')
  where id = v_new;

  perform public.publish_service_version(v_new);
  raise notice 'Publicada la versión % (%).', (select version from public.service_versions where id = v_new), v_new;
end $$;
