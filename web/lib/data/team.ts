import { createClient } from "@/lib/supabase/server";
import { listEnrollments, type EnrollmentSummary } from "@/lib/data/staff";
import { firstName } from "@/lib/process";
import { summarize, type ProgressAct, type ProgressInput, type Summary } from "@/lib/team-progress";

export type BoardRow = EnrollmentSummary & {
  summary: Summary;
  input: ProgressInput;
  sessions: { activityId: string; key: string; title: string; status: string; scheduledAt: string | null; staffId: string | null }[];
};

/** Avance de todas las parejas que esta persona del equipo puede ver (la RLS filtra por asignación). */
export async function loadBoard(): Promise<BoardRow[]> {
  const list = await listEnrollments();
  const inputs = await progressFor(list.map((e) => e.id));
  return list.map((e) => {
    const input = inputs.get(e.id)!;
    return {
      ...e,
      input,
      summary: summarize(input),
      sessions: input.sessions.map((s) => {
        const a = input.acts.find((x) => x.id === s.activityId);
        return { ...s, key: a?.key ?? "", title: a?.title ?? "" };
      }),
    };
  });
}

/** Datos de avance (actividades, quién vio y entregó, sesiones) de varias inscripciones. */
export async function progressFor(ids: string[]): Promise<Map<string, ProgressInput>> {
  const out = new Map<string, ProgressInput>();
  if (ids.length === 0) return out;
  const supabase = await createClient();
  const [acts, rows, steps, enr, subs, sessions] = await Promise.all([
    supabase.from("v_activity_state").select("activity_id, enrollment_id, key, title, type, position, participants, response_scope, is_completed, responsible_staff_id").in("enrollment_id", ids),
    supabase.from("enrollment_activities").select("id, form_version_id, source_activity_id").in("enrollment_id", ids),
    supabase.from("v_step_state").select("enrollment_id, activity_id, blocking_unmet").in("enrollment_id", ids),
    supabase.from("enrollments").select("id, unit_id, service_versions(welcome_activity_id)").in("id", ids),
    supabase.from("form_submissions").select("enrollment_activity_id, submitted_by").in("enrollment_id", ids).eq("status", "submitted"),
    supabase.from("enrollment_sessions").select("enrollment_id, enrollment_activity_id, status, scheduled_at, staff_profile_id").in("enrollment_id", ids),
  ]);
  const unitIds = (enr.data ?? []).map((e) => e.unit_id);
  const videoIds = (acts.data ?? []).filter((a) => a.type === "video_module").map((a) => a.activity_id!);
  const [{ data: members }, progress] = await Promise.all([
    supabase.from("client_unit_members").select("unit_id, member_index, profile_id, profiles(full_name)").in("unit_id", unitIds),
    supabase.from("activity_progress").select("enrollment_activity_id, profile_id").eq("status", "completed").in("enrollment_activity_id", videoIds),
  ]);
  const now = new Date();

  for (const id of ids) {
    const en = enr.data?.find((x) => x.id === id);
    const welcome = en?.service_versions?.welcome_activity_id ?? null;
    const mine = (acts.data ?? []).filter((a) => a.enrollment_id === id);
    const actIds = new Set(mine.map((a) => a.activity_id!));
    const progressActs: ProgressAct[] = mine.map((a) => {
      const row = rows.data?.find((r) => r.id === a.activity_id);
      const step = steps.data?.find((s) => s.enrollment_id === id && s.activity_id === a.activity_id);
      return {
        id: a.activity_id!, key: a.key ?? "", title: a.title ?? "", type: a.type ?? "", position: a.position ?? 0,
        participants: (a.participants ?? "all") as ProgressAct["participants"],
        responseScope: (a.response_scope ?? "shared") as ProgressAct["responseScope"],
        hasForm: Boolean(row?.form_version_id), isCompleted: Boolean(a.is_completed),
        isWelcome: Boolean(welcome && row?.source_activity_id === welcome),
        responsibleStaffId: a.responsible_staff_id ?? null, blockingUnmet: step?.blocking_unmet ?? 0,
      };
    });
    out.set(id, {
      acts: progressActs,
      members: (members ?? []).filter((m) => m.unit_id === en?.unit_id).sort((a, b) => a.member_index - b.member_index)
        .map((m) => ({ profileId: m.profile_id, memberIndex: m.member_index, name: firstName(m.profiles?.full_name ?? "") })),
      viewed: (progress.data ?? []).filter((p) => p.profile_id && actIds.has(p.enrollment_activity_id)).map((p) => ({ activityId: p.enrollment_activity_id, profileId: p.profile_id! })),
      submitted: (subs.data ?? []).filter((s) => actIds.has(s.enrollment_activity_id)).map((s) => ({ activityId: s.enrollment_activity_id, profileId: s.submitted_by })),
      sessions: (sessions.data ?? []).filter((s) => s.enrollment_id === id)
        .map((s) => ({ activityId: s.enrollment_activity_id, status: s.status, scheduledAt: s.scheduled_at, staffId: s.staff_profile_id })),
      now,
    });
  }
  return out;
}
