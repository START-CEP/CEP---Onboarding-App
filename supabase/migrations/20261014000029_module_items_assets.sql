-- Los módulos pueden tener contenido extra (config.items = [{asset_id, title}]): quien ve la actividad ve esos archivos.
create or replace function private.can_view_asset(p_asset uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff()
      or exists (select 1 from public.enrollment_activities ea
                 where ea.asset_id = p_asset and private.can_see_activity(ea.id))
      or exists (select 1 from public.enrollment_activities ea
                 where ea.config -> 'items' @> jsonb_build_array(jsonb_build_object('asset_id', p_asset::text))
                   and private.can_see_activity(ea.id))
      or exists (select 1 from public.resources r
                 where r.asset_id = p_asset and private.can_view_resource(r.id))
      or exists (select 1 from public.group_sessions g
                 where g.recording_asset_id = p_asset and private.is_group_program_member(g.program_id))
      or exists (select 1 from public.service_versions v
                 join public.service_activities a on a.id = v.welcome_activity_id
                 where a.asset_id = p_asset and private.is_enrolled_in_version(v.id));
$$;
