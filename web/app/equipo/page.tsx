import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { getStaff, listEnrollments } from "@/lib/data/staff";
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
  const list = await listEnrollments();
  const ids = list.map((e) => e.id);

  const [{ data: requests }, { data: tasks }, { data: questions }] = await Promise.all([
    supabase.from("enrollment_sessions")
      .select("id, enrollment_id, scheduled_at, enrollment_activities(key, title)")
      .eq("status", "requested").in("enrollment_id", ids).order("scheduled_at"),
    supabase.from("staff_task_progress")
      .select("id, item_key, due_on, enrollment_activities!inner(enrollment_id, title, config)")
      .is("done_at", null).order("due_on"),
    supabase.from("group_session_questions").select("id", { count: "exact" }).eq("status", "new"),
  ]);
  const unitOf = (enrollmentId: string) => list.find((e) => e.id === enrollmentId)?.unitName ?? "";
  const label = (config: unknown, key: string) =>
    ((config as { checklist?: { key: string; label: string }[] } | null)?.checklist ?? []).find((c) => c.key === key)?.label ?? key;

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Hola, {staff.name.split(" ")[0]}</p>
          <h1>Parejas y agenda</h1>
          <p className="lead">Quién va al día, qué solicitudes de sesión hay que confirmar y qué tareas del onboarding quedan.</p>
        </div>
        <span className="chip info">{list.filter((e) => e.status === "active").length} procesos activos</span>
      </div>

      <div className="grid2e">
        <section className="card">
          <div className="ch"><h2>Solicitudes de sesión</h2><span className={`chip ${requests?.length ? "warn" : "ok"}`}>{requests?.length ?? 0}</span></div>
          {requests?.length ? (
            <div className="list">
              {requests.map((r) => (
                <Link className="li" key={r.id} href={`/equipo/parejas/${r.enrollment_id}`}>
                  <span className="ico warn"><Icon name="cal" /></span>
                  <div className="tx">
                    <b>{unitOf(r.enrollment_id)} · {r.enrollment_activities?.key}</b>
                    <span>Prefieren {r.scheduled_at ? `${fmtDay(r.scheduled_at)} · ${fmtTime(r.scheduled_at)}` : "sin fecha"}</span>
                  </div>
                  <span className="btn soft sm">Confirmar</span>
                </Link>
              ))}
            </div>
          ) : <p className="muted">No hay solicitudes pendientes.</p>}
        </section>
        <section className="card">
          <div className="ch"><h2>Onboarding pendiente</h2><span className={`chip ${tasks?.length ? "warn" : "ok"}`}>{tasks?.length ?? 0}</span></div>
          {tasks?.length ? (
            <div className="list">
              {tasks.slice(0, 8).map((t) => (
                <Link className="li" key={t.id} href={`/equipo/parejas/${t.enrollment_activities.enrollment_id}`}>
                  <span className="ico"><Icon name="clock" /></span>
                  <div className="tx">
                    <b>{unitOf(t.enrollment_activities.enrollment_id)} · {label(t.enrollment_activities.config, t.item_key)}</b>
                    <span>{t.enrollment_activities.title}{t.due_on ? ` · vence ${fmtDay(t.due_on)}` : ""}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="muted">Todo el onboarding está al día.</p>}
          {(questions?.length ?? 0) > 0 && (
            <p style={{ marginTop: 12 }}><Link className="chip info" href="/equipo/coaching">{questions!.length} preguntas nuevas para el coaching</Link></p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="ch"><h2>Procesos</h2></div>
        {list.length === 0 ? <p className="muted">No tienes procesos asignados.</p> : (
          <div className="scrollx">
            <table>
              <thead><tr><th>Cliente</th><th>Servicio</th><th>Dónde están</th><th>Estado</th><th>Próxima sesión</th><th /></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td><b>{e.unitName}</b></td>
                    <td>{e.service}</td>
                    <td className="num">{e.step ? `Paso ${e.step} de ${e.steps} · ${e.block}` : "Completado"}<br /><span className="small muted">{e.stepTitle}</span></td>
                    <td>
                      {e.requests > 0 ? <span className="chip warn">{e.requests} solicitud{e.requests > 1 ? "es" : ""}</span>
                        : e.blocking > 0 ? <span className="chip warn"><Icon name="lock" size={12} /> {e.blocking} requisito{e.blocking > 1 ? "s" : ""}</span>
                          : e.daysLeft !== null && e.daysLeft <= 21 ? <span className="chip warn">Quedan {e.daysLeft} días</span>
                            : <span className="chip ok">Al día</span>}
                    </td>
                    <td className="num">{e.nextSession ? `${fmtDay(e.nextSession)} · ${fmtTime(e.nextSession)}` : "—"}</td>
                    <td><Link className="btn ghost sm" href={`/equipo/parejas/${e.id}`}>Abrir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
