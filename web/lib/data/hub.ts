import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Views = Database["public"]["Views"];
type Tables = Database["public"]["Tables"];

export type StepRow = Views["v_step_state"]["Row"];
export type RequirementRow = Views["v_requirement_status"]["Row"];
export type ActivityRow = Views["v_activity_state"]["Row"];
export type TrackRow = Views["v_track_progress"]["Row"];
export type GroupRow = Views["v_group_progress"]["Row"];
export type EnrollmentRow = Views["v_enrollment_state"]["Row"];

export type StaffAssignment = { careRoleId: string; roleKey: string; roleName: string; personName: string };
export type Member = { profileId: string; memberIndex: number; name: string };
export type GroupSession = Pick<Tables["group_sessions"]["Row"], "id" | "scheduled_at" | "title" | "status">;
export type TherapySession = Pick<Tables["enrollment_sessions"]["Row"], "enrollment_activity_id" | "scheduled_at" | "status">;

export type Hub = {
  me: { id: string; name: string };
  enrollment: EnrollmentRow;
  unitKind: Database["public"]["Enums"]["unit_kind"];
  members: Member[];
  steps: StepRow[];
  requirements: RequirementRow[];
  activities: ActivityRow[];
  tracks: TrackRow[];
  group: GroupRow | null;
  groupSessions: GroupSession[];
  sessions: TherapySession[];
  staff: StaffAssignment[];
  /** Actividades que esta persona ya vio / entregó (los requisitos individuales los cumple cada uno). */
  mine: { viewed: string[]; submitted: string[] };
  today: Date;
};

/** Todo lo que necesita el hub del paciente. Usa la sesión del usuario: la RLS decide qué ve. */
export const getHub = cache(async (): Promise<{ me: { id: string; name: string } | null; hub: Hub | null }> => {
  await connection(); // datos por usuario y hora actual: siempre en tiempo de petición
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return { me: null, hub: null };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
  const me = { id: uid, name: profile?.full_name || "" };

  const { data: memberships } = await supabase.from("client_unit_members").select("unit_id").eq("profile_id", uid);
  const unitIds = (memberships ?? []).map((m) => m.unit_id);
  if (unitIds.length === 0) return { me, hub: null };

  const { data: states } = await supabase
    .from("v_enrollment_state")
    .select("*")
    .in("unit_id", unitIds)
    .in("status", ["active", "invited", "paused"])
    .order("starts_on", { ascending: false })
    .limit(1);
  const enrollment = states?.[0];
  if (!enrollment?.enrollment_id || !enrollment.unit_id) return { me, hub: null };
  const eid = enrollment.enrollment_id;

  const [unit, members, steps, requirements, activities, tracks, group, groupSessions, sessions, staff, myProgress, mySubs] =
    await Promise.all([
      supabase.from("client_units").select("kind").eq("id", enrollment.unit_id).single(),
      supabase.from("client_unit_members").select("profile_id, member_index, profiles(full_name)").eq("unit_id", enrollment.unit_id),
      supabase.from("v_step_state").select("*").eq("enrollment_id", eid).order("position"),
      supabase.from("v_requirement_status").select("*").eq("enrollment_id", eid),
      supabase.from("v_activity_state").select("*").eq("enrollment_id", eid).order("position"),
      supabase.from("v_track_progress").select("*").eq("enrollment_id", eid).order("track_position"),
      supabase.from("v_group_progress").select("*").eq("enrollment_id", eid).maybeSingle(),
      supabase.from("group_sessions").select("id, scheduled_at, title, status").order("scheduled_at"),
      supabase.from("enrollment_sessions").select("enrollment_activity_id, scheduled_at, status").eq("enrollment_id", eid),
      supabase.from("enrollment_staff").select("care_role_id, care_roles(key, name), profiles(full_name)").eq("enrollment_id", eid),
      supabase.from("activity_progress").select("enrollment_activity_id").eq("profile_id", uid).eq("status", "completed"),
      supabase.from("form_submissions").select("enrollment_activity_id").eq("enrollment_id", eid).eq("submitted_by", uid).eq("status", "submitted"),
    ]);

  return {
    me,
    hub: {
      me,
      enrollment,
      unitKind: unit.data?.kind ?? "couple",
      members: (members.data ?? []).map((m) => ({
        profileId: m.profile_id,
        memberIndex: m.member_index,
        name: m.profiles?.full_name ?? "",
      })),
      steps: steps.data ?? [],
      requirements: requirements.data ?? [],
      activities: activities.data ?? [],
      tracks: tracks.data ?? [],
      group: group.data ?? null,
      groupSessions: groupSessions.data ?? [],
      sessions: sessions.data ?? [],
      staff: (staff.data ?? []).map((s) => ({
        careRoleId: s.care_role_id,
        roleKey: s.care_roles?.key ?? "",
        roleName: s.care_roles?.name ?? "",
        personName: s.profiles?.full_name ?? "",
      })),
      mine: {
        viewed: (myProgress.data ?? []).map((p) => p.enrollment_activity_id),
        submitted: (mySubs.data ?? []).map((p) => p.enrollment_activity_id),
      },
      today: new Date(),
    },
  };
});
