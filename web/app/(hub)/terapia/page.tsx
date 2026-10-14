import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { Reqs } from "@/components/reqs";
import { sessionLabel } from "@/lib/activity-config";
import { RequestSession } from "@/components/session-forms";
import { getHub } from "@/lib/data/hub";
import { activityRows, avatarUrl } from "@/lib/data/extra";
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
  const [rows, { data: sessions }, { data: agenda }, { data: team }] = await Promise.all([
    activityRows(ids),
    supabase.from("enrollment_sessions").select("id, enrollment_activity_id, scheduled_at, status, meeting_url").in("enrollment_activity_id", ids).order("created_at", { ascending: false }),
    supabase.from("session_agenda_items").select("enrollment_activity_id, body, position").in("enrollment_activity_id", ids).order("position"),
    supabase.from("enrollment_staff").select("staff_profile_id, care_roles(key, name), profiles(full_name, avatar_path)").eq("enrollment_id", hub.enrollment.enrollment_id!),
  ]);
  const people = (team ?? []).filter((t) => t.care_roles?.key !== "coordinator");
  const [{ data: bios }, photos] = await Promise.all([
    supabase.from("staff_members").select("profile_id, title, bio").in("profile_id", people.map((t) => t.staff_profile_id)),
    Promise.all(people.map(async (t) => [t.staff_profile_id, await avatarUrl(t.profiles?.avatar_path)] as const)).then((x) => new Map(x)),
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
                      <span className="eyebrow" style={{ margin: 0 }}>{sessionLabel(hub.configs[a.activity_id ?? ""], a.participants)}</span>
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
                      {mine && row?.summary && <span className="small muted">{row.summary}</span>}
                      {/* «Qué veremos» solo cuando el equipo lo define para esta pareja (depende de cada proceso). */}
                      {mine && items.length > 0 && (
                        <>
                          <span className="small" style={{ fontWeight: 700, marginTop: 4 }}>Qué veremos</span>
                          <ul className="agendaitems">{items.map((x, j) => <li key={j}>{x.body}</li>)}</ul>
                        </>
                      )}
                      {!a.is_completed && <Reqs reqs={reqs} />}
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
            <h3 style={{ marginBottom: 10 }}>Política de cancelación</h3>
            <p className="muted">Les pedimos hacer cualquier cambio con más de 72 horas de anticipación. Una sesión que se cancele con menos tiempo, o a la que no se presenten, se descuenta de su paquete; para reagendarla se paga el 50% del precio de una sesión.</p>
          </section>
          <section className="card">
            <h3 style={{ marginBottom: 10 }}>Ritmo entre sesiones</h3>
            <p className="muted">Las fechas sugeridas son una referencia, no un plazo: el avance lo marca su terapeuta en sesión. Si necesitan una sesión antes, pueden pedirla.</p>
          </section>
          <section className="card">
            <h3 style={{ marginBottom: 4 }}>Quién los acompaña</h3>
            {people.map((p) => {
              const name = p.profiles?.full_name ?? "";
              const info = bios?.find((b) => b.profile_id === p.staff_profile_id);
              const photo = photos.get(p.staff_profile_id);
              const keys = byRole.get(name)?.join(", ");
              return (
                <div className={`pro ${roleClass(p.care_roles?.key)}`} key={p.staff_profile_id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage */}
                  <span className="av pav">{photo ? <img src={photo} alt="" /> : name.charAt(0)}</span>
                  <div className="tx">
                    <b>{name}</b>
                    <span className="small muted">{info?.title ?? p.care_roles?.name}{keys ? ` · ${keys}` : ""}</span>
                    {info?.bio && <p className="small" style={{ marginTop: 4 }}>{info.bio}</p>}
                  </div>
                </div>
              );
            })}
          </section>
          <section className="card">
            <h3 style={{ marginBottom: 10 }}>¿Necesitan cambiar una fecha?</h3>
            <p className="muted" style={{ marginBottom: 12 }}>Con gusto podemos apoyarles. Por favor, hagan cualquier cambio con más de 72 horas de anticipación.</p>
            {wa && <a className="btn" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={15} /> Escribir por WhatsApp</a>}
          </section>
        </div>
      </div>
    </>
  );
}
