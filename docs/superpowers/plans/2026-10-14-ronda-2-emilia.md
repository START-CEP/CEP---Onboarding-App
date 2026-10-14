# Ronda 2 (Emilia) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Pasos con `- [ ]`.

**Goal:** Aplicar la revisión de Emilia (transcripción de la reunión del 2026-10-14). Por un lado, los cambios de la app (textos, paleta, sesiones con tipo, módulos con varios contenidos, preguntas frecuentes del contrato, video de coaching, política de cancelación). Por otro, los del servicio de $3.000, publicados como versión 3, con la pareja demo reinscrita en ella.

**Architecture:** Lo configurable va en `service_activities.config` (y se copia a `enrollment_activities.config` al inscribir):
- `session_label`: tipo de sesión («Sesión de terapia de pareja»…).
- `items`: contenidos extra de un módulo, `[{asset_id, title}]`.
- `faq`: preguntas frecuentes del contrato, `[{q, a}]`.

El `asset_id` de la actividad del contrato es su video de preguntas frecuentes, y el de la actividad de coaching grupal, su video de presentación. Solo hace falta una migración: `can_view_asset` debe aceptar los `items` del `config`. Los datos del servicio van en un script SQL (`supabase/seed/30_pareja_v3.sql`) y la reinscripción de la demo en `31_demo_pareja_v3.sql`.

**Tech Stack:** Next.js 16, Supabase, `node --test` (TZ=UTC).

**Spec:** transcripción «10-14 Reunión de revisión: Plataforma y flujo de terapia de pareja», más estas decisiones de Jose:
- Colores: la interfaz usa el celeste y el naranja del logo, sin turquesa. Emilia en celeste, Diego en naranja y la psicóloga en morado.
- Servicio: se publica la v3 y la demo (Pedro y Andrea) se reinscribe en ella.

## Global Constraints
- Supabase solo en la nube. La migración 29 y los scripts de datos se ejecutan tras el OK de Jose (los datos de la v3 y la reinscripción ya están aprobados).
- Cero turquesa (`#0C8F8C`, `#43D3C7`, `#5FE0D4`) en la interfaz. Celeste del logo `#7AC7E0` (claro) / `#1F86B0` (texto y botones sobre blanco); naranja `#F9B13D`.
- «obligatorio» no aparece en ningún texto para la pareja; se usa «indispensable».
- Nada de «solo lo ve el equipo, no {pareja}»: el cliente es la relación.

## Review Focus
1. Un módulo bloqueado no entrega las URLs firmadas de sus videos extra (prueba en Task 3).
2. Una pareja inscrita en otra versión no puede ver los videos extra de un módulo (prueba pgTAP en Task 5).
3. Un `config.items` mal formado (no es un arreglo, o le falta `asset_id`) no rompe la página (prueba en Task 3).
4. Requisitos acumulados (S9 = M0–M8): el chip no debe listar 9 elementos; se resume (prueba en Task 1).
5. Al reinscribir la demo, el proceso viejo queda cancelado, sin borrarse, y el hub muestra el nuevo (verificación en Task 6).

---

### Task 1: Textos (login, privacidad, «indispensable», requisitos resumidos, terapia, consultas)
- Login: «Entra con tu correo y tu contraseña. Este acceso es solo para ti; tu pareja tiene el suyo.»
- Quitar los chips y textos «solo la lee el equipo, no X» (`questionnaires.tsx`, `homework.tsx`, `modulos/page.tsx`). Usar en su lugar: «Tus respuestas individuales quedan en tu ficha; lo que responden en pareja queda en la ficha de los dos.»
- `process.ts`: «Es obligatorio para» → «Es indispensable para».
- `reqSummary(reqs)` nuevo y probado: los cumplidos se resumen como «✓ N completados» y los pendientes se muestran uno a uno.
- Encabezado de requisitos en sesiones: «Para esta sesión es importante haber visto y completado:».
- Terapia:
  - Tarjeta «¿Necesitan cambiar una fecha?» → «Con gusto podemos apoyarles. Por favor, cualquier cambio con más de 72 horas de anticipación.»
  - Nueva tarjeta «Política de cancelación».
  - «Qué veremos» solo cuando el equipo cargó temas (`session_agenda_items`), sin caer en `summary`.
- Nav: «Soporte» → «Consultas al equipo».
- Pruebas: `reqSummary` y el texto «indispensable».

### Task 2: Paleta celeste y naranja
- Tokens en `globals.css` (claro, oscuro y hero): `--accent`, `--accent-soft`, `--ok`, `--side-active-ink`, `--hi`, `--w-emilia` (celeste), `--w-psico` (morado), `--w-diego` (naranja). Sustituir los hex turquesa sueltos.
- Casillas hechas en el hero: fondo blanco, borde celeste y letra negra.
- Verificación: `grep -iE "0C8F8C|43D3C7|5FE0D4"` en `web/app web/components` → 0 resultados. Capturas en claro y oscuro.

