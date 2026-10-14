"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/database.types";

// Constructor de servicios (solo admin). Todo se edita en un borrador; publicar crea una versión inmutable.
export type FormState = { error?: string; ok?: string };
type Enums = Database["public"]["Enums"];

async function admin() {
  const staff = await getStaff();
  if (!staff?.isAdmin) throw new Error("Solo un admin puede editar servicios.");
  return createClient();
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => (s(fd, k) === "" ? null : Number(s(fd, k)));
const orNull = (v: string) => (v === "" ? null : v);
const ok = (msg = "Guardado."): FormState => { refresh(); return { ok: msg }; };
const fail = (error: { message: string } | null, msg: string): FormState | null => (error ? { error: `${msg} (${error.message})` } : null);

export async function createService(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const name = s(fd, "name");
  const slug = s(fd, "slug") || name.toLowerCase().normalize("NFD").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  if (!name) return { error: "Ponle nombre al servicio." };
  const { data: svc, error } = await supabase.from("services").insert({
    name, slug, description: orNull(s(fd, "description")),
    unit_kind: s(fd, "unit_kind") as Enums["unit_kind"],
    price_cents: Math.round((n(fd, "price") ?? 0) * 100), currency: s(fd, "currency") || "USD",
  }).select("id").single();
  if (error || !svc) return { error: error?.code === "23505" ? "Ya existe un servicio con ese identificador." : "No pudimos crear el servicio." };
  const { data: v, error: vErr } = await supabase.from("service_versions")
    .insert({ service_id: svc.id, version: 1, expected_duration_days: n(fd, "duration"), access_days: n(fd, "access") })
    .select("id").single();
  if (vErr || !v) return { error: "No pudimos crear la primera versión." };
  await supabase.from("service_blocks").insert({ version_id: v.id, name: "Inicio", position: 1 });
  await supabase.from("service_tracks").insert({ version_id: v.id, key: "inicio", name: "Inicio", position: 1 });
  redirect(`/equipo/servicios/${v.id}`);
}

export async function cloneVersion(versionId: string) {
  const supabase = await admin();
  const { data, error } = await supabase.rpc("clone_service_version", { p_version: versionId });
  if (error || !data) throw new Error(error?.message ?? "No pudimos crear el borrador.");
  redirect(`/equipo/servicios/${data}`);
}

export async function duplicateAsNewService(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const versionId = s(fd, "version");
  const name = s(fd, "name");
  if (!name) return { error: "Ponle nombre al servicio nuevo." };
  const { data: from } = await supabase.from("service_versions").select("services(unit_kind, price_cents, currency)").eq("id", versionId).single();
  const slug = name.toLowerCase().normalize("NFD").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  const { data: svc, error } = await supabase.from("services").insert({
    name, slug, unit_kind: from?.services?.unit_kind ?? "couple", price_cents: from?.services?.price_cents ?? 0, currency: from?.services?.currency ?? "USD",
  }).select("id").single();
  if (error || !svc) return { error: "No pudimos crear el servicio (¿nombre repetido?)." };
  const { data: v, error: cErr } = await supabase.rpc("clone_service_version", { p_version: versionId, p_target_service: svc.id });
  if (cErr || !v) return { error: "No pudimos copiar la estructura." };
  redirect(`/equipo/servicios/${v}`);
}

export async function publishVersion(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const { error } = await supabase.rpc("publish_service_version", { p_version: s(fd, "version") });
  if (error) return { error: `No se puede publicar: ${error.message}` };
  return ok("Versión publicada. Las inscripciones nuevas usarán esta versión.");
}

export async function deleteDraft(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const id = s(fd, "version");
  const { data: v } = await supabase.from("service_versions").select("status, service_id").eq("id", id).single();
  if (v?.status !== "draft") return { error: "Solo se puede borrar un borrador." };
  const { error } = await supabase.from("service_versions").delete().eq("id", id);
  if (error) return { error: "No pudimos borrar el borrador." };
  redirect("/equipo/servicios");
}

export async function updateVersion(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const { error } = await supabase.from("service_versions").update({
    expected_duration_days: n(fd, "duration"), access_days: n(fd, "access"),
    welcome_activity_id: orNull(s(fd, "welcome")), notes: orNull(s(fd, "notes")),
  }).eq("id", s(fd, "version"));
  return fail(error, "No pudimos guardar") ?? ok();
}

export async function saveBlock(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const id = s(fd, "id");
  const versionId = s(fd, "version");
  if (id) {
    const { error } = await supabase.from("service_blocks").update({ name: s(fd, "name"), color: orNull(s(fd, "color")) }).eq("id", id);
    return fail(error, "No pudimos guardar el bloque") ?? ok();
  }
  const { count } = await supabase.from("service_blocks").select("id", { count: "exact", head: true }).eq("version_id", versionId);
  const { error } = await supabase.from("service_blocks").insert({ version_id: versionId, name: s(fd, "name"), position: (count ?? 0) + 1 });
  return fail(error, "No pudimos crear el bloque") ?? ok();
}

export async function saveTrack(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const id = s(fd, "id");
  const versionId = s(fd, "version");
  const name = s(fd, "name");
  if (id) {
    const { error } = await supabase.from("service_tracks").update({ name }).eq("id", id);
    return fail(error, "No pudimos guardar el área") ?? ok();
  }
  const { count } = await supabase.from("service_tracks").select("id", { count: "exact", head: true }).eq("version_id", versionId);
  const key = name.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "_");
  const { error } = await supabase.from("service_tracks").insert({ version_id: versionId, key, name, position: (count ?? 0) + 1 });
  return fail(error, "No pudimos crear el área") ?? ok();
}

