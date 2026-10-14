import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HomeworkForm, MarkViewed, UploadHomework } from "@/components/homework";
import { Icon } from "@/components/icon";
import { bunnyEmbedUrl } from "@/lib/bunny";
import { getHub } from "@/lib/data/hub";
import { getModules, type ModuleDetail, type ModuleItem } from "@/lib/data/modules";
import { firstName, fmtDay } from "@/lib/process";
import { extrasPlan, parseItems } from "@/lib/activity-config";
import { assets, signedContentUrl } from "@/lib/data/extra";
import { Video as AssetVideo } from "@/components/video";
import type { Json } from "@/lib/database.types";

export const metadata: Metadata = { title: "Módulos · CEP" };

export default function ModulesPage({ searchParams }: PageProps<"/modulos">) {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 420 }} aria-busy="true" />}>
      <Modules searchParams={searchParams} />
    </Suspense>
  );
}

const STATUS: Record<ModuleItem["status"], { icon: "check" | "pen" | "play" | "lock"; cls: string; text: string }> = {
  done: { icon: "check", cls: "ok", text: "Visto · tarea entregada" },
  task: { icon: "pen", cls: "warn", text: "Visto · falta la tarea" },
  available: { icon: "play", cls: "info", text: "Disponible" },
  locked: { icon: "lock", cls: "", text: "Se abre al cumplir su requisito" },
};

