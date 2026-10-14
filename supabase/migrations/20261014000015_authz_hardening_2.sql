-- Segunda ronda de la revisión de seguridad.
-- Las comprobaciones de las políticas de 0014 consultaban staff_roles y enrollments con los permisos
-- de quien hace la petición: un usuario solo de ventas no ve esas filas, así que "no existe" era siempre
-- cierto y podía añadir personal o añadirse a una pareja con inscripción. Ahora se evalúan con funciones
-- security definer que ven todos los datos.

create function private.is_staff_profile(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles where profile_id = p_profile);
$$;

-- Cualquier inscripción, incluida 'invited': una unidad inscrita solo la modifica admin.
create function private.unit_has_enrollment(p_unit uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments where unit_id = p_unit and status <> 'cancelled');
$$;

drop policy client_unit_members_sales_insert on public.client_unit_members;
create policy client_unit_members_sales_insert on public.client_unit_members for insert to authenticated
  with check (
    private.has_role('sales')
    and not private.is_staff_profile(profile_id)
    and (private.is_admin() or not private.unit_has_enrollment(unit_id)));

-- Unidades: ventas crea; editar o borrar una unidad ya inscrita es solo de admin.
drop policy client_units_write on public.client_units;
create policy client_units_sales_insert on public.client_units for insert to authenticated
  with check (private.has_role('sales'));
create policy client_units_update on public.client_units for update to authenticated
  using (private.is_admin() or (private.has_role('sales') and not private.unit_has_enrollment(id)))
  with check (private.is_admin() or (private.has_role('sales') and not private.unit_has_enrollment(id)));
create policy client_units_delete on public.client_units for delete to authenticated
  using (private.is_admin() or (private.has_role('sales') and not private.unit_has_enrollment(id)));

-- Firmas: la IP se toma solo de cabeceras que pone la infraestructura, no del cliente.
-- En Supabase alojado (detrás de Cloudflare) es cf-connecting-ip. Si no está, se usa la última IP de
-- x-forwarded-for, que es la que añade el último proxy; las anteriores las puede inventar el cliente.
-- El user agent lo declara el navegador: se guarda como dato informativo, no como prueba.
-- Para una evidencia con valor legal fuerte, la firma debe pasar por la Edge Function de firma (Fase 3),
-- que además genera y guarda el PDF firmado.
create or replace function private.stamp_signature() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  v_xff text[];
  v_ip text;
begin
  if auth.uid() is not null then
    new.signed_at := now();
    new.provider := 'in_app';
    new.provider_ref := null;
    v_ip := nullif(trim(v_headers ->> 'cf-connecting-ip'), '');
    if v_ip is null then
      v_xff := string_to_array(coalesce(v_headers ->> 'x-forwarded-for', ''), ',');
      v_ip := nullif(trim(v_xff[array_length(v_xff, 1)]), '');
    end if;
    begin
      new.ip := v_ip::inet;
    exception when others then
      new.ip := null;
    end;
    new.user_agent := left(v_headers ->> 'user-agent', 500);
    if not exists (select 1 from public.enrollment_activities ea
                   where ea.enrollment_id = new.enrollment_id and ea.type = 'contract'
                     and ea.contract_template_id = new.contract_template_id) then
      raise exception 'Esa plantilla de contrato no corresponde a esta inscripción.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
