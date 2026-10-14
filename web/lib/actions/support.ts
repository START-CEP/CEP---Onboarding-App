"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Consultas de soporte. La RLS decide quién ve y escribe en cada consulta.
export type SupportState = { error?: string; ok?: string };
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function openTicket(_p: SupportState, fd: FormData): Promise<SupportState> {
  const subject = s(fd, "subject");
  const body = s(fd, "body");
  if (!subject || !body) return { error: "Escribe el asunto y tu consulta." };
  if (subject.length > 200 || body.length > 5000) return { error: "El texto es muy largo." };
  const supabase = await createClient();
  // El id se genera aquí: la política de lectura aún no "ve" la fila dentro del mismo insert (sin RETURNING).
  const id = randomUUID();
  const { error } = await supabase.from("support_tickets")
    .insert({ id, enrollment_id: s(fd, "enrollment"), subject, is_private: fd.get("private") === "on" });
  if (error) return { error: "No pudimos enviar tu consulta. Inténtalo de nuevo." };
  const { error: mErr } = await supabase.from("support_messages").insert({ ticket_id: id, body });
  if (mErr) return { error: "Se creó la consulta, pero no pudimos guardar el mensaje. Escríbelo de nuevo en ella." };
  refresh();
  return { ok: "Consulta enviada. Te avisaremos aquí cuando respondamos." };
}

export async function replyTicket(_p: SupportState, fd: FormData): Promise<SupportState> {
  const body = s(fd, "body");
  if (!body) return { error: "Escribe tu mensaje." };
  if (body.length > 5000) return { error: "El mensaje es muy largo." };
  const supabase = await createClient();
  const { error } = await supabase.from("support_messages").insert({ ticket_id: s(fd, "ticket"), body });
  if (error) return { error: "No pudimos enviar el mensaje." };
  refresh();
  return { ok: "Enviado." };
}

export async function closeTicket(_p: SupportState, fd: FormData): Promise<SupportState> {
  const supabase = await createClient();
  const { error } = await supabase.from("support_tickets").update({ status: "closed" }).eq("id", s(fd, "ticket"));
  if (error) return { error: "No pudimos cerrar la consulta." };
  refresh();
  return { ok: "Consulta resuelta." };
}
