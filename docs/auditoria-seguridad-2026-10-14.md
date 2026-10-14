# Auditoría de seguridad · CEP Onboarding App · 14-10-2026

Método: las 10 auditorías de la Semana 04 (Vibe Coding), en solo lectura. No se cambió código ni la base de datos. Se revisaron el código (`web/`), las 19 migraciones, los tests y `config.toml`, y en el proyecto Supabase en la nube (`eghgkanvueptmjruptws`) solo se leyó: el asesor de seguridad, consultas SELECT y la configuración pública de Auth.

Semáforo: 🔴 se arregla antes de publicar · 🟡 a la lista de pendientes · 🟢 bien.

## Resumen

| # | Auditoría | Resultado |
|---|---|---|
| 1 | Base de datos (RLS y archivos) | 🔴 2 · 🟡 13 |
| 2 | Secretos | 🟢 (2 🟡 menores) |
| 3 | Backend (permisos) | 🔴 1 · 🟡 7 |
| 4 | Formularios y archivos | 🟡 varios, sin XSS |
| 5 | Abuso y costes | 🔴 1 (registro abierto) · 🟡 varios |
| 6 | Cuentas | 🔴 2 (registro abierto, sin SMTP) · 🟡 3 |
| 7 | Redes | 🟡 (faltan cabeceras de seguridad y URLs de redirección) |
| 8 | Dependencias | 🟢 (solo herramientas de desarrollo) |
| 9 | Errores y fugas | 🟡 (cuentas de demo en la nube, mensajes técnicos al equipo) |
| 10 | Cuentas de administrador | Guía para Jose (abajo) |

La base de la app es sólida:
- Todas las tablas tienen RLS.
- Los roles salen de `staff_roles`, que no se puede falsear.
- Todas las funciones SECURITY DEFINER fijan `search_path`.
- Las vistas usan `security_invoker`.
- Los buckets son privados.
- No hay XSS (no se usa `dangerouslySetInnerHTML`).
- No se ha subido ningún secreto a git en ningún commit.
- La clave de service_role se usa en un solo sitio y está bien protegida.

Los problemas están en los bordes: la configuración de Auth en la nube, unas pocas reglas de RLS demasiado amplias y reglas de negocio que solo comprueba la app.

---

## 🔴 Lo que hay que arreglar antes de publicar

### R1 · El registro público está abierto en la nube
- **Verificado:** `GET /auth/v1/settings` devuelve `disable_signup: false`. No hay captcha.
- **Riesgo:** la app funciona solo por invitación, pero cualquiera con la clave pública (que va en la web) puede crearse una cuenta. Esto permite R2, permite leer el nombre, correo y teléfono de todo el personal y permite subir avatares sin límite.
- **Arreglo (panel de Supabase):** Authentication → Sign In / Providers → desactivar *Allow new users to sign up*. Las invitaciones con `inviteUserByEmail` siguen funcionando.

### R2 · Robo de la inscripción de otra persona a través del correo del perfil
- **Verificado:**
  - `web/lib/actions/enroll.ts:53,67` busca a cada miembro de la pareja por `profiles.email`.
  - La política `profiles_update` (`20261014000010_rls.sql:171`) deja al usuario editar cualquier columna de su perfil, también `email`. Se comprobó en la nube: `authenticated` tiene UPDATE sobre `email`.
  - `email` no es único.
- **Ataque:**
  1. Alguien se registra (R1) o ya es paciente, y cambia su `profiles.email` al correo de una futura paciente. También puede registrarse directamente con ese correo.
  2. Cuando ventas inscribe a esa persona, el código reutiliza la cuenta del atacante y no envía invitación.
  3. El atacante entra en la pareja y ve contrato, tareas compartidas y sesiones.
  4. **Variante:** si la víctima ya tiene cuenta, hay dos perfiles con el mismo correo, `maybeSingle()` falla y no se puede inscribir.
