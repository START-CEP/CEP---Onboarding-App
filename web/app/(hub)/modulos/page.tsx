import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HomeworkForm, MarkViewed, UploadHomework } from "@/components/homework";
import { Icon } from "@/components/icon";
import { getHub } from "@/lib/data/hub";
import { getModules, type ModuleDetail, type ModuleItem } from "@/lib/data/modules";
import { ModuleList } from "@/components/module-list";
import { firstName, fmtDay, keyRange } from "@/lib/process";
import { extrasPlan, moduleHref, parseItems } from "@/lib/activity-config";
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

async function Modules({ searchParams }: { searchParams: PageProps<"/modulos">["searchParams"] }) {
  const sp = await searchParams;
  const focusKey = typeof sp.m === "string" ? sp.m : undefined;
  const tab = sp.t === "pdf" ? "pdf" : "online";
  const lessonN = typeof sp.l === "string" ? Number(sp.l) || 1 : 1;
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;

  const { items, detail } = await getModules(hub, focusKey, lessonN);
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
          <ModuleList key={detail?.activityId} items={items} activeId={detail?.activityId} activeLesson={detail?.lesson.n ?? 1} />
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
      <LessonVideo d={d} />
      {extras}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {!locked && <MarkViewed key={d.activityId} activityId={d.activityId} moduleKey={d.key} done={d.viewedByMe} />}
        {partner && d.partnerViewed !== null && (
          <span className={`chip ${d.partnerViewed ? "ok" : ""}`}>{partner}: {d.partnerViewed ? "lo vio" : "aún no lo ve"}</span>
        )}
        {d.requiredFor.length > 0 && <span className="chip warn"><Icon name="lock" size={13} /> Indispensable para {keyRange(d.requiredFor)}</span>}
      </div>

      {d.form && !locked && (
        <section className="card qblock">
          <div className="ch" style={{ margin: 0 }}>
            <h2>Tarea del módulo</h2>
            {!d.submitted && (
              <div className="tabs">
                <Link href={moduleHref(d.key, d.lesson.n)} aria-current={tab === "online" ? "true" : undefined}
                  className="tab" style={tabStyle(tab === "online")}>Completar en línea</Link>
                <Link href={`${moduleHref(d.key, d.lesson.n)}${d.lesson.n > 1 ? "&" : "?"}t=pdf`} aria-current={tab === "pdf" ? "true" : undefined}
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
      <Pager items={items} d={d} />
    </div>
  );
}

function Pager({ items, d }: { items: ModuleItem[]; d: ModuleDetail }) {
  const i = items.findIndex((m) => m.activityId === d.activityId);
  const nextLesson = d.status === "locked" ? undefined : d.lessons.find((l) => l.n === d.lesson.n + 1);
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
      {nextLesson ? (
        <Link className="btn sm" href={moduleHref(d.key, nextLesson.n)}>Siguiente video: {nextLesson.title} <Icon name="arrow" size={14} /></Link>
      ) : next && (next.status === "locked"
        ? <span className="chip"><Icon name="lock" size={13} /> {short(next)}: se abre al cumplir su requisito</span>
        : <Link className="btn sm" href={`/modulos?m=${encodeURIComponent(next.key)}`}>Siguiente: {short(next)} <Icon name="arrow" size={14} /></Link>)}
    </nav>
  );
}

function tabStyle(on: boolean): React.CSSProperties {
  return { padding: "8px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13.5, color: on ? "var(--ink)" : "var(--muted)", background: on ? "var(--surface)" : "transparent" };
}

/** Video de la lección abierta, con su lugar en el módulo y acceso a las demás. */
function LessonVideo({ d }: { d: ModuleDetail }) {
  // Un módulo bloqueado no recibe la URL firmada del video, aunque se pida por la dirección (?m=).
  const locked = d.status === "locked";
  const many = d.lessons.length > 1;
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      {many && (
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>{d.title.split(" · ")[0]} · Video {d.lesson.n} de {d.lessons.length}</p>
          <h2 style={{ margin: "2px 0 0" }}>{d.lesson.title}</h2>
        </div>
      )}
      <AssetVideo key={`${d.activityId}-${d.lesson.n}`} asset={d.lessonAsset} title={many ? d.lesson.title : d.title} locked={locked}
        caption={locked ? "Se abre al cumplir su requisito" : undefined} />
      {many && !locked && (
        <nav className="lessonbar" aria-label="Videos de este módulo">
          {d.lessons.map((l) => (
            <Link key={l.n} href={moduleHref(d.key, l.n)} className={`chip ${l.n === d.lesson.n ? "info" : ""}`}
              aria-current={l.n === d.lesson.n ? "true" : undefined}>
              <Icon name="play" size={12} /> {l.n}. {l.title}{l.minutes ? ` · ${l.minutes} min` : ""}
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}

/** Material para descargar del módulo (PDF…). Los videos extra son lecciones y van en la lista de videos. */
async function Extras({ d, config }: { d: ModuleDetail; config: Json | undefined }) {
  const items = parseItems(config);
  if (items.length === 0 || d.status === "locked") return null;
  const map = await assets(items.map((i) => i.asset_id));
  const files = extrasPlan(items, map, false).filter((p) => p.kind === "file");
  if (files.length === 0) return null;
  const links = new Map(await Promise.all(files.map(async (p) =>
    [p.asset_id, await signedContentUrl(map.get(p.asset_id)?.storage_path, `${p.title || "recurso"}.pdf`)] as const)));
  return (
    <section className="card">
      <h2 style={{ marginBottom: 10 }}>Material del módulo</h2>
      <div className="list">
        {files.map((p, i) => (
          <div key={`${p.asset_id}-${i}`} className="li">
            <span className="ico"><Icon name="book" /></span>
            <div className="tx"><b>{p.title || "Recurso"}</b><span>Para descargar</span></div>
            {links.get(p.asset_id)
              ? <a className="btn soft sm" href={links.get(p.asset_id)!} target="_blank" rel="noreferrer">Descargar</a>
              : <span className="chip">Pendiente de subir</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
