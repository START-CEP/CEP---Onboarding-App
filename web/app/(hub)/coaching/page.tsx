import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { AskQuestion, DownloadLink } from "@/components/session-forms";
import { Video } from "@/components/video";
import { getHub } from "@/lib/data/hub";
import { activityRows, assets, signedContentUrl } from "@/lib/data/extra";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, fmtTime, groupTitle, nextGroupSession } from "@/lib/process";

export const metadata: Metadata = { title: "Coaching Grupal · CEP" };

export default function CoachingPage({ searchParams }: PageProps<"/coaching">) {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Coaching searchParams={searchParams} />
    </Suspense>
  );
}

async function Coaching({ searchParams }: { searchParams: PageProps<"/coaching">["searchParams"] }) {
  const sp = await searchParams;
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  if (hub.groupSessions.length === 0) return <section className="card empty">Este servicio no incluye coaching grupal.</section>;

  const supabase = await createClient();
  const ids = hub.groupSessions.map((g) => g.id);
  const [{ data: full }, { data: resources }, { data: questions }] = await Promise.all([
    supabase.from("group_sessions").select("id, recording_asset_id, meeting_url").in("id", ids),
    supabase.from("resources").select("id, title, asset_id, attach_id").eq("attach_type", "group_session").in("attach_id", ids).order("position"),
    supabase.from("group_session_questions").select("id, group_session_id, body, status, created_at").eq("profile_id", me.id).order("created_at", { ascending: false }),
  ]);
  const assetMap = await assets([...(full ?? []).map((g) => g.recording_asset_id ?? ""), ...(resources ?? []).map((r) => r.asset_id)]);
  const links = new Map(await Promise.all((resources ?? []).map(async (r) => {
    const a = assetMap.get(r.asset_id);
    return [r.id, await signedContentUrl(a?.storage_path, `${r.title}.pdf`)] as const;
  })));

  const cg = hub.activities.find((a) => a.type === "group_session");
  const [cgRow] = cg?.activity_id ? await activityRows([cg.activity_id]) : [];
  const introVideo = cgRow?.asset_id ? (await assets([cgRow.asset_id])).get(cgRow.asset_id) : null;
  const next = nextGroupSession(hub);
  const watch = typeof sp.ver === "string" ? sp.ver : null;
  const watching = watch ? hub.groupSessions.find((g) => g.id === watch) : null;
  const watchAsset = watching ? assetMap.get(full?.find((f) => f.id === watching.id)?.recording_asset_id ?? "") : null;
  const held = hub.groupSessions.filter((g) => g.status === "completed").length;

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Coaching Grupal</p>
          <h1>Coaching Grupal</h1>
          <p className="lead">Encuentros en línea con otras parejas. Después de cada uno quedan la grabación y un recurso para descargar.</p>
        </div>
        <span className="chip info">{held} de {hub.groupSessions.length} realizados</span>
      </div>
      {(introVideo || cgRow?.summary) && (
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Qué es el coaching grupal</h2>
          <div className="grid2" style={{ alignItems: "start" }}>
            {introVideo && <Video asset={introVideo} title="Qué es el coaching grupal" />}
            {cgRow?.summary && <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{cgRow.summary}</p>}
          </div>
        </section>
      )}
      {watching && (
        <section className="card qblock">
          <div className="ch" style={{ margin: 0 }}>
            <h2>Grabación · {fmtDay(watching.scheduled_at)} · {groupTitle(watching)}</h2>
            <a className="btn ghost sm" href="/coaching">Cerrar</a>
          </div>
          <Video asset={watchAsset} title={`Coaching ${groupTitle(watching)}`} />
        </section>
      )}
      <div className="grid2">
        <section className="card">
          <div className="ch"><h2>Fechas</h2></div>
          <div className="list">
            {hub.groupSessions.map((g) => {
              const isNext = g.id === next?.id;
              const done = g.status === "completed";
              const rec = full?.find((f) => f.id === g.id);
              const res = (resources ?? []).filter((r) => r.attach_id === g.id);
              const meeting = rec?.meeting_url;
              return (
                <div className="li" key={g.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                  <span className={`ico ${done ? "ok" : isNext ? "info" : ""}`}><Icon name={done ? "check" : "users"} /></span>
                  <div className="tx" style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
                    <div>
                      <b>{fmtDay(g.scheduled_at)} · {groupTitle(g)}</b>
                      <span>{done ? "Grabación y recursos disponibles" : isNext ? `Próximo · ${fmtTime(g.scheduled_at)}` : `Programado · ${fmtTime(g.scheduled_at)}`}</span>
                    </div>
                    {res.map((r) => (
                      <div className="res" key={r.id}>
                        <Icon name="book" size={18} />
                        <div className="tx"><b>{r.title}</b><span className="muted">PDF</span></div>
                        {links.get(r.id)
                          ? <DownloadLink resourceId={r.id} href={links.get(r.id)!}>Descargar recurso</DownloadLink>
                          : <span className="chip">Pendiente de subir</span>}
                      </div>
                    ))}
                  </div>
                  <div className="acts">
                    {done && rec?.recording_asset_id && <a className="btn soft sm" href={`/coaching?ver=${g.id}`}><Icon name="play" size={13} /> Ver grabación</a>}
                    {isNext && meeting && <a className="btn sm" href={meeting} target="_blank" rel="noreferrer">Entrar</a>}
                    {!done && new Date(g.scheduled_at) >= hub.today && <a className="btn ghost sm" href={`/calendario/coaching/${g.id}`}><Icon name="cal" size={13} /> Añadir al calendario</a>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignSelf: "start" }}>
          {next && (
            <section className="card qblock" id="pregunta">
              <h2>¿Tienes una pregunta para el próximo coaching?</h2>
              <AskQuestion groupSessionId={next.id} enrollmentId={hub.enrollment.enrollment_id!} dateLabel={fmtDay(next.scheduled_at)} />
            </section>
          )}
          {(questions ?? []).length > 0 && (
            <section className="card">
              <h3 style={{ marginBottom: 10 }}>Sus preguntas</h3>
              <div className="list">
                {questions!.map((q) => (
                  <div className="li" key={q.id}>
                    <div className="tx"><b style={{ fontWeight: 500 }}>{q.body}</b><span>{fmtDay(q.created_at)} · {q.status === "answered" ? "Respondida" : q.status === "selected" ? "Se tratará en el coaching" : "Recibida"}</span></div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
