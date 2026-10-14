-- Enlaces de avisos estrictos y firma del contrato solo con la actividad abierta.
-- (otro dominio). El enlace de un aviso es una ruta interna con caracteres imprimibles, sin barras invertidas.
alter table public.notifications drop constraint notifications_link_internal;
alter table public.notifications
  add constraint notifications_link_internal check (link is null or link ~ '^/([A-Za-z0-9._~%!$&''()*+,;=:@-][A-Za-z0-9._~%!$&''()*+,;=:@/?#-]*)?$');

-- Firmar el contrato: la actividad de contrato tiene que estar abierta para quien firma (visible y sin
-- requisitos que la bloqueen), igual que el resto de actividades desde la 0021.
create or replace function private.stamp_signature() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  v_xff text[];
  v_ip text;
  v_activity uuid;
begin
  if auth.uid() is not null then
    new.signed_at := now();
    new.provider := 'in_app';
    new.provider_ref := null;
    new.signed_file_id := null;
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
    select ea.id into v_activity from public.enrollment_activities ea
    where ea.enrollment_id = new.enrollment_id and ea.type = 'contract'
      and ea.contract_template_id = new.contract_template_id
      and private.can_see_activity(ea.id)
    limit 1;
    if v_activity is null then
      raise exception 'Esa plantilla de contrato no corresponde a esta inscripción.' using errcode = '42501';
    end if;
    if not private.activity_unlocked(v_activity) then
      raise exception 'El contrato todavía está bloqueado.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
