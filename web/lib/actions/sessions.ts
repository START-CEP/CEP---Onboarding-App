"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok?: boolean; error?: string };

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, uid: data?.claims?.sub };
}

/**
 * La pareja pide una sesión con una fecha preferida; el equipo la confirma.
 * Solo si el paso de esa sesión no tiene requisitos obligatorios pendientes.
 */
export async function requestSession(activityId: string, preferred: string): Promise<Result> {
  const { supabase, uid } = await session();
  if (!uid) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const when = new Date(preferred);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) return { error: "Elige una fecha y hora futuras." };

  const { data: act } = await supabase.from("enrollment_activities").select("id, enrollment_id, type").eq("id", activityId).single();
  if (!act || act.type !== "therapy_session") return { error: "No encontramos esta sesión." };

  const { data: step } = await supabase
    .from("v_step_state").select("state, blocking_unmet").eq("activity_id", activityId).maybeSingle();
  if (step && (step.blocking_unmet ?? 0) > 0) return { error: "Antes de agendar, completen los requisitos de esta sesión." };
  if (step && step.state === "locked") return { error: "Esta sesión se abre cuando terminen el paso anterior." };

  const { data: existing } = await supabase
    .from("enrollment_sessions").select("id").eq("enrollment_activity_id", activityId).in("status", ["requested", "scheduled"]);
  if (existing?.length) return { error: "Ya hay una solicitud o una cita para esta sesión." };

  const { error } = await supabase.from("enrollment_sessions").insert({
    enrollment_id: act.enrollment_id,
    enrollment_activity_id: activityId,
    scheduled_at: when.toISOString(),
    status: "requested",
  });
  if (error) return { error: "No pudimos enviar la solicitud. Inténtalo de nuevo." };
  refresh();
  return { ok: true };
}

/** Pregunta para el próximo coaching grupal. */
export async function askGroupQuestion(groupSessionId: string, enrollmentId: string, body: string, anonymous: boolean): Promise<Result> {
  const { supabase, uid } = await session();
  if (!uid) return { error: "Tu sesión expiró. Vuelve a entrar." };
  if (body.trim().length < 5) return { error: "Escribe tu pregunta (al menos unas palabras)." };
  const { error } = await supabase.from("group_session_questions").insert({
    group_session_id: groupSessionId,
    enrollment_id: enrollmentId,
    profile_id: uid,
    body: body.trim(),
    is_anonymous: anonymous,
  });
  if (error) return { error: "No pudimos enviar tu pregunta. Inténtalo de nuevo." };
  refresh();
  return { ok: true };
}

/** Deja constancia de una descarga de recurso (seguimiento del equipo). */
export async function logDownload(resourceId: string) {
  const { supabase, uid } = await session();
  if (!uid) return;
  await supabase.from("resource_downloads").insert({ resource_id: resourceId, profile_id: uid });
}
