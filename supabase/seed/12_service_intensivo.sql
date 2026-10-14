-- Plantilla: Programa intensivo (3 días). Estructura básica sobre el mismo motor.

do $$
declare
  v_service uuid := '5e000000-0000-4000-8000-000000000003';
  v_version uuid := '5e100000-0000-4000-8000-000000000003';
  r_lead uuid := (select id from public.care_roles where key = 'lead_therapist');
  b uuid[];
  t_ini uuid; t_int uuid;
  c_tpl uuid;
  i int;
  d_title text[] := array['Día 1 · mañana','Día 1 · tarde','Día 2 · mañana','Día 2 · tarde','Día 3 · mañana','Día 3 · tarde'];
  d_offset int[] := array[14, 14, 15, 15, 16, 16];
begin
  insert into public.services (id, slug, name, description, unit_kind, price_cents)
  values (v_service, 'programa-intensivo', 'Programa intensivo', 'Tres días de trabajo intensivo en pareja.', 'couple', 1500000);
  insert into public.service_versions (id, service_id, version, expected_duration_days, access_days)
  values (v_version, v_service, 1, 17, 45);

  with ins as (
    insert into public.service_blocks (version_id, name, position)
    select v_version, n, p from (values ('Preparación',1),('Día 1',2),('Día 2',3),('Día 3',4)) x(n,p)
    returning id, position)
  select array_agg(id order by position) into b from ins;
  insert into public.service_tracks (version_id, key, name, position) values (v_version, 'inicio', 'Preparación', 1) returning id into t_ini;
  insert into public.service_tracks (version_id, key, name, position) values (v_version, 'intensivo', 'Intensivo', 2) returning id into t_int;

  insert into public.contract_templates (service_id, version, title, body_md, published_at)
  values (v_service, 1, 'Contrato · Programa intensivo', '# Contrato\n\n(Texto legal pendiente.)', now())
  returning id into c_tpl;

  insert into public.service_activities (version_id, track_id, key, type, title, participants, response_scope, contract_template_id, position)
  values (v_version, t_ini, 'CON', 'contract', 'Firmar el contrato', 'each_member', 'individual', c_tpl, 1);
  insert into public.service_activities (version_id, track_id, key, type, title, participants, response_scope, form_version_id, position)
  values
   (v_version, t_ini, 'RAD_IND', 'form', 'Radiografía · individual', 'each_member', 'individual',
    (select fv.id from public.form_versions fv join public.forms f on f.id = fv.form_id where f.key = 'radiografia_individual'), 2),
   (v_version, t_ini, 'RAD_PAR', 'form', 'Radiografía · en pareja', 'all', 'shared',
    (select fv.id from public.form_versions fv join public.forms f on f.id = fv.form_id where f.key = 'radiografia_pareja'), 3);

  for i in 1..6 loop
    insert into public.service_activities (version_id, track_id, key, type, title, responsible_role_id, position, suggested_offset_days, estimated_minutes)
    values (v_version, t_int, 'D' || i, 'therapy_session', d_title[i], r_lead, 10 + i, d_offset[i], 180);
  end loop;

  insert into public.service_steps (version_id, block_id, position, title, activity_id)
  select v_version, b[1], x.pos, x.title, (select id from public.service_activities where version_id = v_version and key = x.k)
  from (values (1, 'Contrato', 'CON'), (2, 'Radiografía', 'RAD_PAR')) x(pos, title, k);
  for i in 1..6 loop
    insert into public.service_steps (version_id, block_id, position, title, activity_id)
    select v_version, b[2 + (i - 1) / 2], 2 + i, d_title[i], id
    from public.service_activities where version_id = v_version and key = 'D' || i;
  end loop;

  insert into public.service_requirements (version_id, target_step_id, required_activity_id, criterion, label)
  select v_version, (select id from public.service_steps where version_id = v_version and position = 3), a.id, x.crit::public.req_criterion, x.label
  from (values ('CON', 'signed', 'Contrato firmado por ambos'),
               ('RAD_IND', 'form_submitted', 'Radiografía individual'),
               ('RAD_PAR', 'form_submitted', 'Radiografía en pareja')) x(k, crit, label)
  join public.service_activities a on a.version_id = v_version and a.key = x.k;

  perform public.publish_service_version(v_version);
end $$;

-- Qué ofrecer al cerrar el proceso de pareja (pendiente de definir con el equipo).
-- La versión publicada es inmutable: los followups se configuran en el borrador de la próxima versión.
