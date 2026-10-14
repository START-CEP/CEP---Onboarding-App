# Ronda 1 de cambios de Diego — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar la primera ronda de comentarios de Diego al hub de la pareja: inicio con llamados a la acción, «El proceso» con semáforo, menú que se adapta al avance, módulos navegables, terapia con estado claro y botón de WhatsApp, perfil con preferencias, y dos secciones nuevas: **Documentos** y **Soporte**.

**Architecture:** Next.js 16 (App Router, Server Components + Server Actions) sobre Supabase (Postgres + RLS + Storage). La lógica de presentación pura vive en `web/lib/process.ts` y helpers nuevos (`web/lib/contact.ts`, `web/lib/ics.ts`), probados con `node --test`. Las tablas nuevas (`documents`, `support_tickets`, `support_messages`) y columnas (`profiles.prefs`, `staff_members.bio`) van en migraciones nuevas con pruebas pgTAP. Nada de procesos concretos en código: todo se deriva de pasos/actividades/requisitos.

**Tech Stack:** Next.js 16.4, React 19.3, TypeScript 5, Supabase (Postgres 15, pgTAP, Storage), Node 22 (`--experimental-strip-types` para pruebas), CSS propio en `web/app/globals.css`.

**Spec:** el mensaje de Diego «Primera ronda de cambios» (2026-10-14) + decisiones de Jose en esta sesión:
- Organización: **todo en un solo plan**.
- Firma del contrato: **se decide con Diego** → fuera de este plan (se mantiene la aceptación actual en `/contrato`).
- Reagendar: **WhatsApp fijo** al asistente.
- Entrevista con IA: **después**; ahora el formulario de onboarding actual es el primer paso.

## Global Constraints

- Idioma de la interfaz: español, trato **de ustedes** para la pareja, salvo los encabezados que Diego pidió en singular: «También puedes», «Lo que puedes avanzar ahora».
- Supabase **solo en la nube** (proyecto `eghgkanvueptmjruptws`). Nunca `supabase start` ni `db reset --local`. Migraciones: `supabase db push --dry-run` → **pedir OK a Jose** → `supabase db push`.
- Vercel es del cliente: no desplegar; las variables nuevas se documentan en `.env.example` para que Jose las cargue.
- Variable nueva: `NEXT_PUBLIC_WHATSAPP_ASSISTANT` = número en formato internacional solo dígitos (ej. `5215512345678`).
- Colores de semáforo: verde = hecho, naranja = lo que sigue, rojo = atrasado, gris punteado = por venir. Deben funcionar en claro y oscuro.
- Las sesiones de coaching grupal **futuras** se muestran como «Sesión de coaching grupal»; el título real solo cuando `status = 'completed'`.
- Rutas: `/pasos` pasa a `/proceso` (redirección permanente desde `/pasos`). `/contrato` sigue existiendo para firmar, pero sale del menú y se accede desde Documentos y desde el paso pendiente.
- Seguir los patrones existentes: `Suspense` + componente async por página, `ActionForm`/`FormState` para formularios de admin, `getHub()` como única fuente del estado del hub.

## Review Focus

1. **Pareja sin sesión agendada ni requisitos cumplidos** → la cuenta atrás no debe mostrar «Faltan NaN días»; debe decir «Por agendar» y el botón llevar a «Ver qué falta». (Prueba en Task 2: `nextSessionInfo` sin sesión agendada.)
2. **Servicio sin onboarding / sin radiografía / sin contrato** → esas entradas no aparecen en el menú (nada que completar ≠ pendiente). (Prueba en Task 2: `hiddenNav` con listas vacías.)
3. **Documento individual de un miembro** (p. ej. informe psicométrico de Pedro) → Andrea no lo ve ni puede descargar el archivo. (pgTAP en Task 7.)
4. **Consulta de soporte marcada como privada** → la pareja no la ve; el equipo sí. (pgTAP en Task 8.)
5. **Sin `NEXT_PUBLIC_WHATSAPP_ASSISTANT` configurada** → el botón de WhatsApp no aparece (no un enlace roto a `wa.me/`). (Prueba en Task 2: `whatsappUrl` sin variable.)

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `web/lib/contact.ts` (nuevo) | `whatsappUrl(text)` |
| `web/lib/ics.ts` (nuevo) | `icsEvent(...)` → texto iCalendar |
| `web/lib/process.ts` | + `Action.cta`, `nextSessionInfo`, `upcoming`, `stepTone`, `hiddenNav` |
| `web/lib/data/hub.ts` | `TherapySession` incluye `id` y `meeting_url` |
| `web/tests/*.test.ts` (nuevo) | pruebas `node --test` de lo anterior |
| `web/app/calendario/[kind]/[id]/route.ts` (nuevo) | descarga `.ics` de sesión o coaching |
| `web/app/(hub)/page.tsx` | inicio: cuenta atrás, cajas por profesional, CTAs |
| `web/app/(hub)/proceso/page.tsx` (mover desde `pasos`) | semáforo |
| `web/components/nav.tsx`, `web/app/(hub)/layout.tsx` | menú adaptativo + Documentos + Soporte |
| `web/app/(hub)/bienvenida/page.tsx` | modo «ya completaron» → ir a donde van |
| `web/app/(hub)/modulos/page.tsx` | anterior / siguiente / marcar completado |
| `web/app/(hub)/terapia/page.tsx` | estado agendada/por agendar, WhatsApp, perfil del profesional |
| `web/app/(hub)/coaching/page.tsx` | títulos futuros genéricos, calendario, ancla `#pregunta` |
| `supabase/migrations/20261014000022_profile_prefs_staff_bio.sql` | `profiles.prefs`, `staff_members.bio` |
| `supabase/migrations/20261014000023_documents.sql` | tabla + bucket `documents` |
| `supabase/migrations/20261014000024_support.sql` | tickets + mensajes + triggers |
| `supabase/tests/07_documents.test.sql`, `08_support.test.sql` | RLS |
| `web/app/(hub)/perfil/page.tsx`, `web/components/profile-forms.tsx`, `web/lib/actions/account.ts` | preferencias y bio del equipo |
| `web/app/(hub)/documentos/page.tsx`, `web/lib/actions/documents.ts`, `web/components/document-forms.tsx` | Documentos |
| `web/app/(hub)/soporte/page.tsx`, `web/app/equipo/soporte/page.tsx`, `web/lib/actions/support.ts`, `web/components/support-forms.tsx` | Soporte |
| `web/app/equipo/parejas/[id]/page.tsx`, `web/lib/actions/staff.ts` | subir documentos, cambiar responsables |
| `web/app/equipo/servicios/[id]/page.tsx`, `web/lib/actions/catalog.ts` | bloquear actividad (módulo) por requisito |

---

### Task 1: Consolidar lo que ya está hecho y preparar pruebas

Lo que ya está en el árbol sin commit (olvidé contraseña, logo, «¡Bienvenidos!», `/perfil`, onboarding, renombre del menú, leyenda con «Pendiente o atrasado» y «Por venir») se verifica y se guarda antes de empezar.

**Files:**
- Modify: `web/package.json`, `web/tsconfig.json`
- Create: `web/tests/smoke.test.ts`

- [ ] **Step 1: Verificar el árbol actual**

Run (desde `web/`): `npx tsc --noEmit && npm run lint && npm run build`
Expected: sin errores. Si algo falla, arreglarlo antes de seguir (es trabajo previo, no de este plan).

- [ ] **Step 2: Commit del trabajo previo**

```bash
git add -A ':!CODEX-APP-PROPOSAL' ':!*.xmind'
git commit -m "Ronda 1 (parte previa): olvidé contraseña, marca en login, perfil, onboarding y auditoría de seguridad"
```

- [ ] **Step 3: Script de pruebas**

En `web/package.json`, dentro de `"scripts"`:

```json
"test": "node --test --experimental-strip-types --no-warnings tests/"
```

En `web/tsconfig.json`, dentro de `compilerOptions`:

```json
"allowImportingTsExtensions": true,
```

- [ ] **Step 4: Prueba de humo**

`web/tests/smoke.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { firstName } from "../lib/process.ts";

test("firstName toma el primer nombre", () => {
  assert.equal(firstName("  Andrea  Demo "), "Andrea");
});
```

Run: `npm test` → Expected: `# pass 1`.

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/tsconfig.json web/tests/smoke.test.ts
git commit -m "Pruebas unitarias con node --test"
```

---

### Task 2: Helpers puros (WhatsApp, calendario, cuenta atrás, semáforo, menú)

**Files:**
- Create: `web/lib/contact.ts`, `web/lib/ics.ts`, `web/tests/contact.test.ts`, `web/tests/ics.test.ts`, `web/tests/process.test.ts`
- Modify: `web/lib/process.ts`, `web/lib/data/hub.ts:21` (TherapySession), `web/lib/data/hub.ts:72` (select), `.env.example`

**Interfaces:**
- Produces:
  - `whatsappUrl(text: string): string | null`
  - `icsEvent(e: { uid: string; title: string; start: Date; minutes: number; url?: string | null; description?: string }): string`
  - `type Action = { title; why; icon; href; minutes?; cta: string }`
  - `type SessionInfo = { title: string; staffName?: string; roleKey?: string; when: string | null; days: number | null; state: "booked" | "requested" | "ready" | "blocked"; cta: { label: string; href: string } }`
  - `nextSessionInfo(hub: Hub): SessionInfo | null`
  - `type UpcomingItem = { d: string; sm: string; t: string; s: string; role?: string; who?: string; cta?: { label: string; href: string } }`
  - `upcoming(hub: Hub): UpcomingItem[]`
  - `stepTone(hub: Hub, step: StepRow): "d" | "n" | "x" | "l"`
  - `hiddenNav(hub: Hub): string[]`
  - `hrefFor` se exporta.

- [ ] **Step 1: Pruebas que fallan**

`web/tests/contact.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappUrl } from "../lib/contact.ts";

test("sin número configurado no hay enlace", () => {
  delete process.env.NEXT_PUBLIC_WHATSAPP_ASSISTANT;
  assert.equal(whatsappUrl("hola"), null);
});

test("arma wa.me con el texto codificado", () => {
  process.env.NEXT_PUBLIC_WHATSAPP_ASSISTANT = "+52 1 55 1234-5678";
  assert.equal(whatsappUrl("Cambiar S4 ¿sí?"), "https://wa.me/5215512345678?text=Cambiar%20S4%20%C2%BFs%C3%AD%3F");
});
```

`web/tests/ics.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { icsEvent } from "../lib/ics.ts";

test("evento iCalendar válido", () => {
  const ics = icsEvent({ uid: "abc", title: "Coaching, grupal", start: new Date("2026-10-22T16:00:00Z"), minutes: 90, url: "https://meet.example.com/x" });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261022T160000Z\r\n/);
  assert.match(ics, /DTEND:20261022T173000Z\r\n/);
  assert.match(ics, /SUMMARY:Coaching\\, grupal\r\n/);
  assert.match(ics, /UID:abc@cep\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});
