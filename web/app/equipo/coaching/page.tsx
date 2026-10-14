import { Suspense } from "react";
import { GroupSessionEditor, NewGroupSession, RemoveResource } from "@/components/content-forms";
import { QuestionButtons } from "@/components/staff-forms";
import { getStaff } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, fmtTime } from "@/lib/process";

export default function TeamCoachingPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <TeamCoaching />
    </Suspense>
  );
}

async function TeamCoaching() {
  const staff = await getStaff();
  if (!staff) return null;
  const supabase = await createClient();
  const [{ data: programs }, { data: sessions }, { data: questions }, { data: resources }, { data: assetList }, { data: attendance }] = await Promise.all([
    supabase.from("group_programs").select("id, name, cadence_days, default_time").is("archived_at", null),
    supabase.from("group_sessions").select("id, program_id, scheduled_at, title, meeting_url, status, recording_asset_id").order("scheduled_at"),
    supabase.from("group_session_questions").select("id, group_session_id, body, is_anonymous, status, created_at, profiles(full_name)").neq("status", "dismissed").order("created_at"),
    supabase.from("resources").select("id, title, attach_id").eq("attach_type", "group_session").is("archived_at", null),
    supabase.from("content_assets").select("id, kind, title").is("archived_at", null),
    supabase.from("group_session_attendance").select("group_session_id"),
  ]);
  const videos = (assetList ?? []).filter((a) => a.kind === "video").map((a) => ({ id: a.id, title: a.title }));
  const pdfs = (assetList ?? []).filter((a) => a.kind === "pdf").map((a) => ({ id: a.id, title: a.title }));

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Equipo</p>
          <h1>Coaching grupal</h1>
          <p className="lead">Fechas, enlace de cada encuentro, preguntas de las parejas y, después, la grabación y el recurso descargable.</p>
        </div>
      </div>
      {(programs ?? []).map((p) => {
        const list = (sessions ?? []).filter((s) => s.program_id === p.id);
        return (
          <section className="card" key={p.id}>
            <div className="ch"><h2>{p.name}</h2><span className="muted small">Cada {p.cadence_days} días · {p.default_time?.slice(0, 5)}</span></div>
            <div className="list">
              {list.map((s) => {
                const qs = (questions ?? []).filter((q) => q.group_session_id === s.id);
                const res = (resources ?? []).filter((r) => r.attach_id === s.id);
                const att = (attendance ?? []).filter((a) => a.group_session_id === s.id).length;
                return (
                  <div className="li" key={s.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div className="tx" style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 260 }}>
                      <div>
                        <b>{fmtDay(s.scheduled_at)} · {fmtTime(s.scheduled_at)} · {s.title}</b>
                        <span>{s.status === "completed" ? `Realizado · ${att} asistentes` : "Programado"}</span>
                      </div>
                      {staff.isAdmin
                        ? <GroupSessionEditor id={s.id} meetingUrl={s.meeting_url} status={s.status} recordingAssetId={s.recording_asset_id} videos={videos} pdfs={pdfs} />
                        : null}
                      {res.map((r) => (
                        <div className="res" key={r.id}>
                          <div className="tx"><b>{r.title}</b></div>
                          {staff.isAdmin && <RemoveResource id={r.id} />}
                        </div>
                      ))}
                      {qs.map((q) => (
                        <div className="res" key={q.id} style={{ flexWrap: "wrap" }}>
                          <div className="tx" style={{ minWidth: 200 }}>
                            <b style={{ fontWeight: 500 }}>«{q.body}»</b>
                            <span className="muted small">{q.is_anonymous ? "Anónima" : q.profiles?.full_name} · {q.status === "new" ? "Nueva" : q.status === "selected" ? "Se tratará" : "Respondida"}</span>
                          </div>
                          {q.status !== "answered" && <QuestionButtons id={q.id} />}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14 }}><NewGroupSession programId={p.id} /></div>
          </section>
        );
      })}
    </>
  );
}
