"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage } from "@/lib/db-errors";
import { FOLDERS, type Folder } from "@/lib/documents";

type Result = { error?: string };

/** Registra un archivo que el navegador ya subió al bucket "documents". La RLS decide quién puede. */
export async function registerDocument(input: {
  enrollmentId: string; profileId: string | null; folder: Folder; title: string; description: string; path: string; mime: string; size: number;
}): Promise<Result> {
  if (!FOLDERS.includes(input.folder)) return { error: "Carpeta no válida." };
  const title = input.title.trim().slice(0, 200);
  if (!title) return { error: "Escribe un título." };
  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    enrollment_id: input.enrollmentId, profile_id: input.profileId, folder: input.folder,
    title, description: input.description.trim().slice(0, 1000) || null,
    storage_path: input.path, mime: input.mime || null, size_bytes: input.size,
  });
  if (error) {
    await supabase.storage.from("documents").remove([input.path]);
    const why = dbMessage(error);
    return { error: why ? `No pudimos guardar el documento. ${why}` : "No pudimos guardar el documento." };
  }
  refresh();
  return {};
}

/** Quitar un documento de la vista de la pareja (queda archivado, no se borra). */
export async function archiveDocument(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "No pudimos quitar el documento." };
  refresh();
  return {};
}