```

`web/tests/process.test.ts` (fábrica mínima de `Hub`; los campos que no usan las funciones van con `as never`):

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { hiddenNav, nextSessionInfo, stepTone, upcoming } from "../lib/process.ts";
import type { Hub } from "../lib/data/hub.ts";

const today = new Date("2026-10-14T15:00:00Z");
function hub(over: Partial<Hub> = {}): Hub {
  return {
    me: { id: "u1", name: "Pedro Demo" },
    enrollment: { enrollment_id: "e1", starts_on: "2026-09-01", days_left: 100 } as never,
    unitKind: "couple",
    members: [{ profileId: "u1", memberIndex: 1, name: "Pedro Demo" }, { profileId: "u2", memberIndex: 2, name: "Andrea Demo" }],
    steps: [], requirements: [], activities: [], tracks: [], group: null, groupSessions: [], sessions: [],
    staff: [{ careRoleId: "r1", roleKey: "lead_therapist", roleName: "Terapeuta", personName: "Emilia Ruiz" }],
    mine: { viewed: [], submitted: [] }, onboardingForms: [], today,
    ...over,
  };
}
const step = (o: Record<string, unknown>) => ({ step_id: "s1", position: 1, state: "current", activity_id: "a1", activity_type: "therapy_session", activity_key: "S4", title: "Sesión 4", responsible_role_id: "r1", blocking_unmet: 0, ...o }) as never;
const act = (o: Record<string, unknown>) => ({ activity_id: "a1", type: "therapy_session", is_completed: false, suggested_on: null, track_position: 1, ...o }) as never;

test("cuenta atrás con sesión agendada", () => {
  const h = hub({ steps: [step({})], activities: [act({})], sessions: [{ id: "x1", enrollment_activity_id: "a1", scheduled_at: "2026-10-19T16:00:00Z", status: "scheduled", meeting_url: null }] });
  const info = nextSessionInfo(h)!;
  assert.equal(info.state, "booked");
  assert.equal(info.days, 5);
  assert.equal(info.staffName, "Emilia Ruiz");
  assert.deepEqual(info.cta, { label: "Añadir al calendario", href: "/calendario/sesion/x1" });
});

test("sin agendar y con requisitos pendientes: bloqueada, sin días", () => {
  const info = nextSessionInfo(hub({ steps: [step({ blocking_unmet: 2 })], activities: [act({})] }))!;
  assert.equal(info.state, "blocked");
  assert.equal(info.days, null);
  assert.equal(info.cta.label, "Ver qué falta");
});

test("sin agendar y lista: botón Agendar", () => {
  const info = nextSessionInfo(hub({ steps: [step({})], activities: [act({})] }))!;
  assert.equal(info.state, "ready");
  assert.deepEqual(info.cta, { label: "Agendar", href: "/terapia#S4" });
});

test("semáforo: hecho, sigue, atrasado, por venir", () => {
  const h = hub({ activities: [act({ activity_id: "a1", suggested_on: "2026-10-01" }), act({ activity_id: "a2", suggested_on: "2026-10-30" })] });
  assert.equal(stepTone(h, step({ state: "completed" })), "d");
  assert.equal(stepTone(h, step({ state: "current", activity_id: "a1" })), "x");
  assert.equal(stepTone(h, step({ state: "current", activity_id: "a2" })), "n");
  assert.equal(stepTone(h, step({ state: "locked", activity_id: "a2" })), "l");
});

test("menú: oculta lo completado y lo que el servicio no tiene", () => {
  const h = hub({
    onboardingForms: ["f1"],
    activities: [
      act({ activity_id: "w1", type: "video_module", track_position: 1, is_completed: true }),
      act({ activity_id: "f1", type: "form", track_position: 2, is_completed: false }),
      act({ activity_id: "c1", type: "contract", track_position: 2, is_completed: true }),
    ],
  });
  assert.deepEqual(hiddenNav(h).sort(), ["/bienvenida", "/contrato", "/radiografia"]);
});

test("coaching futuro sin título y con calendario", () => {
  const h = hub({ groupSessions: [{ id: "g1", scheduled_at: "2026-10-20T01:00:00Z", title: "Ciclo negativo", status: "scheduled" }] });
  const g = upcoming(h).find((u) => u.t === "Sesión de coaching grupal")!;
  assert.equal(g.s, "");
  assert.deepEqual(g.cta, { label: "Añadir al calendario", href: "/calendario/coaching/g1" });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npm test` → Expected: FAIL (`Cannot find module '../lib/contact.ts'`, exports inexistentes).

- [ ] **Step 3: `web/lib/contact.ts`**

```ts
// Contacto directo con el asistente del equipo (WhatsApp). Sin número configurado, no se muestra el botón.
export function whatsappUrl(text: string): string | null {
  const digits = (process.env.NEXT_PUBLIC_WHATSAPP_ASSISTANT ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
```

- [ ] **Step 4: `web/lib/ics.ts`**

```ts
// Un evento iCalendar (RFC 5545) para «Añadir al calendario». Horas en UTC.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

export function icsEvent(e: { uid: string; title: string; start: Date; minutes: number; url?: string | null; description?: string }) {
  const end = new Date(e.start.getTime() + e.minutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Creciendo en pareja//CEP//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@cep`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    ...(e.url ? [`URL:${e.url}`, `LOCATION:${esc(e.url)}`] : []),
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
```

- [ ] **Step 5: `TherapySession` con `id` y `meeting_url`**

En `web/lib/data/hub.ts`:

```ts
export type TherapySession = Pick<Tables["enrollment_sessions"]["Row"], "id" | "enrollment_activity_id" | "scheduled_at" | "status" | "meeting_url">;
```

y en el `Promise.all`:

```ts
supabase.from("enrollment_sessions").select("id, enrollment_activity_id, scheduled_at, status, meeting_url").eq("enrollment_id", eid),
```

- [ ] **Step 6: `web/lib/process.ts`**

6a. `Action` lleva `cta` y `hrefFor` se exporta:

```ts
export type Action = { title: string; why: string; icon: IconName; href: string; minutes?: number | null; cta: string };

export function hrefFor(hub: Hub, type: ActivityRow["type"], activityId?: string | null) {
```

(`hrefFor`: en el `default` y en las referencias a `"/pasos"` cambiar a `"/proceso"`.)

6b. En `actionForRequirement`, añadir `cta` a cada retorno:

| caso | `cta` |
|---|---|
| pareja pendiente (`icon: "users"`) | `"Ver detalle"` |
| `task_submitted` con `task_pending` | `"Entregar tarea"` |
| `task_submitted` sin tarea pendiente | `"Ver ahora"` |
| `viewed` | `"Ver ahora"` |
| `form_submitted` | `"Responder ahora"` |
| `signed` | `"Firmar ahora"` |
| `attended` | `"Ver detalle"` |
| default (equipo) | `"Ver el proceso"` y `href: "/proceso"` |

6c. En `todayActions`: sesión lista → `cta: "Agendar"`, `href: \`/terapia#${step.activity_key}\``; otro paso → `cta: act?.type === "video_module" ? "Ver ahora" : "Ir ahora"`; pregunta de coaching → `href: "/coaching#pregunta"`, `cta: "Escribir mi pregunta"`.

6d. Añadir al final del archivo:

```ts
// ---------------------------------------------------------------- inicio: próxima sesión y agenda
export type SessionInfo = {
  title: string; staffName?: string; roleKey?: string; when: string | null; days: number | null;
  state: "booked" | "requested" | "ready" | "blocked"; cta: { label: string; href: string };
};

/** La sesión de terapia que sigue (la del paso actual o la próxima pendiente) y qué pueden hacer con ella. */
export function nextSessionInfo(hub: Hub): SessionInfo | null {
  const pending = hub.steps.filter((s) => s.activity_type === "therapy_session" && s.state !== "completed");
  const step = pending.find((s) => s.state === "current") ?? pending[0];
  if (!step) return null;
  const staff = staffFor(hub, step.responsible_role_id);
  const live = hub.sessions.find((x) => x.enrollment_activity_id === step.activity_id && x.status !== "cancelled" && x.status !== "completed");
  const base = { title: step.activity_key ? `${step.activity_key} · ${step.title ?? ""}` : step.title ?? "", staffName: staff?.personName, roleKey: staff?.roleKey };
  if (live?.scheduled_at && live.status === "scheduled") {
    const days = Math.max(0, Math.ceil((startOfDay(new Date(live.scheduled_at)).getTime() - startOfDay(hub.today).getTime()) / DAY));
    const joinable = days === 0 && live.meeting_url;
    return { ...base, when: live.scheduled_at, days, state: "booked",
      cta: joinable ? { label: "Entrar a la sesión", href: live.meeting_url! } : { label: "Añadir al calendario", href: `/calendario/sesion/${live.id}` } };
  }
  if (live?.status === "requested") return { ...base, when: null, days: null, state: "requested", cta: { label: "Ver solicitud", href: `/terapia#${step.activity_key}` } };
  if ((step.blocking_unmet ?? 0) > 0) return { ...base, when: null, days: null, state: "blocked", cta: { label: "Ver qué falta", href: `/terapia#${step.activity_key}` } };
  return { ...base, when: null, days: null, state: "ready", cta: { label: "Agendar", href: `/terapia#${step.activity_key}` } };
}

export type UpcomingItem = { d: string; sm: string; t: string; s: string; role?: string; who?: string; cta?: { label: string; href: string } };

export function upcoming(hub: Hub): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  const info = nextSessionInfo(hub);
  if (info) {
    const step = hub.steps.find((s) => s.activity_type === "therapy_session" && s.state !== "completed");
    items.push({
      d: info.when ? fmtDay(info.when) : step?.activity_key ?? "",
      sm: info.when ? fmtTime(info.when) : info.state === "requested" ? "solicitada" : info.state === "blocked" ? "por agendar" : "lista para agendar",
      t: info.title, s: info.staffName ? `Con ${info.staffName}` : "", role: info.roleKey, who: info.staffName, cta: info.cta,
    });
  }
  const g = nextGroupSession(hub);
  if (g) {
    const isToday = new Date(g.scheduled_at).toDateString() === hub.today.toDateString();
    items.push({ d: fmtDay(g.scheduled_at), sm: `${isToday ? "hoy · " : ""}${fmtTime(g.scheduled_at)}`, t: "Sesión de coaching grupal", s: "",
      cta: { label: "Añadir al calendario", href: `/calendario/coaching/${g.id}` } });
  }
  return items;
}

/** Título visible de un coaching: el real solo cuando ya se hizo. */
export const groupTitle = (g: { title: string | null; status: string }) => (g.status === "completed" && g.title ? g.title : "Sesión de coaching grupal");

// ---------------------------------------------------------------- semáforo y menú
/** d hecho (verde) · n lo que sigue (naranja) · x atrasado (rojo) · l por venir (gris) */
export function stepTone(hub: Hub, step: StepRow): "d" | "n" | "x" | "l" {
  if (step.state === "completed") return "d";
  const act = hub.activities.find((a) => a.activity_id === step.activity_id);
  const late = Boolean(act?.suggested_on) && act!.suggested_on! < hub.today.toISOString().slice(0, 10);
  if (late) return "x";
  return step.state === "current" ? "n" : "l";
}

/** Secciones de un solo uso que salen del menú cuando están completas (o el servicio no las tiene). */
export function hiddenNav(hub: Hub): string[] {
  const all = (list: ActivityRow[]) => list.every((a) => a.is_completed); // lista vacía → true → se oculta
  const firstTrack = Math.min(...hub.activities.map((a) => a.track_position ?? 99));
  const forms = hub.activities.filter((a) => a.type === "form");
  const rules: [string, ActivityRow[]][] = [
    ["/bienvenida", hub.activities.filter((a) => a.track_position === firstTrack && a.type !== "staff_task" && a.type !== "form" && a.type !== "contract")],
    ["/onboarding", forms.filter((a) => hub.onboardingForms.includes(a.activity_id ?? ""))],
    ["/radiografia", forms.filter((a) => !hub.onboardingForms.includes(a.activity_id ?? ""))],
    ["/contrato", hub.activities.filter((a) => a.type === "contract")],
  ];
  return rules.filter(([, list]) => all(list)).map(([href]) => href);
}
```

Nota: la prueba del menú espera `/bienvenida` oculto porque la única actividad de su primera área (`w1`) está hecha, `/radiografia` oculto porque no hay formularios que no sean de onboarding, y `/onboarding` visible porque `f1` está pendiente.

- [ ] **Step 7: `.env.example`**

Añadir:

```
# WhatsApp del asistente (solo dígitos, con código de país). Sin valor, no se muestra el botón.
NEXT_PUBLIC_WHATSAPP_ASSISTANT=
```

- [ ] **Step 8: Correr pruebas y tipos**

Run: `npm test && npx tsc --noEmit` → Expected: todas PASS, sin errores de tipos (si `page.tsx` usa `Action` sin `cta`, se arregla en Task 4; aquí basta con que `process.ts` compile; usar `npx tsc --noEmit 2>&1 | grep lib/` para filtrar).

- [ ] **Step 9: Commit**

```bash
git add web/lib web/tests .env.example
git commit -m "Helpers: WhatsApp, calendario .ics, próxima sesión, semáforo y menú adaptativo"
```

---

### Task 3: Descargar al calendario (`.ics`)

**Files:**
- Create: `web/app/calendario/[kind]/[id]/route.ts`

**Interfaces:**
- Consumes: `icsEvent` (Task 2), `groupTitle` (Task 2).
- Produces: `GET /calendario/sesion/{enrollment_session_id}` y `GET /calendario/coaching/{group_session_id}` → `text/calendar`.

- [ ] **Step 1: Route handler**

```ts
import { icsEvent } from "@/lib/ics";
import { groupTitle } from "@/lib/process";
import { createClient } from "@/lib/supabase/server";

