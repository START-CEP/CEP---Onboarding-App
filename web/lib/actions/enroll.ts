"use server";

import { redirect } from "next/navigation";
import { getStaff } from "@/lib/data/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { origin } from "@/lib/actions/account";

export type EnrollState = { error?: string };

type Member = { name: string; email: string };

/**
 * Inscribe una pareja (o una persona) en un servicio publicado:
 * 1) busca o invita a cada miembro por email (service role), 2) crea la unidad y sus miembros,
 * 3) llama a enroll_unit() con el equipo asignado por rol. Los pasos 2 y 3 van con la sesión de quien vende (RLS).
 */
export async function enrollCouple(_prev: EnrollState, formData: FormData): Promise<EnrollState> {
  const staff = await getStaff();
  if (!staff?.canSell) return { error: "Solo ventas o admin pueden inscribir." };

  const versionId = String(formData.get("version") ?? "");
  const startsOn = String(formData.get("starts_on") ?? "");
  const members: Member[] = [1, 2]
    .map((i) => ({ name: String(formData.get(`name${i}`) ?? "").trim(), email: String(formData.get(`email${i}`) ?? "").trim().toLowerCase() }))
    .filter((m) => m.name || m.email);
  const staffMap: Record<string, string> = {};
  formData.forEach((v, k) => { if (k.startsWith("role:") && v) staffMap[k.slice(5)] = String(v); });

  if (!versionId || !startsOn) return { error: "Elige el servicio y la fecha de inicio." };
  if (members.length === 0 || members.some((m) => !m.name || !/^\S+@\S+\.\S+$/.test(m.email))) {
    return { error: "Completa nombre y correo válido de cada persona." };
  }

  const supabase = await createClient();
  const { data: version } = await supabase
    .from("service_versions").select("id, status, services(unit_kind, name)").eq("id", versionId).single();
  if (!version || version.status !== "published") return { error: "Ese servicio no tiene una versión publicada." };
  const kind = version.services?.unit_kind ?? "couple";
  if (kind === "couple" && members.length !== 2) return { error: "Este servicio es para pareja: añade a las dos personas." };
  if (kind === "individual" && members.length !== 1) return { error: "Este servicio es individual: añade solo a una persona." };

  const admin = createAdminClient();

  // Validar ANTES de invitar a nadie: el equipo asignado debe ser personal activo con rol clínico/asistente/admin.
  const staffIds = Object.values(staffMap);
  if (staffIds.length) {
    const { data: valid } = await admin.from("staff_roles").select("profile_id, role").in("profile_id", staffIds).in("role", ["clinician", "assistant", "admin"]);
    const ok = new Set((valid ?? []).map((v) => v.profile_id));
    if (staffIds.some((sid) => !ok.has(sid))) return { error: "Alguna persona asignada al equipo no es del equipo clínico." };
  }
  for (const m of members) {
    const { data: existing } = await admin.from("profiles").select("id").eq("email", m.email).maybeSingle();
    if (!existing) continue;
    const { data: isStaff } = await admin.from("staff_roles").select("role").eq("profile_id", existing.id).limit(1);
    if (isStaff?.length) return { error: `${m.email} es una cuenta del equipo; usa otro correo para la pareja.` };
    if (!staff.isAdmin) {
      const { data: units } = await admin.from("client_unit_members").select("unit_id").eq("profile_id", existing.id);
      const { data: active } = await admin.from("enrollments").select("id").in("unit_id", (units ?? []).map((u) => u.unit_id)).in("status", ["invited", "active", "paused"]).limit(1);
      if (active?.length) return { error: `${m.email} ya tiene un proceso activo; pídele a un admin que lo revise.` };
    }
  }

  const redirectTo = `${await origin()}/auth/aceptar?next=/cuenta/contrasena`;
  const ids: string[] = [];
  for (const m of members) {
    const { data: existing } = await admin.from("profiles").select("id").eq("email", m.email).maybeSingle();
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(m.email, { data: { full_name: m.name }, redirectTo });
    if (error || !invited.user) return { error: `No pudimos invitar a ${m.email}: ${error?.message ?? "error desconocido"}.` };
    await admin.from("profiles").update({ full_name: m.name }).eq("id", invited.user.id);
    ids.push(invited.user.id);
  }

  const displayName = members.map((m) => m.name.split(" ")[0]).join(" y ");
  const { data: unit, error: unitError } = await supabase
    .from("client_units").insert({ kind, display_name: kind === "individual" ? members[0].name : displayName }).select("id").single();
  if (unitError || !unit) return { error: "No pudimos crear la unidad." };
  const { error: memberError } = await supabase
    .from("client_unit_members").insert(ids.map((id, i) => ({ unit_id: unit.id, profile_id: id, member_index: i + 1 })));
  if (memberError) return { error: "No pudimos añadir a los miembros." };

  const { data: enrollmentId, error: enrollError } = await supabase.rpc("enroll_unit", {
    p_unit_id: unit.id, p_version_id: versionId, p_starts_on: startsOn, p_staff: staffMap,
  });
  if (enrollError || !enrollmentId) return { error: `No pudimos inscribir: ${enrollError?.message ?? "error"}.` };
  redirect(`/equipo/parejas/${enrollmentId}`);
}