- **Arreglo:**
  - `revoke update (email) on public.profiles from authenticated`, o un trigger que sincronice el correo desde `auth.users`.
  - Índice único sobre `lower(email)`.
  - En `enroll.ts`, buscar en `auth.users` mediante la API admin, no en `profiles`.
  - Cerrar el registro (R1).

### R3 · Cada miembro de la pareja ve el enlace y la hora de las sesiones individuales del otro
- **Verificado:** `enrollment_sessions_select` (`20261014000010_rls.sql:343`) usa `can_access_enrollment`, que funciona por inscripción y no por persona. Ninguna migración posterior lo cambia. La cabecera de esa misma migración promete lo contrario. `(hub)/terapia/page.tsx` oculta el enlace solo en pantalla: la API lo devuelve igual.
- **Ataque:** Andrea consulta `enrollment_sessions` y obtiene el `meeting_url` de la sesión individual de Pedro. Puede entrar a la videollamada.
- **Lo mismo pasa en:** `enrollment_activities_select` (:267) y `activity_progress_select` (:282). La pareja ve el título y el progreso de las actividades individuales del otro.
- **Arreglo:** en esas tres políticas, `can_manage_enrollment(enrollment_id) or can_see_activity(enrollment_activity_id)`, más un test en `02_privacy`.

### R4 · No hay SMTP propio
- Los correos (invitaciones y recuperación de contraseña) salen del remitente genérico de Supabase:
  - en inglés;
  - con un límite muy bajo por hora;
  - en general solo llegan a miembros del equipo del proyecto.
- **Riesgo:** las invitaciones a parejas reales pueden no llegar.
- **Arreglo:** configurar el SMTP del dominio (SPF, DKIM y DMARC) y plantillas en español.

---

## 🟡 Pendientes, por prioridad

### Alta (datos clínicos)
1. **Ventas puede descargar datos clínicos de las parejas que vendió.** `can_access_enrollment` incluye `sold_by = auth.uid()` (rls.sql:39). Esa función se usa en:
   - el bucket `submissions/.../shared` (`…0011_storage.sql:39-45`);
   - el bucket `contracts`;
   - progreso, sesiones y firmas, incluidas IP y navegador.

   La tabla `form_submissions` sí excluye a ventas: las reglas no coinciden. **Arreglo:** separar una función operativa (con `sold_by`) de otra clínica (sin `sold_by`).
2. **Notas internas.** `enrollments.notes_internal` lo puede leer la pareja, porque la RLS filtra filas y no columnas. **Arreglo:** moverlo a una tabla solo para el equipo, o revocar el SELECT de esa columna.
3. **`is_staff()` incluye a ventas y se usa para escribir.** Ventas puede:
   - cambiar el `meeting_url` y la grabación del coaching grupal (phishing a todas las parejas);
   - crear avisos con cualquier enlace para cualquier usuario;
   - leer `outbound_messages`;
   - ver quién hizo cada pregunta "anónima".

   **Arreglo:** crear `is_care_staff()` (admin, clínico o asistente) y exigir que `notifications.link` empiece por `/`.
4. **Ventas puede crear inscripciones directamente** (`enrollments_insert`, rls.sql:253) y saltarse las validaciones de `enroll_unit`. Además, `enroll_unit` acepta cualquier `p_status` y no comprueba si la unidad ya tiene una inscripción. **Arreglo:** quitar esa política; la RPC ya es SECURITY DEFINER.

### Media (reglas que solo comprueba la app)
5. **El paciente puede saltarse los bloqueos.**
   - Puede marcar como `completed` cualquier actividad visible mediante `activity_progress`.
   - Puede ver el video de un módulo bloqueado con `/modulos?m=<clave>`, porque se genera el token de Bunny igualmente.
   - Puede pedir sesiones directamente por REST, con su propio `meeting_url` y `staff_profile_id` (rls.sql:345). Ese enlace se le muestra al equipo.

   **Arreglo:** mover esas reglas a la BD con `with check` y triggers, y no generar el token si el módulo está `locked`.
