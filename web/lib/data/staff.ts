import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type StaffRole = Database["public"]["Enums"]["staff_role"];
export type Staff = { id: string; name: string; roles: StaffRole[]; isAdmin: boolean; isClinician: boolean; canSell: boolean };

/** Quién es la persona del equipo que entra (null si no es del equipo). */
export const getStaff = cache(async (): Promise<Staff | null> => {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return null;
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("staff_roles").select("role").eq("profile_id", uid),
    supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
  ]);
  const list = (roles ?? []).map((r) => r.role);
  if (list.length === 0) return null;
  return {
    id: uid,
    name: profile?.full_name ?? "",
    roles: list,
    isAdmin: list.includes("admin"),
    isClinician: list.includes("clinician") || list.includes("admin"),
    canSell: list.includes("sales") || list.includes("admin"),
  };
});

export type EnrollmentSummary = {
  id: string;
  unitName: string;
  service: string;
  step: number | null;
  steps: number;
  stepTitle: string | null;
  block: string | null;
  blocking: number;
  daysLeft: number | null;
  nextSession: string | null;
  requests: number;
  status: Database["public"]["Enums"]["enrollment_status"];
};

/** Inscripciones que esta persona del equipo puede ver (la RLS filtra por asignación). */
export async function listEnrollments(): Promise<EnrollmentSummary[]> {
  const supabase = await createClient();
  const { data: states } = await supabase.from("v_enrollment_state").select("*").order("starts_on", { ascending: false });
  const list = states ?? [];
  const unitIds = list.map((s) => s.unit_id!).filter(Boolean);
  const ids = list.map((s) => s.enrollment_id!).filter(Boolean);
  const [{ data: units }, { data: sessions }] = await Promise.all([
    supabase.from("client_units").select("id, display_name").in("id", unitIds),
    supabase.from("enrollment_sessions").select("enrollment_id, scheduled_at, status").in("enrollment_id", ids),
  ]);
  const now = Date.now();
  return list.map((s) => {
    const mine = (sessions ?? []).filter((x) => x.enrollment_id === s.enrollment_id);
    const next = mine
      .filter((x) => x.status === "scheduled" && x.scheduled_at && new Date(x.scheduled_at).getTime() > now)
      .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))[0];
    return {
      id: s.enrollment_id!,
      unitName: units?.find((u) => u.id === s.unit_id)?.display_name ?? "",
      service: s.service_name ?? "",
      step: s.current_step_position,
      steps: s.steps_total ?? 0,
      stepTitle: s.current_step_title,
      block: s.current_block,
      blocking: s.current_step_blocking_unmet ?? 0,
      daysLeft: s.days_left,
      nextSession: next?.scheduled_at ?? null,
      requests: mine.filter((x) => x.status === "requested").length,
      status: s.status!,
    };
  });
}
