"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Upload } from "tus-js-client";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import {
  addGroupSession, attachResource, createAsset, finishPdf, markUploaded, refreshBunnyStatus, removeResource,
  setRecording, startBunnyUpload, updateGroupSession,
} from "@/lib/actions/content";

const Err = ({ e }: { e?: string }) => (e ? <span className="formerr" role="alert">{e}</span> : null);

export function NewAsset() {
  const [kind, setKind] = useState<"video" | "pdf">("video");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
      onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createAsset(kind, title); setError(r.error); if (r.id) setTitle(""); }); }}>
      <select className="input" style={{ maxWidth: 140 }} value={kind} onChange={(e) => setKind(e.target.value as "video" | "pdf")} aria-label="Tipo">
        <option value="video">Video</option>
        <option value="pdf">PDF</option>
      </select>
      <input className="input" style={{ maxWidth: 360 }} placeholder="Título (p. ej. Grabación coaching 21 oct)" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título" />
      <button className="btn sm" disabled={pending}>Crear</button>
      <Err e={error} />
    </form>
  );
}

/** Subida directa del navegador a Bunny (TUS, reanudable) con firma temporal del servidor. */
export function VideoUploader({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const onFile = async (file?: File) => {
    if (!file) return;
    setError(undefined);
    setProgress(0);
    const prep = await startBunnyUpload(assetId);
    if (prep.error || !prep.endpoint || !prep.headers) { setProgress(null); return setError(prep.error); }
    const upload = new Upload(file, {
      endpoint: prep.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: prep.headers,
      metadata: { filetype: file.type, title: file.name },
      onError: () => { setProgress(null); setError("Se cortó la subida. Inténtalo de nuevo (se reanuda donde quedó)."); },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: async () => { setProgress(100); const r = await markUploaded(assetId); setError(r.error); router.refresh(); },
    });
    const previous = await upload.findPreviousUploads();
    if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
    upload.start();
  };
  return (
    <label className="btn ghost sm" style={{ cursor: "pointer" }}>
      <Icon name="arrow" size={14} /> {progress === null ? "Subir video" : progress < 100 ? `Subiendo ${progress}%` : "Procesando…"}
      <input type="file" accept="video/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <Err e={error} />
    </label>
  );
}

export function PdfUploader({ assetId }: { assetId: string }) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const onFile = (file?: File) => {
    if (!file) return;
    start(async () => {
      const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
      const path = `${assetId}/${safe}`;
      const { error: up } = await createClient().storage.from("content").upload(path, file, { contentType: file.type, upsert: true });
      if (up) return setError("No pudimos subir el archivo.");
      const r = await finishPdf(assetId, path, file.size, file.type);
      setError(r.error);
    });
  };
  return (
    <label className="btn ghost sm" style={{ cursor: "pointer" }}>
      <Icon name="arrow" size={14} /> {pending ? "Subiendo…" : "Subir PDF"}
      <input type="file" accept="application/pdf" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <Err e={error} />
    </label>
  );
}

export function RefreshStatus({ assetId }: { assetId: string }) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn ghost sm" disabled={pending} onClick={() => start(async () => setError((await refreshBunnyStatus(assetId)).error))}>
        {pending ? "Consultando…" : "Actualizar estado"}
      </button>
      <Err e={error} />
    </>
  );
}

export function GroupSessionEditor({ id, meetingUrl, status, recordingAssetId, videos, pdfs }: {
  id: string; meetingUrl: string | null; status: string; recordingAssetId: string | null;
  videos: { id: string; title: string }[]; pdfs: { id: string; title: string }[];
}) {
  const [url, setUrl] = useState(meetingUrl ?? "");
  const [pdf, setPdf] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => setError((await fn()).error));
  return (
    <div className="qblock" style={{ gap: 8, width: "100%" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" style={{ maxWidth: 320 }} type="url" placeholder="Enlace de la videollamada" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Enlace" />
        <button className="btn ghost sm" disabled={pending} onClick={() => run(() => updateGroupSession(id, { meetingUrl: url }))}>Guardar enlace</button>
        {status !== "completed"
          ? <button className="btn soft sm" disabled={pending} onClick={() => run(() => updateGroupSession(id, { status: "completed" }))}><Icon name="check" size={13} /> Marcar realizado</button>
          : <button className="btn ghost sm" disabled={pending} onClick={() => run(() => updateGroupSession(id, { status: "scheduled" }))}>Reabrir</button>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select className="input" style={{ maxWidth: 320 }} value={recordingAssetId ?? ""} aria-label="Grabación"
          onChange={(e) => run(() => setRecording(id, e.target.value || null))}>
          <option value="">Sin grabación</option>
          {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 260 }} value={pdf} onChange={(e) => setPdf(e.target.value)} aria-label="Recurso PDF">
          <option value="">Adjuntar recurso PDF…</option>
          {pdfs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <button className="btn ghost sm" disabled={pending || !pdf}
          onClick={() => run(async () => { const t = pdfs.find((p) => p.id === pdf)?.title ?? "Recurso"; const r = await attachResource(pdf, t, "group_session", id); if (r.ok) setPdf(""); return r; })}>Adjuntar</button>
      </div>
      <Err e={error} />
    </div>
  );
}

export function RemoveResource({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button className="btn ghost sm" disabled={pending} onClick={() => start(async () => { await removeResource(id); })}>Quitar</button>;
}

export function NewGroupSession({ programId }: { programId: string }) {
  const [when, setWhen] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
      onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addGroupSession(programId, new Date(when).toISOString(), title); setError(r.error); if (r.ok) { setWhen(""); setTitle(""); } }); }}>
      <input className="input" style={{ maxWidth: 230 }} type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Fecha y hora" />
      <input className="input" style={{ maxWidth: 300 }} placeholder="Tema" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Tema" />
      <button className="btn sm" disabled={pending}>Añadir encuentro</button>
      <Err e={error} />
    </form>
  );
}