6. **El cliente puede manipular datos de las entregas y firmas.**
   - En `form_submissions` decide `score`, `submitted_at` y `revision_of`.
   - En `files` decide bucket, ruta, mime y tamaño.
   - En `contract_signatures`, `signed_file_id` es libre.
   - Se pueden añadir archivos a entregas ya enviadas.

   **Arreglo:** que los triggers fijen esos campos y validar contra `storage.objects`.
7. **No hay límites de tamaño ni de cantidad.**
   - Ninguna tabla tiene CHECK de longitud (`answers` jsonb, `body`, `full_name`, `signer_name`).
   - No hay cuota de archivos en `submissions` ni en `avatars`. Además, `avatars` lo puede leer y listar cualquier usuario con sesión.
   - Las respuestas no se validan contra el `schema` del formulario.

   **Arreglo:** CHECKs, validación con zod en el servidor y cuotas o URLs de subida firmadas.
8. **Enlaces sin validar.** `meeting_url`, `config.url` y `notifications.link` se pintan como `href`. **Arreglo:** aceptar solo `https://` o rutas internas.

### Configuración (panel de Supabase, Vercel y Bunny)
9. **Auth en Supabase:**
   - contraseña mínima de 10 (hoy es 6, y la app pide 10 solo en su formulario);
   - activar *Leaked password protection*, *Secure password change* y *Confirm email*;
   - JWT de 15 a 30 minutos y caducidad de sesión por inactividad;
   - revisar los rate limits.
10. **URLs:**
    - *Site URL* = el dominio de producción.
    - *Redirect URLs* exactas, sin `localhost` ni comodines. `web/README.md:34` recomienda lo contrario: hay que corregirlo.
    - En `account.ts:9`, `origin()` construye los enlaces de los correos a partir de la cabecera Host. Hay que usar una variable fija `SITE_URL`.
11. **Cabeceras de seguridad.** `next.config.ts` no define ninguna. Añadir:
    - CSP con `frame-ancestors 'none'` (evita que la página de firma se meta en un iframe ajeno);
    - `frame-src` para Bunny;
    - `Referrer-Policy` y `Permissions-Policy`.
12. **Bunny.**
    - `lib/bunny.ts:14` devuelve la URL **sin token** si falta la clave: debe fallar en cerrado.
    - En el panel de Bunny, activar *Token authentication* y restringir los dominios permitidos.
    - Cada subida crea un video nuevo y deja huérfanos.
13. **Rate limit y captcha.** Añadir Turnstile o hCaptcha en Auth y un límite por IP en Vercel Firewall para `/login` y `/recuperar`.

### Baja
14. **Cuentas de demo en la nube:** 7 usuarios `@example.com`, entre ellos `admin@example.com` con rol admin, y la pareja de demo. Sus contraseñas son aleatorias y no coinciden con la pública `cep-demo-2026` (comprobado). Hay que borrarlas antes de recibir pacientes reales.
15. **Funciones expuestas.** El asesor de Supabase avisa de 4 funciones SECURITY DEFINER que puede ejecutar `authenticated`: `enroll_unit`, `publish/clone_service_version` y `generate_followups`. Todas comprueban el rol por dentro, pero `generate_followups` debería poder ejecutarla solo service role o cron.
16. **Errores.**
    - No hay `error.tsx`, `global-error.tsx` ni `not-found.tsx`: se ve la página de Next, en inglés.
    - Al equipo se le muestra `error.message` de Postgres en `enroll.ts` y `catalog.ts`.
17. **Varios.**
    - Un clínico coasignado puede editar la nota de otro.
    - `resources` lo puede escribir cualquier clínico, esté o no asignado.
    - Las asistentes ven todas las inscripciones: confirmar con el cliente que es lo que quieren.

---

