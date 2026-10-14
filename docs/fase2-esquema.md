# Fase 2 · Base de datos (Supabase)

Motor genérico de servicios: un servicio es solo datos, configurables desde admin. El proceso de pareja de $3.000 es la primera plantilla; Individual e Intensivo usan el mismo motor.

## Cómo levantarlo (Supabase local en Docker)

```bash
supabase start          # levanta el stack en Docker (puertos 553xx, no choca con otros proyectos)
supabase db reset       # aplica migraciones + seed de demo
supabase test db        # 54 tests pgTAP (motor, privacidad, storage)
supabase db lint        # sin errores
supabase gen types typescript --linked > web/lib/database.types.ts
```

| Servicio | URL |
|---|---|
| API | http://127.0.0.1:55321 |
| Base de datos | postgresql://postgres:postgres@127.0.0.1:55322/postgres |
| Studio | http://127.0.0.1:55323 |
| Mailpit (emails de prueba) | http://127.0.0.1:55324 |

Usuarios de prueba (contraseña `cep-demo-2026`): `admin@`, `emilia@`, `psicologa@`, `diego@`, `yasna@`, `pedro@`, `andrea@`, `monica@` (todos `@example.com`).

## Migrar a la cuenta de Supabase

```bash
supabase link --project-ref <ref>
supabase db push        # solo migraciones; el seed de demo NO se sube
```

Después: activar PITR en el dashboard y crear los secretos de Edge Functions con `supabase secrets set`. Los buckets los crea la migración de storage.

## Modelo

```
services ─┬─ service_versions (draft → published → retired; publicada = inmutable)
          │     ├─ service_blocks      (Inicio, Ciclo 1…)
          │     ├─ service_tracks      (áreas del cuadro: Inicio, Módulos, Terapia, Coaching)
          │     ├─ service_activities  (video, form, homework, contract, therapy_session, group_session, staff_task…)
          │     ├─ service_steps       (el camino ordenado: "los 14 pasos")
          │     └─ service_requirements (requisito para entrar: criterio, obligatorio, bloquea / recuerda)
          └─ contract_templates, service_group_programs

enroll_unit() copia la versión →
enrollments ─┬─ enrollment_staff (quién cubre cada rol clínico)
             ├─ enrollment_activities / enrollment_steps / enrollment_requirements (ajustables por el equipo)
             ├─ activity_progress, staff_task_progress
             ├─ form_submissions (+ participants, files), contract_signatures
             └─ enrollment_sessions (+ agenda, notas clínicas)
```

Vistas del motor (respetan la RLS de quien consulta): `v_enrollment_state`, `v_step_state`, `v_requirement_status`, `v_activity_state`, `v_track_progress`, `v_group_progress`.

Funciones: `enroll_unit`, `publish_service_version` (valida responsables, formularios, contratos y requisitos circulares), `clone_service_version` (editar = clonar a borrador; con otro servicio = duplicar).

## Video: Bunny Stream

- Cada video es un `content_assets` con `provider = 'bunny'`, `provider_library_id` (librería) y `provider_id` (GUID del video). `processing_status` sigue la codificación (`pending → uploading → processing → ready / failed`).
- **Subida (admin):** una Edge Function crea el video en Bunny con la API key y devuelve una firma de subida TUS. El navegador sube directo a Bunny; la API key nunca sale del servidor.
- **Reproducción (paciente):** una Edge Function comprueba `private.can_view_asset()` y devuelve la URL del reproductor de Bunny con token firmado y caducidad corta (Token Authentication).
- **Webhook de Bunny:** actualiza `processing_status`, la duración y `provider_meta`.
- El avance del video se guarda en `activity_progress.video_seconds`.
- PDFs, tareas subidas y contratos siguen en Supabase Storage.
- Variables: ver `.env.example` (`BUNNY_STREAM_*`).

## Archivos

| Archivo | Contenido |
|---|---|
| `supabase/migrations/…01_extensions_enums.sql` | tipos y esquema `private` |
| `…02_identity_roles.sql` | perfiles, roles, unidades |
| `…03_catalog.sql` | catálogo + inmutabilidad de versiones |
| `…04_content_forms_contracts.sql` | assets, formularios versionados, contratos, recursos |
| `…05_enrollment.sql` | inscripción + `enroll_unit()` |
| `…06_submissions_files_signatures.sql` | respuestas inmutables, archivos, firmas |
| `…07_sessions_groups.sql` | sesiones, notas, coaching grupal |
| `…08_requirements_engine.sql` | motor de requisitos y vistas |
| `…09_ops_audit.sql` | avisos, mensajes, tokens, tareas, auditoría |
| `…10_rls.sql` | políticas de seguridad |
| `…11_storage.sql` | buckets privados y políticas |
| `…12_publish_and_clone.sql` | publicar y clonar |
| `…13_bunny_video.sql` | videos en Bunny Stream |
| `…14` · `…15` · `…16_authz_hardening*.sql` | endurecimiento de permisos (revisiones de seguridad) |
| `supabase/seed/*.sql` | usuarios, 3 servicios, pareja en el paso 9 |
| `supabase/tests/*.test.sql` | tests pgTAP |
| `web/lib/database.types.ts` | tipos para la app |
