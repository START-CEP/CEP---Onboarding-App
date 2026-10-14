"use server";

import { refresh } from "next/cache";
import { getStaff } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import { cleanSchema, FORM_KINDS, schemaProblem, type Section } from "@/lib/forms";
import type { Json } from "@/lib/database.types";

// Constructor de formularios (solo admin). Cada publicación crea una versión nueva e inmutable:
// las actividades apuntan a una versión concreta, así que las parejas en curso no ven cambios.
export type PublishResult = { error?: string; formId?: string; version?: number };

const slug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "formulario";

export async function publishForm(input: { formId: string | null; name: string; kind: string; sections: Section[] }): Promise<PublishResult> {
  const staff = await getStaff();
  if (!staff?.isAdmin) return { error: "Solo un admin puede editar formularios." };
  const name = input.name.trim();
  if (!name) return { error: "Ponle nombre al formulario." };
  if (!FORM_KINDS.some(([k]) => k === input.kind)) return { error: "Elige para qué es el formulario." };
  const problem = schemaProblem(input.sections);
  if (problem) return { error: problem };
  const schema = cleanSchema(input.sections) as unknown as Json;
  const supabase = await createClient();

  let formId = input.formId;
  if (formId) {
    const { error } = await supabase.from("forms").update({ name, kind: input.kind }).eq("id", formId);
    if (error) return { error: "No pudimos guardar el nombre del formulario." };
  } else {
    const base = slug(name);
    const { data: taken } = await supabase.from("forms").select("key").like("key", `${base}%`);
    const keys = new Set((taken ?? []).map((f) => f.key));
    let key = base;
    for (let i = 2; keys.has(key); i++) key = `${base}_${i}`;
    const { data, error } = await supabase.from("forms").insert({ key, name, kind: input.kind }).select("id").single();
    if (error || !data) return { error: "No pudimos crear el formulario." };
    formId = data.id;
  }

  const { data: last } = await supabase.from("form_versions").select("version").eq("form_id", formId).order("version", { ascending: false }).limit(1);
  const version = (last?.[0]?.version ?? 0) + 1;
  const { error } = await supabase.from("form_versions").insert({ form_id: formId, version, schema, published_at: new Date().toISOString() });
  if (error) return { error: `No pudimos publicar la versión (${error.message}).`, formId };
  refresh();
  return { formId, version };
}

export async function archiveForm(formId: string, archived: boolean): Promise<{ error?: string }> {
  const staff = await getStaff();
  if (!staff?.isAdmin) return { error: "Solo un admin puede editar formularios." };
  const supabase = await createClient();
  const { error } = await supabase.from("forms").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", formId);
  if (error) return { error: "No pudimos actualizar el formulario." };
  refresh();
  return {};
}
