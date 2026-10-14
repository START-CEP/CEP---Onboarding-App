import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { getStaff } from "@/lib/data/staff";
import { loadBoard } from "@/lib/data/team";
import { fmtDay, fmtTime } from "@/lib/process";
import { createClient } from "@/lib/supabase/server";
import { weeksLeft } from "@/lib/team-progress";

export default function SessionsPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Sessions />
    </Suspense>
  );
}

async function Sessions() {
  const staff = await getStaff();
  if (!staff) return null;
  const supabase = await createClient();
  const [all, { data: people }, { data: clinicians }] = await Promise.all([
    loadBoard(),
    supabase.from("staff_members").select("profile_id, title, profiles(full_name)").eq("is_active", true),
    supabase.from("staff_roles").select("profile_id").eq("role", "clinician"),
  ]);
  // Un proceso cancelado (p. ej. una reinscripción) no cuenta: sus sesiones ya están en el proceso nuevo.
  const board = all.filter((e) => e.status !== "cancelled");
  const active = board.filter((e) => e.status === "active");
  // La hora de referencia la fija el cargador (una sola vez por petición).
  const now = board[0]?.input.now.getTime() ?? 0;
  const monthAgo = now - 30 * 864e5;
  const pros = (people ?? []).filter((p) => (clinicians ?? []).some((c) => c.profile_id === p.profile_id))
    .sort((a, b) => (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? ""));

  const stats = pros.map((p) => {
    const id = p.profile_id;
    const owner = (e: (typeof board)[number], s: (typeof board)[number]["sessions"][number]) =>
      s.staffId ?? e.input.acts.find((a) => a.id === s.activityId)?.responsibleStaffId ?? null;
    const upcoming = board.flatMap((e) => e.sessions.filter((s) => s.status === "scheduled" && s.scheduledAt && new Date(s.scheduledAt).getTime() > now && owner(e, s) === id)
      .map((s) => ({ ...s, unit: e.unitName, enrollmentId: e.id })))
      .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
    const done30 = board.flatMap((e) => e.sessions.filter((s) => s.status === "completed" && s.scheduledAt && new Date(s.scheduledAt).getTime() > monthAgo && owner(e, s) === id)).length;
    const pending = active.filter((e) => e.summary.toSchedule && e.summary.therapy.next?.responsibleStaffId === id);
    const remainingBy = active.map((e) => ({
      e, left: e.input.acts.filter((a) => a.type === "therapy_session" && !a.isCompleted && a.responsibleStaffId === id).length,
    })).filter((x) => x.left > 0);
    const remaining = remainingBy.reduce((n, x) => n + x.left, 0);
    const perWeek = remainingBy.reduce((n, x) => n + x.left / weeksLeft(x.e.daysLeft), 0);
    const processes = active.filter((e) => e.input.acts.some((a) => a.type === "therapy_session" && a.responsibleStaffId === id)).length;
    return { p, upcoming, done30, pending, remaining, perWeek, processes };
  });

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Equipo</p>
          <h1>Sesiones</h1>
          <p className="lead">Las sesiones de cada profesional: las agendadas, las que faltan por agendar y cuántas le quedan por dar. Sirve para ver la capacidad: cuántos procesos más se pueden tomar.</p>
        </div>
        <span className="chip info">{active.length} proceso{active.length === 1 ? "" : "s"} activo{active.length === 1 ? "" : "s"}</span>
      </div>

      {stats.length === 0 && <section className="card empty">No hay profesionales con rol clínico.</section>}
      <div className="pros">
        {stats.map(({ p, upcoming, done30, pending, remaining, perWeek, processes }) => (
          <section className="card procard" key={p.profile_id}>
            <div className="who2">
              <span className="av">{(p.profiles?.full_name ?? "?").charAt(0)}</span>
              <div><b>{p.profiles?.full_name}</b><div className="small muted">{p.title}</div></div>
            </div>
            <div className="kpis">
              <div className="kpi"><b>{processes}</b><span>procesos activos</span></div>
              <div className="kpi"><b>{remaining}</b><span>sesiones por dar</span></div>
              <div className="kpi"><b>{done30}</b><span>hechas (30 días)</span></div>
            </div>
            <p className="small muted">Ritmo que exige su carga actual: <b style={{ color: "var(--ink)" }}>≈ {perWeek.toFixed(1)} sesiones por semana</b> (las que le quedan, repartidas en el tiempo de acceso de cada pareja).</p>

            <div>
              <h3 style={{ fontSize: 14, marginBottom: 6 }}>Agendadas <span className="chip" style={{ marginLeft: 4 }}>{upcoming.length}</span></h3>
              {upcoming.length === 0 ? <p className="small muted">Nada agendado.</p> : (
                <div className="list">
                  {upcoming.slice(0, 8).map((s) => (
                    <Link className="li" key={`${s.enrollmentId}-${s.activityId}-${s.scheduledAt}`} href={`/equipo/parejas/${s.enrollmentId}`} style={{ padding: "8px 0" }}>
                      <span className="ico info"><Icon name="cal" size={16} /></span>
                      <div className="tx"><b>{fmtDay(s.scheduledAt!)} · {fmtTime(s.scheduledAt!)}</b><span>{s.unit} · {s.key} {s.title}</span></div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: 14, marginBottom: 6 }}>Pendientes de agendar <span className={`chip ${pending.length ? "warn" : ""}`} style={{ marginLeft: 4 }}>{pending.length}</span></h3>
              {pending.length === 0 ? <p className="small muted">Ninguna pareja esperando.</p> : (
                <div className="list">
                  {pending.map((e) => (
                    <Link className="li" key={e.id} href={`/equipo/parejas/${e.id}`} style={{ padding: "8px 0" }}>
                      <span className="ico warn"><Icon name="clock" size={16} /></span>
                      <div className="tx"><b>{e.unitName} · {e.summary.therapy.next?.key}</b><span>{e.summary.therapy.next?.title}</span></div>
                      {(e.summary.therapy.next?.blockingUnmet ?? 0) > 0 ? <span className="chip"><Icon name="lock" size={12} /> Requisitos</span> : <span className="chip warn">Puede agendar</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
      <p className="small muted">Cada sesión se cuenta para la persona que la atiende o, si aún no tiene fecha, para la persona asignada a ese rol en la pareja.</p>
    </>
  );
}
