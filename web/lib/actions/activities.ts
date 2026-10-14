"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type ActionResult = { ok?: boolean; error?: string };

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) throw new Error("Tu sesión expiró. Vuelve a entrar.");
  return { supabase, uid };
}

/** "Ya vi el video": guarda el avance de esta persona. */
export async function markViewed(activityId: string): Promise<ActionResult> {
  const { supabase, uid } = await session();
  const now = new Date().toISOString();
  const { error } = await supabase.from("activity_progress").upsert(
    { enrollment_activity_id: activityId, profile_id: uid, status: "completed", started_at: now, completed_at: now, updated_by: uid },
    { onConflict: "enrollment_activity_id,profile_id" },
  );
  if (error) return { error: "No pudimos guardar tu avance. Inténtalo de nuevo." };
  refresh();
  return { ok: true };
}

/** Guarda un formulario (tarea, radiografía, cierre…) como borrador o lo entrega; lo entregado ya no se edita. */
export async function saveHomework(activityId: string, answers: Record<string, Json>, submit: boolean): Promise<ActionResult> {
  const { supabase, uid } = await session();
  const { data: act } = await supabase
    .from("enrollment_activities")
    .select("id, enrollment_id, form_version_id, response_scope")
    .eq("id", activityId)
    .single();
  if (!act?.form_version_id) return { error: "Esta actividad no tiene formulario en línea." };

  const mine = supabase.from("form_submissions").select("id, status").eq("enrollment_activity_id", activityId);
  const { data: existing } = act.response_scope === "shared" ? await mine : await mine.eq("submitted_by", uid);
  if (existing?.some((s) => s.status === "submitted")) return { error: "Esta tarea ya está entregada." };

  const status = submit ? "submitted" : "draft";
  const draft = existing?.find((s) => s.status === "draft");
  const { data: saved, error } = draft
    ? await supabase.from("form_submissions").update({ answers, status }).eq("id", draft.id).select("id").single()
    : await supabase.from("form_submissions").insert({
        enrollment_id: act.enrollment_id,
        enrollment_activity_id: activityId,
        form_version_id: act.form_version_id,
        response_scope: act.response_scope,
        submitted_by: uid,
        answers,
        status,
      }).select("id").single();
  if (error || !saved) return { error: "No pudimos guardar tus respuestas. Inténtalo de nuevo." };
  // En una respuesta compartida, quien la envía queda registrado como participante.
  if (submit && act.response_scope === "shared") {
    await supabase.from("submission_participants").upsert(
      { submission_id: saved.id, profile_id: uid, confirmed_at: new Date().toISOString() },
      { onConflict: "submission_id,profile_id" },
    );
  }
  refresh();
  return { ok: true };
}

/** Registra una tarea entregada como archivo (ya subido a Storage desde el navegador). */
export async function registerUpload(
  activityId: string,
  file: { path: string; mime: string; size: number },
): Promise<ActionResult> {
  const { supabase, uid } = await session();
  const { data: act } = await supabase
    .from("enrollment_activities")
    .select("id, enrollment_id, form_version_id, response_scope")
    .eq("id", activityId)
    .single();
  if (!act) return { error: "No encontramos este módulo." };

  // La ruta tiene que ser la carpeta de esta persona en esta inscripción.
  const expected = `${act.enrollment_id}/${act.response_scope === "shared" ? "shared" : uid}/`;
  if (!file.path.startsWith(expected)) return { error: "La ruta del archivo no es válida." };

  const mine = supabase.from("form_submissions").select("id").eq("enrollment_activity_id", activityId).eq("status", "submitted");
  const { data: done } = act.response_scope === "shared" ? await mine : await mine.eq("submitted_by", uid);
  if (done?.length) return { error: "Esta tarea ya está entregada." };

  const { data: f, error: fileError } = await supabase
    .from("files")
    .insert({ bucket: "submissions", path: file.path, mime: file.mime, size_bytes: file.size, uploaded_by: uid })
    .select("id")
    .single();
  if (fileError || !f) return { error: "No pudimos registrar el archivo." };

  const { data: sub, error: subError } = await supabase
    .from("form_submissions")
    .insert({
      enrollment_id: act.enrollment_id,
      enrollment_activity_id: activityId,
      form_version_id: act.form_version_id,
      response_scope: act.response_scope,
      submitted_by: uid,
      answers: { entregado_como: "archivo" },
      status: "submitted",
    })
    .select("id")
    .single();
  if (subError || !sub) return { error: "No pudimos registrar la entrega." };

  const { error } = await supabase.from("submission_files").insert({ submission_id: sub.id, file_id: f.id });
  if (error) return { error: "No pudimos adjuntar el archivo a la entrega." };
  refresh();
  return { ok: true };
}