async function Modules({ searchParams }: { searchParams: PageProps<"/modulos">["searchParams"] }) {
  const sp = await searchParams;
  const focusKey = typeof sp.m === "string" ? sp.m : undefined;
  const tab = sp.t === "pdf" ? "pdf" : "online";
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;

  const { items, detail } = await getModules(hub, focusKey);
  const partner = hub.members.find((m) => m.profileId !== me.id);
  const seen = items.filter((m) => m.status === "done" || m.status === "task").length;

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Videos y tareas</p>
          <h1>Módulos</h1>
          <p className="lead">Cada módulo prepara una sesión. Véanlo antes de la sesión que lo requiere; si quieren adelantarse, también pueden.</p>
        </div>
        <span className="chip info">{seen} de {items.length} vistos</span>
      </div>
      <div className="split">
        <section className="card">
          <div className="list modlist">
            {items.map((m, i) => {
              const s = STATUS[m.status];
              const header = m.trackName !== items[i - 1]?.trackName && <div className="blockhead">{m.trackName}</div>;
              return (
                <div key={m.activityId}>
                  {header}
                  <Link href={`/modulos?m=${encodeURIComponent(m.key)}`} className={`li ${m.activityId === detail?.activityId ? "on" : ""}`}
                    aria-current={m.activityId === detail?.activityId ? "true" : undefined}>
                    <span className={`ico ${s.cls}`}><Icon name={s.icon} /></span>
                    <div className="tx">
                      <b>{m.title}</b>
                      <span>{m.status === "done" && !m.hasTask ? "Visto" : m.status === "available" && m.taskSent ? "Tarea entregada · falta ver el video" : s.text}{m.requiredFor.length ? ` · para ${m.requiredFor.join(", ")}` : ""}</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
        {detail ? <Detail d={detail} items={items} extras={<Extras d={detail} config={hub.configs[detail.activityId]} />} tab={tab} meId={me.id} partner={partner ? firstName(partner.name) : undefined} /> : <section className="card empty">Este servicio no tiene módulos en video.</section>}
      </div>
    </>
  );
}

function Detail({ d, items, extras, tab, meId, partner }: { d: ModuleDetail; items: ModuleItem[]; extras: React.ReactNode; tab: "online" | "pdf"; meId: string; partner?: string }) {
  const locked = d.status === "locked";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
      <Video d={d} />
      {extras}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {!locked && <MarkViewed key={d.activityId} activityId={d.activityId} moduleKey={d.key} done={d.viewedByMe} />}
        {partner && d.partnerViewed !== null && (
          <span className={`chip ${d.partnerViewed ? "ok" : ""}`}>{partner}: {d.partnerViewed ? "lo vio" : "aún no lo ve"}</span>
        )}
        {d.requiredFor.length > 0 && <span className="chip warn"><Icon name="lock" size={13} /> Requisito para {d.requiredFor.join(", ")}</span>}
      </div>

      {d.form && !locked && (
        <section className="card qblock">
          <div className="ch" style={{ margin: 0 }}>
            <h2>Tarea del módulo</h2>
            {!d.submitted && (
              <div className="tabs">
                <Link href={`/modulos?m=${encodeURIComponent(d.key)}`} aria-current={tab === "online" ? "true" : undefined}
                  className="tab" style={tabStyle(tab === "online")}>Completar en línea</Link>
                <Link href={`/modulos?m=${encodeURIComponent(d.key)}&t=pdf`} aria-current={tab === "pdf" ? "true" : undefined}
                  className="tab" style={tabStyle(tab === "pdf")}>Subir PDF o foto</Link>
              </div>
            )}
          </div>

          {d.submitted ? (
            <>
              <div className="alert info"><Icon name="check" /><div><b>Tarea entregada{d.submitted.submitted_at ? ` el ${fmtDay(d.submitted.submitted_at)}` : ""}.</b> Queda guardada en tu ficha; ya no se puede editar.</div></div>
              {d.uploadedFiles.length > 0
                ? <p className="muted">Archivo entregado: {d.uploadedFiles.join(", ")}</p>
                : <HomeworkForm key={`${d.activityId}-sent`} activityId={d.activityId} returnTo={`/modulos?m=${encodeURIComponent(d.key)}`} sections={d.form.sections} initial={(d.submitted.answers ?? {}) as Record<string, never>} readOnly />}
            </>
          ) : tab === "pdf" ? (
            <>
              <UploadHomework key={d.activityId} activityId={d.activityId} moduleKey={d.key} folder={`${d.enrollmentId}/${d.responseScope === "shared" ? "shared" : meId}`} />
              <p className="small muted">¿Les gusta escribir a mano? Completen la tarea en papel y suban la foto o el PDF. Recomendamos la versión en línea: así el equipo la tiene lista antes de la sesión.</p>
            </>
          ) : (
            <HomeworkForm key={d.activityId} activityId={d.activityId} returnTo={`/modulos?m=${encodeURIComponent(d.key)}`} sections={d.form.sections} initial={(d.draft?.answers ?? {}) as Record<string, never>} readOnly={false} />
          )}
        </section>
      )}
      <Pager items={items} current={d.activityId} />
    </div>
  );
}

function Pager({ items, current }: { items: ModuleItem[]; current: string }) {
  const i = items.findIndex((m) => m.activityId === current);
  const prev = items[i - 1];
  const next = items[i + 1];
  const short = (m: ModuleItem) => m.title.split(" · ")[0];
  return (
    <nav className="modpager" aria-label="Navegar entre módulos">
      {prev ? (
        <Link className="btn ghost sm" href={`/modulos?m=${encodeURIComponent(prev.key)}`}>
          <span style={{ display: "inline-flex", transform: "scaleX(-1)" }}><Icon name="arrow" size={14} /></span> {short(prev)}
        </Link>
      ) : <span />}
      {next && (next.status === "locked"
        ? <span className="chip"><Icon name="lock" size={13} /> {short(next)}: se abre al cumplir su requisito</span>
        : <Link className="btn sm" href={`/modulos?m=${encodeURIComponent(next.key)}`}>Siguiente: {short(next)} <Icon name="arrow" size={14} /></Link>)}
    </nav>
  );
}

function tabStyle(on: boolean): React.CSSProperties {
  return { padding: "8px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13.5, color: on ? "var(--ink)" : "var(--muted)", background: on ? "var(--surface)" : "transparent" };
}

function Video({ d }: { d: ModuleDetail }) {
  // Un módulo bloqueado no recibe la URL firmada del video, aunque se pida por la dirección (?m=).
  const locked = d.status === "locked";
  const src = !locked && d.video?.kind === "bunny" && d.video.ready ? bunnyEmbedUrl(d.video.libraryId, d.video.videoId) : null;
  if (src) {
    return (
      <div className="video" style={{ display: "block" }}>
        <iframe src={src} title={d.title} loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen
          style={{ border: 0, position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>
    );
  }
  return (
    <div className="video" role="img" aria-label={`Video de ${d.title}`}>
      <span className="play"><Icon name={d.status === "locked" ? "lock" : "play"} size={26} /></span>
      <div className="cap">
        <span>{d.title}</span>
        <span>{locked ? "Se abre al cumplir su requisito" : d.video?.kind === "bunny" ? (d.video.ready ? "Video no disponible" : "Procesando video…") : "Video pendiente de subir"}</span>
      </div>
    </div>
  );
}

/** Más contenidos del módulo (p. ej. un segundo video o un PDF), configurados en el servicio. */
async function Extras({ d, config }: { d: ModuleDetail; config: Json | undefined }) {
  const items = parseItems(config);
  if (items.length === 0) return null;
  const locked = d.status === "locked";
  const map = locked ? new Map() : await assets(items.map((i) => i.asset_id));
  const plan = extrasPlan(items, map, locked);
  const links = new Map(await Promise.all(plan.filter((p) => p.kind === "file").map(async (p) =>
    [p.asset_id, await signedContentUrl(map.get(p.asset_id)?.storage_path, `${p.title || "recurso"}.pdf`)] as const)));
  return (
    <section className="card">
      <h2 style={{ marginBottom: 10 }}>Más contenido de este módulo</h2>
      <div className="list">
        {plan.map((p, i) => (
          <details key={`${p.asset_id}-${i}`} className="modextra">
            <summary>
              <Icon name={p.kind === "locked" ? "lock" : p.kind === "video" ? "play" : "book"} size={16} />
              <b>{p.title || (p.kind === "video" ? "Video" : "Recurso")}</b>
              <span className="small muted">{p.kind === "locked" ? "Se abre al cumplir su requisito" : p.kind === "video" ? "Video" : p.kind === "file" ? "Para descargar" : "Pendiente de subir"}</span>
            </summary>
            {p.kind === "video" && <AssetVideo asset={map.get(p.asset_id)} title={p.title || d.title} />}
            {p.kind === "file" && (links.get(p.asset_id)
              ? <a className="btn soft sm" href={links.get(p.asset_id)!} target="_blank" rel="noreferrer">Descargar</a>
              : <span className="chip">Pendiente de subir</span>)}
          </details>
        ))}
      </div>
    </section>
  );
}