### Task 3: La app lee la configuración nueva
- `lib/activity-config.ts` con funciones puras y probadas:
  - `sessionLabel(cfg, participants)`
  - `parseItems(cfg)`
  - `parseFaq(cfg)`
- `getHub` añade `configs: Record<activityId, Json>` (una sola consulta a `enrollment_activities`, que sustituye a la de formularios).
- Etiqueta de sesión en el hero (tooltip), en `/proceso` y en `/terapia`.
- Casillas del hero → `Link` a `/proceso#paso-N` (anclas en `/proceso`).
- Módulos: lista desplegable de los contenidos del módulo (video principal, videos extra, PDF, tarea). Videos extra con `Video`; PDFs con enlace firmado. Bloqueado → no se firma nada.
- Contrato: bloque «Preguntas frecuentes», con video (`asset_id`) y `faq`.
- Coaching: bloque «Qué es el coaching grupal», con el video (`asset_id`) y el `summary` de la actividad CG.
- Pruebas: los tres parsers, incluido el `config` mal formado.

### Task 4: Admin — editor de actividades
- `buildConfig` se extrae a `lib/activity-config.ts` (probado) y conserva las claves desconocidas.
- Campos nuevos en `ActivityEditor`:
  - Sesión: «Tipo de sesión» (`session_label`).
  - Módulo / lectura / tarea: «Contenido adicional» (lista de asset + título).
  - Contrato: «Preguntas frecuentes» (lista de pregunta y respuesta) y video (selector de asset).
  - Coaching grupal: video de presentación.
- `USES.asset` incluye `contract` y `group_session`.

### Task 5: Migración 29 — `can_view_asset` con `config.items`
- Cláusula: `exists (select 1 from enrollment_activities ea where ea.config->'items' @> jsonb_build_array(jsonb_build_object('asset_id', p_asset::text)) and private.can_see_activity(ea.id))`.
- pgTAP `09_module_items.test.sql`, ejecutada por la API con transacción abortada:
  - Un miembro ve el asset extra de su módulo.
  - Un usuario de otra pareja no lo ve.
- RED antes del push y GREEN después.

### Task 6: Servicio v3 y demo
- `seed/30_pareja_v3.sql` (idempotente: no hace nada si ya existe la v3). Clona la v2 con `clone_service_version` y aplica:
  - Pasos:
    1. Bienvenida (WEL)
    2. Onboarding (ONB: contrato · accesos · grupo de WhatsApp)
    3. Radiografía Inicial (RAD_IND)
    4. Módulo 0
    5. S1–S10 (pasos 5 a 14)
  - Se borran ENT y ONB_FORM, con sus pasos y requisitos. Las preguntas del formulario de onboarding pasan como primera sección («Datos básicos») a una nueva versión del formulario «Radiografía Inicial · individual».
  - Orden del área Inicio: WEL, CON, WA, RAD_IND, RAD_PAR, ONB.
  - Módulos: M0 «Responsabilidad y validación emocional»; M1–M8 con los nombres de Emilia.
  - Requisitos de S1–S9: S_n exige M0…M_{n-1} (`task_submitted`; `viewed` si el módulo no tiene tarea), todos obligatorios y que bloquean, con etiqueta «Módulo k». S1 conserva RAD_IND y RAD_PAR.
  - Textos:
    - S1: «Devolución de la Radiografía Inicial: alinear expectativas y generar metas del proceso y el camino a seguir.»
    - S4: «Sesión para los dos, con Diego: entender la personalidad de cada uno (DISC).»
    - S5: «Se inicia a profundizar en el ciclo negativo de la pareja.»
    - S8: título y paso «Frases poderosas y plan de acción».
  - `session_label`: S1 y S5–S10 «Sesión de terapia de pareja»; S2 y S3 «Sesión individual»; S4 «Sesión de coaching en pareja».
  - FAQ del contrato (3 preguntas, redactadas con lo que dijo Emilia; las revisa ella).
  - Summary de CG que explica el coaching grupal.
  - Publicar.
- `seed/31_demo_pareja_v3.sql`: cancela la inscripción vieja de Pedro y Andrea (no la borra) y los inscribe en la v3 con el mismo avance (S1–S4 hechas; S5 actual con M3/M4 pendientes).
- Verificación: el hub de Pedro muestra los pasos nuevos (capturas) y la pareja de la v1 queda cancelada.

### Task 7: Verificación completa, revisión final y entrega
- `npm test`, tsc, lint, build y recorrido con puppeteer contra `next start :3100`.
- Revisor final (opus). Correcciones en una sola pasada.
- Commit y, si Jose lo confirma, merge a main + push.

## Fuera de alcance (anotar para Jose)
- Asistente con IA que conozca el proceso («biblioteca integral de conocimiento»).
- Entrevista de Radiografía con IA.
- Informe automático del cuestionario del taller de sexualidad.
- Bonos: se cargan como área «Bonos» desde el admin cuando haya videos.
- Contenido real de la Radiografía (los bloques de Emilia: datos básicos, origen, pruebas y crisis, heridas vivas, anhelos): lo carga ella en el constructor de formularios.
- Perfil de personalidad: falta el enlace o el test.
