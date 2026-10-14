"use server";

import { createHash } from "node:crypto";
import { refresh } from "next/cache";
import { getStaff } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";

// Contenidos (admin): videos en Bunny Stream, PDFs en Storage, recursos y coaching grupal.
export type Result = { ok?: boolean; error?: string };

async function admin() {
  const staff = await getStaff();
  if (!staff?.isAdmin) throw new Error("Solo un admin puede gestionar contenidos.");
  return { staff, supabase: await createClient() };
}

function bunny() {
  const lib = process.env.BUNNY_STREAM_LIBRARY_ID;
  const key = process.env.BUNNY_STREAM_API_KEY;
  if (!lib || !key) return null;
  return { lib, key };
}

export async function bunnyConfigured() {
  return Boolean(bunny());
}

/** Nuevo asset (video o PDF) en la biblioteca. */
export async function createAsset(kind: "video" | "pdf", title: string): Promise<{ id?: string; error?: string }> {
  const { supabase, staff } = await admin();
  if (!title.trim()) return { error: "Ponle un título." };
  const { data, error } = await supabase.from("content_assets").insert({
    kind, title: title.trim(), created_by: staff.id,
    ...(kind === "video" ? { provider: "pending", provider_id: crypto.randomUUID(), processing_status: "pending" } : { storage_path: "pendiente" }),
  }).select("id").single();
  if (error || !data) return { error: "No pudimos crear el contenido." };
  refresh();
  return { id: data.id };
}

/**
 * Prepara la subida directa de un video a Bunny (TUS): crea el video en la librería con la API key
 * (que nunca sale del servidor) y devuelve una firma temporal para que el navegador suba el archivo.
 */
export async function startBunnyUpload(assetId: string): Promise<{
  error?: string; endpoint?: string; headers?: Record<string, string>; videoId?: string;
}> {
  const { supabase } = await admin();
  const cfg = bunny();
  if (!cfg) return { error: "Faltan las credenciales de Bunny (BUNNY_STREAM_LIBRARY_ID y BUNNY_STREAM_API_KEY)." };
  const { data: asset } = await supabase.from("content_assets").select("id, title").eq("id", assetId).single();
  if (!asset) return { error: "No encontramos el contenido." };

  const res = await fetch(`https://video.bunnycdn.com/library/${cfg.lib}/videos`, {
    method: "POST",
    headers: { AccessKey: cfg.key, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ title: asset.title }),
  });
  if (!res.ok) return { error: `Bunny rechazó la creación del video (${res.status}). Revisa la librería y la API key.` };
  const { guid } = (await res.json()) as { guid: string };

  const expire = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
  const signature = createHash("sha256").update(cfg.lib + cfg.key + expire + guid).digest("hex");
  const { error } = await supabase.from("content_assets").update({
    provider: "bunny", provider_id: guid, provider_library_id: cfg.lib, processing_status: "uploading",
  }).eq("id", assetId);
  if (error) return { error: "No pudimos actualizar el contenido." };
  return {
    endpoint: "https://video.bunnycdn.com/tusupload",
    videoId: guid,
    headers: { AuthorizationSignature: signature, AuthorizationExpire: String(expire), VideoId: guid, LibraryId: cfg.lib },
  };
}

/** Consulta a Bunny el estado de codificación y lo guarda (4 = listo, 5/6 = error). */
export async function refreshBunnyStatus(assetId: string): Promise<Result> {
  const { supabase } = await admin();
  const cfg = bunny();
  if (!cfg) return { error: "Faltan las credenciales de Bunny." };
  const { data: asset } = await supabase.from("content_assets").select("provider, provider_id").eq("id", assetId).single();
  if (asset?.provider !== "bunny" || !asset.provider_id) return { error: "Este contenido no tiene video en Bunny." };
  const res = await fetch(`https://video.bunnycdn.com/library/${cfg.lib}/videos/${asset.provider_id}`, {
    headers: { AccessKey: cfg.key, accept: "application/json" },
  });
  if (!res.ok) return { error: `Bunny respondió ${res.status}.` };
  const v = (await res.json()) as { status: number; length: number; encodeProgress: number };
  const status = v.status === 4 ? "ready" : v.status >= 5 ? "failed" : v.status === 0 ? "uploading" : "processing";
  const { error } = await supabase.from("content_assets").update({
    processing_status: status, duration_seconds: Math.round(v.length || 0) || null,
    provider_meta: { status: v.status, encodeProgress: v.encodeProgress },
  }).eq("id", assetId);
  if (error) return { error: "No pudimos guardar el estado." };
  refresh();
  return { ok: true };
}

