// Avance de cada pareja para el panel del equipo: sesión de terapia, módulo visto, tarea entregada y qué toca agendar.
// Funciones puras (sin Supabase) para poder probarlas.

export type Participants = "all" | "each_member" | "member_1" | "member_2";
export type ProgressAct = {
  id: string;
  key: string;
  title: string;
  type: string;
  position: number;
  participants: Participants;
  responseScope: "shared" | "individual";
  hasForm: boolean;
  isCompleted: boolean;
  isWelcome: boolean;
  responsibleStaffId: string | null;
  blockingUnmet: number;
};
export type ProgressMember = { profileId: string; memberIndex: number; name: string };
export type ProgressSession = { activityId: string; status: string; scheduledAt: string | null; staffId: string | null };
export type ProgressInput = {
  acts: ProgressAct[];
  members: ProgressMember[];
  /** Quién marcó cada video como visto (activity_progress completado). */
  viewed: { activityId: string; profileId: string }[];
  /** Quién entregó cada formulario (form_submissions enviados). */
  submitted: { activityId: string; profileId: string }[];
  sessions: ProgressSession[];
  now: Date;
};

export type MemberMark = { profileId: string; name: string; viewed: boolean; submitted: boolean | null };
export type ModuleRow = { id: string; key: string; title: string; members: MemberMark[]; viewed: boolean; submitted: boolean | null };
export type Ref = { key: string; title: string };

/** Quiénes tienen que hacer la actividad. */
export function requiredMembers(a: Pick<ProgressAct, "participants">, members: ProgressMember[]) {
  if (a.participants === "member_1") return members.filter((m) => m.memberIndex === 1);
  if (a.participants === "member_2") return members.filter((m) => m.memberIndex === 2);
  return members;
}

/** Módulos (videos con o sin tarea), sin el video de bienvenida: quién vio el video y quién entregó la tarea. */
export function moduleRows(input: Pick<ProgressInput, "acts" | "members" | "viewed" | "submitted">): ModuleRow[] {
  return input.acts
    .filter((a) => a.type === "video_module" && !a.isWelcome)
    .sort((x, y) => x.position - y.position)
    .map((a) => {
      const who = requiredMembers(a, input.members);
      const marks = who.map((m) => ({
        profileId: m.profileId,
        name: m.name,
        viewed: input.viewed.some((v) => v.activityId === a.id && v.profileId === m.profileId),
        submitted: a.hasForm ? input.submitted.some((s) => s.activityId === a.id && (a.responseScope === "shared" || s.profileId === m.profileId)) : null,
      }));
      // «all» = basta con uno; «each_member» = cada uno.
      const done = (f: (m: MemberMark) => boolean) => (a.participants === "all" ? marks.some(f) : marks.length > 0 && marks.every(f));
      return {
        id: a.id, key: a.key, title: a.title, members: marks,
        viewed: done((m) => m.viewed),
        submitted: a.hasForm ? (a.responseScope === "shared" ? marks.some((m) => Boolean(m.submitted)) : done((m) => Boolean(m.submitted))) : null,
      };
    });
}

export type Summary = {
  therapy: { done: number; total: number; next: (Ref & { id: string; responsibleStaffId: string | null; blockingUnmet: number }) | null };
  /** Último módulo cuyo video vieron todos los que debían. */
  lastViewed: Ref | null;
  /** Último módulo con la tarea entregada por todos los que debían. */
  lastSubmitted: Ref | null;
  /** Módulos a medias (p. ej. solo uno de los dos vio el video). */
  partial: { key: string; who: string; what: "video" | "tarea" }[];
  nextSession: { at: string; key: string } | null;
  /** La siguiente sesión de terapia está sin agendar. */
  toSchedule: boolean;
};

export function summarize(input: ProgressInput): Summary {
  const therapy = input.acts.filter((a) => a.type === "therapy_session").sort((x, y) => x.position - y.position);
  const next = therapy.find((a) => !a.isCompleted) ?? null;
  const rows = moduleRows(input);
  const lastOf = (f: (r: ModuleRow) => boolean) => { const r = [...rows].reverse().find(f); return r ? { key: r.key, title: r.title } : null; };
  const partial = rows.flatMap((r) => {
    const out: Summary["partial"] = [];
    const v = r.members.filter((m) => m.viewed);
    if (!r.viewed && v.length > 0) out.push({ key: r.key, who: v.map((m) => m.name).join(" y "), what: "video" });
    const s = r.members.filter((m) => m.submitted);
    if (r.submitted === false && s.length > 0) out.push({ key: r.key, who: s.map((m) => m.name).join(" y "), what: "tarea" });
    return out;
  });
  const now = input.now.getTime();
  const upcoming = input.sessions
    .filter((s) => s.status === "scheduled" && s.scheduledAt && new Date(s.scheduledAt).getTime() > now)
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))[0];
  const openForNext = next ? input.sessions.some((s) => s.activityId === next.id && (s.status === "scheduled" || s.status === "requested")) : false;
  return {
    therapy: {
      done: therapy.filter((a) => a.isCompleted).length,
      total: therapy.length,
      next: next ? { id: next.id, key: next.key, title: next.title, responsibleStaffId: next.responsibleStaffId, blockingUnmet: next.blockingUnmet } : null,
    },
    lastViewed: lastOf((r) => r.viewed),
    lastSubmitted: lastOf((r) => r.submitted === true),
    partial,
    nextSession: upcoming ? { at: upcoming.scheduledAt!, key: input.acts.find((a) => a.id === upcoming.activityId)?.key ?? "" } : null,
    toSchedule: Boolean(next) && !openForNext,
  };
}

/** Semanas (mínimo 1) hasta el fin del acceso; para estimar el ritmo de sesiones que hace falta. */
export function weeksLeft(daysLeft: number | null) {
  return Math.max(1, Math.ceil((daysLeft ?? 0) / 7));
}
