-- Video en Bunny Stream (bunny.net).
-- Un asset de video guarda la librería y el GUID del video en Bunny. La reproducción usa el reproductor
-- embebido de Bunny con token firmado (Token Authentication), que genera una Edge Function solo si
-- private.can_view_asset() lo permite. La API key y la clave de firma viven en secretos, nunca en la base.
-- PDFs, tareas subidas y contratos siguen en Supabase Storage.

alter table public.content_assets
  add column provider_library_id text,
  add column processing_status text not null default 'ready'
    check (processing_status in ('pending', 'uploading', 'processing', 'ready', 'failed')),
  add column provider_meta jsonb not null default '{}'::jsonb,   -- respuesta del webhook: resoluciones, thumbnail...
  add constraint content_assets_provider_check
    check (provider is null or provider in ('bunny', 'pending')),
  add constraint content_assets_bunny_check
    check (provider is distinct from 'bunny' or (provider_id is not null and provider_library_id is not null));

comment on column public.content_assets.provider is
  'bunny = Bunny Stream; pending = video aún no subido. Nulo = archivo en Supabase Storage.';
comment on column public.content_assets.provider_id is 'GUID del video en Bunny Stream.';
comment on column public.content_assets.provider_library_id is 'ID de la librería de Bunny Stream.';

create unique index content_assets_provider_video on public.content_assets (provider, provider_id)
  where provider = 'bunny';