export async function deleteRow(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const table = s(fd, "table") as "service_blocks" | "service_tracks" | "service_activities" | "service_steps" | "service_requirements";
  if (!["service_blocks", "service_tracks", "service_activities", "service_steps", "service_requirements"].includes(table)) return { error: "Tabla no válida." };
  const { error } = await supabase.from(table).delete().eq("id", s(fd, "id"));
  if (error) return { error: error.code === "23503" ? "No se puede borrar: otra parte del servicio lo usa (un paso o un requisito)." : `No pudimos borrar (${error.message}).` };
  if (table === "service_steps") await renumberSteps(supabase, s(fd, "version"));
  return ok("Borrado.");
}

export async function saveActivity(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const id = s(fd, "id");
  let config: Json = {};
  try { config = s(fd, "config") ? JSON.parse(s(fd, "config")) : {}; } catch { return { error: "La configuración avanzada no es un JSON válido." }; }
  const row = {
    version_id: s(fd, "version"),
    key: s(fd, "key"),
    type: s(fd, "type") as Enums["activity_type"],
    title: s(fd, "title"),
    summary: orNull(s(fd, "summary")),
    track_id: orNull(s(fd, "track")),
    responsible_role_id: orNull(s(fd, "role")),
    participants: (s(fd, "participants") || "all") as Enums["participants"],
    response_scope: (s(fd, "scope") || "shared") as Enums["response_scope"],
    asset_id: orNull(s(fd, "asset")),
    form_version_id: orNull(s(fd, "form")),
    contract_template_id: orNull(s(fd, "contract")),
    estimated_minutes: n(fd, "minutes"),
    suggested_offset_days: n(fd, "offset"),
    suggested_gap_days: n(fd, "gap"),
    position: n(fd, "position") ?? 0,
    config,
  };
  if (!row.key || !row.title) return { error: "La actividad necesita clave y título." };
  const { error } = id
    ? await supabase.from("service_activities").update(row).eq("id", id)
    : await supabase.from("service_activities").insert(row);
  if (error?.code === "23505") return { error: `Ya hay una actividad con la clave «${row.key}».` };
  return fail(error, "No pudimos guardar la actividad") ?? ok(id ? "Actividad guardada." : "Actividad creada.");
}