export async function markUploaded(assetId: string): Promise<Result> {
  const { supabase } = await admin();
  await supabase.from("content_assets").update({ processing_status: "processing" }).eq("id", assetId);
  return refreshBunnyStatus(assetId);
}

/** Registra un PDF ya subido al bucket "content" en la carpeta del asset. */
export async function finishPdf(assetId: string, path: string, size: number, mime: string): Promise<Result> {
  const { supabase } = await admin();
  if (!path.startsWith(`${assetId}/`)) return { error: "Ruta no válida." };
  const { error } = await supabase.from("content_assets").update({ storage_path: path, size_bytes: size, mime }).eq("id", assetId);
  if (error) return { error: "No pudimos registrar el archivo." };
  refresh();
  return { ok: true };
}

export async function attachResource(assetId: string, title: string, attachType: "activity" | "group_session", attachId: string): Promise<Result> {
  const { supabase, staff } = await admin();
  const { error } = await supabase.from("resources").insert({ asset_id: assetId, title: title.trim(), attach_type: attachType, attach_id: attachId, created_by: staff.id });
  if (error) return { error: "No pudimos adjuntar el recurso." };
  refresh();
  return { ok: true };
}

export async function removeResource(resourceId: string): Promise<Result> {
  const { supabase } = await admin();
  const { error } = await supabase.from("resources").update({ archived_at: new Date().toISOString() }).eq("id", resourceId);
  if (error) return { error: "No pudimos quitar el recurso." };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- coaching grupal (equipo)
// Coaching grupal: equipo de cuidado (admin, clínico o asistente); ventas no.
async function staffOnly() {
  const staff = await getStaff();
  if (!staff?.roles.some((r) => r === "admin" || r === "clinician" || r === "assistant")) throw new Error("Solo el equipo de cuidado.");
  return { staff, supabase: await createClient() };
}

const httpsUrl = (v: string) => /^https:\/\/\S+$/i.test(v);

export async function updateGroupSession(id: string, fields: { meetingUrl?: string; status?: "scheduled" | "completed" | "cancelled"; whenIso?: string; title?: string }): Promise<Result> {
  const { supabase } = await staffOnly();
  if (fields.meetingUrl?.trim() && !httpsUrl(fields.meetingUrl.trim())) return { error: "El enlace tiene que empezar por https://." };
  const { error } = await supabase.from("group_sessions").update({
    ...(fields.meetingUrl !== undefined ? { meeting_url: fields.meetingUrl.trim() || null } : {}),
    ...(fields.status ? { status: fields.status } : {}),
    ...(fields.whenIso ? { scheduled_at: fields.whenIso } : {}),
    ...(fields.title !== undefined ? { title: fields.title.trim() || null } : {}),
  }).eq("id", id);
  if (error) return { error: "No pudimos actualizar el encuentro." };
  refresh();
  return { ok: true };
}

export async function addGroupSession(programId: string, whenIso: string, title: string): Promise<Result> {
  const { supabase } = await staffOnly();
  const { error } = await supabase.from("group_sessions").insert({ program_id: programId, scheduled_at: whenIso, title: title.trim() || null });
  if (error) return { error: "No pudimos crear el encuentro." };
  refresh();
  return { ok: true };
}

export async function setRecording(groupSessionId: string, assetId: string | null): Promise<Result> {
  const { supabase } = await admin();
  const { error } = await supabase.from("group_sessions").update({ recording_asset_id: assetId }).eq("id", groupSessionId);
  if (error) return { error: "No pudimos asignar la grabación." };
  refresh();
  return { ok: true };
}
