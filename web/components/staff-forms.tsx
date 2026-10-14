"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import {
  addAgendaItem, addSessionNote, completeStep, confirmActivity, removeAgendaItem, scheduleSession,
  saveSessionRecord, setQuestionStatus, setSessionStatus, toggleStaffTask, waiveRequirement, type Result,
} from "@/lib/actions/staff";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<Result>) => start(async () => setError((await fn()).error));
  return { pending, error, run };
}

const Err = ({ e }: { e?: string }) => (e ? <span className="formerr" role="alert">{e}</span> : null);

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleForm({ activityId, sessionId, initial, label }: { activityId: string; sessionId: string | null; initial?: string | null; label: string }) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(toLocalInput(initial));
  const [url, setUrl] = useState("");
  const { pending, error, run } = useAction();
  if (!open) return <button className="btn sm" onClick={() => setOpen(true)}><Icon name="cal" size={14} /> {label}</button>;
  return (
    <form className="field" style={{ width: "100%" }} onSubmit={(e) => { e.preventDefault(); run(() => scheduleSession(activityId, sessionId, new Date(when).toISOString(), url)); }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" style={{ maxWidth: 230 }} type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Fecha y hora" />
        <input className="input" style={{ maxWidth: 320 }} type="url" placeholder="Enlace de la videollamada (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Enlace" />
        <button className="btn sm" disabled={pending}>{pending ? "Guardando…" : "Confirmar"}</button>
        <button className="btn ghost sm" type="button" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
      <Err e={error} />
    </form>
  );
}

export function SessionStatusButtons({ sessionId }: { sessionId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <button className="btn soft sm" disabled={pending} onClick={() => run(() => setSessionStatus(sessionId, "completed"))}><Icon name="check" size={13} /> Hecha</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => run(() => setSessionStatus(sessionId, "no_show"))}>No asistieron</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => run(() => setSessionStatus(sessionId, "cancelled"))}>Cancelar</button>
      <Err e={error} />
    </div>
  );
}

export function AgendaEditor({ activityId, items }: { activityId: string; items: { id: string; body: string }[] }) {
  const [text, setText] = useState("");
  const { pending, error, run } = useAction();
  return (
    <div className="qblock" style={{ gap: 8 }}>
      <span className="small" style={{ fontWeight: 700 }}>Qué veremos (lo ve la pareja)</span>
      {items.map((i) => (
        <div key={i.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ flex: 1 }}>• {i.body}</span>
          <button className="btn ghost sm" disabled={pending} onClick={() => run(() => removeAgendaItem(i.id))} aria-label="Quitar">Quitar</button>
        </div>
      ))}
      <form style={{ display: "flex", gap: 8 }} onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await addAgendaItem(activityId, text); if (r.ok) setText(""); return r; }); }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Añadir un tema" aria-label="Nuevo tema" />
        <button className="btn soft sm" disabled={pending}>Añadir</button>
      </form>
      <Err e={error} />
    </div>
  );
}

export function NoteForm({ sessionId }: { sessionId: string }) {
  const [text, setText] = useState("");
  const { pending, error, run } = useAction();
  return (
    <form className="qblock" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await addSessionNote(sessionId, text); if (r.ok) setText(""); return r; }); }}>
      <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nota clínica (solo la ven el clínico asignado y admin)" aria-label="Nota clínica" />
      <button className="btn soft sm" style={{ alignSelf: "flex-start" }} disabled={pending}>Guardar nota</button>
      <Err e={error} />
    </form>
  );
}

export function TaskToggle({ id, done, label, due }: { id: string; done: boolean; label: string; due?: string }) {
  const { pending, error, run } = useAction();
  return (
    <label className="li" style={{ cursor: "pointer" }}>
      <input type="checkbox" checked={done} disabled={pending} onChange={(e) => run(() => toggleStaffTask(id, e.target.checked))} />
      <div className="tx"><b style={{ fontWeight: 600 }}>{label}</b>{due && <span>{due}</span>}</div>
      <Err e={error} />
    </label>
  );
}

export function WaiveButton({ id, waived }: { id: string; waived: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <button className="btn ghost sm" disabled={pending} onClick={() => run(() => waiveRequirement(id, !waived))}>{waived ? "Volver a exigir" : "Dispensar"}</button>
      <Err e={error} />
    </>
  );
}

export function ConfirmActivityButton({ id }: { id: string }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <button className="btn ghost sm" disabled={pending} onClick={() => run(() => confirmActivity(id))}>Marcar como hecha</button>
      <Err e={error} />
    </>
  );
}

export function StepButton({ id, completed }: { id: string; completed: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <button className="btn ghost sm" disabled={pending} onClick={() => run(() => completeStep(id, !completed))}>{completed ? "Reabrir paso" : "Dar paso por completado"}</button>
      <Err e={error} />
    </>
  );
}

export function QuestionButtons({ id }: { id: string }) {
  const { pending, error, run } = useAction();
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button className="btn soft sm" disabled={pending} onClick={() => run(() => setQuestionStatus(id, "selected"))}>Tratar</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => run(() => setQuestionStatus(id, "answered"))}>Respondida</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => run(() => setQuestionStatus(id, "dismissed"))}>Descartar</button>
      <Err e={error} />
    </div>
  );
}

/** Registro de la sesión: resumen y transcripción de Plaud, y el reporte del equipo. Solo clínico asignado y admin. */
export function SessionRecordForm({ sessionId, initial, updatedLabel }: {
  sessionId: string;
  initial: { transcript: string; brief: string; report: string };
  updatedLabel?: string;
}) {
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAction();
  const dirty = f.transcript !== initial.transcript || f.brief !== initial.brief || f.report !== initial.report;
  const words = f.transcript.trim() ? f.transcript.trim().split(/\s+/).length : 0;
  return (
    <form className="rec" onSubmit={(e) => { e.preventDefault(); setSaved(false); run(async () => { const r = await saveSessionRecord(sessionId, f); if (r.ok) setSaved(true); return r; }); }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="small" style={{ fontWeight: 700 }}>Registro de la sesión</span>
        <span className="small muted"><Icon name="lock" size={12} /> Solo el equipo clínico asignado y admin{updatedLabel ? ` · ${updatedLabel}` : ""}</span>
      </div>
      <div className="field">
        <label htmlFor={`brief-${sessionId}`} style={{ fontSize: 13 }}>Resumen de Plaud</label>
        <textarea id={`brief-${sessionId}`} className="input" value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })}
          placeholder="Pega aquí el resumen (brief) que entrega Plaud" style={{ minHeight: 110 }} />
      </div>
      <details>
        <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>Transcripción completa {words ? `· ${words.toLocaleString("es")} palabras` : "· vacía"}</summary>
        <textarea className="input mono" value={f.transcript} onChange={(e) => setF({ ...f, transcript: e.target.value })} aria-label="Transcripción completa"
          placeholder="Pega aquí la transcripción completa de Plaud" style={{ minHeight: 220, marginTop: 8 }} />
      </details>
      <div className="field">
        <label htmlFor={`report-${sessionId}`} style={{ fontSize: 13 }}>Reporte de la sesión</label>
        <textarea id={`report-${sessionId}`} className="input" value={f.report} onChange={(e) => setF({ ...f, report: e.target.value })}
          placeholder="Qué se trabajó, acuerdos, próximos pasos…" style={{ minHeight: 130 }} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn soft sm" disabled={pending || !dirty}>{pending ? "Guardando…" : "Guardar registro"}</button>
        {saved && !dirty && <span className="chip ok" role="status">Guardado</span>}
        <Err e={error} />
      </div>
    </form>
  );
}
