"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SignResult = { ok?: boolean; error?: string };

/** Firma del contrato dentro de la app: fecha, IP y navegador los registra el servidor (trigger). */
export async function signContract(activityId: string, signerName: string, accepted: boolean): Promise<SignResult> {
  if (!accepted) return { error: "Marca la casilla para confirmar que leíste y aceptas el contrato." };
  if (signerName.trim().length < 3) return { error: "Escribe tu nombre completo como firma." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return { error: "Tu sesión expiró. Vuelve a entrar." };

  const { data: act } = await supabase
    .from("enrollment_activities").select("enrollment_id, contract_template_id").eq("id", activityId).single();
  if (!act?.contract_template_id) return { error: "No encontramos el contrato." };

  const { error } = await supabase.from("contract_signatures").insert({
    enrollment_id: act.enrollment_id,
    contract_template_id: act.contract_template_id,
    profile_id: uid,
    signer_name: signerName.trim(),
  });
  if (error) {
    return { error: error.code === "23505" ? "Ya firmaste este contrato." : "No pudimos registrar tu firma. Inténtalo de nuevo." };
  }
  refresh();
  return { ok: true };
}
