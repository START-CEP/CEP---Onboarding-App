// Traduce el estado del motor (vistas de Supabase) a lo que muestra el hub.
// Es genérico: no conoce el proceso de $3.000, solo pasos, actividades, áreas y requisitos.
import type { IconName } from "@/components/icon";
import type { ActivityRow, Hub, RequirementRow, StepRow } from "@/lib/data/hub";

const DAY = 86_400_000;

/** Clase de color por rol clínico (mismos colores que la maqueta). */
export function roleClass(roleKey: string | null | undefined) {
  switch (roleKey) {
    case "lead_therapist":
      return "w-emilia";
    case "psychologist":
      return "w-psico";
    case "disc_specialist":
      return "w-diego";
    default:
      return "w-team";
  }
}

/** "Módulo 3 · Personalidad…" → "Módulo 3" */
export const shortTitle = (title: string | null | undefined) => (title ?? "").split(" · ")[0];

export function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? "";
}

export function staffFor(hub: Hub, careRoleId: string | null | undefined) {
  return hub.staff.find((s) => s.careRoleId === careRoleId);
}

export function stepLabel(step: StepRow) {
  return step.activity_type === "therapy_session" ? step.activity_key ?? "" : shortTitle(step.title);
}

export function currentStep(hub: Hub) {
  return hub.steps.find((s) => s.state === "current") ?? null;
}

export function weekOf(hub: Hub, date: Date | string) {
  const start = new Date(`${hub.enrollment.starts_on}T00:00:00`);
  const d = typeof date === "string" ? new Date(date.length === 10 ? `${date}T00:00:00` : date) : date;
  return Math.floor((d.getTime() - start.getTime()) / (7 * DAY)) + 1;
}

export function fmtDay(date: string | Date) {
  // Una fecha sin hora ("2026-09-01") se muestra tal cual, sin desplazarla por la zona horaria.
  const d = typeof date === "string" ? new Date(date.length === 10 ? `${date}T12:00:00Z` : date) : date;
  return d.toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "America/Mexico_City" }).replace(".", "");
}

export function fmtTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Mexico_City" });
}

// ---------------------------------------------------------------- requisitos y "qué hacer hoy"
export type Action = { title: string; why: string; icon: IconName; href: string; minutes?: number | null; cta: string };

export function hrefFor(hub: Hub, type: ActivityRow["type"], activityId?: string | null) {
  if (activityId && hub.onboardingForms.includes(activityId)) return "/onboarding";
  switch (type) {
    case "video_module":
    case "homework":
      return "/modulos";
    case "form":
      return "/radiografia";
    case "contract":
      return "/contrato";
    case "therapy_session":
      return "/terapia";
    case "group_session":
      return "/coaching";
    default:
      return "/proceso";
  }
}

export function stepRequirements(hub: Hub, stepId: string | null | undefined): RequirementRow[] {
  return hub.requirements
    .filter((r) => r.target_step_id === stepId)
    .sort((a, b) => Number(a.is_met) - Number(b.is_met) || (a.label ?? "").localeCompare(b.label ?? ""));
}

function actionForRequirement(hub: Hub, r: RequirementRow, target: string): Action {
  const act = hub.activities.find((a) => a.activity_id === r.required_activity_id);
  const title = act?.title ?? r.required_title ?? "";
  const short = shortTitle(title);
  const why = `${r.is_mandatory ? "Es obligatorio para" : "Lo necesitan para"} entrar a ${target}`;
  const base = { why, href: hrefFor(hub, r.required_type ?? act?.type ?? "checklist", r.required_activity_id), minutes: act?.estimated_minutes };

  // Requisito que cumple cada miembro: si yo ya hice mi parte, lo que falta es de mi pareja.
  const perMember = act?.participants === "each_member" || act?.response_scope === "individual";
  const myPartDone =
    (r.criterion === "viewed" && hub.mine.viewed.includes(r.required_activity_id ?? "")) ||
    ((r.criterion === "task_submitted" || r.criterion === "form_submitted") && hub.mine.submitted.includes(r.required_activity_id ?? ""));
  const partner = hub.members.find((m) => m.profileId !== hub.me.id);
  if (perMember && myPartDone && partner) {
    const what = r.criterion === "viewed" ? `vea el ${short}` : r.criterion === "task_submitted" ? `entregue la tarea del ${short}` : `responda ${short}`;
    return { ...base, title: `Falta que ${firstName(partner.name)} ${what}`, why: `Tú ya hiciste tu parte. ${why}.`, icon: "users", cta: "Ver detalle" };
  }

  switch (r.criterion) {
    case "task_submitted":
      return act?.task_pending
        ? { ...base, title: `Entregar la tarea del ${short}`, icon: "pen", cta: "Entregar tarea" }
        : { ...base, title: `Ver el ${short} y entregar su tarea`, icon: "play", cta: "Ver ahora" };
    case "viewed":
      return { ...base, title: `Ver el ${title}`, icon: "play", cta: "Ver ahora" };
    case "form_submitted":
      return { ...base, title: `Responder: ${title}`, icon: "pulse", cta: "Responder ahora" };
    case "signed":
      return { ...base, title: "Firmar el contrato", icon: "pen", cta: "Firmar ahora" };
    case "attended":
      return { ...base, title: `Asistir a ${title}`, icon: "cal", cta: "Ver detalle" };
    default:
      return { ...base, title: `El equipo está completando: ${title}`, icon: "clock", href: "/proceso", cta: "Ver el proceso" };
  }
}

