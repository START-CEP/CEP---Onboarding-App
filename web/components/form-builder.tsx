"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Field } from "@/components/homework";
import { Icon } from "@/components/icon";
import { publishForm } from "@/lib/actions/forms";
import type { Json } from "@/lib/database.types";
import {
  allKeys, FORM_KINDS, hasOptions, newKey, newQuestion, parseSchema, QUESTION_TYPES, schemaProblem, typeInfo,
  type Question, type QuestionType, type Section,
} from "@/lib/forms";

type Sel = { s: number; q: number | null };
type Drag = { s: number; q: number } | null;

const move = <T,>(list: T[], from: number, to: number) => {
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
};

/** Constructor visual de formularios: lista a la izquierda, la pregunta como la verá la pareja al centro, ajustes a la derecha. */
export function FormBuilder({ formId, initial, nextVersion }: {
  formId: string | null;
  initial: { name: string; kind: string; sections: Section[] };
  nextVersion: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState(initial.kind);
  const [sections, setSectionsRaw] = useState<Section[]>(() =>
    initial.sections.length ? initial.sections : [{ key: newKey("s", new Set()), title: "", scope: "individual", questions: [] }]);
  const [sel, setSel] = useState<Sel>({ s: 0, q: initial.sections[0]?.questions.length ? 0 : null });
  const [dirty, setDirty] = useState(false);
  const [palette, setPalette] = useState<{ s: number; at: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [trial, setTrial] = useState<Record<string, Json>>({});
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  const drag = useRef<Drag>(null);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setSections = (fn: (prev: Section[]) => Section[]) => { setSectionsRaw(fn); setDirty(true); setMsg({}); };
  const patchSection = (si: number, p: Partial<Section>) => setSections((ss) => ss.map((s, i) => (i === si ? { ...s, ...p } : s)));
  const patchQuestion = (si: number, qi: number, p: Partial<Question>) =>
    setSections((ss) => ss.map((s, i) => (i === si ? { ...s, questions: s.questions.map((q, j) => (j === qi ? { ...q, ...p } : q)) } : s)));

  const addQuestion = (type: QuestionType, si: number, at: number) => {
    const q = newQuestion(type, allKeys(sections));
    setSections((ss) => ss.map((s, i) => (i === si ? { ...s, questions: [...s.questions.slice(0, at), q, ...s.questions.slice(at)] } : s)));
    setSel({ s: si, q: at });
    setPalette(null);
    setTimeout(() => document.getElementById("fb-label")?.focus(), 30);
  };
  const removeQuestion = (si: number, qi: number) => {
    setSections((ss) => ss.map((s, i) => (i === si ? { ...s, questions: s.questions.filter((_, j) => j !== qi) } : s)));
    const left = sections[si].questions.length - 1;
    setSel({ s: si, q: left > 0 ? Math.min(qi, left - 1) : null });
  };
  const duplicateQuestion = (si: number, qi: number) => {
    const src = sections[si].questions[qi];
    const copy = { ...src, key: newKey("p", allKeys(sections)), options: src.options ? [...src.options] : undefined };
    setSections((ss) => ss.map((s, i) => (i === si ? { ...s, questions: [...s.questions.slice(0, qi + 1), copy, ...s.questions.slice(qi + 1)] } : s)));
    setSel({ s: si, q: qi + 1 });
  };
  const moveQuestion = (from: { s: number; q: number }, to: { s: number; q: number }) => {
    if (from.s === to.s && (from.q === to.q || from.q + 1 === to.q)) return;
    const q = sections[from.s].questions[from.q];
    setSections((ss) => {
      const next = ss.map((s) => ({ ...s, questions: [...s.questions] }));
      next[from.s].questions.splice(from.q, 1);
      const at = from.s === to.s && from.q < to.q ? to.q - 1 : to.q;
      next[to.s].questions.splice(at, 0, q);
      return next;
    });
    setSel({ s: to.s, q: from.s === to.s && from.q < to.q ? to.q - 1 : to.q });
  };
  const addSection = () => {
    setSections((ss) => [...ss, { key: newKey("s", allKeys(ss)), title: "", scope: ss.at(-1)?.scope ?? "individual", questions: [] }]);
    setSel({ s: sections.length, q: null });
    setTimeout(() => document.getElementById("fb-section-title")?.focus(), 30);
  };
  const removeSection = (si: number) => {
    if (sections[si].questions.length && !confirm(`¿Borrar la sección y sus ${sections[si].questions.length} preguntas?`)) return;
    setSections((ss) => ss.filter((_, i) => i !== si));
    setSel({ s: Math.max(0, si - 1), q: null });
  };

  const flat = sections.flatMap((s, si) => s.questions.map((_, qi) => ({ s: si, q: qi })));
  const pos = sel.q === null ? -1 : flat.findIndex((x) => x.s === sel.s && x.q === sel.q);
  const section = sections[sel.s];
  const question = sel.q !== null ? section?.questions[sel.q] : undefined;
  const problem = schemaProblem(sections);

  const publish = () => {
    if (!name.trim()) { setMsg({ error: "Ponle nombre al formulario." }); document.getElementById("fb-name")?.focus(); return; }
    if (problem) { setMsg({ error: problem }); return; }
    start(async () => {
      const r = await publishForm({ formId, name, kind, sections });
      if (r.error) return setMsg({ error: r.error });
      setDirty(false);
      setMsg({ ok: `Versión ${r.version} publicada. Ya puedes elegirla en una actividad del servicio.` });
      if (!formId && r.formId) router.replace(`/equipo/formularios/${r.formId}`);
    });
  };

  return (
    <div className="fb">
      <div className="fb-top card">
        <div className="fb-title">
          <input id="fb-name" className="fb-name" value={name} placeholder="Nombre del formulario" aria-label="Nombre del formulario"
            onChange={(e) => { setName(e.target.value); setDirty(true); }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select className="input fb-kind" value={kind} aria-label="Para qué es" onChange={(e) => { setKind(e.target.value); setDirty(true); }}>
              {FORM_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <span className="small muted">{flat.length} pregunta{flat.length === 1 ? "" : "s"} · {sections.length} sección{sections.length === 1 ? "" : "es"}</span>
            {dirty ? <span className="chip warn">Cambios sin publicar</span> : formId ? <span className="chip ok">Publicado</span> : null}
          </div>
        </div>
        <div className="fb-actions">
          <button className="btn ghost" type="button" onClick={() => setJsonOpen(true)}>JSON</button>
          <button className="btn ghost" type="button" disabled={flat.length === 0} onClick={() => { setTrial({}); setPlaying(true); }}><Icon name="play" size={14} /> Probar</button>
          <button className="btn" type="button" disabled={pending || (!dirty && Boolean(formId))} onClick={publish}>
            <Icon name="check" size={15} /> {pending ? "Publicando…" : `Publicar versión ${nextVersion}`}
          </button>
        </div>
        {(msg.error || msg.ok) && (
          <div style={{ flexBasis: "100%" }}>
            {msg.error && <span className="formerr" role="alert">{msg.error}</span>}
            {msg.ok && <span className="chip ok" role="status">{msg.ok}</span>}
          </div>
        )}
      </div>

      <div className="fb-grid">
        {/* ---------- Estructura ---------- */}
        <nav className="card fb-outline" aria-label="Preguntas">
          {sections.map((s, si) => (
            <div key={s.key} className="fb-sec">
              <button type="button" className={`fb-sechead ${sel.s === si && sel.q === null ? "on" : ""} ${over === `end-${si}` ? "dropping" : ""}`}
                onClick={() => setSel({ s: si, q: null })}
                onDragOver={(e) => { e.preventDefault(); setOver(`end-${si}`); }} onDragLeave={() => setOver(null)}
                onDrop={() => { if (drag.current) moveQuestion(drag.current, { s: si, q: s.questions.length }); drag.current = null; setOver(null); }}>
                <span className="fb-secn">{si + 1}</span>
                <span className="fb-sect">{s.title || <i className="muted">Sección sin título</i>}</span>
                <span className={`chip ${s.scope === "shared" ? "pair" : ""}`} style={{ fontSize: 10.5, padding: "1px 7px" }}>{s.scope === "shared" ? "En pareja" : "Individual"}</span>
              </button>
              {s.questions.map((q, qi) => {
                const n = flat.findIndex((x) => x.s === si && x.q === qi) + 1;
                const id = `${si}-${qi}`;
                return (
                  <button type="button" key={q.key} draggable className={`fb-q ${sel.s === si && sel.q === qi ? "on" : ""} ${over === id ? "dropping" : ""}`}
                    onClick={() => setSel({ s: si, q: qi })}
                    onDragStart={() => { drag.current = { s: si, q: qi }; }}
                    onDragEnd={() => { drag.current = null; setOver(null); }}
                    onDragOver={(e) => { e.preventDefault(); setOver(id); }} onDragLeave={() => setOver(null)}
                    onDrop={() => { if (drag.current) moveQuestion(drag.current, { s: si, q: qi }); drag.current = null; setOver(null); }}>
                    <span className="fb-glyph" aria-hidden="true">{typeInfo(q.type).glyph}</span>
                    <span className="fb-qn">{n}</span>
                    <span className="fb-ql">{q.label || <i className="muted">Sin texto</i>}</span>
                    {q.required && <span className="fb-req" title="Obligatoria">*</span>}
                  </button>
                );
              })}
              <button type="button" className="fb-add" onClick={() => setPalette({ s: si, at: s.questions.length })}>+ Añadir pregunta</button>
            </div>
          ))}
          <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start", marginTop: 6 }} onClick={addSection}>+ Nueva sección</button>
          <p className="small muted" style={{ marginTop: 10 }}>Arrastra las preguntas para cambiar el orden o pasarlas a otra sección.</p>
        </nav>

        {/* ---------- Escenario ---------- */}
        <section className="card fb-stage">
          {question && sel.q !== null ? (
            <>
              <div className="fb-stagehead">
                <span className="small muted">{section.title || `Sección ${sel.s + 1}`} · {section.scope === "shared" ? "la responden en pareja" : "cada uno por su cuenta"}</span>
                <span className="small muted">{pos + 1} / {flat.length}</span>
              </div>
              <div className="fb-canvas">
                <div className="fb-num"><span>{pos + 1}</span><Icon name="arrow" size={14} /></div>
                <div className="fb-body">
                  <textarea id="fb-label" className="fb-label" rows={1} value={question.label} placeholder="Escribe tu pregunta aquí…"
                    aria-label="Texto de la pregunta" onChange={(e) => patchQuestion(sel.s, sel.q!, { label: e.target.value })} />
                  <input className="fb-desc" value={question.description ?? ""} placeholder="Descripción (opcional)" aria-label="Descripción"
                    onChange={(e) => patchQuestion(sel.s, sel.q!, { description: e.target.value })} />
                  <div className="fb-field">
                    <Field q={{ ...question, options: (question.options ?? []).filter((o) => o.trim()) }} value={trial[question.key]} readOnly={false}
                      onChange={(v) => setTrial((t) => ({ ...t, [question.key]: v }))} />
                  </div>
                  {hasOptions(question.type) && <OptionsEditor q={question} onChange={(options) => patchQuestion(sel.s, sel.q!, { options })} />}
                </div>
              </div>
              <div className="fb-stagefoot">
                <button type="button" className="btn ghost sm" disabled={pos <= 0} onClick={() => setSel(flat[pos - 1])}>← Anterior</button>
                <button type="button" className="btn soft sm" onClick={() => setPalette({ s: sel.s, at: sel.q! + 1 })}>+ Pregunta debajo</button>
                <button type="button" className="btn ghost sm" disabled={pos >= flat.length - 1} onClick={() => setSel(flat[pos + 1])}>Siguiente →</button>
              </div>
            </>
          ) : section ? (
            <>
              <div className="fb-stagehead"><span className="small muted">Sección {sel.s + 1} de {sections.length}</span></div>
              <div className="fb-canvas">
                <div className="fb-body">
                  <input id="fb-section-title" className="fb-label" value={section.title} placeholder="Título de la sección" aria-label="Título de la sección"
                    onChange={(e) => patchSection(sel.s, { title: e.target.value })} />
                  <input className="fb-desc" value={section.description ?? ""} placeholder="Texto de introducción (opcional)" aria-label="Introducción"
                    onChange={(e) => patchSection(sel.s, { description: e.target.value })} />
                  <div className="fb-scope" role="radiogroup" aria-label="Quién responde">
                    {([["individual", "lock", "Individual", "Cada uno responde por su cuenta. Solo lo lee el equipo."],
                      ["shared", "users", "En pareja", "Una sola respuesta para los dos. La ven ambos."]] as const).map(([v, ic, t, d]) => (
                      <button key={v} type="button" role="radio" aria-checked={section.scope === v} className={section.scope === v ? "on" : ""}
                        onClick={() => patchSection(sel.s, { scope: v })}>
                        <Icon name={ic} size={18} /><b>{t}</b><span>{d}</span>
                      </button>
                    ))}
                  </div>
                  {section.questions.length === 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p className="muted" style={{ marginBottom: 10 }}>Esta sección aún no tiene preguntas. Elige el tipo de la primera:</p>
                      <TypeGrid onPick={(t) => addQuestion(t, sel.s, 0)} />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>

        {/* ---------- Ajustes ---------- */}
        <aside className="card fb-panel" aria-label="Ajustes">
          {question && sel.q !== null ? (
            <>
              <h3>Ajustes de la pregunta</h3>
              <div className="field">
                <label htmlFor="fb-type">Tipo</label>
                <select id="fb-type" className="input" value={question.type} onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  const p: Partial<Question> = { type };
                  if (hasOptions(type) && !(question.options ?? []).length) p.options = ["Opción 1", "Opción 2"];
                  if (type === "scale" && question.max === undefined) Object.assign(p, { min: 1, max: 5 });
                  patchQuestion(sel.s, sel.q!, p);
                }}>
                  {QUESTION_TYPES.map((t) => <option key={t.type} value={t.type}>{t.glyph}  {t.label}</option>)}
                </select>
              </div>
              <label className="fb-toggle">
                <input type="checkbox" checked={Boolean(question.required)} onChange={(e) => patchQuestion(sel.s, sel.q!, { required: e.target.checked })} />
                <span><b>Obligatoria</b><small>No pueden enviar sin responderla</small></span>
              </label>
              {["text", "textarea", "number", "email"].includes(question.type) && (
                <div className="field">
                  <label htmlFor="fb-ph">Texto de ejemplo</label>
                  <input id="fb-ph" className="input" value={question.placeholder ?? ""} placeholder="Ej.: Escribe aquí…" onChange={(e) => patchQuestion(sel.s, sel.q!, { placeholder: e.target.value })} />
                </div>
              )}
              {question.type === "scale" && (
                <>
                  <div className="fb-row2">
                    <div className="field"><label htmlFor="fb-min">Desde</label>
                      <select id="fb-min" className="input" value={question.min ?? 1} onChange={(e) => patchQuestion(sel.s, sel.q!, { min: Number(e.target.value) })}>
                        {[0, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="field"><label htmlFor="fb-max">Hasta</label>
                      <select id="fb-max" className="input" value={question.max ?? 5} onChange={(e) => patchQuestion(sel.s, sel.q!, { max: Number(e.target.value) })}>
                        {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field"><label htmlFor="fb-minl">Texto en el extremo bajo</label>
                    <input id="fb-minl" className="input" value={question.minLabel ?? ""} placeholder="Ej.: Nada" onChange={(e) => patchQuestion(sel.s, sel.q!, { minLabel: e.target.value })} />
                  </div>
                  <div className="field"><label htmlFor="fb-maxl">Texto en el extremo alto</label>
                    <input id="fb-maxl" className="input" value={question.maxLabel ?? ""} placeholder="Ej.: Muchísimo" onChange={(e) => patchQuestion(sel.s, sel.q!, { maxLabel: e.target.value })} />
                  </div>
                </>
              )}
              {sections.length > 1 && (
                <div className="field">
                  <label htmlFor="fb-mvsec">Sección</label>
                  <select id="fb-mvsec" className="input" value={sel.s} onChange={(e) => moveQuestion({ s: sel.s, q: sel.q! }, { s: Number(e.target.value), q: sections[Number(e.target.value)].questions.length })}>
                    {sections.map((s, i) => <option key={s.key} value={i}>{i + 1}. {s.title || "Sin título"}</option>)}
                  </select>
                </div>
              )}
              <div className="fb-tools">
                <button type="button" className="btn ghost sm" disabled={sel.q === 0} onClick={() => moveQuestion({ s: sel.s, q: sel.q! }, { s: sel.s, q: sel.q! - 1 })} aria-label="Subir">↑</button>
                <button type="button" className="btn ghost sm" disabled={sel.q === section.questions.length - 1} onClick={() => moveQuestion({ s: sel.s, q: sel.q! }, { s: sel.s, q: sel.q! + 2 })} aria-label="Bajar">↓</button>
                <button type="button" className="btn ghost sm" onClick={() => duplicateQuestion(sel.s, sel.q!)}>Duplicar</button>
                <button type="button" className="btn ghost sm fb-danger" onClick={() => removeQuestion(sel.s, sel.q!)}>Borrar</button>
              </div>
            </>
          ) : section ? (
            <>
              <h3>Ajustes de la sección</h3>
              <p className="small muted">El título y la introducción se ven arriba de sus preguntas. «Individual» o «En pareja» decide quién responde y quién puede leer las respuestas.</p>
              <div className="fb-tools">
                <button type="button" className="btn ghost sm" disabled={sel.s === 0} onClick={() => { setSections((ss) => move(ss, sel.s, sel.s - 1)); setSel({ s: sel.s - 1, q: null }); }}>↑ Subir</button>
                <button type="button" className="btn ghost sm" disabled={sel.s === sections.length - 1} onClick={() => { setSections((ss) => move(ss, sel.s, sel.s + 1)); setSel({ s: sel.s + 1, q: null }); }}>↓ Bajar</button>
                <button type="button" className="btn ghost sm fb-danger" disabled={sections.length === 1} onClick={() => removeSection(sel.s)}>Borrar sección</button>
              </div>
            </>
          ) : null}
          <div className="fb-check">
            {problem ? <><span className="chip warn">Antes de publicar</span><span className="small">{problem}</span></> : <span className="chip ok"><Icon name="check" size={13} /> Listo para publicar</span>}
          </div>
        </aside>
      </div>

      {palette && (
        <Modal title="¿Qué tipo de pregunta?" onClose={() => setPalette(null)}>
          <TypeGrid onPick={(t) => addQuestion(t, palette.s, palette.at)} />
        </Modal>
      )}
      {jsonOpen && <JsonModal sections={sections} onClose={() => setJsonOpen(false)} onApply={(ss) => { setSections(() => ss); setSel({ s: 0, q: ss[0]?.questions.length ? 0 : null }); setJsonOpen(false); }} />}
      {playing && <Player name={name} sections={sections} onClose={() => setPlaying(false)} />}
    </div>
  );
}

function TypeGrid({ onPick }: { onPick: (t: QuestionType) => void }) {
  return (
    <div className="fb-types">
      {QUESTION_TYPES.map((t) => (
        <button key={t.type} type="button" onClick={() => onPick(t.type)}>
          <span className="fb-glyph big" aria-hidden="true">{t.glyph}</span>
          <span><b>{t.label}</b><small>{t.hint}</small></span>
        </button>
      ))}
    </div>
  );
}

function OptionsEditor({ q, onChange }: { q: Question; onChange: (o: string[]) => void }) {
  const opts = q.options ?? [];
  const ref = useRef<HTMLDivElement>(null);
  const focus = (i: number) => setTimeout(() => ref.current?.querySelectorAll<HTMLInputElement>("input")[i]?.focus(), 20);
  const dupes = opts.filter((o, i) => o.trim() && opts.findIndex((x) => x.trim() === o.trim()) !== i);
  return (
    <div className="fb-opts" ref={ref}>
      <span className="small muted">Opciones (Enter añade otra)</span>
      {opts.map((o, i) => (
        <div key={i} className="fb-opt">
          <span className="fb-letter">{String.fromCharCode(65 + i)}</span>
          <input className="input" value={o} aria-label={`Opción ${i + 1}`} onChange={(e) => onChange(opts.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onChange([...opts.slice(0, i + 1), "", ...opts.slice(i + 1)]); focus(i + 1); }
              if (e.key === "Backspace" && o === "" && opts.length > 1) { e.preventDefault(); onChange(opts.filter((_, j) => j !== i)); focus(Math.max(0, i - 1)); }
            }} />
          <button type="button" className="btn ghost sm" disabled={i === 0} aria-label="Subir opción" onClick={() => onChange(move(opts, i, i - 1))}>↑</button>
          <button type="button" className="btn ghost sm" aria-label="Quitar opción" disabled={opts.length <= 1} onClick={() => onChange(opts.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="fb-add" style={{ alignSelf: "flex-start" }} onClick={() => { onChange([...opts, ""]); focus(opts.length); }}>+ Añadir opción</button>
      {dupes.length > 0 && <span className="formerr">Hay opciones repetidas.</span>}
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fb-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card fb-modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: "min(820px, 100%)" } : undefined}>
        <div className="ch" style={{ marginBottom: 12 }}><h2>{title}</h2><button type="button" className="btn ghost sm" onClick={onClose} aria-label="Cerrar">×</button></div>
        {children}
      </div>
    </div>
  );
}

function JsonModal({ sections, onClose, onApply }: { sections: Section[]; onClose: () => void; onApply: (s: Section[]) => void }) {
  const [text, setText] = useState(() => JSON.stringify({ sections }, null, 2));
  const [error, setError] = useState<string>();
  return (
    <Modal title="Estructura en JSON" onClose={onClose} wide>
      <p className="small muted" style={{ marginBottom: 10 }}>Para usuarios avanzados: copia la estructura a otro formulario o pega una existente. Los cambios se aplican al constructor; luego hay que publicar.</p>
      <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="JSON"
        style={{ minHeight: 360, fontFamily: "ui-monospace, monospace", fontSize: 12 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn" onClick={() => {
          try {
            const ss = parseSchema(JSON.parse(text));
            if (!ss.length) return setError("No encontramos una lista «sections».");
            onApply(ss.map((s) => ({ ...s, questions: Array.isArray(s.questions) ? s.questions : [] })));
          } catch { setError("El texto no es un JSON válido."); }
        }}>Aplicar</button>
        <button type="button" className="btn ghost" onClick={() => navigator.clipboard?.writeText(text)}>Copiar</button>
        {error && <span className="formerr" role="alert">{error}</span>}
      </div>
    </Modal>
  );
}

/** Vista previa a pantalla completa, una pregunta a la vez (como la experiencia tipo Typeform). No guarda nada. */
function Player({ name, sections, onClose }: { name: string; sections: Section[]; onClose: () => void }) {
  const items = sections.flatMap((s) => s.questions.map((q) => ({ s, q })));
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Json>>({});
  const [err, setErr] = useState<string>();
  const done = i >= items.length;
  const cur = items[i];
  const next = () => {
    if (!cur) return;
    const v = answers[cur.q.key];
    if (cur.q.required && (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length))) return setErr("Esta pregunta es obligatoria.");
    setErr(undefined);
    setI(i + 1);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fb-player" role="dialog" aria-modal="true" aria-label="Vista previa">
      <div className="fb-pbar"><span style={{ width: `${(Math.min(i, items.length) / items.length) * 100}%` }} /></div>
      <div className="fb-ptop">
        <span className="small muted">Vista previa · {name || "Formulario"} · no se guarda nada</span>
        <button type="button" className="btn ghost sm" onClick={onClose}>Cerrar</button>
      </div>
      <div className="fb-pstage">
        {done ? (
          <div className="fb-pq">
            <h1>¡Gracias!</h1>
            <p className="lead">Aquí terminaría el formulario. La pareja vería el botón «Enviar respuestas».</p>
            <div style={{ display: "flex", gap: 8 }}><button className="btn" type="button" onClick={() => { setI(0); setAnswers({}); }}>Empezar de nuevo</button></div>
          </div>
        ) : (
          <form key={cur.q.key} className="fb-pq" onSubmit={(e) => { e.preventDefault(); next(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "TEXTAREA" && !e.shiftKey) { e.preventDefault(); next(); } }}>
            {(i === 0 || items[i - 1].s !== cur.s) && cur.s.title && (
              <div className="fb-psec"><span className="eyebrow">{cur.s.title}</span>{cur.s.description && <p className="muted">{cur.s.description}</p>}</div>
            )}
            <h2 className="fb-plabel"><span className="fb-pn">{i + 1} <Icon name="arrow" size={14} /></span>{cur.q.label || "Sin texto"}{cur.q.required && <span style={{ color: "var(--crit)" }}> *</span>}</h2>
            {cur.q.description && <p className="muted">{cur.q.description}</p>}
            <div className="fb-pfield" style={{ fontSize: 16 }}>
              <Field q={cur.q} value={answers[cur.q.key]} readOnly={false} onChange={(v) => { setErr(undefined); setAnswers((a) => ({ ...a, [cur.q.key]: v })); }} />
            </div>
            {err && <span className="formerr" role="alert">{err}</span>}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn" type="submit">{i === items.length - 1 ? "Enviar" : "OK"} <Icon name="check" size={14} /></button>
              <span className="small muted">pulsa <b>Enter ↵</b>{cur.q.type === "textarea" ? " · Shift+Enter para nueva línea" : ""}</span>
            </div>
          </form>
        )}
      </div>
      <div className="fb-pnav">
        <button type="button" className="btn ghost sm" disabled={i === 0} onClick={() => { setErr(undefined); setI(i - 1); }} aria-label="Anterior">↑</button>
        <button type="button" className="btn ghost sm" disabled={done} onClick={next} aria-label="Siguiente">↓</button>
      </div>
    </div>
  );
}
