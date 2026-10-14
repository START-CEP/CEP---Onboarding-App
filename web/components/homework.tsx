"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";
import type { Question, Section } from "@/lib/data/modules";
import { markViewed, registerUpload, saveHomework } from "@/lib/actions/activities";

type Answers = Record<string, Json>;

// Tras guardar, la página se queda donde estaba (p. ej. el módulo que se acaba de usar).
function useStay(returnTo?: string) {
  const router = useRouter();
  return () => (returnTo ? router.replace(returnTo, { scroll: false }) : router.refresh());
}
const moduleUrl = (key: string) => `/modulos?m=${encodeURIComponent(key)}`;

export function MarkViewed({ activityId, moduleKey, done }: { activityId: string; moduleKey: string; done: boolean }) {
  const stay = useStay(moduleUrl(moduleKey));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  if (done) return <span className="chip ok"><Icon name="check" size={14} /> Video visto</span>;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn soft sm" disabled={pending}
        onClick={() => start(async () => { const r = await markViewed(activityId); setError(r.error); if (!r.error) stay(); })}>
        <Icon name="check" size={15} /> {pending ? "Guardando…" : "Ya vi el video"}
      </button>
      {error && <span className="formerr">{error}</span>}
    </div>
  );
}

function Field({ q, value, onChange, readOnly }: { q: Question; value: Json | undefined; onChange: (v: Json) => void; readOnly: boolean }) {
  const id = `q-${q.key}`;
  switch (q.type) {
    case "textarea":
      return <textarea className="input" id={id} value={(value as string) ?? ""} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />;
    case "text":
    case "number":
      return <input className="input" id={id} type={q.type === "number" ? "number" : "text"} value={(value as string) ?? ""} readOnly={readOnly}
        onChange={(e) => onChange(q.type === "number" ? Number(e.target.value) : e.target.value)} />;
    case "scale": {
      const min = q.min ?? 1, max = q.max ?? 5;
      return (
        <div className="scale" role="radiogroup" aria-labelledby={`${id}-l`}>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <button type="button" key={n} role="radio" aria-checked={value === n} className={value === n ? "on" : ""}
              disabled={readOnly} onClick={() => onChange(n)} style={{ width: 36, height: 36, borderRadius: "var(--rad-s)", border: "1px solid var(--line)", background: value === n ? "var(--accent)" : "transparent", color: value === n ? "var(--accent-ink)" : "inherit", fontWeight: 700 }}>
              {n}
            </button>
          ))}
        </div>
      );
    }
    case "single_choice":
    case "multi_choice": {
      const multi = q.type === "multi_choice";
      const selected = multi ? ((value as string[]) ?? []) : [value as string];
      return (
        <div className="tags">
          {(q.options ?? []).map((o) => {
            const on = selected.includes(o);
            return (
              <button type="button" key={o} className={on ? "on" : ""} disabled={readOnly} aria-pressed={on}
                onClick={() => onChange(multi ? (on ? selected.filter((x) => x !== o) : [...selected, o]) : o)}
                style={{ border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`, background: on ? "var(--accent-soft)" : "transparent", color: on ? "var(--accent)" : "inherit", borderRadius: 999, padding: "6px 12px", fontWeight: on ? 700 : 500 }}>
                {o}
              </button>
            );
          })}
        </div>
      );
    }
  }
}

export function HomeworkForm({ activityId, returnTo, sections, initial, readOnly, partnerName, submitLabel = "Entregar tarea", sentLabel = "Tarea entregada." }: {
  activityId: string; returnTo?: string; sections: Section[]; initial: Answers; readOnly: boolean; partnerName?: string;
  submitLabel?: string; sentLabel?: string;
}) {
  const stay = useStay(returnTo);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const save = (submit: boolean) =>
    start(async () => {
      const r = await saveHomework(activityId, answers, submit);
      setMsg(r.error ? { error: r.error } : { ok: submit ? sentLabel : "Borrador guardado." });
      if (!r.error) stay();
    });

  return (
    <form className="qblock" onSubmit={(e) => { e.preventDefault(); save(true); }}>
      {sections.map((s) => (
        <div key={s.key} className="qblock">
          {sections.length > 1 && <h3>{s.title}</h3>}
          <span className={`chip ${s.scope === "shared" ? "pair" : ""}`} style={{ alignSelf: "flex-start" }}>
            {s.scope === "shared" ? <><Icon name="users" size={13} /> En pareja: la ven los dos</> : <><Icon name="lock" size={13} /> Individual: solo la lee el equipo{partnerName ? `, no ${partnerName}` : ""}</>}
          </span>
          {s.questions.map((q, i) => (
            <div className="field" key={q.key}>
              <label htmlFor={`q-${q.key}`} id={`q-${q.key}-l`}>{i + 1}. {q.label}</label>
              <Field q={q} value={answers[q.key]} readOnly={readOnly} onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))} />
            </div>
          ))}
        </div>
      ))}
      {!readOnly && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" type="submit" disabled={pending}><Icon name="check" size={16} /> {submitLabel}</button>
          <button className="btn ghost" type="button" disabled={pending} onClick={() => save(false)}>Guardar borrador</button>
          {msg.error && <span className="formerr" role="alert">{msg.error}</span>}
          {msg.ok && <span className="chip ok" role="status">{msg.ok}</span>}
        </div>
      )}
    </form>
  );
}

export function UploadHomework({ activityId, moduleKey, folder }: { activityId: string; moduleKey: string; folder: string }) {
  const stay = useStay(moduleUrl(moduleKey));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return setError("El archivo pesa más de 20 MB.");
    start(async () => {
      const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
      const path = `${folder}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await createClient().storage.from("submissions").upload(path, file, { contentType: file.type });
      if (upErr) return setError("No pudimos subir el archivo. Revisa que sea PDF o imagen.");
      const r = await registerUpload(activityId, { path, mime: file.type, size: file.size });
      setError(r.error);
      if (!r.error) stay();
    });
  };
  return (
    <label className="drop" style={{ cursor: "pointer" }}>
      <Icon name="arrow" size={22} />
      <b style={{ color: "var(--ink)" }}>{pending ? "Subiendo…" : "Elige tu tarea completada"}</b>
      <span className="small">PDF, foto o escaneo · hasta 20 MB</span>
      <input type="file" accept="application/pdf,image/png,image/jpeg,image/heic,image/webp" hidden disabled={pending}
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {error && <span className="formerr" role="alert">{error}</span>}
    </label>
  );
}
