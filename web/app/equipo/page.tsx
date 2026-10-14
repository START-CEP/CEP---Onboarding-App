import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { TaskDone } from "@/components/task-done";
import { getStaff } from "@/lib/data/staff";
import { loadBoard } from "@/lib/data/team";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, fmtTime } from "@/lib/process";

export default function TeamHome() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Team />
    </Suspense>
  );
}

async function Team() {
  const staff = await getStaff();
  if (!staff) return null;
  const supabase = await createClient();
  // Los procesos cancelados (p. ej. una reinscripción) no se muestran.
  const board = (await loadBoard()).filter((e) => e.status !== "cancelled");
  const active = board.filter((e) => e.status === "active");

  const [{ data: tasks }, { data: questions }, { data: followups }, { data: people }] = await Promise.all([
    supabase.from("staff_task_progress")
      .select("id, item_key, due_on, enrollment_activities!inner(enrollment_id, title, config)")
      .is("done_at", null).order("due_on"),
    supabase.from("group_session_questions").select("id").eq("status", "new"),
    supabase.from("staff_tasks").select("id, enrollment_id, title, description, due_on, assignee_id, profiles(full_name)").eq("status", "open").order("due_on"),
    supabase.from("staff_members").select("profile_id, profiles(full_name)"),
  ]);
  const unitOf = (enrollmentId: string) => board.find((e) => e.id === enrollmentId)?.unitName ?? "";
  const personOf = (id: string | null) => (people ?? []).find((p) => p.profile_id === id)?.profiles?.full_name ?? null;
  const label = (config: unknown, key: string) =>
    ((config as { checklist?: { key: string; label: string }[] } | null)?.checklist ?? []).find((c) => c.key === key)?.label ?? key;
  const toSchedule = active.filter((e) => e.summary.toSchedule || e.requests > 0);
  const admin = [
    ...(tasks ?? []).map((t) => ({
      id: t.id, kind: "onboarding" as const, enrollmentId: t.enrollment_activities.enrollment_id, due: t.due_on,
      title: label(t.enrollment_activities.config, t.item_key), detail: t.enrollment_activities.title,
    })),
    ...(followups ?? []).map((t) => ({
      id: t.id, kind: "seguimiento" as const, enrollmentId: t.enrollment_id, due: t.due_on,
      title: t.title, detail: [t.description, t.profiles?.full_name].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Hola, {staff.name.split(" ")[0]}</p>
          <h1>Parejas y agenda</h1>
          <p className="lead">Dónde va cada pareja (sesión, módulo visto y tarea entregada), quién tiene que agendar y los pendientes administrativos.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="chip info">{active.length} proceso{active.length === 1 ? "" : "s"} activo{active.length === 1 ? "" : "s"}</span>
          {toSchedule.length > 0 && <span className="chip warn">{toSchedule.length} sin sesión agendada</span>}
        </div>
      </div>

      <section className="card">
        <div className="ch"><h2>Procesos</h2><span className="muted small">«Módulo visto» es el video; «Tarea entregada» es la tarea de ese módulo</span></div>
        {board.length === 0 ? <p className="muted">No tienes procesos asignados.</p> : (
          <div className="scrollx">
            <table className="board">
              <thead><tr><th>Cliente</th><th>Servicio</th><th>Sesión de terapia</th><th>Módulo visto</th><th>Tarea entregada</th><th>Próxima sesión</th><th /></tr></thead>
              <tbody>
                {board.map((e) => {
                  const s = e.summary;
                  const partialOf = (what: "video" | "tarea") => s.partial.filter((p) => p.what === what).slice(-1)[0];
                  const pv = partialOf("video"), pt = partialOf("tarea");
                  return (
                    <tr key={e.id} className={e.status !== "active" ? "dim" : undefined}>
                      <td><b>{e.unitName}</b>{e.status !== "active" && <><br /><span className="small muted">{e.status === "completed" ? "Terminado" : e.status === "cancelled" ? "Cancelado" : e.status}</span></>}</td>
                      <td>{e.service}</td>
                      <td>
                        {s.therapy.total === 0 ? "—" : <>
                          <b className="num">{s.therapy.done} de {s.therapy.total}</b>
                          <br /><span className="small muted">{s.therapy.next ? `Sigue ${s.therapy.next.key} · ${s.therapy.next.title}` : "Todas hechas"}</span>
                        </>}
                      </td>
                      <td>
                        {s.lastViewed ? <b>{s.lastViewed.key}</b> : <span className="muted">Ninguno</span>}
                        {pv && <><br /><span className="chip warn" style={{ marginTop: 4 }}>{pv.key}: solo {pv.who}</span></>}
                      </td>
                      <td>
                        {s.lastSubmitted ? <b>{s.lastSubmitted.key}</b> : <span className="muted">Ninguna</span>}
                        {pt && <><br /><span className="chip warn" style={{ marginTop: 4 }}>{pt.key}: solo {pt.who}</span></>}
                      </td>
                      <td className="num">
                        {s.nextSession ? <>{fmtDay(s.nextSession.at)} · {fmtTime(s.nextSession.at)}<br /><span className="small muted">{s.nextSession.key}</span></>
                          : e.status === "active" && s.therapy.next ? <span className="chip warn">Sin agendar</span> : "—"}
                      </td>
                      <td><Link className="btn ghost sm" href={`/equipo/parejas/${e.id}`}>Abrir</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid2e">
        <section className="card">
          <div className="ch"><h2>Pendientes de agendar</h2><span className={`chip ${toSchedule.length ? "warn" : "ok"}`}>{toSchedule.length}</span></div>
          <p className="small muted" style={{ marginBottom: 10 }}>Parejas cuya siguiente sesión aún no tiene fecha. Solo pueden agendar una sesión a la vez: hay que estar pendientes de que la agenden.</p>
          {toSchedule.length ? (
            <div className="list">
              {toSchedule.map((e) => {
                const next = e.summary.therapy.next;
                const requested = e.sessions.find((x) => x.status === "requested");
                const who = personOf(next?.responsibleStaffId ?? null);
                return (
                  <Link className="li" key={e.id} href={`/equipo/parejas/${e.id}`}>
                    <span className={`ico ${next && next.blockingUnmet > 0 ? "" : "warn"}`}><Icon name="cal" /></span>
                    <div className="tx">
                      <b>{e.unitName} · {next?.key ?? requested?.key}</b>
                      <span>{next?.title}{who ? ` · con ${who}` : ""}</span>
                    </div>
                    {requested?.scheduledAt ? <span className="chip warn">Propusieron {fmtDay(requested.scheduledAt)}</span>
                      : next && next.blockingUnmet > 0 ? <span className="chip"><Icon name="lock" size={12} /> Le falta{next.blockingUnmet > 1 ? `n ${next.blockingUnmet} requisitos` : " 1 requisito"}</span>
                        : <span className="chip warn">Ya puede agendar</span>}
                  </Link>
                );
              })}
            </div>
          ) : <p className="muted">Todas las parejas tienen su próxima sesión agendada.</p>}
        </section>

        <section className="card">
          <div className="ch"><h2>Pendientes administrativos</h2><span className={`chip ${admin.length ? "warn" : "ok"}`}>{admin.length}</span></div>
          {admin.length ? (
            <div className="list">
              {admin.slice(0, 12).map((t) => (
                <div className="li" key={`${t.kind}-${t.id}`}>
                  <span className={`ico ${t.kind === "seguimiento" ? "warn" : ""}`}><Icon name={t.kind === "seguimiento" ? "bell" : "clock"} /></span>
                  <div className="tx">
                    <b>{t.enrollmentId && !t.title.startsWith(unitOf(t.enrollmentId)) ? `${unitOf(t.enrollmentId)} · ` : ""}{t.title}</b>
                    <span>{t.kind === "onboarding" ? "Onboarding" : "Seguimiento"}{t.detail ? ` · ${t.detail}` : ""}{t.due ? ` · vence ${fmtDay(t.due)}` : ""}</span>
                  </div>
                  {t.enrollmentId && <Link className="btn ghost sm" href={`/equipo/parejas/${t.enrollmentId}`}>Abrir</Link>}
                  {t.kind === "seguimiento" && <TaskDone id={t.id} />}
                </div>
              ))}
              {admin.length > 12 && <p className="small muted" style={{ paddingTop: 10 }}>Y {admin.length - 12} más.</p>}
            </div>
          ) : <p className="muted">No hay pendientes administrativos.</p>}
          {(questions?.length ?? 0) > 0 && (
            <p style={{ marginTop: 12 }}><Link className="chip info" href="/equipo/coaching#preguntas">{questions!.length} preguntas nuevas para el coaching</Link></p>
          )}
        </section>
      </div>
    </>
  );
}
