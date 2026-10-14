-- Proceso de pareja ($3.000): módulos con varias lecciones (videos) y tareas distintas.
-- Una lección = un video del módulo. La 1 es el video principal (asset_id, título en config.video_title);
-- las siguientes van en config.items. Clona la versión publicada a un borrador (v4), lo cambia y lo publica;
-- las inscripciones activas del servicio reciben los mismos videos (y las tareas nuevas si aún no las empezaron).
-- Las tareas de M3–M8 pasan a ser distintas entre sí (M0–M2 se dejan: la demo ya las entregó).
-- Si ya existen las lecciones de demo, no hace nada.

do $$
declare
  v_old uuid;
  v uuid;
  m record;
  l record;
  t record;
  a uuid;
  fv uuid;
  cfg jsonb;
begin
  select sv.id into v_old from public.service_versions sv join public.services s on s.id = sv.service_id
  where s.name = 'Proceso de pareja' and sv.status = 'published';
  if v_old is null then raise exception 'No hay una versión publicada de «Proceso de pareja».'; end if;
  if exists (select 1 from public.content_assets where provider_id = 'leccion-M1-2') then
    raise notice 'Las lecciones de demo ya existen; no se hace nada.';
    return;
  end if;
  v := public.clone_service_version(v_old);
  update public.service_versions set notes = 'Módulos con varias lecciones y tareas distintas (2026-10-14)' where id = v;

  -- Lecciones por módulo: 1, 2 o 3 videos (la primera es el video principal que ya existe).
  create temp table lec (mkey text, n int, title text, minutes int) on commit drop;
  insert into lec values
    ('M0', 1, 'Responsabilidad y validación emocional', 22),
    ('M1', 1, 'Qué es un ciclo negativo', 14),
    ('M1', 2, 'Perseguidor y retirado', 18),
    ('M1', 3, 'Dibujen su propio ciclo', 11),
    ('M2', 1, 'Emociones primarias y secundarias', 16),
    ('M2', 2, 'La emoción que se esconde detrás del enojo', 13),
    ('M3', 1, 'Personalidad y estilo de conflicto', 15),
    ('M3', 2, 'Lo que el DISC dice de cada uno', 19),
    ('M3', 3, 'Cuando dos estilos chocan', 12),
    ('M4', 1, 'Reconociendo el lugar de la historia de vida', 25),
    ('M5', 1, 'Qué es una necesidad profunda', 14),
    ('M5', 2, 'Pedir sin reclamar', 17),
    ('M6', 1, 'Señales de alerta del ciclo', 12),
    ('M6', 2, 'La pausa acordada', 15),
    ('M6', 3, 'Volver a la conversación', 13),
    ('M7', 1, 'Reparar después de una discusión', 21),
    ('M8', 1, 'Lo que construyeron', 16),
    ('M8', 2, 'Su plan para seguir creciendo', 18);

  for m in select sa.id, sa.key, sa.asset_id from public.service_activities sa
           where sa.version_id = v and sa.type = 'video_module' order by sa.position loop
    cfg := '[]'::jsonb;
    for l in select * from lec where mkey = m.key order by n loop
      if l.n = 1 then
        update public.content_assets set duration_seconds = l.minutes * 60 where id = m.asset_id;
        continue;
      end if;
      insert into public.content_assets (kind, title, provider, provider_id, duration_seconds)
      values ('video', m.key || ' · ' || l.title, 'pending', 'leccion-' || m.key || '-' || l.n, l.minutes * 60)
      returning id into a;
      cfg := cfg || jsonb_build_array(jsonb_build_object('asset_id', a::text, 'title', l.title));
    end loop;

    update public.service_activities sa
    set config = (coalesce(sa.config, '{}'::jsonb) - 'items' - 'video_title')
                 || jsonb_build_object('video_title', (select title from lec where mkey = m.key and n = 1))
                 || case when jsonb_array_length(cfg) > 0 then jsonb_build_object('items', cfg) else '{}'::jsonb end
    where sa.id = m.id;

    update public.enrollment_activities ea
    set config = (select config from public.service_activities where id = m.id)
    from public.enrollments e join public.service_versions sv on sv.id = e.service_version_id
    where ea.enrollment_id = e.id and sv.service_id = (select service_id from public.service_versions where id = v)
      and e.status in ('active', 'invited', 'paused')
      and ea.key = m.key;
  end loop;
  update public.content_assets set processing_status = 'pending' where provider = 'pending' and provider_id like 'leccion-%';

  -- Tareas distintas para M3–M8 (nueva versión del formulario de cada módulo).
  create temp table tarea (mkey text, schema jsonb) on commit drop;
  insert into tarea values
    ('M3', '{"sections":[{"key":"tarea","title":"Tarea del Módulo 3","scope":"individual","questions":[
       {"key":"estilo","type":"single_choice","label":"¿Qué estilo te describe mejor cuando hay tensión?","options":["Dominante: voy al grano","Influyente: busco convencer","Estable: evito el choque","Concienzudo: analizo antes de hablar"],"required":true},
       {"key":"choque","type":"textarea","label":"Describe una situación reciente en la que sus estilos chocaron.","required":true},
       {"key":"valoro","type":"text","label":"Una cosa que valoras del estilo de tu pareja","required":true}]}]}'),
    ('M4', '{"sections":[{"key":"tarea","title":"Tarea del Módulo 4","scope":"individual","questions":[
       {"key":"familia","type":"textarea","label":"¿Cómo se manejaban los conflictos en la familia en la que creciste?","required":true},
       {"key":"repito","type":"yes_no","label":"¿Reconoces alguno de esos patrones en tu relación actual?","required":true},
       {"key":"cual","type":"textarea","label":"Si respondiste que sí, ¿cuál?","required":false},
       {"key":"peso","type":"scale","label":"¿Cuánto pesa tu historia en cómo reaccionas hoy?","min":1,"max":10,"minLabel":"Nada","maxLabel":"Muchísimo","required":true}]}]}'),
    ('M5', '{"sections":[{"key":"tarea","title":"Tarea del Módulo 5","scope":"individual","questions":[
       {"key":"necesidades","type":"multi_choice","label":"¿Qué necesitas más de tu pareja en este momento?","options":["Sentirme escuchado/a","Sentirme valorado/a","Seguridad","Cercanía física","Espacio propio","Apoyo en lo cotidiano"],"required":true},
       {"key":"pedido","type":"textarea","label":"Escribe cómo se lo pedirías, sin reclamo, empezando con «Necesito…»","required":true}]}]}'),
    ('M6', '{"sections":[{"key":"tarea","title":"Tarea del Módulo 6","scope":"individual","questions":[
       {"key":"senal","type":"text","label":"Tu primera señal de que el ciclo está empezando","required":true},
       {"key":"pausa","type":"text","label":"La frase que usarás para pedir una pausa","required":true},
       {"key":"minutos","type":"number","label":"¿Cuántos minutos necesitas antes de volver a la conversación?","required":true},
       {"key":"volver","type":"date","label":"¿Cuándo van a practicar la pausa acordada por primera vez?","required":false}]}]}'),
    ('M7', '{"sections":[{"key":"tarea","title":"Tarea del Módulo 7","scope":"individual","questions":[
       {"key":"reparar","type":"textarea","label":"Cuenta una discusión reciente y cómo podrías haberla reparado.","required":true},
       {"key":"facil","type":"scale","label":"¿Qué tan fácil te resulta pedir perdón?","min":1,"max":5,"minLabel":"Muy difícil","maxLabel":"Muy fácil","required":true}]}]}'),
    ('M8', '{"sections":[{"key":"tarea","title":"Tarea del Módulo 8","scope":"individual","questions":[
       {"key":"logro","type":"textarea","label":"¿Qué es lo que más cambió en su relación durante el proceso?","required":true},
       {"key":"seguir","type":"multi_choice","label":"¿Qué quieren seguir practicando?","options":["La pausa acordada","Pedir sin reclamar","Validar antes de responder","Reparar después de discutir"],"required":true},
       {"key":"recomendar","type":"yes_no","label":"¿Recomendarías el proceso a otra pareja?","required":true}]}]}');

  for t in select * from tarea loop
    insert into public.form_versions (form_id, version, schema, published_at)
    select fv0.form_id, (select max(version) + 1 from public.form_versions where form_id = fv0.form_id), t.schema, now()
    from public.service_activities sa join public.form_versions fv0 on fv0.id = sa.form_version_id
    where sa.version_id = v and sa.key = t.mkey
    returning id into fv;
    update public.service_activities set form_version_id = fv where version_id = v and key = t.mkey;
    -- Solo inscripciones que aún no entregaron ni empezaron esa tarea.
    update public.enrollment_activities ea set form_version_id = fv
    from public.enrollments e join public.service_versions sv on sv.id = e.service_version_id
    where ea.enrollment_id = e.id and sv.service_id = (select service_id from public.service_versions where id = v)
      and e.status in ('active', 'invited', 'paused')
      and ea.key = t.mkey
      and not exists (select 1 from public.form_submissions fs where fs.enrollment_activity_id = ea.id);
  end loop;

  perform public.publish_service_version(v);
end $$;
