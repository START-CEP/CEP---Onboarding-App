import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import {
  AgendaEditor, ConfirmActivityButton, NoteForm, ScheduleForm, SessionRecordForm, SessionStatusButtons, StepButton, TaskToggle, WaiveButton,
} from "@/components/staff-forms";
import { ActionForm } from "@/components/action-form";
import { ArchiveDocument, UploadDocument } from "@/components/document-forms";
import { FOLDER_LABEL } from "@/lib/documents";
import { assignStaff } from "@/lib/actions/staff";
import { formSchemas } from "@/lib/data/extra";
import { getStaff } from "@/lib/data/staff";
import { progressFor } from "@/lib/data/team";
import { moduleRows } from "@/lib/team-progress";
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
    supabase.from("enrollment_staff").select("care_role_id, staff_profile_id, care_roles(name), profiles(full_name)").eq("enrollment_id", id),
  ]);

  const nameOf = (pid: string) => firstName(members.data?.find((m) => m.profile_id === pid)?.profiles?.full_name ?? "");
  const therapy = (acts.data ?? []).filter((a) => a.type === "therapy_session");
  const current = steps.data?.find((s) => s.state === "current");
  const confirmables = (acts.data ?? []).filter((a) => !a.is_completed && a.type !== "therapy_session" && a.type !== "group_session");
  const label = (config: unknown, key: string) =>
    ((config as { checklist?: { key: string; label: string }[] } | null)?.checklist ?? []).find((c) => c.key === key)?.label ?? key;
  const schemas = await formSchemas([...new Set((subs.data ?? []).map((s) => s.form_version_id).filter((v): v is string => Boolean(v)))]);
  const sessionIds = (sessions.data ?? []).map((x) => x.id);
  const [{ data: records }, progress] = await Promise.all([
    staff.isClinician && sessionIds.length
      ? supabase.from("session_records").select("enrollment_session_id, transcript, brief, report, updated_at, profiles(full_name)").in("enrollment_session_id", sessionIds)
      : Promise.resolve({ data: [] as never[] }),
    progressFor([id]),
  ]);
  const modules = moduleRows(progress.get(id) ?? { acts: [], members: [], viewed: [], submitted: [] });
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
      {staff?.isAdmin && <AssignTeam enrollmentId={id} current={staffRows.data ?? []} />}
      <SharedDocuments enrollmentId={id} members={(members.data ?? []).map((m) => ({ profileId: m.profile_id, name: m.profiles?.full_name ?? "" }))} />

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
                    {list.filter((s) => s.status === "completed" || (s.status === "scheduled" && s.scheduled_at && new Date(s.scheduled_at).getTime() < (progress.get(id)?.now.getTime() ?? 0))).map((s) => {
                      const rec = (records ?? []).find((r) => r.enrollment_session_id === s.id);
                      const own = (notes.data ?? []).filter((n) => n.enrollment_session_id === s.id);
                      return (
                        <div key={`n-${s.id}`} className="qblock" style={{ gap: 10 }}>
                          {staff.isClinician && (
                            <SessionRecordForm sessionId={s.id}
                              initial={{ transcript: rec?.transcript ?? "", brief: rec?.brief ?? "", report: rec?.report ?? "" }}
                              updatedLabel={rec ? `actualizado el ${fmtDay(rec.updated_at)}${rec.profiles?.full_name ? ` por ${rec.profiles.full_name}` : ""}` : undefined} />
                          )}
                          {(own.length > 0 || staff.isClinician) && (
                            <details>
                              <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>Notas clínicas ({own.length})</summary>
                              <div className="qblock" style={{ gap: 6, marginTop: 8 }}>
                                {own.map((n) => <p key={n.id} className="small"><b>{n.profiles?.full_name}</b> · {fmtDay(n.created_at)}: {n.body}</p>)}
                                {staff.isClinician && <NoteForm sessionId={s.id} />}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
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

      {modules.length > 0 && (
        <section className="card">
          <div className="ch"><h2>Módulos</h2><span className="muted small">Ver el video y entregar la tarea son dos cosas distintas</span></div>
          <div className="scrollx">
            <div className="modgrid" style={{ ["--cols" as string]: 2, minWidth: 520 }}>
              <div className="r h"><span>Módulo</span><span>Video visto</span><span>Tarea entregada</span></div>
              {modules.map((m) => (
                <div className="r" key={m.id}>
                  <span><b>{m.key}</b> <span className="small muted">{m.title}</span></span>
                  <span className="marks">
                    {m.members.map((x) => <span key={x.profileId} className={`mark ${x.viewed ? "on" : ""}`}>{x.viewed ? <Icon name="check" size={11} /> : null}{x.name}</span>)}
                  </span>
                  <span className="marks">
                    {m.submitted === null ? <span className="small muted">Sin tarea</span>
                      : m.members.map((x) => <span key={x.profileId} className={`mark ${x.submitted ? "on" : ""}`}>{x.submitted ? <Icon name="check" size={11} /> : null}{x.name}</span>)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="ch"><h2>Respuestas y tareas entregadas</h2><span className="muted small">Las de los dos, lado a lado. Las individuales solo las ve el clínico asignado y admin</span></div>
        {(subs.data ?? []).length === 0 ? <p className="muted">Todavía no hay entregas.</p> : (
          <div className="list">
            {[...new Set(subs.data!.map((s) => s.enrollment_activity_id))]
              .map((aid) => ({ aid, act: acts.data?.find((a) => a.activity_id === aid), list: subs.data!.filter((s) => s.enrollment_activity_id === aid) }))
              .sort((x, y) => (x.act?.position ?? 0) - (y.act?.position ?? 0))
              .map(({ aid, act, list }) => {
                const shared = list.every((s) => s.response_scope === "shared");
                const cols = shared ? list.slice(0, 1) : (members.data ?? []).map((m) => list.find((s) => s.submitted_by === m.profile_id) ?? m.profile_id);
                const latest = list.map((s) => s.submitted_at ?? "").sort().at(-1);
                return (
                  <details className="li" key={aid} style={{ display: "block" }}>
                    <summary style={{ cursor: "pointer" }}>
                      <b>{act?.key ? `${act.key} · ` : ""}{act?.title}</b> · <span className="small muted">
                        {shared ? "En pareja" : (members.data ?? []).map((m) => `${firstName(m.profiles?.full_name ?? "")} ${list.some((s) => s.submitted_by === m.profile_id) ? "✓" : "pendiente"}`).join(" · ")}
                        {latest ? ` · ${fmtDay(latest)}` : ""}</span>
                    </summary>
                    <div className="pairgrid" style={{ marginTop: 10, ["--cols" as string]: cols.length }}>
                      {cols.map((s) => {
                        if (typeof s === "string") return (
                          <div className="col" key={s}><b>{nameOf(s)}</b><p className="small muted">Todavía no la entrega.</p></div>
                        );
                        const raw = (s.answers ?? {}) as Record<string, unknown>;
                        const questions = (schemas.get(s.form_version_id ?? "") ?? []).flatMap((sec) => sec.questions);
                        const known = questions.filter((q) => q.key in raw).map((q) => ({ key: q.key, label: q.label, text: answerText(q, raw[q.key]) }));
                        const answers = [...known, ...Object.keys(raw).filter((k) => !questions.some((q) => q.key === k)).map((k) => ({ key: k, label: k, text: answerText(undefined, raw[k]) }))];
                        const own = files.filter((f) => f?.submission === s.id);
                        return (
                          <div className="col" key={s.id}>
                            <b>{s.response_scope === "shared" ? `En pareja · envió ${nameOf(s.submitted_by)}` : nameOf(s.submitted_by)}</b>
                            <span className="small muted">{s.submitted_at ? `Entregada el ${fmtDay(s.submitted_at)}` : ""}</span>
                            {answers.map((x) => <div key={x.key} className="small"><b style={{ display: "block" }}>{x.label}</b><span style={{ whiteSpace: "pre-wrap" }}>{x.text}</span></div>)}
                            {own.map((f) => f && <a key={f.name} className="small" href={f.url ?? "#"} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Abrir {f.name}</a>)}
                          </div>
                        );
                      })}
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

async function AssignTeam({ enrollmentId, current }: { enrollmentId: string; current: { care_role_id: string; staff_profile_id: string }[] }) {
  const supabase = await createClient();
  const [{ data: roles }, { data: active }, { data: care }] = await Promise.all([
    supabase.from("care_roles").select("id, key, name").order("name"),
    supabase.from("staff_members").select("profile_id, title, profiles(full_name)").eq("is_active", true),
    supabase.from("staff_roles").select("profile_id").in("role", ["clinician", "assistant", "admin"]),
  ]);
  // Solo quien puede atender parejas (la base de datos lo exige igual).
  const people = (active ?? []).filter((p) => (care ?? []).some((c) => c.profile_id === p.profile_id));
  return (
    <details className="card">
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Cambiar responsables de esta pareja</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {(roles ?? []).map((r) => (
          <ActionForm key={r.id} action={assignStaff} inline>
            <input type="hidden" name="enrollment" value={enrollmentId} /><input type="hidden" name="role" value={r.id} />
            <span className="small" style={{ minWidth: 160, fontWeight: 700 }}>{r.name}</span>
            <select className="input" name="staff" style={{ maxWidth: 280 }} defaultValue={current.find((c) => c.care_role_id === r.id)?.staff_profile_id ?? ""}>
              <option value="">Sin asignar</option>
              {people.map((p) => <option key={p.profile_id} value={p.profile_id}>{p.profiles?.full_name} · {p.title}</option>)}
            </select>
            <button className="btn ghost sm">Guardar</button>
          </ActionForm>
        ))}
      </div>
    </details>
  );
}

async function SharedDocuments({ enrollmentId, members }: { enrollmentId: string; members: { profileId: string; name: string }[] }) {
  const supabase = await createClient();
  const { data: docs } = await supabase.from("documents").select("id, folder, title, profile_id, created_at")
    .eq("enrollment_id", enrollmentId).is("archived_at", null).order("created_at", { ascending: false });
  return (
    <details className="card">
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Documentos compartidos con la pareja ({docs?.length ?? 0})</summary>
      <div className="list" style={{ marginTop: 10 }}>
        {(docs ?? []).map((d) => (
          <div className="li" key={d.id}>
            <div className="tx"><b>{d.title}</b><span>{FOLDER_LABEL[d.folder]}{d.profile_id ? ` · solo ${members.find((m) => m.profileId === d.profile_id)?.name ?? "un miembro"}` : ""} · {fmtDay(d.created_at)}</span></div>
            <ArchiveDocument id={d.id} />
          </div>
        ))}
      </div>
      <UploadDocument enrollmentId={enrollmentId} members={members} />
    </details>
  );
}
