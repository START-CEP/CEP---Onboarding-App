-- Plantilla: Terapia individual (2 meses). Estructura básica para demostrar que el motor es genérico.

do $$
declare
  v_service uuid := '5e000000-0000-4000-8000-000000000002';
  v_version uuid := '5e100000-0000-4000-8000-000000000002';
  r_psy uuid := (select id from public.care_roles where key = 'psychologist');
  b_ini uuid; b_pro uuid; b_cie uuid;
  t_ini uuid; t_ter uuid;
  c_tpl uuid;
  i int;
begin
  insert into public.services (id, slug, name, description, unit_kind, price_cents)
  values (v_service, 'terapia-individual', 'Terapia individual', 'Proceso individual de 2 meses.', 'individual', 100000);
  insert into public.service_versions (id, service_id, version, expected_duration_days, access_days)
  values (v_version, v_service, 1, 56, 60);

  insert into public.service_blocks (version_id, name, position) values (v_version, 'Inicio', 1) returning id into b_ini;
  insert into public.service_blocks (version_id, name, position) values (v_version, 'Proceso', 2) returning id into b_pro;
  insert into public.service_blocks (version_id, name, position) values (v_version, 'Cierre', 3) returning id into b_cie;
  insert into public.service_tracks (version_id, key, name, position) values (v_version, 'inicio', 'Inicio', 1) returning id into t_ini;
  insert into public.service_tracks (version_id, key, name, position) values (v_version, 'terapia', 'Sesiones de Terapia', 2) returning id into t_ter;

  insert into public.contract_templates (service_id, version, title, body_md, published_at)
  values (v_service, 1, 'Contrato · Terapia individual', '# Contrato\n\n(Texto legal pendiente.)', now())
  returning id into c_tpl;

  insert into public.service_activities (version_id, track_id, key, type, title, participants, response_scope, contract_template_id, position)
  values (v_version, t_ini, 'CON', 'contract', 'Firmar el contrato', 'all', 'individual', c_tpl, 1);
  -- Reutiliza el formulario individual de la Radiografía (biblioteca compartida).
  insert into public.service_activities (version_id, track_id, key, type, title, participants, response_scope, form_version_id, position, suggested_offset_days)
  values (v_version, t_ini, 'RAD', 'form', 'Radiografía Inicial', 'all', 'individual',
          (select fv.id from public.form_versions fv join public.forms f on f.id = fv.form_id where f.key = 'radiografia_individual'), 2, 1);

  for i in 1..6 loop
    insert into public.service_activities (version_id, track_id, key, type, title, responsible_role_id, position, suggested_offset_days, suggested_gap_days)
    values (v_version, t_ter, 'S' || i, 'therapy_session', 'Sesión ' || i, r_psy, 10 + i, 7 * i, 7);
  end loop;

  insert into public.service_steps (version_id, block_id, position, title, activity_id)
  select v_version, b_ini, 1, 'Contrato', id from public.service_activities where version_id = v_version and key = 'CON';
  insert into public.service_steps (version_id, block_id, position, title, activity_id)
  select v_version, b_ini, 2, 'Radiografía Inicial', id from public.service_activities where version_id = v_version and key = 'RAD';
  for i in 1..6 loop
    insert into public.service_steps (version_id, block_id, position, title, activity_id)
    select v_version, case when i = 6 then b_cie else b_pro end, 2 + i, 'S' || i, id
    from public.service_activities where version_id = v_version and key = 'S' || i;
  end loop;

  insert into public.service_requirements (version_id, target_step_id, required_activity_id, criterion, label)
  select v_version, (select id from public.service_steps where version_id = v_version and position = 3),
         id, case key when 'CON' then 'signed' else 'form_submitted' end::public.req_criterion,
         case key when 'CON' then 'Contrato firmado' else 'Radiografía Inicial' end
  from public.service_activities where version_id = v_version and key in ('CON', 'RAD');

  perform public.publish_service_version(v_version);
end $$;
