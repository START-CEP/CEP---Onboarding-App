import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { RequestSession } from "@/components/session-forms";
import { getHub } from "@/lib/data/hub";
import { activityRows } from "@/lib/data/extra";
import { createClient } from "@/lib/supabase/server";
import { whatsappUrl } from "@/lib/contact";
import { firstName, fmtDay, fmtTime, roleClass, staffFor, stepRequirements } from "@/lib/process";

export const metadata: Metadata = { title: "Sesiones de Terapia · CEP" };

export default function TherapyPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Therapy />
    </Suspense>
  );
}

const STATUS_TEXT = { requested: "Solicitud enviada", scheduled: "Agendada", completed: "Hecha", cancelled: "Cancelada", no_show: "No asistieron" } as const;

async function Therapy() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  const acts = hub.activities.filter((a) => a.type === "therapy_session");
  if (acts.length === 0) return <section className="card empty">Este servicio no tiene sesiones de terapia.</section>;

  const supabase = await createClient();
  const ids = acts.map((a) => a.activity_id!);
  const [rows, { data: sessions }, { data: agenda }] = await Promise.all([
    activityRows(ids),
    supabase.from("enrollment_sessions").select("id, enrollment_activity_id, scheduled_at, status, meeting_url").in("enrollment_activity_id", ids).order("created_at", { ascending: false }),
    supabase.from("session_agenda_items").select("enrollment_activity_id, body, position").in("enrollment_activity_id", ids).order("position"),
  ]);
  const myIndex = hub.members.find((m) => m.profileId === me.id)?.memberIndex;
  const done = acts.filter((a) => a.is_completed).length;
  const wa = whatsappUrl(`Hola, somos ${hub.members.map((m) => firstName(m.name)).join(" y ")}. Necesitamos cambiar la fecha de una sesión.`);
  const byRole = new Map<string, string[]>();
  acts.forEach((a) => {
    const s = staffFor(hub, a.responsible_role_id);
    if (s) byRole.set(s.personName, [...(byRole.get(s.personName) ?? []), a.key ?? ""]);
  });

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Sesiones de Terapia</p>
          <h1>Sus {acts.length} sesiones</h1>
          <p className="lead">Para entrar a cada sesión hay un requisito. Cuando lo cumplan, agenden aquí y el equipo confirma la hora.</p>
        </div>
        <span className="chip info">{done} de {acts.length} hechas</span>
      </div>
      <div className="grid2">
        <section className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {acts.map((a, i) => {
              const row = rows.find((r) => r.id === a.activity_id);
              const step = hub.steps.find((s) => s.activity_id === a.activity_id);
              const staff = staffFor(hub, a.responsible_role_id);
              const reqs = step ? stepRequirements(hub, step.step_id) : [];
              const individual = a.participants === "member_1" || a.participants === "member_2";
              const owner = individual ? hub.members.find((m) => m.memberIndex === (a.participants === "member_1" ? 1 : 2)) : undefined;
              const mine = !individual || owner?.profileId === me.id || myIndex === undefined;
              const last = (sessions ?? []).find((s) => s.enrollment_activity_id === a.activity_id && s.status !== "cancelled");
              const items = (agenda ?? []).filter((x) => x.enrollment_activity_id === a.activity_id);
              const state = a.is_completed ? "done" : step?.state === "current" ? "next" : "";
              const blocked = (step?.blocking_unmet ?? 0) > 0;
              const prevBlock = acts[i - 1] && hub.steps.find((s) => s.activity_id === acts[i - 1].activity_id)?.block_name;
              return (
                <div key={a.activity_id} id={a.key ?? undefined} style={{ scrollMarginTop: 90 }}>
                  {step?.block_name !== prevBlock && <div className="blockhead">{step?.block_name}</div>}
                  <div className={`sessrow ${state}`}>
                    <span className="n">{a.key}</span>
                    <div className="tx">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <b>{a.title}</b>
                        {staff && <span className={`whochip ${roleClass(staff.roleKey)}`}><i>{staff.personName.charAt(0)}</i>{firstName(staff.personName)}</span>}
                        {individual && (mine
                          ? <span className="chip pair"><Icon name="user" size={12} /> Tu sesión individual</span>
                          : <span className="chip">Individual · {firstName(owner?.name ?? "")}</span>)}
                        {a.is_completed ? <span className="chip go">Hecha</span>
                          : last?.status === "scheduled" ? <span className="chip info">Agendada</span>
                          : last?.status === "requested" ? <span className="chip warn">Solicitud enviada</span>
                          : state === "next" ? <span className="chip crit">Sin agendar</span> : null}
                      </div>
                      <span className="small muted">
                        <Icon name="clock" size={14} />{" "}
                        {last?.scheduled_at
                          ? `${STATUS_TEXT[last.status]} · ${fmtDay(last.scheduled_at)} · ${fmtTime(last.scheduled_at)}`
                          : a.suggested_on ? `Fecha sugerida: semana del ${fmtDay(a.suggested_on)}` : "Por agendar"}
                      </span>
                      {last?.status === "scheduled" && mine && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {last.meeting_url && <a className="btn soft sm" href={last.meeting_url} target="_blank" rel="noreferrer">Entrar a la sesión</a>}
                          <a className="btn ghost sm" href={`/calendario/sesion/${last.id}`}><Icon name="cal" size={13} /> Añadir al calendario</a>
                        </div>
                      )}
                      {mine && (items.length > 0 || (state === "next" && row?.summary)) && (
                        <>
                          <span className="small" style={{ fontWeight: 700, marginTop: 4 }}>Qué veremos</span>
                          <ul className="agendaitems">
                            {items.length ? items.map((x, j) => <li key={j}>{x.body}</li>) : <li>{row?.summary}</li>}
                          </ul>
                        </>
                      )}
                      {!a.is_completed && reqs.length > 0 && (
                        <div>
                          <span className="small" style={{ fontWeight: 700 }}>Requisito para entrar</span>
                          <div className="reqs">
                            {reqs.map((r) => (
                              <span key={r.id} className={`req ${r.is_met ? "ok" : "no"}`}>
                                <Icon name={r.is_met ? "check" : "lock"} size={13} /> {r.label ?? r.required_title}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {mine && state === "next" && !last && (blocked
                        ? <span className="small muted">Podrán agendarla cuando cumplan el requisito.</span>
                        : <RequestSession activityId={a.activity_id!} label={`Agendar${staff ? ` con ${firstName(staff.personName)}` : ""}`} />)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="card">
            <h3 style={{ marginBottom: 10 }}>Ritmo entre sesiones</h3>
            <p className="muted">Las fechas sugeridas son una referencia, no un plazo: el avance lo marca su terapeuta en sesión. Si necesitan una sesión antes, pueden pedirla.</p>
          </section>
          <section className="card">
            <h3 style={{ marginBottom: 10 }}>Quién los acompaña</h3>
            <div className="list">
              {[...byRole.entries()].map(([name, keys]) => {
                const s = hub.staff.find((x) => x.personName === name);
                return (
                  <div className="li" key={name}>
                    <span className={`whochip ${roleClass(s?.roleKey)}`}><i>{name.charAt(0)}</i>{firstName(name)}</span>
                    <div className="tx"><span>{keys.join(", ")}</span></div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card">
            <h3 style={{ marginBottom: 10 }}>¿Necesitan cambiar una fecha?</h3>
            <p className="muted" style={{ marginBottom: 12 }}>Escríbanle a nuestro asistente con 24 horas de anticipación.</p>
            {wa && <a className="btn" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={15} /> Escribir por WhatsApp</a>}
          </section>
        </div>
      </div>
    </>
  );
}
