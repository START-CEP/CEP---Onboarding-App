import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { DownloadLink } from "@/components/session-forms";
import { getHub } from "@/lib/data/hub";
import { assets, signedContentUrl } from "@/lib/data/extra";
import { FOLDER_LABEL, FOLDERS, type Folder } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, groupTitle } from "@/lib/process";

export const metadata: Metadata = { title: "Documentos · CEP" };

export default function DocumentsPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Documents />
    </Suspense>
  );
}

type Row = { key: string; title: string; sub: string; href: string | null; resourceId?: string; internal?: boolean };

async function Documents() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  const supabase = await createClient();
  const held = hub.groupSessions.filter((g) => g.status === "completed").map((g) => g.id);
  const [{ data: docs }, { data: resources }] = await Promise.all([
    supabase.from("documents").select("id, folder, title, description, storage_path, profile_id, created_at")
      .eq("enrollment_id", hub.enrollment.enrollment_id!).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("resources").select("id, title, asset_id, attach_id").eq("attach_type", "group_session")
      .in("attach_id", held.length ? held : ["00000000-0000-0000-0000-000000000000"]).order("position"),
  ]);
  const [signed, assetMap] = await Promise.all([
    Promise.all((docs ?? []).map(async (d) => {
      const { data } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 3600, { download: true });
      return [d.id, data?.signedUrl ?? null] as const;
    })).then((x) => new Map(x)),
    assets((resources ?? []).map((r) => r.asset_id)),
  ]);
  const resLinks = new Map(await Promise.all((resources ?? []).map(async (r) =>
    [r.id, await signedContentUrl(assetMap.get(r.asset_id)?.storage_path, `${r.title}.pdf`)] as const)));

  const folders: Record<Folder, Row[]> = { legal: [], process: [], reports: [], resources: [] };
  const contracts = hub.activities.filter((a) => a.type === "contract");
  if (contracts.length > 0) {
    const done = contracts.every((a) => a.is_completed);
    folders.legal.push({ key: "contrato", title: "Contrato de servicio", sub: done ? "Firmado · ver el texto y las firmas" : "Pendiente de firma", href: "/contrato", internal: true });
  }
  (docs ?? []).forEach((d) => folders[d.folder].push({
    key: d.id, title: d.title, href: signed.get(d.id) ?? null,
    sub: [d.profile_id ? "Solo para ti" : null, fmtDay(d.created_at), d.description].filter(Boolean).join(" · "),
  }));
  (resources ?? []).forEach((r) => {
    const g = hub.groupSessions.find((x) => x.id === r.attach_id);
    folders.resources.push({ key: r.id, title: r.title, sub: g ? `Coaching del ${fmtDay(g.scheduled_at)} · ${groupTitle(g)}` : "Coaching grupal", href: resLinks.get(r.id) ?? null, resourceId: r.id });
  });

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Documentos</p>
          <h1>Sus documentos</h1>
          <p className="lead">Todo lo que el equipo comparte con ustedes: contrato, informes y recursos para descargar.</p>
        </div>
      </div>
      <div className="grid2e">
        {FOLDERS.map((f) => (
          <section className="card" key={f}>
            <div className="ch"><h2 style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name="folder" size={18} /> {FOLDER_LABEL[f]}</h2><span className="chip">{folders[f].length}</span></div>
            {folders[f].length === 0 ? <p className="muted small">Todavía no hay nada aquí.</p> : (
              <div className="list">
                {folders[f].map((r) => (
                  <div className="li" key={r.key}>
                    <div className="tx"><b>{r.title}</b><span>{r.sub}</span></div>
                    {r.internal ? <Link className="btn soft sm" href={r.href!}>Abrir</Link>
                      : !r.href ? <span className="chip">No disponible</span>
                      : r.resourceId ? <DownloadLink resourceId={r.resourceId} href={r.href}>Descargar</DownloadLink>
                      : <a className="btn soft sm" href={r.href} target="_blank" rel="noreferrer">Descargar</a>}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
