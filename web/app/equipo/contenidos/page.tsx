import { Suspense } from "react";
import { NewAsset, PdfUploader, RefreshStatus, VideoUploader } from "@/components/content-forms";
import { bunnyConfigured } from "@/lib/actions/content";
import { getStaff } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";

export default function ContentPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Content />
    </Suspense>
  );
}

const STATUS = {
  pending: { text: "Sin video", cls: "" },
  uploading: { text: "Subiendo", cls: "info" },
  processing: { text: "Procesando en Bunny", cls: "warn" },
  ready: { text: "Listo", cls: "ok" },
  failed: { text: "Error en Bunny", cls: "crit" },
} as const;

async function Content() {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <section className="card empty">Solo un admin puede gestionar los contenidos.</section>;
  const supabase = await createClient();
  const [{ data: list }, configured] = await Promise.all([
    supabase.from("content_assets").select("id, kind, title, provider, processing_status, storage_path, duration_seconds, created_at")
      .is("archived_at", null).order("created_at"),
    bunnyConfigured(),
  ]);
  const videos = (list ?? []).filter((a) => a.kind === "video");
  const pdfs = (list ?? []).filter((a) => a.kind === "pdf");

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Videos y archivos</h1>
          <p className="lead">Los videos se suben directo a Bunny Stream y se reproducen con enlace firmado. Los PDFs se guardan en el almacenamiento privado. Cambiar el video de un contenido lo actualiza en todos los procesos que lo usan.</p>
        </div>
      </div>
      {!configured && (
        <div className="alert"><div><b>Bunny no está configurado.</b> Añade <code>BUNNY_STREAM_LIBRARY_ID</code>, <code>BUNNY_STREAM_API_KEY</code> y <code>BUNNY_STREAM_TOKEN_AUTH_KEY</code> en las variables del servidor para subir y reproducir videos.</div></div>
      )}
      <section className="card">
        <div className="ch"><h2>Nuevo contenido</h2></div>
        <NewAsset />
      </section>
      <section className="card">
        <div className="ch"><h2>Videos</h2><span className="chip">{videos.filter((v) => v.processing_status === "ready").length} de {videos.length} listos</span></div>
        <div className="scrollx">
          <table>
            <thead><tr><th>Título</th><th>Estado</th><th>Duración</th><th /></tr></thead>
            <tbody>
              {videos.map((v) => {
                const s = STATUS[(v.processing_status as keyof typeof STATUS) ?? "pending"] ?? STATUS.pending;
                return (
                  <tr key={v.id}>
                    <td><b>{v.title}</b></td>
                    <td><span className={`chip ${s.cls}`}>{s.text}</span></td>
                    <td className="num">{v.duration_seconds ? `${Math.round(v.duration_seconds / 60)} min` : "—"}</td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <VideoUploader assetId={v.id} />
                      {v.provider === "bunny" && v.processing_status !== "ready" && <RefreshStatus assetId={v.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="ch"><h2>PDFs y recursos</h2></div>
        <div className="scrollx">
          <table>
            <thead><tr><th>Título</th><th>Archivo</th><th /></tr></thead>
            <tbody>
              {pdfs.map((p) => {
                const uploaded = p.storage_path && p.storage_path.startsWith(`${p.id}/`);
                return (
                  <tr key={p.id}>
                    <td><b>{p.title}</b></td>
                    <td>{uploaded ? <span className="chip ok">{p.storage_path!.split("/").at(-1)}</span> : <span className="chip">Sin archivo</span>}</td>
                    <td><PdfUploader assetId={p.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
