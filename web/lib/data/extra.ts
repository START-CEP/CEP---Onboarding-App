import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/database.types";
import { parseSchema, type Section } from "@/lib/forms";

type Row = Database["public"]["Tables"]["enrollment_activities"]["Row"];

/** Columnas de las actividades de la inscripción que no están en las vistas (formulario, contrato, asset, config). */
export async function activityRows(ids: string[]) {
  if (ids.length === 0) return [] as Row[];
  const supabase = await createClient();
  const { data } = await supabase.from("enrollment_activities").select("*").in("id", ids);
  return data ?? [];
}

export function parseSections(schema: Json | undefined | null): Section[] {
  return parseSchema(schema);
}

export async function formSchemas(versionIds: string[]) {
  if (versionIds.length === 0) return new Map<string, Section[]>();
  const supabase = await createClient();
  const { data } = await supabase.from("form_versions").select("id, schema").in("id", versionIds);
  return new Map((data ?? []).map((f) => [f.id, parseSections(f.schema)]));
}

export type AssetInfo = Pick<
  Database["public"]["Tables"]["content_assets"]["Row"],
  "id" | "kind" | "title" | "provider" | "provider_id" | "provider_library_id" | "processing_status" | "storage_path" | "duration_seconds"
>;

export async function assets(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map<string, AssetInfo>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_assets")
    .select("id, kind, title, provider, provider_id, provider_library_id, processing_status, storage_path, duration_seconds")
    .in("id", unique);
  return new Map((data ?? []).map((a) => [a.id, a]));
}

/** URL firmada de un archivo del bucket "content" (la RLS decide si el usuario puede verlo). */
export async function signedContentUrl(path: string | null | undefined, download?: string) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("content").createSignedUrl(path, 60 * 60, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}

/** URL firmada de la foto de perfil (bucket privado "avatars"). */
export async function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