export function stepTarget(hub: Hub, step: StepRow) {
  const who = staffFor(hub, step.responsible_role_id)?.personName;
  return `${step.activity_type === "therapy_session" ? `la ${step.activity_key}` : `«${step.title}»`}${who ? ` con ${who}` : ""}`;
}

export function todayActions(hub: Hub): Action[] {
  const step = currentStep(hub);
  const actions: Action[] = [];
  if (step) {
    const target = stepTarget(hub, step);
    const unmet = stepRequirements(hub, step.step_id).filter((r) => !r.is_met);
    // Primero lo que esta persona puede hacer; después lo que falta de su pareja.
    const reqActions = unmet.map((r) => actionForRequirement(hub, r, target));
    actions.push(...reqActions.filter((a) => a.icon !== "users"), ...reqActions.filter((a) => a.icon === "users"));
    if (unmet.length === 0) {
      const who = staffFor(hub, step.responsible_role_id)?.personName;
      if (step.activity_type === "therapy_session") {
        actions.push({ title: `Agendar su ${step.activity_key}${who ? ` con ${who}` : ""}`, why: step.description ?? "", icon: "cal", href: `/terapia#${step.activity_key}`, cta: "Agendar" });
      } else {
        const act = hub.activities.find((a) => a.activity_id === step.activity_id);
        actions.push({ title: step.title ?? "", why: step.description ?? "", icon: act?.type === "video_module" ? "play" : "route", href: hrefFor(hub, act?.type ?? "checklist", act?.activity_id), minutes: act?.estimated_minutes, cta: act?.type === "video_module" ? "Ver ahora" : "Ir ahora" });
      }
    }
  }
  const next = nextGroupSession(hub);
  if (next && new Date(next.scheduled_at).getTime() - hub.today.getTime() < 14 * DAY) {
    actions.push({ title: "Dejar su pregunta para el coaching grupal", why: `Próximo coaching: ${fmtDay(next.scheduled_at)} · ${fmtTime(next.scheduled_at)}`, icon: "chat", href: "/coaching#pregunta", minutes: 2, cta: "Escribir mi pregunta" });
  }
  return actions;
}

/** Actividades de la pareja cuya fecha sugerida ya pasó y no están hechas (a la izquierda de la línea dorada). */
export function lateActivities(hub: Hub) {
  const today = hub.today.toISOString().slice(0, 10);
  return hub.activities.filter((a) => a.type !== "staff_task" && !a.is_completed && Boolean(a.suggested_on) && a.suggested_on! < today);
}