// La RLS decide si el usuario puede ver la sesión; si no, 404.
export async function GET(_req: Request, ctx: RouteContext<"/calendario/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  const supabase = await createClient();
  let ev: Parameters<typeof icsEvent>[0] | null = null;

  if (kind === "sesion") {
    const { data } = await supabase.from("enrollment_sessions")
      .select("id, scheduled_at, meeting_url, status, enrollment_activities(title, key)").eq("id", id).maybeSingle();
    if (data?.scheduled_at && data.status === "scheduled") {
      const a = data.enrollment_activities;
      ev = { uid: `sesion-${data.id}`, title: `${a?.key ?? ""} · ${a?.title ?? "Sesión de terapia"} · Creciendo en pareja`, start: new Date(data.scheduled_at), minutes: 60, url: data.meeting_url };
    }
  } else if (kind === "coaching") {
    const { data } = await supabase.from("group_sessions").select("id, scheduled_at, meeting_url, title, status").eq("id", id).maybeSingle();
    if (data) ev = { uid: `coaching-${data.id}`, title: `${groupTitle(data)} · Creciendo en pareja`, start: new Date(data.scheduled_at), minutes: 90, url: data.meeting_url };
  }

  if (!ev) return new Response("No encontrado", { status: 404 });
  return new Response(icsEvent(ev), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-${id.slice(0, 8)}.ics"`, "Cache-Control": "private, no-store" },
  });
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit`. Luego con `npm run dev` y sesión de Pedro (demo en la nube), abrir `/calendario/coaching/<id de un group_session>` → descarga un `.ics` que abre en Calendar. Con un id inventado → 404.

- [ ] **Step 3: Commit**

```bash
git add web/app/calendario
git commit -m "Añadir al calendario: .ics de sesiones y coaching"
```

---

### Task 4: Inicio — cuenta atrás destacada, cajas por profesional y llamados a la acción

**Files:**
- Modify: `web/app/(hub)/page.tsx`, `web/app/globals.css`

**Interfaces:**
- Consumes: `nextSessionInfo`, `upcoming`, `Action.cta`, `roleClass`, `fmtDay`, `fmtTime` (Task 2).

- [ ] **Step 1: Bloque de cuenta atrás en el Hero**

En `Hero`, justo después del `<div className="ph">…</div>`, insertar (y calcular `const next = nextSessionInfo(hub);` al inicio de `Hero`):

```tsx
{next && (
  <div className={`countdown ${roleClass(next.roleKey)}`}>
    <div className="num">
      {next.days === null ? <Icon name="cal" size={28} /> : next.days === 0 ? "Hoy" : <>{next.days}<small>{next.days === 1 ? "día" : "días"}</small></>}
    </div>
    <div className="tx">
      <span className="k">{next.days === null ? (next.state === "requested" ? "Solicitud enviada" : "Su siguiente sesión") : next.days === 0 ? "Su sesión es hoy" : "Faltan para su siguiente sesión"}</span>
      <b>{next.title}{next.staffName ? ` · con ${firstName(next.staffName)}` : ""}</b>
      <span className="why">{next.when ? `${fmtDay(next.when)} · ${fmtTime(next.when)}` : next.state === "blocked" ? "Aún no pueden agendarla: les falta un requisito." : next.state === "ready" ? "Ya pueden agendarla." : "El equipo les confirmará la hora."}</span>
    </div>
    <Link className="btn" href={next.cta.href} {...(next.cta.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{next.cta.label} <Icon name="arrow" size={16} /></Link>
  </div>
)}
```

Importar `nextSessionInfo, upcoming` de `@/lib/process` y quitar los imports que ya no se usen (`nextGroupSession`, `staffFor` si `Upcoming` se reescribe).

- [ ] **Step 2: CSS de la cuenta atrás y cajas de sesión con color completo**

Añadir a `web/app/globals.css` (sección del hero):

```css
.countdown{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;padding:16px 18px;border-radius:var(--rad);background:color-mix(in srgb,var(--wc,#43D3C7) 26%,rgba(255,255,255,.04));border:2px solid var(--wc,#43D3C7);margin:6px 0 4px}
.countdown .num{font-family:var(--display);font-weight:800;font-size:44px;line-height:1;color:#fff;display:flex;align-items:baseline;gap:6px;min-width:64px}
.countdown .num small{font-size:14px;font-weight:700;opacity:.85}
.countdown .tx{display:flex;flex-direction:column;gap:2px;color:#fff}
.countdown .k{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;opacity:.85}
.countdown b{font-size:18px}
.countdown .why{font-size:13px;opacity:.85}
@media(max-width:700px){.countdown{grid-template-columns:auto minmax(0,1fr)}.countdown .btn{grid-column:1/-1;justify-content:center}.countdown .num{font-size:34px}}
```

Y reemplazar las reglas `.path .c.ses`, `.path .c.ses.d`, `.path .c.ses.n` (líneas 158-160) por cajas con el color completo del profesional:

```css
.path .c.ses{background:var(--wc);color:#fff;box-shadow:none;opacity:.55}
.path .c.ses.d{background:var(--wc);color:#fff;opacity:1;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}
.path .c.ses.d::after{content:"✓";position:absolute;top:2px;right:4px;font-size:10px}
.path .c.ses.n{background:var(--wc);color:#fff;opacity:1;box-shadow:0 0 0 3px #F6C35B,0 0 0 7px rgba(246,195,91,.25)}
```

En el Gantt (`.gm.ses`), mismo criterio: buscar la regla `.gm.ses` en `globals.css` y hacer que el relleno sea `var(--wc)` con texto blanco.

- [ ] **Step 3: «También puedes» con botones de acción**

En `Process`, el botón de cada fila:

```tsx
<Link className="btn soft sm" href={a.href}>{a.cta}{a.minutes ? ` · ${a.minutes} min` : ""}</Link>
```

y el botón de la misión en `Hero`:

```tsx
<Link className="btn" href={first.href}>{first.cta}{first.minutes ? ` · ${first.minutes} min` : ""} <Icon name="arrow" size={16} /></Link>
```

- [ ] **Step 4: «Lo que viene» con botón**

Reemplazar `function Upcoming` por:

```tsx
function Upcoming({ hub }: { hub: Hub }) {
  const items = upcoming(hub);
  if (items.length === 0) return <p className="muted" style={{ marginTop: 12 }}>No hay nada agendado por ahora.</p>;
  return (
    <div className="list" style={{ marginTop: 12 }}>
      {items.map((u) => (
        <div className={`li ${u.role ? `upc ${roleClass(u.role)}` : ""}`} key={u.t}>
          <span className="d">{u.d}<small>{u.sm}</small></span>
          <div className="tx"><b>{u.t}</b><span>{u.s}</span></div>
          {u.cta && (
            <Link className="btn soft sm" href={u.cta.href} {...(u.cta.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{u.cta.label}</Link>
          )}
        </div>
      ))}
    </div>
  );
}
```

CSS: `.li.upc{border-left:4px solid var(--wc);padding-left:12px;background:color-mix(in srgb,var(--wc) 7%,transparent);border-radius:var(--rad-s)}`

- [ ] **Step 5: Enlaces a `/pasos` → `/proceso`**

En `page.tsx`, `href="/pasos"` → `href="/proceso"`.

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`. Luego `npm run dev`, entrar como Pedro y Andrea (credenciales en `credenciales-demo.local.txt`) y revisar con chrome-devtools en 1280px y 390px: la cuenta atrás se ve, el color corresponde al profesional, los botones llevan al lugar correcto, nada se desborda en móvil. Revisar también modo oscuro.

- [ ] **Step 7: Commit**

```bash
git add web/app/\(hub\)/page.tsx web/app/globals.css
git commit -m "Inicio: cuenta atrás de la próxima sesión, cajas por profesional y botones de acción"
```

---

### Task 5: «El proceso» con semáforo y ruta `/proceso`

**Files:**
- Move: `web/app/(hub)/pasos/page.tsx` → `web/app/(hub)/proceso/page.tsx`
- Modify: `web/next.config.ts`, `web/app/globals.css`, `web/lib/process.ts` (ya hecho en Task 2), cualquier `"/pasos"` (`grep -rn '"/pasos"' web/`)

**Interfaces:**
- Consumes: `stepTone(hub, step)` (Task 2).

- [ ] **Step 1: Mover y redirigir**

```bash
git mv "web/app/(hub)/pasos" "web/app/(hub)/proceso"
```

En `web/next.config.ts`, dentro del objeto de configuración:

```ts
async redirects() {
  return [{ source: "/pasos", destination: "/proceso", permanent: true }];
},
```

(Si `next.config.ts` ya define `redirects`, añadir la entrada al arreglo existente.)

- [ ] **Step 2: Semáforo en la página**

En `proceso/page.tsx`, reemplazar el cálculo `st` por:

```tsx
const tone = stepTone(hub, s);
```

y usar `className={\`vstep ${tone}\`}`, el número:

```tsx
<span className="dotn">{tone === "d" ? <Icon name="check" size={16} /> : tone === "x" ? "!" : s.position}</span>
```

y las etiquetas:

```tsx
{tone === "d" && <span className="chip go">Hecho</span>}
{tone === "n" && <span className="chip warn">Sigue</span>}
{tone === "x" && <span className="chip crit">Atrasado</span>}
```

`const ok = r.is_met || tone === "d";`. Añadir debajo del encabezado una leyenda:

```tsx
<div className="legend" style={{ marginBottom: 12 }}>
  <span><i style={{ background: "var(--go)" }} />Hecho</span>
  <span><i style={{ background: "var(--warn)" }} />Sigue</span>
  <span><i style={{ background: "var(--crit)" }} />Atrasado</span>
  <span><i style={{ borderStyle: "dashed", borderColor: "var(--muted)" }} />Por venir</span>
</div>
```

Encabezado: `eyebrow` «El proceso», `h1` «El camino completo: los {n} pasos de su proceso».

- [ ] **Step 3: Tokens y CSS del semáforo**

En `:root` de la app (línea ~17) añadir `--go:#1F9D55;--go-soft:#DDF5E6;` y en **ambos** bloques oscuros `--go:#4ADE80;--go-soft:#12331F;`. Reglas:

```css
.chip.go{background:var(--go-soft);color:var(--go)}
.vstep.d .dotn{background:var(--go);color:#fff}
.vstep.n .dotn{background:var(--warn);color:#fff;box-shadow:0 0 0 4px var(--warn-soft)}
.vstep.x .dotn{background:var(--crit);color:#fff;box-shadow:0 0 0 4px var(--crit-soft)}
.vstep.l .dotn{background:transparent;border:2px dashed var(--muted);color:var(--muted)}
.vstep.d::before{background:var(--go)}
```

(Borrar las reglas viejas `.vstep.d`/`.vstep.n` que choquen; `grep -n "\.vstep\." web/app/globals.css`.)

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm run build`. En el navegador: `/pasos` redirige a `/proceso`; hay pasos verdes, uno naranja y (si la fecha sugerida pasó) rojo. Claro y oscuro.

- [ ] **Step 5: Commit**

```bash
git add -A web/app web/next.config.ts
git commit -m "El proceso: ruta /proceso y colores de semáforo"
```

---

### Task 6: Menú adaptativo, Bienvenida que lleva a donde van, módulos navegables, coaching y terapia

**Files:**
- Modify: `web/components/nav.tsx`, `web/app/(hub)/layout.tsx`, `web/app/(hub)/bienvenida/page.tsx`, `web/app/(hub)/modulos/page.tsx`, `web/components/homework.tsx:24`, `web/app/(hub)/coaching/page.tsx`, `web/app/(hub)/terapia/page.tsx`

**Interfaces:**
- Consumes: `hiddenNav`, `todayActions`, `groupTitle`, `whatsappUrl`, `nextSessionInfo`.
- Produces: `SideNav({ hidden }: { hidden: string[] })`, `BottomNav()` sin cambios; `NAV` incluye `/documentos` y `/soporte` (las páginas llegan en Tasks 7-8; hasta entonces devuelven 404, por eso esta task se commitea junto con un `page.tsx` mínimo — ver Step 1).

- [ ] **Step 1: NAV nuevo**

```ts
export const NAV: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: "/", label: "Inicio", short: "Inicio", icon: "home" },
  { href: "/proceso", label: "El proceso", short: "Proceso", icon: "route" },
  { href: "/bienvenida", label: "Bienvenida", short: "Bienvenida", icon: "play" },
  { href: "/onboarding", label: "Formulario de onboarding", short: "Onboarding", icon: "user" },
  { href: "/contrato", label: "Firmar contrato", short: "Contrato", icon: "pen" },
  { href: "/radiografia", label: "Radiografía Inicial", short: "Radiografía", icon: "pulse" },
  { href: "/modulos", label: "Módulos", short: "Módulos", icon: "book" },
  { href: "/terapia", label: "Sesiones de Terapia", short: "Terapia", icon: "heart" },
  { href: "/coaching", label: "Coaching Grupal", short: "Coaching", icon: "users" },
  { href: "/documentos", label: "Documentos", short: "Documentos", icon: "book" },
  { href: "/soporte", label: "Soporte", short: "Soporte", icon: "chat" },
];

const MOBILE = ["/", "/proceso", "/modulos", "/terapia", "/coaching"];

export function SideNav({ hidden = [] }: { hidden?: string[] }) {
  const pathname = usePathname();
  return (
    <>
      {NAV.filter((n) => !hidden.includes(n.href) || isActive(pathname, n.href)).map((n) => (
        <Link key={n.href} href={n.href} className="nav" aria-current={isActive(pathname, n.href) ? "page" : undefined}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </Link>
      ))}
    </>
  );
}
```

`Crumb`: añadir `pathname.startsWith("/soporte") ? "Soporte"` no hace falta (está en NAV). Para no romper el build, crear `web/app/(hub)/documentos/page.tsx` y `web/app/(hub)/soporte/page.tsx` mínimos:

```tsx
export default function Page() {
  return <section className="card empty">Muy pronto.</section>;
}
```

(Se reemplazan en Tasks 7 y 8.)

- [ ] **Step 2: Layout pasa `hidden`**

En `layout.tsx`:

```tsx
async function Menu() {
  const { hub } = await getHub();
  return <SideNav hidden={hub ? hiddenNav(hub) : []} />;
}
```

y reemplazar `<Suspense><SideNav /></Suspense>` por `<Suspense><SideNav /></Suspense>`→`<Suspense fallback={<SideNav />}><Menu /></Suspense>`. Importar `hiddenNav` de `@/lib/process`.

- [ ] **Step 3: Bienvenida ya completada**

En `bienvenida/page.tsx`, después de calcular `done`/`startActs`:

```tsx
const finished = hiddenNav(hub).includes("/bienvenida");
const [first] = todayActions(hub);
```

y antes del `<div className="grid2">`:

```tsx
{finished && first && (
  <div className="alert info">
    <Icon name="check" />
    <div style={{ flex: 1 }}><b>Ya completaron su bienvenida.</b> Pueden volver a ver el video cuando quieran. Lo que sigue: {first.title}.</div>
    <Link className="btn sm" href={first.href}>{first.cta} <Icon name="arrow" size={14} /></Link>
  </div>
)}
```

- [ ] **Step 4: Módulos — anterior, siguiente, marcar completado**

En `components/homework.tsx:24`, texto del estado hecho: `Completado`; y el botón de `MarkViewed` (buscar el texto del botón en el mismo componente) → `Marcar como completado`.

En `modulos/page.tsx`, `Detail` recibe `items` y calcula vecinos:

```tsx
function Pager({ items, current }: { items: ModuleItem[]; current: string }) {
  const i = items.findIndex((m) => m.activityId === current);
  const prev = items[i - 1];
  const next = items[i + 1];
  return (
    <div className="modpager">
      {prev ? <Link className="btn ghost sm" href={`/modulos?m=${encodeURIComponent(prev.key)}`}><Icon name="arrow" size={14} style={{ transform: "scaleX(-1)" }} /> {prev.title.split(" · ")[0]}</Link> : <span />}
      {next && (next.status === "locked"
        ? <span className="chip"><Icon name="lock" size={13} /> {next.title.split(" · ")[0]}: se abre al cumplir su requisito</span>
        : <Link className="btn sm" href={`/modulos?m=${encodeURIComponent(next.key)}`}>{next.title.split(" · ")[0]} <Icon name="arrow" size={14} /></Link>)}
    </div>
  );
}
```

Renderizar `<Pager items={items} current={d.activityId} />` al final de `Detail` (pasar `items` como prop). Si `Icon` no acepta `style`, envolver en `<span style={{ display: "inline-flex", transform: "scaleX(-1)" }}>`. CSS: `.modpager{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}`.

El candado por orden ya existe vía requisitos (`blocking_unmet`); lo configurable se añade en Task 9.

- [ ] **Step 5: Coaching**

En `coaching/page.tsx`:
- `{fmtDay(g.scheduled_at)} · {g.title}` → `{fmtDay(g.scheduled_at)} · {groupTitle(g)}`; igual en el encabezado de la grabación.
- En `.acts`, para sesiones no hechas: `<a className="btn ghost sm" href={\`/calendario/coaching/${g.id}\`}><Icon name="cal" size={13} /> Añadir al calendario</a>`.
- La tarjeta de pregunta: `<section className="card qblock" id="pregunta">`; texto «¿Tienes una pregunta para el próximo coaching?».

- [ ] **Step 6: Terapia**

En `terapia/page.tsx`:
- Cada fila: `<div key={a.activity_id} id={a.key ?? undefined}>` (ancla para `/terapia#S4`).
- Estado claro (reemplaza el chip «Siguiente»):

```tsx
{a.is_completed ? <span className="chip go">Hecha</span>
  : last?.status === "scheduled" ? <span className="chip info">Agendada</span>
  : last?.status === "requested" ? <span className="chip warn">Solicitud enviada</span>
  : state === "next" ? <span className="chip crit">Sin agendar</span> : null}
```

- Botón Agendar destacado: el `RequestSession` de la sesión siguiente usa `label={\`Agendar${staff ? \` con ${firstName(staff.personName)}\` : ""}\`}`.
- Agendada → botón `Añadir al calendario` (`/calendario/sesion/{id}`; incluir `id` en el `select` de `enrollment_sessions`).
- Tarjeta «¿Necesitan cambiar una fecha?»:

```tsx
const wa = whatsappUrl(`Hola, somos ${hub.members.map((m) => firstName(m.name)).join(" y ")}. Necesitamos cambiar la fecha de una sesión.`);
...
<p className="muted">Escríbanle a nuestro asistente con 24 horas de anticipación.</p>
{wa && <a className="btn" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={15} /> Escribir por WhatsApp</a>}
```

- «Quién los acompaña» con foto, nombre y perfil: ampliar la consulta para traer `staff_profile_id` y luego perfiles + bio:

```ts
const { data: team } = await supabase.from("enrollment_staff")
  .select("staff_profile_id, care_roles(key, name), profiles(full_name, avatar_path)").eq("enrollment_id", hub.enrollment.enrollment_id!);
const { data: bios } = await supabase.from("staff_members").select("profile_id, title, bio").in("profile_id", (team ?? []).map((t) => t.staff_profile_id));
const photos = new Map(await Promise.all((team ?? []).map(async (t) => [t.staff_profile_id, await avatarUrl(t.profiles?.avatar_path)] as const)));
```

y renderizar por cada miembro del equipo (excepto `coordinator`):

```tsx
<div className="pro" key={t.staff_profile_id}>
  {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada */}
  <span className={`av lg ${roleClass(t.care_roles?.key)}`}>{photos.get(t.staff_profile_id) ? <img src={photos.get(t.staff_profile_id)!} alt="" /> : (t.profiles?.full_name ?? "·").charAt(0)}</span>
  <div className="tx">
    <b>{t.profiles?.full_name}</b>
    <span className="small muted">{bio?.title ?? t.care_roles?.name}{keys ? ` · ${keys}` : ""}</span>
    {bio?.bio && <p className="small">{bio.bio}</p>}
  </div>
</div>
```

(`bio` depende de Task 7a; hasta que la columna exista, `select("profile_id, title, bio")` falla en tipos → hacer esta parte después de Task 7a, o hacer Task 7a antes de este paso.) CSS: `.pro{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;padding:10px 0;border-top:1px solid var(--line)}.av.lg{width:56px;height:56px;font-size:20px;box-shadow:0 0 0 3px var(--wc)}`.

- [ ] **Step 7: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`. Navegador: con la demo, el menú no muestra Bienvenida/Contrato si están completos; la página de bienvenida muestra el aviso; módulos tiene anterior/siguiente con candado; coaching futuro dice «Sesión de coaching grupal»; terapia muestra Agendada/Sin agendar y el botón de WhatsApp (con la variable puesta en `.env.local`).

- [ ] **Step 8: Commit**

```bash
git add -A web
git commit -m "Menú adaptativo, bienvenida que lleva a donde van, módulos navegables, coaching y terapia más claros"
```

---

### Task 7: Base de datos — preferencias, bio del equipo y Documentos

**Files:**
- Create: `supabase/migrations/20261014000022_profile_prefs_staff_bio.sql`, `supabase/migrations/20261014000023_documents.sql`, `supabase/tests/07_documents.test.sql`
- Modify: `web/lib/database.types.ts` (regenerado)

**Interfaces:**
- Produces:
  - `profiles.prefs jsonb not null default '{"remind_email":true,"remind_whatsapp":true,"app_notices":true}'`
  - `staff_members.bio text` (≤ 1200)
  - `public.document_folder` enum `('legal','process','reports','resources')`
  - `public.documents(id, enrollment_id, profile_id null, folder, title, description, storage_path, mime, size_bytes, created_by, created_at, archived_at)`
  - `private.can_view_document(p_doc uuid) returns boolean`
  - bucket `documents`, ruta `{enrollment_id}/{uuid}-{archivo}`

- [ ] **Step 1: Migración 22**

```sql
-- Preferencias de avisos del perfil y presentación del equipo (la ven las parejas en «Quién los acompaña»).
alter table public.profiles
  add column prefs jsonb not null default '{"remind_email": true, "remind_whatsapp": true, "app_notices": true}'::jsonb,
  add constraint profiles_prefs_object check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) <= 2048);

alter table public.staff_members
  add column bio text,
  add constraint staff_members_bio_len check (bio is null or char_length(bio) <= 1200);

-- Cada miembro del equipo puede editar su propia presentación (el resto de columnas, solo admin).
create policy staff_members_self_bio on public.staff_members for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create function private.guard_staff_self_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() and (new.title is distinct from old.title or new.is_active is distinct from old.is_active or new.profile_id is distinct from old.profile_id) then
    raise exception 'Solo admin puede cambiar el cargo o el estado.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger staff_members_guard_self before update on public.staff_members
  for each row execute function private.guard_staff_self_update();

-- Los avisos en la app respetan la preferencia «app_notices».
create or replace function private.respect_notice_prefs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.profile_id and (p.prefs ->> 'app_notices') = 'false') then
    return null; -- no se inserta
  end if;
  return new;
end $$;
create trigger notifications_respect_prefs before insert on public.notifications
  for each row execute function private.respect_notice_prefs();
```

- [ ] **Step 2: Migración 23**

```sql
-- Documentos que el equipo comparte con la pareja (contrato firmado, informes, recursos…), en carpetas.
-- profile_id null = para la pareja; con valor = solo para ese miembro (p. ej. un informe individual).
create type public.document_folder as enum ('legal', 'process', 'reports', 'resources');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  folder public.document_folder not null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) <= 1000),
  storage_path text not null unique,
  mime text,
  size_bytes bigint,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index documents_enrollment_idx on public.documents (enrollment_id, folder);

create function private.can_view_document(p_doc uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc and d.archived_at is null
      and (private.can_manage_enrollment(d.enrollment_id)
           or (private.is_enrollment_member(d.enrollment_id) and (d.profile_id is null or d.profile_id = auth.uid()))));
$$;
grant execute on function private.can_view_document(uuid) to authenticated;

alter table public.documents enable row level security;
create policy documents_select on public.documents for select to authenticated
  using (private.can_view_document(id) or (archived_at is not null and private.can_manage_enrollment(enrollment_id)));
create policy documents_write on public.documents for all to authenticated
  using (private.can_manage_enrollment(enrollment_id)) with check (private.can_manage_enrollment(enrollment_id));

-- El documento de un miembro tiene que ser de un miembro de esa inscripción.
create function private.guard_document_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profile_id is not null and not exists (
    select 1 from public.enrollments e join public.client_unit_members m on m.unit_id = e.unit_id
    where e.id = new.enrollment_id and m.profile_id = new.profile_id) then
    raise exception 'La persona no pertenece a esta inscripción.' using errcode = '23514';
  end if;
  if private.storage_segment(new.storage_path, 1) <> new.enrollment_id::text then
    raise exception 'La ruta del archivo no corresponde a la inscripción.' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger documents_guard before insert or update on public.documents
  for each row execute function private.guard_document_profile();

create trigger documents_audit after insert or update or delete on public.documents
  for each row execute function private.audit();

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documents', 'documents', false, 52428800,
   array['application/pdf','image/png','image/jpeg','image/webp',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create policy documents_read on storage.objects for select to authenticated using (
  bucket_id = 'documents' and exists (select 1 from public.documents d where d.storage_path = name and private.can_view_document(d.id)));
create policy documents_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'documents' and private.can_manage_enrollment(private.try_uuid(private.storage_segment(name, 1))));
create policy documents_remove on storage.objects for delete to authenticated using (
  bucket_id = 'documents' and private.can_manage_enrollment(private.try_uuid(private.storage_segment(name, 1))));
```

Antes de aplicar: confirmar que `private.audit()` es un trigger genérico usable así (`grep -n "execute function private.audit" supabase/migrations/*.sql | head -3`) y copiar la misma forma; si no aplica, quitar el trigger de auditoría.

- [ ] **Step 3: Prueba pgTAP que falla**

`supabase/tests/07_documents.test.sql` (misma convención que `06_security_audit.test.sql`: Pedro `b…001`, Andrea `b…002`, unidad `0a…001`):

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;

select has_table('public', 'documents', 'Existe la tabla de documentos');
select has_column('public', 'profiles', 'prefs', 'El perfil guarda preferencias');
select has_column('public', 'staff_members', 'bio', 'El equipo tiene presentación');

-- Datos: un documento para la pareja y otro solo para Pedro.
create temp table t_e as select id from enrollments where unit_id = '0a000000-0000-4000-8000-000000000001' limit 1;
grant select on t_e to authenticated;
insert into documents (enrollment_id, folder, title, storage_path)
  select id, 'legal', 'Contrato firmado', id || '/c-contrato.pdf' from t_e;
insert into documents (enrollment_id, profile_id, folder, title, storage_path)
  select id, 'b0000000-0000-4000-8000-000000000001', 'reports', 'Informe DISC de Pedro', id || '/r-disc-pedro.pdf' from t_e;

select pg_temp.as_user('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from documents where title = 'Contrato firmado'), 1, 'Andrea ve el documento de la pareja');
select is((select count(*)::int from documents where title = 'Informe DISC de Pedro'), 0, 'Andrea no ve el informe individual de Pedro');
select throws_ok($$ insert into documents (enrollment_id, folder, title, storage_path)
                    select id, 'resources', 'x', id || '/x.pdf' from t_e $$,
                 '42501', null, 'Andrea no puede subir documentos');
reset role;

select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is((select count(*)::int from documents where title = 'Informe DISC de Pedro'), 1, 'Pedro ve su informe');
reset role;

select throws_ok($$ insert into documents (enrollment_id, profile_id, folder, title, storage_path)
                    select id, 'c0000000-0000-4000-8000-000000000099', 'reports', 'x', id || '/y.pdf' from t_e $$,
                 null, null, 'No se puede asignar un documento a alguien ajeno a la inscripción');

select * from finish();
rollback;
```

Run: `supabase test db --linked supabase/tests/07_documents.test.sql` → Expected: FAIL (tabla no existe). La prueba corre en una transacción con `rollback`: no deja datos en la nube.

- [ ] **Step 4: Aplicar migraciones (con OK de Jose)**

```bash
supabase db push --dry-run
```

Mostrar a Jose las migraciones 22 y 23 y **esperar su OK**. Luego:

```bash
supabase db push
supabase test db --linked
```

Expected: 07 PASS (8 pruebas) y las suites 01-06 siguen en verde.

- [ ] **Step 5: Regenerar tipos**

```bash
supabase gen types typescript --linked --schema public > web/lib/database.types.ts
cd web && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261014000022_profile_prefs_staff_bio.sql supabase/migrations/20261014000023_documents.sql supabase/tests/07_documents.test.sql web/lib/database.types.ts
git commit -m "BD: preferencias del perfil, presentación del equipo y documentos por carpetas"
```

---

### Task 7b: Perfil — preferencias y presentación del equipo

**Files:**
- Modify: `web/app/(hub)/perfil/page.tsx`, `web/components/profile-forms.tsx`, `web/lib/actions/account.ts`

**Interfaces:**
- Consumes: `profiles.prefs`, `staff_members.bio` (Task 7).
- Produces: `savePrefs(_p: FormState, fd: FormData): Promise<FormState>`, `saveBio(_p: FormState, fd: FormData): Promise<FormState>` en `lib/actions/account.ts`; componentes `PrefsForm({ prefs, timezone })`, `BioForm({ bio })`.

- [ ] **Step 1: Acciones**

En `web/lib/actions/account.ts` (seguir el estilo de las acciones existentes del archivo para `FormState` y el cliente):

```ts
export async function savePrefs(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const prefs = {
    remind_email: fd.get("remind_email") === "on",
    remind_whatsapp: fd.get("remind_whatsapp") === "on",
    app_notices: fd.get("app_notices") === "on",
  };
  const timezone = String(fd.get("timezone") ?? "America/Mexico_City");
  const { error } = await supabase.from("profiles").update({ prefs, timezone }).eq("id", uid);
  return error ? { error: "No pudimos guardar tus preferencias." } : { ok: "Preferencias guardadas." };
}

export async function saveBio(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const bio = String(fd.get("bio") ?? "").trim().slice(0, 1200);
  const { error } = await supabase.from("staff_members").update({ bio: bio || null }).eq("profile_id", uid);
  return error ? { error: "No pudimos guardar tu presentación." } : { ok: "Presentación guardada." };
}
```

(Si `FormState` no se exporta desde `account.ts`, importarlo de `@/lib/actions/catalog`.)

- [ ] **Step 2: Formularios**

En `web/components/profile-forms.tsx`:

```tsx
const ZONES = [["America/Mexico_City", "Ciudad de México"], ["America/Bogota", "Bogotá / Lima"], ["America/Santiago", "Santiago"], ["America/Argentina/Buenos_Aires", "Buenos Aires"], ["Europe/Madrid", "Madrid"], ["America/New_York", "Nueva York / Miami"]] as const;

export function PrefsForm({ prefs, timezone }: { prefs: { remind_email?: boolean; remind_whatsapp?: boolean; app_notices?: boolean }; timezone: string }) {
  return (
    <ActionForm action={savePrefs}>
      <label className="check"><input type="checkbox" name="app_notices" defaultChecked={prefs.app_notices !== false} /> Avisos dentro de la app (la campana)</label>
      <label className="check"><input type="checkbox" name="remind_email" defaultChecked={prefs.remind_email !== false} /> Recordatorios de sesiones y tareas por correo</label>
      <label className="check"><input type="checkbox" name="remind_whatsapp" defaultChecked={prefs.remind_whatsapp !== false} /> Recordatorios por WhatsApp</label>
      <div className="field"><label htmlFor="tz">Tu zona horaria</label>
        <select className="input" id="tz" name="timezone" defaultValue={timezone}>{ZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      <button className="btn" style={{ alignSelf: "flex-start" }}>Guardar preferencias</button>
    </ActionForm>
  );
}

export function BioForm({ bio }: { bio: string }) {
  return (
    <ActionForm action={saveBio}>
      <div className="field"><label htmlFor="bio">Tu presentación para las parejas</label>
        <textarea className="input" id="bio" name="bio" maxLength={1200} rows={5} defaultValue={bio} placeholder="Psicóloga clínica con 10 años acompañando parejas…" />
        <span className="hint">Aparece con tu foto en «Quién los acompaña».</span>
      </div>
      <button className="btn" style={{ alignSelf: "flex-start" }}>Guardar presentación</button>
    </ActionForm>
  );
}
```

Importar `ActionForm` de `@/components/action-form` y las acciones. CSS: `.check{display:flex;gap:8px;align-items:center;font-size:14px}`.

- [ ] **Step 3: Página de perfil**

Ampliar el `select` a `"full_name, phone, email, avatar_path, prefs, timezone"`, consultar `staff_members` (`select("bio").eq("profile_id", uid).maybeSingle()`), y añadir:

```tsx
<section className="card">
  <h2 style={{ marginBottom: 6 }}>Avisos y recordatorios</h2>
  <p className="muted small" style={{ marginBottom: 14 }}>Elige cómo quieres que te recordemos sesiones, tareas y coaching.</p>
  <PrefsForm prefs={(p?.prefs ?? {}) as Record<string, boolean>} timezone={p?.timezone ?? "America/Mexico_City"} />
</section>
{staff && (
  <section className="card">
    <h2 style={{ marginBottom: 14 }}>Tu presentación</h2>
    <BioForm bio={staff.bio ?? ""} />
  </section>
)}
```

Nota: el envío de recordatorios por correo/WhatsApp aún no existe (no hay proveedor); estas preferencias quedan guardadas para cuando se conecte. `app_notices` sí tiene efecto ya (trigger de Task 7).

- [ ] **Step 4: Verificar**

`npx tsc --noEmit && npm run lint`. En el navegador: Pedro guarda preferencias y al recargar se mantienen; Emilia ve «Tu presentación», la guarda, y Pedro la ve en Terapia → «Quién los acompaña» con foto (completa ahora el Step 6 de Task 6 si se dejó pendiente).

- [ ] **Step 5: Commit**

```bash
git add -A web
git commit -m "Perfil: avisos, recordatorios, zona horaria y presentación del equipo"
```

---

### Task 7c: Página Documentos y subida desde el panel del equipo

**Files:**
- Create: `web/lib/actions/documents.ts`, `web/components/document-forms.tsx`
- Modify: `web/app/(hub)/documentos/page.tsx` (reemplaza el provisional), `web/app/equipo/parejas/[id]/page.tsx`

**Interfaces:**
- Consumes: tabla `documents`, bucket `documents`, `signedContentUrl` (patrón), `groupTitle`.
- Produces: `registerDocument(input: { enrollmentId: string; profileId: string | null; folder: "legal" | "process" | "reports" | "resources"; title: string; description: string; path: string; mime: string; size: number }): Promise<{ error?: string }>`, `archiveDocument(id: string): Promise<{ error?: string }>`; componente cliente `UploadDocument({ enrollmentId, members })`.

- [ ] **Step 1: Acciones**

`web/lib/actions/documents.ts`:

```ts
"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage } from "@/lib/db-errors";

const FOLDERS = ["legal", "process", "reports", "resources"] as const;
type Folder = (typeof FOLDERS)[number];

/** Registra un archivo que el navegador ya subió al bucket "documents" (la RLS decide quién puede). */
export async function registerDocument(input: { enrollmentId: string; profileId: string | null; folder: Folder; title: string; description: string; path: string; mime: string; size: number }) {
  if (!FOLDERS.includes(input.folder)) return { error: "Carpeta no válida." };
  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    enrollment_id: input.enrollmentId, profile_id: input.profileId, folder: input.folder,
    title: input.title.trim().slice(0, 200), description: input.description.trim() || null,
    storage_path: input.path, mime: input.mime, size_bytes: input.size,
  });
  if (error) {
    await supabase.storage.from("documents").remove([input.path]);
    return { error: dbMessage(error) ?? "No pudimos guardar el documento." };
  }
  refresh();
  return {};
}

export async function archiveDocument(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "No pudimos quitar el documento." };
  refresh();
  return {};
}
```

- [ ] **Step 2: Formulario de subida (equipo)**

`web/components/document-forms.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { archiveDocument, registerDocument } from "@/lib/actions/documents";

export const FOLDER_LABEL = { legal: "Documentos legales", process: "Documentos del proceso", reports: "Informes", resources: "Recursos" } as const;

export function UploadDocument({ enrollmentId, members }: { enrollmentId: string; members: { profileId: string; name: string }[] }) {
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string }>({});
  const [pending, start] = useTransition();
  return (
    <form className="qblock" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const file = fd.get("file") as File;
      const form = e.currentTarget;
      start(async () => {
        if (!file?.size) return setMsg({ error: "Elige un archivo." });
        const path = `${enrollmentId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error: upErr } = await createClient().storage.from("documents").upload(path, file, { contentType: file.type });
        if (upErr) return setMsg({ error: "No pudimos subir el archivo (máx. 50 MB; PDF, imagen, Word o Excel)." });
        const r = await registerDocument({
          enrollmentId, profileId: String(fd.get("for") || "") || null, folder: fd.get("folder") as keyof typeof FOLDER_LABEL,
          title: String(fd.get("title") ?? file.name), description: String(fd.get("description") ?? ""), path, mime: file.type, size: file.size,
        });
        setMsg(r.error ? r : { ok: true });
        if (!r.error) form.reset();
      });
    }}>
      <div className="ae-grid">
        <div className="field"><label>Carpeta</label><select className="input" name="folder">{Object.entries(FOLDER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>Para</label><select className="input" name="for"><option value="">La pareja</option>{members.map((m) => <option key={m.profileId} value={m.profileId}>Solo {m.name}</option>)}</select></div>
        <div className="field"><label>Título</label><input className="input" name="title" required maxLength={200} /></div>
        <div className="field"><label>Archivo</label><input className="input" type="file" name="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx" /></div>
        <div className="field wide"><label>Descripción (opcional)</label><input className="input" name="description" maxLength={1000} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn soft sm" disabled={pending}>{pending ? "Subiendo…" : "Subir documento"}</button>
        {msg.error && <span className="formerr" role="alert">{msg.error}</span>}
        {msg.ok && <span className="chip ok" role="status">Documento compartido</span>}
      </div>
    </form>
  );
}

export function ArchiveDocument({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button className="btn ghost sm" disabled={pending} onClick={() => start(async () => { await archiveDocument(id); })}>Quitar</button>;
}
```

(Confirmar la ruta del cliente de navegador: `ls web/lib/supabase/` — usar el mismo import que `components/homework.tsx` para `UploadHomework`.)

- [ ] **Step 3: Página `/documentos`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FOLDER_LABEL } from "@/components/document-forms";
import { Icon } from "@/components/icon";
import { DownloadLink } from "@/components/session-forms";
import { getHub } from "@/lib/data/hub";
import { assets, signedContentUrl } from "@/lib/data/extra";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, groupTitle } from "@/lib/process";

export const metadata: Metadata = { title: "Documentos · CEP" };

export default function DocumentsPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Documents />
    </Suspense>
  );
}

type Row = { key: string; title: string; sub: string; href: string | null; resourceId?: string; internal?: boolean };

async function Documents() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  const supabase = await createClient();
  const eid = hub.enrollment.enrollment_id!;
  const ids = hub.groupSessions.filter((g) => g.status === "completed").map((g) => g.id);
  const [{ data: docs }, { data: resources }] = await Promise.all([
    supabase.from("documents").select("id, folder, title, description, storage_path, profile_id, created_at").eq("enrollment_id", eid).is("archived_at", null).order("created_at", { ascending: false }),
    ids.length ? supabase.from("resources").select("id, title, asset_id, attach_id").eq("attach_type", "group_session").in("attach_id", ids) : Promise.resolve({ data: [] as { id: string; title: string; asset_id: string; attach_id: string }[] }),
  ]);
  const signed = new Map(await Promise.all((docs ?? []).map(async (d) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 3600, { download: d.title });
    return [d.id, data?.signedUrl ?? null] as const;
  })));
  const assetMap = await assets((resources ?? []).map((r) => r.asset_id));
  const resLinks = new Map(await Promise.all((resources ?? []).map(async (r) => [r.id, await signedContentUrl(assetMap.get(r.asset_id)?.storage_path, `${r.title}.pdf`)] as const)));

  const folders: Record<keyof typeof FOLDER_LABEL, Row[]> = { legal: [], process: [], reports: [], resources: [] };
  if (hub.activities.some((a) => a.type === "contract")) {
    const signedAll = hub.activities.filter((a) => a.type === "contract").every((a) => a.is_completed);
    folders.legal.push({ key: "contrato", title: "Contrato de servicio", sub: signedAll ? "Firmado · ver texto y firmas" : "Pendiente de firma", href: "/contrato", internal: true });
  }
  (docs ?? []).forEach((d) => folders[d.folder].push({
    key: d.id, title: d.title, href: signed.get(d.id) ?? null,
    sub: `${d.profile_id ? "Solo para ti · " : ""}${fmtDay(d.created_at)}${d.description ? ` · ${d.description}` : ""}`,
  }));
  (resources ?? []).forEach((r) => {
    const g = hub.groupSessions.find((x) => x.id === r.attach_id);
    folders.resources.push({ key: r.id, title: r.title, sub: g ? `Coaching ${fmtDay(g.scheduled_at)} · ${groupTitle(g)}` : "Coaching grupal", href: resLinks.get(r.id) ?? null, resourceId: r.id });
  });

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Documentos</p>
          <h1>Sus documentos</h1>
          <p className="lead">Todo lo que el equipo comparte con ustedes: contrato, informes y recursos para descargar.</p>
        </div>
      </div>
      <div className="grid2e">
        {(Object.keys(FOLDER_LABEL) as (keyof typeof FOLDER_LABEL)[]).map((f) => (
          <section className="card" key={f}>
            <div className="ch"><h2><Icon name="book" size={18} /> {FOLDER_LABEL[f]}</h2><span className="chip">{folders[f].length}</span></div>
            {folders[f].length === 0 ? <p className="muted small">Todavía no hay nada aquí.</p> : (
              <div className="list">
                {folders[f].map((r) => (
                  <div className="li" key={r.key}>
                    <div className="tx"><b>{r.title}</b><span>{r.sub}</span></div>
                    {r.internal ? <Link className="btn soft sm" href={r.href!}>Abrir</Link>
                      : r.href ? (r.resourceId ? <DownloadLink resourceId={r.resourceId} href={r.href}>Descargar</DownloadLink> : <a className="btn soft sm" href={r.href} target="_blank" rel="noreferrer">Descargar</a>)
                      : <span className="chip">No disponible</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
```

Ajustar la carpeta `process`: también podría listar las respuestas de la Radiografía — fuera de alcance (YAGNI); queda para cuando Diego lo pida.

- [ ] **Step 4: Panel del equipo**

En `web/app/equipo/parejas/[id]/page.tsx`, añadir a `Promise.all`:

```ts
supabase.from("documents").select("id, folder, title, profile_id, created_at").eq("enrollment_id", id).is("archived_at", null).order("created_at", { ascending: false }),
```

y una sección:

```tsx
<section className="card">
  <h2 style={{ marginBottom: 12 }}>Documentos compartidos</h2>
  <div className="list">
    {(docs.data ?? []).map((d) => (
      <div className="li" key={d.id}>
        <div className="tx"><b>{d.title}</b><span>{FOLDER_LABEL[d.folder]}{d.profile_id ? " · individual" : ""} · {fmtDay(d.created_at)}</span></div>
        <ArchiveDocument id={d.id} />
      </div>
    ))}
  </div>
  <UploadDocument enrollmentId={id} members={(members.data ?? []).map((m) => ({ profileId: m.profile_id, name: m.profiles?.full_name ?? "" }))} />
</section>
```

(Usar los nombres de variables reales de la página para `members`.)

- [ ] **Step 5: Verificar**

`npx tsc --noEmit && npm run lint && npm run build`. Navegador: como Emilia, subir un PDF «Solo Pedro» en «Informes» y otro para la pareja en «Recursos». Como Pedro ve ambos y descarga; como Andrea solo el de la pareja. El contrato aparece en «Documentos legales» y lleva a `/contrato`. Avisar a Jose de que esos archivos de prueba quedan en la nube (o quitarlos con «Quitar»).

- [ ] **Step 6: Commit**

```bash
git add -A web
git commit -m "Documentos: carpetas para la pareja y subida desde el panel del equipo"
```

---

### Task 8: Soporte (consultas con historial)

**Files:**
- Create: `supabase/migrations/20261014000024_support.sql`, `supabase/tests/08_support.test.sql`, `web/lib/actions/support.ts`, `web/components/support-forms.tsx`, `web/app/equipo/soporte/page.tsx`
- Modify: `web/app/(hub)/soporte/page.tsx` (reemplaza el provisional), `web/components/staff-nav.tsx`, `web/lib/database.types.ts`

**Interfaces:**
- Produces:
  - `support_tickets(id, enrollment_id, opened_by, subject, is_private, status 'open'|'answered'|'closed', created_at, updated_at)`
  - `support_messages(id, ticket_id, author_id, body, created_at)`
  - `private.can_view_ticket(p_ticket uuid) returns boolean`
  - Server actions: `openTicket(_p: FormState, fd: FormData)`, `replyTicket(_p: FormState, fd: FormData)`, `closeTicket(_p: FormState, fd: FormData)`.

- [ ] **Step 1: Migración 24**

```sql
-- Soporte: el canal formal para que la pareja deje consultas y quede registro de lo que se respondió.
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  opened_by uuid not null references public.profiles (id) default auth.uid(),
  subject text not null check (char_length(subject) between 1 and 200),
  is_private boolean not null default false,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references public.profiles (id) default auth.uid(),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index support_tickets_enrollment_idx on public.support_tickets (enrollment_id, updated_at desc);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create function private.can_view_ticket(p_ticket uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = p_ticket
      and (private.can_manage_enrollment(t.enrollment_id)
           or t.opened_by = auth.uid()
           or (not t.is_private and private.is_enrollment_member(t.enrollment_id))));
$$;
grant execute on function private.can_view_ticket(uuid) to authenticated;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy support_tickets_select on public.support_tickets for select to authenticated using (private.can_view_ticket(id));
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (opened_by = (select auth.uid()) and private.is_enrollment_member(enrollment_id));
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (private.can_manage_enrollment(enrollment_id) or opened_by = (select auth.uid()))
  with check (private.can_manage_enrollment(enrollment_id) or opened_by = (select auth.uid()));

create policy support_messages_select on public.support_messages for select to authenticated using (private.can_view_ticket(ticket_id));
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (author_id = (select auth.uid()) and private.can_view_ticket(ticket_id));

-- Un mensaje mueve el estado y avisa al otro lado.
create function private.on_support_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t public.support_tickets;
  v_staff boolean := private.is_staff_profile(new.author_id);
  v_coord uuid;
begin
  select * into t from public.support_tickets where id = new.ticket_id;
  update public.support_tickets set status = case when v_staff then 'answered' else 'open' end, updated_at = now() where id = t.id;

  if v_staff then
    insert into public.notifications (profile_id, enrollment_id, title, body, link)
    select m.profile_id, t.enrollment_id, 'Respondimos su consulta', t.subject, '/soporte'
    from public.enrollments e join public.client_unit_members m on m.unit_id = e.unit_id
    where e.id = t.enrollment_id and (not t.is_private or m.profile_id = t.opened_by);
  else
    select st.staff_profile_id into v_coord
    from public.enrollment_staff st join public.care_roles cr on cr.id = st.care_role_id
    where st.enrollment_id = t.enrollment_id and cr.key = 'coordinator' limit 1;
    insert into public.staff_tasks (enrollment_id, assignee_id, title, description, due_on, source, dedupe_key)
    values (t.enrollment_id, v_coord, format('Responder consulta: %s', t.subject), left(new.body, 500), current_date, 'automatic',
            'support:' || t.id || ':' || to_char(now(), 'YYYYMMDD'))
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end $$;
create trigger support_messages_after after insert on public.support_messages
  for each row execute function private.on_support_message();

-- Quien no es del equipo solo puede cerrar su consulta (no cambiar asunto, privacidad ni reabrir a mano).
create function private.guard_ticket_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage_enrollment(old.enrollment_id) and (
       new.subject is distinct from old.subject or new.is_private is distinct from old.is_private
    or new.enrollment_id is distinct from old.enrollment_id or new.opened_by is distinct from old.opened_by
    or (new.status is distinct from old.status and new.status <> 'closed'
        and current_setting('cep.support_trigger', true) is distinct from 'on')) then
    raise exception 'Solo puedes cerrar tu consulta.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger support_tickets_guard before update on public.support_tickets
  for each row execute function private.guard_ticket_update();
```

Importante: el `update` de estado dentro de `on_support_message` corre como `security definer` pero `auth.uid()` sigue siendo el paciente, así que el guard lo bloquearía. Por eso, en `on_support_message`, envolver el `update` con:

```sql
perform set_config('cep.support_trigger', 'on', true);
update public.support_tickets set ... ;
perform set_config('cep.support_trigger', 'off', true);
```

Confirmar que `staff_tasks.source` acepta `'automatic'` y `assignee_id` admite null (`awk '/create table public.staff_tasks \(/,/^\);/' supabase/migrations/*.sql`).

- [ ] **Step 2: Prueba pgTAP que falla**

`supabase/tests/08_support.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  select set_config('request.jwt.claim.sub', p::text, true);
$$;
create temp table t_e as select id from enrollments where unit_id = '0a000000-0000-4000-8000-000000000001' limit 1;
grant select on t_e to authenticated;

-- Pedro abre una consulta compartida y otra privada.
select pg_temp.as_user('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$ insert into support_tickets (enrollment_id, subject) select id, 'Factura' from t_e $$, 'Pedro abre una consulta');
select lives_ok($$ insert into support_tickets (enrollment_id, subject, is_private) select id, 'Tema personal', true from t_e $$, 'Pedro abre una consulta privada');
select lives_ok($$ insert into support_messages (ticket_id, body) select id, '¿Me envían la factura?' from support_tickets where subject = 'Factura' $$, 'Pedro escribe el mensaje');
select is((select status from support_tickets where subject = 'Factura'), 'open', 'La consulta queda abierta');
reset role;

-- Andrea ve la compartida, no la privada.
select pg_temp.as_user('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from support_tickets where subject = 'Factura'), 1, 'Andrea ve la consulta compartida');
select is((select count(*)::int from support_tickets where subject = 'Tema personal'), 0, 'Andrea no ve la consulta privada de Pedro');
select throws_ok($$ update support_tickets set subject = 'otro' where subject = 'Factura' $$, '42501', null, 'Andrea no puede editar la consulta de Pedro');
reset role;

select * from finish();
rollback;
```

Nota: para la última prueba, la política `support_tickets_update` no deja a Andrea ver la fila para actualizarla → el `update` afecta 0 filas sin error. Si `throws_ok` falla por eso, cambiar a `select is((select count(*)::int from (update ... returning 1) x), 0, ...)` no es válido en pgTAP; usar en su lugar: ejecutar el `update` con `lives_ok` y luego `reset role; select is((select subject from support_tickets where subject = 'Factura'), 'Factura', 'El asunto no cambió')`.

Run: `supabase test db --linked supabase/tests/08_support.test.sql` → FAIL (no existe la tabla).

- [ ] **Step 3: Aplicar (con OK de Jose), probar y regenerar tipos**

```bash
supabase db push --dry-run   # mostrar a Jose, esperar OK
supabase db push
supabase test db --linked
supabase gen types typescript --linked --schema public > web/lib/database.types.ts
```

Expected: 08 PASS, 01-07 PASS.

- [ ] **Step 4: Acciones**

`web/lib/actions/support.ts`:

```ts
"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/catalog";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function openTicket(_p: FormState, fd: FormData): Promise<FormState> {
  const subject = s(fd, "subject").slice(0, 200);
  const body = s(fd, "body").slice(0, 5000);
  if (!subject || !body) return { error: "Escribe el asunto y tu consulta." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("support_tickets")
    .insert({ enrollment_id: s(fd, "enrollment"), subject, is_private: fd.get("private") === "on" }).select("id").single();
  if (error || !data) return { error: "No pudimos enviar tu consulta." };
  const { error: mErr } = await supabase.from("support_messages").insert({ ticket_id: data.id, body });
  if (mErr) return { error: "La consulta se creó, pero no pudimos guardar el mensaje. Escríbelo de nuevo." };
  refresh();
  return { ok: "Consulta enviada. Te avisaremos aquí cuando respondamos." };
}

export async function replyTicket(_p: FormState, fd: FormData): Promise<FormState> {
  const body = s(fd, "body").slice(0, 5000);
  if (!body) return { error: "Escribe tu mensaje." };
  const supabase = await createClient();
  const { error } = await supabase.from("support_messages").insert({ ticket_id: s(fd, "ticket"), body });
  if (error) return { error: "No pudimos enviar el mensaje." };
  refresh();
  return { ok: "Enviado." };
}

export async function closeTicket(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("support_tickets").update({ status: "closed" }).eq("id", s(fd, "ticket"));
  if (error) return { error: "No pudimos cerrar la consulta." };
  refresh();
  return { ok: "Consulta cerrada." };
}
```

- [ ] **Step 5: Componentes**

`web/components/support-forms.tsx`:

```tsx
"use client";

import { ActionForm } from "@/components/action-form";
import { closeTicket, openTicket, replyTicket } from "@/lib/actions/support";

export function NewTicket({ enrollmentId, couple }: { enrollmentId: string; couple: boolean }) {
  return (
    <ActionForm action={openTicket}>
      <input type="hidden" name="enrollment" value={enrollmentId} />
      <div className="field"><label htmlFor="subj">Asunto</label><input className="input" id="subj" name="subject" required maxLength={200} placeholder="Ej.: Cambio de método de pago" /></div>
      <div className="field"><label htmlFor="body">Tu consulta</label><textarea className="input" id="body" name="body" required maxLength={5000} rows={4} /></div>
      {couple && <label className="check"><input type="checkbox" name="private" /> Que solo la vea yo (no mi pareja)</label>}
      <button className="btn" style={{ alignSelf: "flex-start" }}>Enviar consulta</button>
    </ActionForm>
  );
}

export function Reply({ ticketId, canClose }: { ticketId: string; canClose: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ActionForm action={replyTicket}>
        <input type="hidden" name="ticket" value={ticketId} />
        <textarea className="input" name="body" required maxLength={5000} rows={3} placeholder="Escribe tu respuesta…" aria-label="Respuesta" />
        <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Enviar</button>
      </ActionForm>
      {canClose && (
        <ActionForm action={closeTicket} inline>
          <input type="hidden" name="ticket" value={ticketId} />
          <button className="btn ghost sm">Marcar como resuelta</button>
        </ActionForm>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Página `/soporte` (pareja)**

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { NewTicket, Reply } from "@/components/support-forms";
import { getHub } from "@/lib/data/hub";
import { createClient } from "@/lib/supabase/server";
import { firstName, fmtDay, fmtTime } from "@/lib/process";
import { whatsappUrl } from "@/lib/contact";

export const metadata: Metadata = { title: "Soporte · CEP" };
const STATUS = { open: ["warn", "Esperando respuesta"], answered: ["info", "Respondida"], closed: ["ok", "Resuelta"] } as const;

export default function SupportPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Support />
    </Suspense>
  );
}

async function Support() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  const supabase = await createClient();
  const { data: tickets } = await supabase.from("support_tickets")
    .select("id, subject, status, is_private, opened_by, created_at, support_messages(id, body, created_at, author_id, profiles(full_name))")
    .eq("enrollment_id", hub.enrollment.enrollment_id!).order("updated_at", { ascending: false });
  const memberIds = new Set(hub.members.map((m) => m.profileId));
  const wa = whatsappUrl("Hola, tengo una consulta urgente.");

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Soporte</p>
          <h1>Consultas al equipo</h1>
          <p className="lead">Escríbenos aquí cualquier duda (pagos, accesos, agenda…). Queda registro de todo lo que te respondemos.</p>
        </div>
        {wa && <a className="btn ghost" href={wa} target="_blank" rel="noreferrer">¿Es urgente? WhatsApp</a>}
      </div>
      <div className="grid2">
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2>Sus consultas</h2>
          {(tickets ?? []).length === 0 && <p className="muted">Todavía no han enviado consultas.</p>}
          {(tickets ?? []).map((t) => {
            const [tone, label] = STATUS[t.status as keyof typeof STATUS];
            const msgs = [...(t.support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
            return (
              <details key={t.id} className="ticket" open={t.status !== "closed"}>
                <summary>
                  <b>{t.subject}</b>
                  <span className={`chip ${tone}`}>{label}</span>
                  {t.is_private && <span className="chip">Privada</span>}
                  <span className="small muted">{fmtDay(t.created_at)}</span>
                </summary>
                <div className="thread">
                  {msgs.map((m) => (
                    <div key={m.id} className={`msg ${memberIds.has(m.author_id) ? "me" : "team"}`}>
                      <span className="small muted">{memberIds.has(m.author_id) ? firstName(m.profiles?.full_name ?? "") : `${firstName(m.profiles?.full_name ?? "")} · equipo`} · {fmtDay(m.created_at)} {fmtTime(m.created_at)}</span>
                      <p>{m.body}</p>
                    </div>
                  ))}
                </div>
                {t.status !== "closed" && <Reply ticketId={t.id} canClose={t.opened_by === me.id} />}
              </details>
            );
          })}
        </section>
        <section className="card qblock" style={{ alignSelf: "start" }}>
          <h2>Nueva consulta</h2>
          <NewTicket enrollmentId={hub.enrollment.enrollment_id!} couple={hub.members.length > 1} />
        </section>
      </div>
    </>
  );
}
```

CSS:

```css
.ticket{border:1px solid var(--line);border-radius:var(--rad-s);padding:12px 14px}
.ticket summary{display:flex;gap:8px;align-items:center;flex-wrap:wrap;cursor:pointer;list-style:none}
.thread{display:flex;flex-direction:column;gap:10px;margin:12px 0}
.msg{padding:10px 12px;border-radius:12px;max-width:85%;white-space:pre-wrap}
.msg.me{background:var(--surface2);align-self:flex-end}
.msg.team{background:var(--accent-soft);align-self:flex-start}
```

- [ ] **Step 7: Bandeja del equipo `/equipo/soporte`**

`web/app/equipo/soporte/page.tsx`: listar tickets visibles para el usuario del equipo (la RLS filtra), con nombre de la pareja y el mismo hilo + `Reply`:

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { Reply } from "@/components/support-forms";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, fmtTime } from "@/lib/process";

export const metadata: Metadata = { title: "Soporte · Equipo CEP" };

export default function StaffSupportPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Inbox />
    </Suspense>
  );
}

async function Inbox() {
  const supabase = await createClient();
  const { data: tickets } = await supabase.from("support_tickets")
    .select("id, subject, status, is_private, created_at, enrollments(client_units(display_name)), support_messages(id, body, created_at, author_id, profiles(full_name))")
    .neq("status", "closed").order("updated_at", { ascending: false }).limit(100);
  return (
    <>
      <div className="ph"><div><p className="eyebrow">Soporte</p><h1>Consultas abiertas</h1></div><span className="chip info">{tickets?.length ?? 0}</span></div>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(tickets ?? []).length === 0 && <p className="muted">No hay consultas pendientes.</p>}
        {(tickets ?? []).map((t) => (
          <details key={t.id} className="ticket" open={t.status === "open"}>
            <summary>
              <b>{t.enrollments?.client_units?.display_name} · {t.subject}</b>
              <span className={`chip ${t.status === "open" ? "warn" : "info"}`}>{t.status === "open" ? "Sin responder" : "Respondida"}</span>
              {t.is_private && <span className="chip">Privada</span>}
            </summary>
            <div className="thread">
              {[...(t.support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((m) => (
                <div key={m.id} className="msg team"><span className="small muted">{m.profiles?.full_name} · {fmtDay(m.created_at)} {fmtTime(m.created_at)}</span><p>{m.body}</p></div>
              ))}
            </div>
            <Reply ticketId={t.id} canClose />
          </details>
        ))}
      </section>
    </>
  );
}
```

En `web/components/staff-nav.tsx`, añadir al grupo de cuidado (junto a «Parejas y agenda»): `{ href: "/equipo/soporte", label: "Soporte", icon: "chat" }`.

- [ ] **Step 8: Verificar**

`npx tsc --noEmit && npm run lint && npm run build`. Navegador: Pedro abre una consulta → aparece en `/equipo/soporte` (como Yasna/admin) y se crea una tarea de seguimiento; Yasna responde → Pedro y Andrea ven el aviso en la campana; la privada solo la ve Pedro. Avisar a Jose de los datos de prueba que quedan en la nube.

- [ ] **Step 9: Commit**

```bash
git add -A supabase web
git commit -m "Soporte: consultas con historial, avisos y bandeja del equipo"
```

---

### Task 9: Configuración del proceso desde admin (encadenamiento y responsables)

Diego quiere asegurarse de poder **cambiar, quitar y agregar pasos, encadenar requisitos y cambiar a los responsables**. Pasos (añadir/mover/editar/quitar) y requisitos por paso ya existen en `/equipo/servicios/[id]`. Faltan: (a) bloquear un **módulo** hasta cumplir otro (requisito sobre actividad, que la BD ya soporta con `target_activity_id`), y (b) cambiar **quién atiende** a una pareja concreta.

**Files:**
- Modify: `web/lib/actions/catalog.ts` (`addRequirement`), `web/app/equipo/servicios/[id]/page.tsx`, `web/lib/actions/staff.ts`, `web/app/equipo/parejas/[id]/page.tsx`

**Interfaces:**
- Produces: `addRequirement` acepta `step` **o** `activity` (uno de los dos); `assignStaff(_p: FormState, fd: FormData): Promise<FormState>` con campos `enrollment`, `role`, `staff`.

- [ ] **Step 1: `addRequirement` con objetivo actividad**

```ts
export async function addRequirement(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const step = orNull(s(fd, "step"));
  const activity = orNull(s(fd, "target_activity"));
  if (!step === !activity) return { error: "Elige si el requisito es para un paso o para una actividad." };
  const { error } = await supabase.from("service_requirements").insert({
    version_id: s(fd, "version"),
    target_step_id: step,
    target_activity_id: activity,
    required_activity_id: s(fd, "required"),
    criterion: s(fd, "criterion") as Enums["req_criterion"],
    is_mandatory: s(fd, "mandatory") !== "no",
    enforcement: (s(fd, "enforcement") || "blocks") as Enums["enforcement"],
    label: orNull(s(fd, "label")),
  });
  return fail(error, "No pudimos añadir el requisito") ?? ok("Requisito añadido.");
}
```

- [ ] **Step 2: UI «Se abre cuando…» por actividad**

En `servicios/[id]/page.tsx`, en la tarjeta de cada actividad de tipo `video_module`/`homework`/`form` (buscar dónde se listan las actividades del borrador), añadir dentro de un `<details>`:

```tsx
<details>
  <summary className="small" style={{ cursor: "pointer" }}>Se abre cuando…</summary>
  <ActionForm action={addRequirement} style={{ marginTop: 8 }}>
    <input type="hidden" name="version" value={id} /><input type="hidden" name="target_activity" value={a.id} />
    <div className="ae-grid">
      <div className="field"><label>Antes hay que…</label><select className="input" name="criterion">{CRITERIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div className="field"><label>…en la actividad</label><select className="input" name="required">{A.filter((x) => x.id !== a.id).map((x) => <option key={x.id} value={x.id}>{x.key} · {x.title}</option>)}</select></div>
      <div className="field wide"><label>Texto para la pareja (opcional)</label><input className="input" name="label" placeholder="Ej.: Ver primero el Módulo 3" /></div>
    </div>
    <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Bloquear hasta cumplirlo</button>
  </ActionForm>
</details>
```

Y mostrar los requisitos existentes de esa actividad (`reqs.filter((r) => r.target_activity_id === a.id)`) con el mismo botón «×» de `deleteRow` que usan los requisitos de pasos. Asegurar que la consulta de `reqs` incluye `target_activity_id`.

Sin «se abre cuando…», el módulo se puede adelantar (comportamiento actual). Con él, aparece con candado hasta cumplir lo pedido. Así se decide módulo por módulo.

- [ ] **Step 3: Cambiar responsables de una pareja**

En `web/lib/actions/staff.ts` (seguir el patrón de las acciones del archivo; solo admin o asistente):

```ts
export async function assignStaff(_p: FormState, fd: FormData): Promise<FormState> {
  const staff = await getStaff();
  if (!staff?.isAdmin && !staff?.roles?.includes("assistant")) return { error: "Solo admin o coordinación pueden cambiar responsables." };
  const supabase = await createClient();
  const { error } = await supabase.from("enrollment_staff").upsert(
    { enrollment_id: String(fd.get("enrollment")), care_role_id: String(fd.get("role")), staff_profile_id: String(fd.get("staff")) },
    { onConflict: "enrollment_id,care_role_id" });
  if (error) return { error: "No pudimos cambiar el responsable." };
  refresh();
  return { ok: "Responsable actualizado." };
}
```

(Revisar la forma real de `getStaff()` en `web/lib/data/staff.ts` para el chequeo de rol; ajustar `roles`/`isAdmin` a lo que devuelva. Si `staff.ts` no importa `FormState`/`refresh`, importarlos como en `catalog.ts`. Verificar que la RLS de `enrollment_staff` permite el upsert al admin/asistente: `grep -n "enrollment_staff" supabase/migrations/20261014000010_rls.sql`; si no, la acción debe fallar con el mensaje y se añade política en una migración `…025` con su prueba pgTAP.)

En `parejas/[id]/page.tsx`, la sección del equipo asignado: por cada `care_role` mostrar un `<select name="staff">` con los `staff_members` activos y `ActionForm action={assignStaff}`:

```tsx
<ActionForm action={assignStaff} inline>
  <input type="hidden" name="enrollment" value={id} /><input type="hidden" name="role" value={r.id} />
  <span className="small" style={{ minWidth: 140 }}>{r.name}</span>
  <select className="input" name="staff" defaultValue={current?.staff_profile_id ?? ""}>
    <option value="" disabled>Elegir…</option>
    {people.map((p) => <option key={p.profile_id} value={p.profile_id}>{p.profiles?.full_name}</option>)}
  </select>
  <button className="btn ghost sm">Guardar</button>
</ActionForm>
```

con `care_roles` (`select("id, key, name")`), `staff_members` (`select("profile_id, profiles(full_name)").eq("is_active", true)`) y `enrollment_staff` ampliado a `select("care_role_id, staff_profile_id, care_roles(name), profiles(full_name)")`.

- [ ] **Step 4: Verificar**

`npx tsc --noEmit && npm run lint && npm run build`. Navegador (admin): en un **borrador** del servicio, bloquear «Módulo 5» hasta «ver Módulo 4», publicar en una copia de prueba (no en el servicio real) y comprobar el candado en `/modulos` con una inscripción de prueba. Cambiar el responsable de «Psicóloga» en la pareja demo y ver que en `/terapia` cambia el nombre y el color. Devolver la asignación original al terminar.

- [ ] **Step 5: Commit**

```bash
git add -A web
git commit -m "Admin: bloquear módulos por requisito y cambiar responsables por pareja"
```

---

### Task 10: Cierre — revisión completa y nota para Diego

- [ ] **Step 1: Verificación completa**

```bash
cd web && npm test && npx tsc --noEmit && npm run lint && npm run build
cd .. && supabase test db --linked
```

Expected: todo en verde. Pegar la salida en el resumen.

- [ ] **Step 2: Recorrido visual**

Con chrome-devtools, en 1280px y 390px, claro y oscuro, como Pedro: Inicio → El proceso → Módulos (anterior/siguiente) → Terapia (WhatsApp, Agendar, perfil del equipo) → Coaching (calendario, pregunta) → Documentos → Soporte → Perfil. Tomar capturas para Diego.

- [ ] **Step 3: Documentar**

En `web/README.md`, añadir `NEXT_PUBLIC_WHATSAPP_ASSISTANT` a la lista de variables y una línea por sección nueva (Documentos, Soporte). Commit:

```bash
git add web/README.md
git commit -m "README: WhatsApp del asistente, Documentos y Soporte"
```

- [ ] **Step 4: Pendientes para Diego (no se implementan aquí)**

Incluir en el resumen a Jose:
- **Firma del contrato**: hoy es aceptación con nombre + casilla + IP/fecha (`contract_signatures`). Opciones: firma simple propia (firma dibujada + PDF sellado con hash) o integrar un proveedor (DocuSign/Dropbox Sign/SignEasy API). Depende de la jurisdicción.
- **Entrevista de onboarding con IA**: fase aparte; el formulario actual queda como primer paso.
- **Recordatorios por correo/WhatsApp**: las preferencias ya se guardan; falta conectar un proveedor (correo transaccional / WhatsApp Business).
- **Paso 1 = formulario de onboarding**: es configuración del servicio (mover el paso en `/equipo/servicios/[id]`), no código. Hacerlo en un borrador y publicarlo cuando Emilia/Diego lo aprueben.
- **Radiografía como paso**: con el menú adaptativo, desaparece del menú al completarse; sus respuestas siguen en la ficha del equipo.
