"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Acciones del equipo sobre una inscripción. La RLS limita a admin, clínico asignado o asistente.
export type Result = { ok?: boolean; error?: string };

async function staffSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) throw new Error("Tu sesión expiró.");
  return { supabase, uid };
}

const done = (error: { message: string } | null, fail: string): Result => {
  if (error) return { error: fail };
  refresh();
  return { ok: true };
};

/** Confirmar una solicitud o agendar directamente una sesión. */
export async function scheduleSession(activityId: string, sessionId: string | null, whenIso: string, meetingUrl: string): Promise<Result> {
  const { supabase, uid } = await staffSession();
  const when = new Date(whenIso);
  if (Number.isNaN(when.getTime())) return { error: "Elige fecha y hora." };
  const fields = { scheduled_at: when.toISOString(), meeting_url: meetingUrl.trim() || null, status: "scheduled" as const, staff_profile_id: uid };
  if (sessionId) {
    const { error } = await supabase.from("enrollment_sessions").update(fields).eq("id", sessionId);
    return done(error, "No pudimos confirmar la sesión.");
  }
  const { data: act } = await supabase.from("enrollment_activities").select("enrollment_id").eq("id", activityId).single();
  if (!act) return { error: "No encontramos la sesión." };
  const { error } = await supabase.from("enrollment_sessions").insert({ ...fields, enrollment_id: act.enrollment_id, enrollment_activity_id: activityId });
  return done(error, "No pudimos agendar la sesión.");
}

export async function setSessionStatus(sessionId: string, status: "completed" | "no_show" | "cancelled"): Promise<Result> {
  const { supabase } = await staffSession();
  const { error } = await supabase.from("enrollment_sessions").update({ status }).eq("id", sessionId);
  return done(error, "No pudimos actualizar la sesión.");
}

export async function addAgendaItem(activityId: string, body: string): Promise<Result> {
  const { supabase, uid } = await staffSession();
  if (!body.trim()) return { error: "Escribe el tema." };
  const { count } = await supabase.from("session_agenda_items").select("id", { count: "exact", head: true }).eq("enrollment_activity_id", activityId);
  const { error } = await supabase.from("session_agenda_items").insert({ enrollment_activity_id: activityId, body: body.trim(), position: (count ?? 0) + 1, created_by: uid });
  return done(error, "No pudimos guardar el tema.");
}

export async function removeAgendaItem(id: string): Promise<Result> {
  const { supabase } = await staffSession();
  const { error } = await supabase.from("session_agenda_items").delete().eq("id", id);
  return done(error, "No pudimos quitar el tema.");
}

export async function addSessionNote(sessionId: string, body: string): Promise<Result> {
  const { supabase, uid } = await staffSession();
  if (!body.trim()) return { error: "La nota está vacía." };
  const { error } = await supabase.from("session_notes").insert({ enrollment_session_id: sessionId, author_id: uid, body: body.trim() });
  return done(error, "Solo el clínico asignado o admin pueden escribir notas clínicas.");
}

export async function toggleStaffTask(progressId: string, isDone: boolean): Promise<Result> {
  const { supabase, uid } = await staffSession();
  const { error } = await supabase.from("staff_task_progress")
    .update({ done_at: isDone ? new Date().toISOString() : null, done_by: isDone ? uid : null }).eq("id", progressId);
  return done(error, "No pudimos actualizar la tarea.");
}

/** Dispensar (o volver a exigir) un requisito para esta pareja. */
export async function waiveRequirement(requirementId: string, waive: boolean): Promise<Result> {
  const { supabase, uid } = await staffSession();
  const { error } = await supabase.from("enrollment_requirements")
    .update({ waived_at: waive ? new Date().toISOString() : null, waived_by: waive ? uid : null }).eq("id", requirementId);
  return done(error, "No pudimos cambiar el requisito.");
}

/** "El avance lo marca el equipo": confirmar una actividad para toda la unidad. */
export async function confirmActivity(activityId: string): Promise<Result> {
  const { supabase, uid } = await staffSession();
  const now = new Date().toISOString();
  const { error } = await supabase.from("activity_progress").upsert(
    { enrollment_activity_id: activityId, profile_id: null, status: "completed", completed_at: now, started_at: now, updated_by: uid },
    { onConflict: "enrollment_activity_id,profile_id" },
  );
  return done(error, "No pudimos confirmar la actividad.");
}

export async function completeStep(stepId: string, complete: boolean): Promise<Result> {
  const { supabase, uid } = await staffSession();
  const { error } = await supabase.from("enrollment_steps")
    .update({ completed_at: complete ? new Date().toISOString() : null, completed_by: complete ? uid : null }).eq("id", stepId);
  return done(error, "No pudimos actualizar el paso.");
}

export async function setQuestionStatus(questionId: string, status: "selected" | "answered" | "dismissed"): Promise<Result> {
  const { supabase } = await staffSession();
  const { error } = await supabase.from("group_session_questions").update({ status }).eq("id", questionId);
  return done(error, "No pudimos actualizar la pregunta.");
}