export async function addStep(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const versionId = s(fd, "version");
  const { data: last } = await supabase.from("service_steps").select("position").eq("version_id", versionId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("service_steps").insert({
    version_id: versionId, block_id: orNull(s(fd, "block")), activity_id: s(fd, "activity"),
    title: s(fd, "title"), description: orNull(s(fd, "description")), position: (last?.[0]?.position ?? 0) + 1,
  });
  return fail(error, "No pudimos añadir el paso") ?? ok("Paso añadido.");
}

export async function updateStep(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const { error } = await supabase.from("service_steps").update({
    title: s(fd, "title"), description: orNull(s(fd, "description")), block_id: orNull(s(fd, "block")), activity_id: s(fd, "activity"),
  }).eq("id", s(fd, "id"));
  return fail(error, "No pudimos guardar el paso") ?? ok();
}

export async function moveStep(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const versionId = s(fd, "version");
  const { data: steps } = await supabase.from("service_steps").select("id, position").eq("version_id", versionId).order("position");
  const list = steps ?? [];
  const i = list.findIndex((x) => x.id === s(fd, "id"));
  const j = s(fd, "dir") === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return {};
  const a = list[i], b = list[j];
  await supabase.from("service_steps").update({ position: -1 }).eq("id", a.id);
  await supabase.from("service_steps").update({ position: a.position }).eq("id", b.id);
  const { error } = await supabase.from("service_steps").update({ position: b.position }).eq("id", a.id);
  return fail(error, "No pudimos mover el paso") ?? ok("Orden actualizado.");
}

async function renumberSteps(supabase: Awaited<ReturnType<typeof createClient>>, versionId: string) {
  const { data } = await supabase.from("service_steps").select("id, position").eq("version_id", versionId).order("position");
  for (const [i, st] of (data ?? []).entries()) {
    if (st.position !== i + 1) await supabase.from("service_steps").update({ position: i + 1 }).eq("id", st.id);
  }
}

export async function addRequirement(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const { error } = await supabase.from("service_requirements").insert({
    version_id: s(fd, "version"),
    target_step_id: s(fd, "step"),
    required_activity_id: s(fd, "required"),
    criterion: s(fd, "criterion") as Enums["req_criterion"],
    is_mandatory: s(fd, "mandatory") !== "no",
    enforcement: (s(fd, "enforcement") || "blocks") as Enums["enforcement"],
    label: orNull(s(fd, "label")),
  });
  return fail(error, "No pudimos añadir el requisito") ?? ok("Requisito añadido.");
}

export async function createForm(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  let schema: Json;
  try { schema = JSON.parse(s(fd, "schema")); } catch { return { error: "La estructura no es un JSON válido." }; }
  if (!Array.isArray((schema as { sections?: unknown })?.sections)) return { error: "La estructura necesita una lista «sections»." };
  const key = s(fd, "key");
  const { data: form, error } = await supabase.from("forms").upsert({ key, name: s(fd, "name"), kind: s(fd, "kind") }, { onConflict: "key" }).select("id").single();
  if (error || !form) return { error: "No pudimos crear el formulario." };
  const { data: last } = await supabase.from("form_versions").select("version").eq("form_id", form.id).order("version", { ascending: false }).limit(1);
  const { error: vErr } = await supabase.from("form_versions").insert({ form_id: form.id, version: (last?.[0]?.version ?? 0) + 1, schema, published_at: new Date().toISOString() });
  return fail(vErr, "No pudimos guardar la versión del formulario") ?? ok("Formulario publicado. Ya puedes elegirlo en una actividad.");
}

export async function createContract(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await admin();
  const serviceId = s(fd, "service");
  const points = s(fd, "points").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [title, ...rest] = l.split(":");
    return { title: title.trim(), body: rest.join(":").trim() };
  });
  const { data: last } = await supabase.from("contract_templates").select("version").eq("service_id", serviceId).order("version", { ascending: false }).limit(1);
  const { error } = await supabase.from("contract_templates").insert({
    service_id: serviceId, version: (last?.[0]?.version ?? 0) + 1, title: s(fd, "title"), body_md: s(fd, "body"),
    summary_points: points, published_at: new Date().toISOString(),
  });
  return fail(error, "No pudimos guardar el contrato") ?? ok("Contrato publicado. Ya puedes elegirlo en la actividad de contrato.");
}
