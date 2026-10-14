"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; ok?: string };

export async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function setPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10) return { error: "Usa al menos 10 caracteres." };
  if (password !== confirm) return { error: "Las dos contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.code === "weak_password" ? "Esa contraseña es demasiado común o débil. Prueba con otra." : "No pudimos guardar tu contraseña. Vuelve a abrir el enlace de tu correo." };
  }
  redirect("/");
}

export async function requestReset(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escribe tu correo." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/aceptar?next=/cuenta/contrasena` });
  // Mismo mensaje exista o no la cuenta (no revelamos qué correos están registrados).
  return { ok: "Si ese correo tiene acceso, te enviamos un enlace para crear una contraseña nueva." };
}
