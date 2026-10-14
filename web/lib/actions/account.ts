"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

export type AccountState = { error?: string; ok?: string };

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
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/aceptar?next=/cuenta/contrasena` });
  // Mismo mensaje exista o no la cuenta (no revelamos qué correos están registrados).
  return { ok: "Si ese correo tiene acceso, te enviamos un enlace para crear una contraseña nueva." };
}

// ---------------------------------------------------------------- perfil

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  const email = data?.claims?.email as string | undefined;
  if (!uid) throw new Error("Tu sesión expiró. Vuelve a entrar.");
  return { supabase, uid, email };
}

export async function updateProfile(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (name.length < 2) return { error: "Escribe tu nombre." };
  if (phone && !/^[+\d][\d\s()-]{6,20}$/.test(phone)) return { error: "Revisa tu teléfono: solo números, espacios y el + del código de país." };
  const { supabase, uid } = await me();
  const { error } = await supabase.from("profiles").update({ full_name: name, phone: phone || null }).eq("id", uid);
  if (error) return { error: "No pudimos guardar tus datos. Inténtalo de nuevo." };
  refresh();
  return { ok: "Datos guardados." };
}

export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10) return { error: "Usa al menos 10 caracteres." };
  if (password !== confirm) return { error: "Las dos contraseñas nuevas no coinciden." };
  const { supabase, email } = await me();
  if (!email) return { error: "No encontramos el correo de tu cuenta." };
  // Pedimos la contraseña actual para que nadie la cambie desde una sesión abierta ajena.
  const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current });
  if (wrong) return { error: "Tu contraseña actual no es correcta." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.code === "weak_password" ? "Esa contraseña es demasiado común o débil. Prueba con otra." : error.code === "same_password" ? "La nueva contraseña tiene que ser distinta de la actual." : "No pudimos cambiar tu contraseña. Inténtalo de nuevo." };
  }
  return { ok: "Contraseña cambiada." };
}

/** La foto ya se subió desde el navegador a avatars/{uid}/…; aquí solo se guarda la ruta. */
export async function saveAvatar(path: string): Promise<AccountState> {
  const { supabase, uid } = await me();
  if (!path.startsWith(`${uid}/`)) return { error: "Esa foto no es tuya." };
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", uid);
  if (error) return { error: "No pudimos guardar tu foto. Inténtalo de nuevo." };
  refresh();
  return { ok: "Foto actualizada." };
}


/** Avisos y recordatorios: cómo quiere esta persona que le recordemos sesiones, tareas y coaching. */
export async function savePrefs(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const prefs = {
    app_notices: formData.get("app_notices") === "on",
    remind_email: formData.get("remind_email") === "on",
    remind_whatsapp: formData.get("remind_whatsapp") === "on",
  };
  const { supabase, uid } = await me();
  const { error } = await supabase.from("profiles").update({ prefs }).eq("id", uid);
  if (error) return { error: "No pudimos guardar tus preferencias. Inténtalo de nuevo." };
  refresh();
  return { ok: "Preferencias guardadas." };
}

/** Presentación de alguien del equipo; la ven las parejas en «Quién los acompaña». */
export async function saveBio(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const bio = String(formData.get("bio") ?? "").trim();
  if (bio.length > 1200) return { error: "La presentación es muy larga (máximo 1200 caracteres)." };
  const { supabase, uid } = await me();
  const { error } = await supabase.from("staff_members").update({ bio: bio || null }).eq("profile_id", uid);
  if (error) return { error: "No pudimos guardar tu presentación." };
  refresh();
  return { ok: "Presentación guardada." };
}