export function nextGroupSession(hub: Hub) {
  return hub.groupSessions.find((g) => g.status === "scheduled" && new Date(g.scheduled_at) >= startOfDay(hub.today)) ?? null;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ---------------------------------------------------------------- cuadro de las áreas (semanas)
/** d hecho · n lo siguiente · w video visto, falta la tarea · x atrasado · l por venir */
export type Marker = { col: number; label: string; state: "d" | "n" | "w" | "x" | "l"; title: string; roleClass?: string; dot?: boolean };
export type TrackLine = { key: string; name: string; sub: string; chip: { tone: "ok" | "warn" | "crit" | "info"; text: string; lock?: boolean }; markers: Marker[] };

export function weekGrid(hub: Hub) {
  const weeks = [
    ...hub.activities.filter((a) => a.suggested_on).map((a) => weekOf(hub, a.suggested_on!)),
    ...hub.groupSessions.map((g) => weekOf(hub, g.scheduled_at)),
    weekOf(hub, hub.today),
    4,
  ];
  const total = Math.min(Math.max(...weeks), 52);
  const months: { label: string; span: number }[] = [];
  const start = new Date(`${hub.enrollment.starts_on}T00:00:00`);
  for (let w = 1; w <= total; w++) {
    const label = new Date(start.getTime() + (w - 1) * 7 * DAY).toLocaleDateString("es", { month: "short" }).replace(".", "");
    const name = label.charAt(0).toUpperCase() + label.slice(1);
    if (months.at(-1)?.label === name) months.at(-1)!.span++;
    else months.push({ label: name, span: 1 });
  }
  return { total, months, todayWeek: weekOf(hub, hub.today) };
}

export function trackLines(hub: Hub, total: number): TrackLine[] {
  const step = currentStep(hub);
  const currentNeeds = new Set(stepRequirements(hub, step?.step_id).filter((r) => !r.is_met).map((r) => r.required_activity_id));
  const clamp = (w: number) => Math.min(Math.max(w, 1), total);
  const todayKey = hub.today.toISOString().slice(0, 10);
  // Atrasado: su fecha sugerida ya pasó (queda a la izquierda de la línea dorada) y no está hecho.
  const late = (a: ActivityRow) => !a.is_completed && Boolean(a.suggested_on) && a.suggested_on! < todayKey;

  return hub.tracks.map((t) => {
    const acts = hub.activities.filter((a) => a.track_key === t.track_key && a.type !== "staff_task");
    const stateOf = (a: ActivityRow): Marker["state"] =>
      a.is_completed ? "d" : a.task_pending ? "w" : late(a) ? "x" : a.activity_id === step?.activity_id || currentNeeds.has(a.activity_id) ? "n" : "l";

    let markers: Marker[];
    const groupAct = acts.find((a) => a.type === "group_session");
    if (groupAct) {
      const next = nextGroupSession(hub);
      markers = hub.groupSessions.map((g) => ({
        col: clamp(weekOf(hub, g.scheduled_at)),
        label: "",
        dot: true,
        title: `Coaching ${fmtDay(g.scheduled_at)}`,
        state: g.status === "completed" ? "d" : g.id === next?.id ? "n" : "l",
      }));
    } else {
      // Varias actividades en la misma semana se agrupan en una marca "x/y".
      const byWeek = new Map<number, ActivityRow[]>();
      acts.forEach((a) => {
        const w = clamp(a.suggested_on ? weekOf(hub, a.suggested_on) : 1);
        byWeek.set(w, [...(byWeek.get(w) ?? []), a]);
      });
      markers = [...byWeek.entries()].map(([col, list]) => {
        if (list.length === 1) {
          const a = list[0];
          return {
            col,
            label: a.key ?? "",
            title: a.title ?? "",
            state: stateOf(a),
            roleClass: a.type === "therapy_session" ? roleClass(staffRoleKey(hub, a.responsible_role_id)) : undefined,
          };
        }
        const done = list.filter((a) => a.is_completed).length;
        const states = list.map(stateOf);
        return {
          col,
          label: done === list.length ? "Listo" : `${done}/${list.length}`,
          title: list.map((a) => a.title).join(" · "),
          state: done === list.length ? "d" : states.includes("x") ? "x" : states.includes("w") ? "w" : states.includes("n") ? "n" : "l",
        };
      });
    }

    const pendingTasks = acts.filter((a) => a.task_pending).map((a) => a.key);
    const holdsCurrent = step && acts.some((a) => a.activity_id === step.activity_id) && (step.blocking_unmet ?? 0) > 0;
    const allDone = acts.length > 0 && acts.every((a) => a.is_completed);
    const lateKeys = acts.filter((a) => late(a) && !a.task_pending).map((a) => a.key);
    const chip: TrackLine["chip"] = lateKeys.length
      ? { tone: "crit", text: `Atrasado: ${lateKeys.join(", ")}` }
      : pendingTasks.length
      ? { tone: "warn", text: `Falta tarea ${pendingTasks.join(", ")}` }
      : holdsCurrent
        ? { tone: "warn", text: `${step!.activity_key}: requisito pendiente`, lock: true }
        : allDone
          ? { tone: "ok", text: "Completado" }
          : { tone: "ok", text: "Al día" };

    const sub = groupAct && hub.group
      ? `${hub.group.sessions_attended} de ${hub.group.sessions_total} asistidos`
      : `${t.activities_completed} de ${t.activities_total} hechas`;
    return { key: t.track_key ?? "", name: t.track_name ?? "", sub, chip, markers };
  });
}

function staffRoleKey(hub: Hub, careRoleId: string | null | undefined) {
  return staffFor(hub, careRoleId)?.roleKey;
}

export function blocksOf(hub: Hub) {
  const blocks: { name: string; span: number; current: boolean }[] = [];
  const step = currentStep(hub);
  hub.steps.forEach((s) => {
    const name = s.block_name ?? "";
    if (blocks.at(-1)?.name === name) blocks.at(-1)!.span++;
    else blocks.push({ name, span: 1, current: false });
    if (s.step_id === step?.step_id) blocks.at(-1)!.current = true;
  });
  return blocks;
}

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
  const anchor = `/terapia#${step.activity_key ?? ""}`;
  if (live?.scheduled_at && live.status === "scheduled") {
    const days = Math.max(0, Math.round((startOfDay(new Date(live.scheduled_at)).getTime() - startOfDay(hub.today).getTime()) / DAY));
    const joinable = days === 0 && live.meeting_url;
    return { ...base, when: live.scheduled_at, days, state: "booked",
      cta: joinable ? { label: "Entrar a la sesión", href: live.meeting_url! } : { label: "Añadir al calendario", href: `/calendario/sesion/${live.id}` } };
  }
  if (live?.status === "requested") return { ...base, when: null, days: null, state: "requested", cta: { label: "Ver solicitud", href: anchor } };
  if ((step.blocking_unmet ?? 0) > 0) return { ...base, when: null, days: null, state: "blocked", cta: { label: "Ver qué falta", href: anchor } };
  return { ...base, when: null, days: null, state: "ready", cta: { label: "Agendar", href: anchor } };
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
  const all = (list: ActivityRow[]) => list.every((a) => a.is_completed); // lista vacía → se oculta
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
