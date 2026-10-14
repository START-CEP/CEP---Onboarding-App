import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import {
  AgendaEditor, ConfirmActivityButton, NoteForm, ScheduleForm, SessionStatusButtons, StepButton, TaskToggle, WaiveButton,
} from "@/components/staff-forms";
import { formSchemas } from "@/lib/data/extra";
import { getStaff } from "@/lib/data/staff";
import { answerText } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { firstName, fmtDay, fmtTime } from "@/lib/process";

export default function CouplePage({ params }: PageProps<"/equipo/parejas/[id]">) {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Couple params={params} />
    </Suspense>
  );
}

const SESSION = { requested: "Solicitada", scheduled: "Agendada", completed: "Hecha", cancelled: "Cancelada", no_show: "No asistieron" } as const;

async function Couple({ params }: { params: PageProps<"/equipo/parejas/[id]">["params"] }) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff) return null;
  const supabase = await createClient();

  const { data: state } = await supabase.from("v_enrollment_state").select("*").eq("enrollment_id", id).maybeSingle();
  if (!state) return <section className="card empty">No tienes acceso a este proceso o no existe.</section>;

  const [unit, members, steps, reqs, acts, sessions, agenda, notes, tasks, subs, staffRows] = await Promise.all([
    supabase.from("client_units").select("display_name").eq("id", state.unit_id!).single(),
    supabase.from("client_unit_members").select("member_index, profile_id, profiles(full_name, email)").eq("unit_id", state.unit_id!).order("member_index"),
    supabase.from("v_step_state").select("*").eq("enrollment_id", id).order("position"),
    supabase.from("v_requirement_status").select("*").eq("enrollment_id", id),
    supabase.from("v_activity_state").select("*").eq("enrollment_id", id).order("position"),
    supabase.from("enrollment_sessions").select("id, enrollment_activity_id, scheduled_at, status, meeting_url").eq("enrollment_id", id).order("created_at", { ascending: false }),
    supabase.from("session_agenda_items").select("id, enrollment_activity_id, body, position").order("position"),
    supabase.from("session_notes").select("id, enrollment_session_id, body, created_at, profiles(full_name)").order("created_at", { ascending: false }),
    supabase.from("staff_task_progress").select("id, item_key, due_on, done_at, enrollment_activities!inner(enrollment_id, title, config)").eq("enrollment_activities.enrollment_id", id),
    supabase.from("form_submissions").select("id, enrollment_activity_id, form_version_id, submitted_by, response_scope, status, answers, submitted_at, submission_files(files(path))").eq("enrollment_id", id).eq("status", "submitted").order("submitted_at", { ascending: false }),
    supabase.from("enrollment_staff").select("care_roles(name), profiles(full_name)").eq("enrollment_id", id),
  ]);

  const nameOf = (pid: string) => firstName(members.data?.find((m) => m.profile_id === pid)?.profiles?.full_name ?? "");
  const therapy = (acts.data ?? []).filter((a) => a.type === "therapy_session");
  const current = steps.data?.find((s) => s.state === "current");
  const confirmables = (acts.data ?? []).filter((a) => !a.is_completed && a.type !== "therapy_session" && a.type !== "group_session");
  const label = (config: unknown, key: string) =>
    ((config as { checklist?: { key: string; label: string }[] } | null)?.checklist ?? []).find((c) => c.key === key)?.label ?? key;
  const schemas = await formSchemas([...new Set((subs.data ?? []).map((s) => s.form_version_id).filter((v): v is string => Boolean(v)))]);
  const files = await Promise.all((subs.data ?? []).flatMap((s) => s.submission_files.map(async (f) => {
    const path = f.files?.path;
    if (!path) return null;
    const { data } = await supabase.storage.from("submissions").createSignedUrl(path, 3600);
    return { submission: s.id, name: path.split("/").at(-1)!.replace(/^[0-9a-f-]{36}-/, ""), url: data?.signedUrl };
  })));

  return (
    <>
      <p><Link className="small muted" href="/equipo">← Parejas y agenda</Link></p>
      <div className="ph">
        <div>
          <p className="eyebrow">{state.service_name} · desde {fmtDay(state.starts_on!)}</p>
          <h1>{unit.data?.display_name}</h1>
          <p className="lead">
            {(members.data ?? []).map((m) => `${m.profiles?.full_name} (${m.profiles?.email})`).join(" · ")}
          </p>
          <p className="small muted" style={{ marginTop: 6 }}>
            Equipo: {(staffRows.data ?? []).map((s) => `${s.profiles?.full_name} · ${s.care_roles?.name}`).join(" · ")}
          </p>
        </div>
        <span className="chip info">{current ? `Paso ${current.position} de ${steps.data?.length} · ${current.block_name}` : "Proceso completado"}</span>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="ch"><h2>Sesiones de terapia</h2></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {therapy.map((a) => {
              const list = (sessions.data ?? []).filter((s) => s.enrollment_activity_id === a.activity_id);
              const open = list.find((s) => s.status === "requested" || s.status === "scheduled");
              const step = steps.data?.find((s) => s.activity_id === a.activity_id);
              const items = (agenda.data ?? []).filter((x) => x.enrollment_activity_id === a.activity_id);
              const individual = a.participants === "member_1" || a.participants === "member_2";
              const owner = members.data?.find((m) => m.member_index === (a.participants === "member_1" ? 1 : 2));
              return (
                <div key={a.activity_id} className={`sessrow ${a.is_completed ? "done" : step?.state === "current" ? "next" : ""}`}>
                  <span className="n">{a.key}</span>
                  <div className="tx">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <b>{a.title}</b>
                      {individual && <span className="chip">Individual · {firstName(owner?.profiles?.full_name ?? "")}</span>}
                      {a.is_completed && <span className="chip ok">Hecha</span>}
                      {(step?.blocking_unmet ?? 0) > 0 && !a.is_completed && <span className="chip warn"><Icon name="lock" size={12} /> {step!.blocking_unmet} requisito(s)</span>}
                    </div>
                    {list.map((s) => (
                      <div key={s.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span className={`chip ${s.status === "requested" ? "warn" : s.status === "scheduled" ? "info" : s.status === "completed" ? "ok" : ""}`}>{SESSION[s.status]}</span>
                        <span className="small">{s.scheduled_at ? `${fmtDay(s.scheduled_at)} · ${fmtTime(s.scheduled_at)}` : "sin fecha"}</span>
                        {s.meeting_url && <a className="small" href={s.meeting_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>enlace</a>}
                        {s.status === "scheduled" && <SessionStatusButtons sessionId={s.id} />}
                      </div>
                    ))}
                    {!a.is_completed && (
                      <ScheduleForm activityId={a.activity_id!} sessionId={open?.id ?? null} initial={open?.scheduled_at}
                        label={open?.status === "requested" ? "Confirmar solicitud" : open ? "Cambiar fecha" : "Agendar"} />
                    )}
                    <AgendaEditor activityId={a.activity_id!} items={items.map((i) => ({ id: i.id, body: i.body }))} />
                    {list.filter((s) => s.status === "completed").map((s) => (
                      <div key={`n-${s.id}`} className="qblock" style={{ gap: 6 }}>
                        <span className="small" style={{ fontWeight: 700 }}>Notas clínicas</span>
                        {(notes.data ?? []).filter((n) => n.enrollment_session_id === s.id).map((n) => (
                          <p key={n.id} className="small"><b>{n.profiles?.full_name}</b> · {fmtDay(n.created_at)}: {n.body}</p>
                        ))}
                        {staff.isClinician && <NoteForm sessionId={s.id} />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {current && (
            <section className="card">
              <div className="ch"><h3>Paso actual: {current.title}</h3></div>
              <div className="list">
                {(reqs.data ?? []).filter((r) => r.target_step_id === current.step_id).map((r) => (
                  <div className="li" key={r.id}>
                    <span className={`ico ${r.is_met ? "ok" : "warn"}`}><Icon name={r.is_met ? "check" : "lock"} /></span>
                    <div className="tx"><b>{r.label ?? r.required_title}</b><span>{r.waived ? "Dispensado por el equipo" : r.is_met ? "Cumplido" : "Pendiente"}</span></div>
                    {(!r.is_met || r.waived) && <WaiveButton id={r.id!} waived={Boolean(r.waived)} />}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}><StepButton id={current.step_id!} completed={false} /></div>
            </section>
          )}
          <section className="card">
            <div className="ch"><h3>Onboarding (equipo)</h3></div>
            {(tasks.data ?? []).length === 0 ? <p className="muted">Sin tareas del equipo.</p> : (
              <div className="list">
                {tasks.data!.map((t) => (
                  <TaskToggle key={t.id} id={t.id} done={Boolean(t.done_at)} label={label(t.enrollment_activities.config, t.item_key)}
                    due={`${t.enrollment_activities.title}${t.due_on ? ` · vence ${fmtDay(t.due_on)}` : ""}`} />
                ))}
              </div>
            )}
          </section>
          {confirmables.length > 0 && (
            <section className="card">
              <div className="ch"><h3>Marcar como hecho por el equipo</h3></div>
              <p className="small muted" style={{ marginBottom: 8 }}>Para cuando algo se hizo fuera de la app (p. ej. vieron el video en sesión).</p>
              <div className="list">
                {confirmables.slice(0, 12).map((a) => (
                  <div className="li" key={a.activity_id}>
                    <div className="tx"><b style={{ fontWeight: 600 }}>{a.title}</b></div>
                    <ConfirmActivityButton id={a.activity_id!} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <section className="card">
        <div className="ch"><h2>Respuestas y tareas entregadas</h2><span className="muted small">Las individuales solo las ve el clínico asignado y admin</span></div>
        {(subs.data ?? []).length === 0 ? <p className="muted">Todavía no hay entregas.</p> : (
          <div className="list">
            {subs.data!.map((s) => {
              const act = acts.data?.find((a) => a.activity_id === s.enrollment_activity_id);
              const raw = (s.answers ?? {}) as Record<string, unknown>;
              const questions = (schemas.get(s.form_version_id ?? "") ?? []).flatMap((sec) => sec.questions);
              const known = questions.filter((q) => q.key in raw).map((q) => ({ key: q.key, label: q.label, text: answerText(q, raw[q.key]) }));
              const answers = [...known, ...Object.keys(raw).filter((k) => !questions.some((q) => q.key === k)).map((k) => ({ key: k, label: k, text: answerText(undefined, raw[k]) }))];
              const own = files.filter((f) => f?.submission === s.id);
              return (
                <details className="li" key={s.id} style={{ display: "block" }}>
                  <summary style={{ cursor: "pointer" }}>
                    <b>{act?.title}</b> · <span className="small muted">{s.response_scope === "shared" ? "En pareja" : nameOf(s.submitted_by)} · {s.submitted_at ? fmtDay(s.submitted_at) : ""}</span>
                  </summary>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    {answers.map((x) => <div key={x.key} className="small"><b style={{ display: "block" }}>{x.label}</b><span style={{ whiteSpace: "pre-wrap" }}>{x.text}</span></div>)}
                    {own.map((f) => f && <a key={f.name} className="small" href={f.url ?? "#"} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Abrir {f.name}</a>)}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
