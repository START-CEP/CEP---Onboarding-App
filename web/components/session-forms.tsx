"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { askGroupQuestion, logDownload, requestSession } from "@/lib/actions/sessions";

export function RequestSession({ activityId, label }: { activityId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  if (!open) {
    return <button className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}><Icon name="cal" size={15} /> {label}</button>;
  }
  return (
    <form className="field" onSubmit={(e) => { e.preventDefault(); start(async () => setError((await requestSession(activityId, new Date(when).toISOString())).error)); }}>
      <label htmlFor={`when-${activityId}`}>¿Qué día y hora les vendría bien?</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" style={{ maxWidth: 260 }} id={`when-${activityId}`} type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
        <button className="btn sm" type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar solicitud"}</button>
        <button className="btn ghost sm" type="button" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
      <span className="hint">El equipo les confirmará la cita (o les propondrá otra hora) por WhatsApp y aquí.</span>
      {error && <span className="formerr" role="alert">{error}</span>}
    </form>
  );
}

export function AskQuestion({ groupSessionId, enrollmentId, dateLabel }: { groupSessionId: string; enrollmentId: string; dateLabel: string }) {
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string }>({});
  const [pending, start] = useTransition();
  return (
    <form className="qblock" onSubmit={(e) => {
      e.preventDefault();
      start(async () => { const r = await askGroupQuestion(groupSessionId, enrollmentId, body, anonymous); setMsg(r); if (r.ok) setBody(""); });
    }}>
      <div className="field">
        <label htmlFor="gq">Su pregunta o el tema que quieren que tratemos</label>
        <textarea className="input" id="gq" value={body} onChange={(e) => setBody(e.target.value)} placeholder="¿Cómo pedir una pausa sin que la otra persona lo sienta como rechazo?" />
        <span className="hint">La leemos antes del coaching del {dateLabel}.</span>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Que sea anónima en el grupo
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar pregunta"}</button>
        {msg.error && <span className="formerr" role="alert">{msg.error}</span>}
        {msg.ok && <span className="chip ok" role="status">Pregunta enviada</span>}
      </div>
    </form>
  );
}

export function DownloadLink({ resourceId, href, children }: { resourceId: string; href: string; children: React.ReactNode }) {
  return (
    <a className="btn ghost sm" href={href} target="_blank" rel="noreferrer" onClick={() => { void logDownload(resourceId); }}>
      <Icon name="arrow" size={14} /> {children}
    </a>
  );
}
