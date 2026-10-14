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
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "America/Mexico_City" }).replace(".", "");
}

export function fmtTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Mexico_City" });
}

// ---------------------------------------------------------------- requisitos y "qué hacer hoy"
export type Action = { title: string; why: string; icon: IconName; href: string; minutes?: number | null };

function hrefFor(type: ActivityRow["type"]) {
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
      return "/pasos";
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
  const base = { why, href: hrefFor(r.required_type ?? act?.type ?? "checklist"), minutes: act?.estimated_minutes };

  // Requisito que cumple cada miembro: si yo ya hice mi parte, lo que falta es de mi pareja.
  const perMember = act?.participants === "each_member" || act?.response_scope === "individual";
  const myPartDone =
    (r.criterion === "viewed" && hub.mine.viewed.includes(r.required_activity_id ?? "")) ||
    ((r.criterion === "task_submitted" || r.criterion === "form_submitted") && hub.mine.submitted.includes(r.required_activity_id ?? ""));
  const partner = hub.members.find((m) => m.profileId !== hub.me.id);
  if (perMember && myPartDone && partner) {
    const what = r.criterion === "viewed" ? `vea el ${short}` : r.criterion === "task_submitted" ? `entregue la tarea del ${short}` : `responda ${short}`;
    return { ...base, title: `Falta que ${firstName(partner.name)} ${what}`, why: `Tú ya hiciste tu parte. ${why}.`, icon: "users" };
  }

  switch (r.criterion) {
    case "task_submitted":
      return act?.task_pending
        ? { ...base, title: `Entregar la tarea del ${short}`, icon: "pen" }
        : { ...base, title: `Ver el ${short} y entregar su tarea`, icon: "play" };
    case "viewed":
      return { ...base, title: `Ver el ${title}`, icon: "play" };
    case "form_submitted":
      return { ...base, title: `Responder: ${title}`, icon: "pulse" };
    case "signed":
      return { ...base, title: "Firmar el contrato", icon: "pen" };
    case "attended":
      return { ...base, title: `Asistir a ${title}`, icon: "cal" };
    default:
      return { ...base, title: `El equipo está completando: ${title}`, icon: "clock", href: "/pasos" };
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
        actions.push({ title: `Agendar su ${step.activity_key}${who ? ` con ${who}` : ""}`, why: step.description ?? "", icon: "cal", href: "/terapia" });
      } else {
        const act = hub.activities.find((a) => a.activity_id === step.activity_id);
        actions.push({ title: step.title ?? "", why: step.description ?? "", icon: act?.type === "video_module" ? "play" : "route", href: hrefFor(act?.type ?? "checklist"), minutes: act?.estimated_minutes });
      }
    }
  }
  const next = nextGroupSession(hub);
  if (next && new Date(next.scheduled_at).getTime() - hub.today.getTime() < 14 * DAY) {
    actions.push({ title: "Dejar su pregunta para el coaching grupal", why: `Próximo coaching: ${fmtDay(next.scheduled_at)} · ${fmtTime(next.scheduled_at)}`, icon: "chat", href: "/coaching", minutes: 2 });
  }
  return actions;
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
export type Marker = { col: number; label: string; state: "d" | "n" | "w" | "l"; title: string; roleClass?: string; dot?: boolean };
export type TrackLine = { key: string; name: string; sub: string; chip: { tone: "ok" | "warn" | "info"; text: string; lock?: boolean }; markers: Marker[] };

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

  return hub.tracks.map((t) => {
    const acts = hub.activities.filter((a) => a.track_key === t.track_key && a.type !== "staff_task");
    const stateOf = (a: ActivityRow): Marker["state"] =>
      a.is_completed ? "d" : a.task_pending ? "w" : a.activity_id === step?.activity_id || currentNeeds.has(a.activity_id) ? "n" : "l";

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
          state: done === list.length ? "d" : states.includes("n") ? "n" : states.includes("w") ? "w" : "l",
        };
      });
    }

    const pendingTasks = acts.filter((a) => a.task_pending).map((a) => a.key);
    const holdsCurrent = step && acts.some((a) => a.activity_id === step.activity_id) && (step.blocking_unmet ?? 0) > 0;
    const allDone = acts.length > 0 && acts.every((a) => a.is_completed);
    const chip: TrackLine["chip"] = pendingTasks.length
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
