"use client";

import { useRef, useState, useTransition } from "react";
import { archiveDocument, registerDocument } from "@/lib/actions/documents";
import { FOLDER_LABEL, FOLDERS, type Folder } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx";

export function UploadDocument({ enrollmentId, members }: { enrollmentId: string; members: { profileId: string; name: string }[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string }>({});
  const [pending, start] = useTransition();
  return (
    <form ref={form} className="qblock" style={{ marginTop: 14 }} onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const file = fd.get("file") as File | null;
      start(async () => {
        if (!file?.size) return setMsg({ error: "Elige un archivo." });
        if (file.size > 50 * 1024 * 1024) return setMsg({ error: "El archivo pesa más de 50 MB." });
        const path = `${enrollmentId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
        const { error: upErr } = await createClient().storage.from("documents").upload(path, file, { contentType: file.type });
        if (upErr) return setMsg({ error: "No pudimos subir el archivo (PDF, imagen, Word o Excel, hasta 50 MB)." });
        const r = await registerDocument({
          enrollmentId, profileId: String(fd.get("for") ?? "") || null, folder: String(fd.get("folder")) as Folder,
          title: String(fd.get("title") ?? "") || file.name, description: String(fd.get("description") ?? ""),
          path, mime: file.type, size: file.size,
        });
        setMsg(r.error ? r : { ok: true });
        if (!r.error) form.current?.reset();
      });
    }}>
      <h3 style={{ fontSize: 15 }}>Compartir un documento</h3>
      <div className="ae-grid">
        <div className="field"><label htmlFor="doc-folder">Carpeta</label>
          <select className="input" id="doc-folder" name="folder">{FOLDERS.map((f) => <option key={f} value={f}>{FOLDER_LABEL[f]}</option>)}</select></div>
        <div className="field"><label htmlFor="doc-for">Para</label>
          <select className="input" id="doc-for" name="for"><option value="">La pareja</option>{members.map((m) => <option key={m.profileId} value={m.profileId}>Solo {m.name}</option>)}</select></div>
        <div className="field"><label htmlFor="doc-title">Título</label><input className="input" id="doc-title" name="title" required maxLength={200} /></div>
        <div className="field"><label htmlFor="doc-file">Archivo</label><input className="input" id="doc-file" type="file" name="file" required accept={ACCEPT} /></div>
        <div className="field wide"><label htmlFor="doc-desc">Descripción (opcional)</label><input className="input" id="doc-desc" name="description" maxLength={1000} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn soft sm" disabled={pending}>{pending ? "Subiendo…" : "Subir documento"}</button>
        {msg.error && <span className="formerr" role="alert">{msg.error}</span>}
        {msg.ok && <span className="chip ok" role="status">Documento compartido</span>}
      </div>
    </form>
  );
}

export function ArchiveDocument({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <button className="btn ghost sm" disabled={pending} onClick={() => start(async () => setError((await archiveDocument(id)).error))}>{pending ? "Quitando…" : "Quitar"}</button>
      {error && <span className="formerr" role="alert">{error}</span>}
    </>
  );
}