## Auditoría 2 · Secretos 🟢
| Secreto | Dónde se usa | Llega al navegador | En git |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | cliente y servidor | sí (es pública por diseño) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` (`server-only`) | no | no |
| `BUNNY_STREAM_API_KEY`, `LIBRARY_ID` | `lib/actions/content.ts` | no | no |
| `BUNNY_STREAM_TOKEN_AUTH_KEY` | `lib/bunny.ts` (`server-only`) | no | no |
| `BUNNY_STREAM_CDN_HOSTNAME` | — | no | no |
| `BUNNY_STREAM_WEBHOOK_SECRET` | **no se usa** (no hay webhook) | no | no |

- Se revisó todo el historial de git: nunca se subió un `.env` ni una clave. `.env.local` y `credenciales-demo.local.txt` están ignorados.
- **Variables a configurar en Vercel:** las dos `NEXT_PUBLIC_*`, `SUPABASE_SERVICE_ROLE_KEY`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY` y `BUNNY_STREAM_TOKEN_AUTH_KEY` (además de `SITE_URL` cuando se arregle el punto 10).
- 🟡 La contraseña local `cep-demo-2026` aparece en claro en `supabase/seed/00_users_local.sql` y en el README. Hoy solo afecta al entorno local, pero ese seed no debe ejecutarse nunca contra la nube.

## Auditoría 8 · Dependencias 🟢
- `npm audit`: 5 avisos "high", todos dentro de `eslint-config-next` (`braces`, `micromatch`, `fast-glob`). Es una herramienta de desarrollo que no llega a producción. La solución que propone npm es bajar a la versión 14, que no tiene sentido: hay que esperar a que salga un parche.
- Hay parches disponibles: `next` 16.4.0 → 16.4.1 y `react` 19.3.0 → 19.3.1. Conviene actualizar con el build y los tests delante.
- No sobra ninguna dependencia: todas se usan (`tus-js-client` para las subidas a Bunny).

## Auditoría 10 · Tus cuentas de administrador (guía)
| Cuenta | Verificación en dos pasos | Quién tiene acceso | Límite de gasto | Si pierdes el acceso |
|---|---|---|---|---|
| GitHub (org START-CEP) | Settings → Password and authentication → activar, y en la org *Require two-factor authentication* | Revisar People y los Outside collaborators de la org | — (Actions: poner Spending limit = 0) | Guardar los códigos de recuperación fuera del ordenador |
| Supabase | Account → Security → MFA. En la organización, exigir MFA a los miembros | Organization → Team: solo Jose y quien decida el cliente | Billing → **Spend cap ON** | Backups: en plan gratuito no se pueden descargar. Con Pro, activar PITR o hacer un `pg_dump` periódico a un lugar seguro |
| Vercel (cuenta del cliente) | Account → Authentication → 2FA (tanto el cliente como Jose) | Team → Members | Billing → **Spend Management** con tope y alertas | El cliente es el dueño: asegurarse de tener rol Owner o Member documentado |
| Bunny | Account → Security → 2FA | Revisar usuarios y API keys; rotar la API key si alguien la vio | Billing → alertas de consumo y límite de almacenamiento y ancho de banda | Los videos originales deberían existir también fuera de Bunny |
| Correo y dominio (SMTP, DNS) | 2FA en el proveedor del dominio y en el del SMTP | — | Límite del plan del SMTP | El dominio controla el correo y las URLs: no perder ese acceso |

## Orden de trabajo propuesto
1. **Panel de Supabase** (unos 15 minutos y sin código): cerrar el registro, confirmar correo, contraseña de 10 o más y filtradas, cambio seguro de contraseña, Site URL y Redirect URLs exactas, spend cap y MFA.
2. **Una migración de endurecimiento con sus tests:**
   - R2 (correo del perfil);
   - R3 (sesiones y actividades individuales);
   - pendientes 1 a 4 (ventas, notas internas, `is_care_staff`, `enrollments_insert`);
   - CHECKs de `https://` y longitudes.
3. **Código:**
   - `enroll.ts`: buscar por `auth.users`;
   - `SITE_URL` fija;
   - `bunny.ts` que falle en cerrado;
   - no generar el video de un módulo bloqueado;
   - cabeceras en `next.config.ts`;
   - `error.tsx` y `not-found.tsx`.
4. **SMTP propio y plantillas en español.**
5. **Antes de tener pacientes reales:** borrar las cuentas de demo de la nube y pasar la prueba en producción y la prueba final "el agente como atacante".
