"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { saveActivity } from "@/lib/actions/catalog";
import { ACTIVITY_TYPES, type ActType } from "@/lib/activity-types";
import { buildConfig, parseFaq, parseItems, videoTitle, type Faq, type Item } from "@/lib/activity-config";
import type { Database, Json } from "@/lib/database.types";

type Activity = Database["public"]["Tables"]["service_activities"]["Row"];
type Opt = { id: string; name: string };
type ChecklistItem = { key: string; label: string; due_days?: number | null };

const PARTICIPANTS = [["all", "Toda la unidad"], ["each_member", "Cada miembro"], ["member_1", "Solo persona 1"], ["member_2", "Solo persona 2"]] as const;

const USES = {
  asset: ["video_module", "reading", "homework", "contract", "group_session"],
  items: ["video_module", "reading", "homework"],
  faq: ["contract"],
  sessionLabel: ["therapy_session"],
  form: ["form", "homework"],
  contract: ["contract"],
  url: ["external_link", "reading"],
  checklist: ["staff_task", "checklist"],
} satisfies Record<string, ActType[]>;
const uses = (what: keyof typeof USES, t: ActType) => (USES[what] as ActType[]).includes(t);

const slug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "item";

export function ActivityEditor({ versionId, activity, tracks, roles, assets, forms, contracts, nextPosition }: {
  versionId: string;
  activity?: Activity;
  tracks: Opt[];
  roles: Opt[];
  assets: { id: string; kind: string; title: string }[];
  forms: { formId: string; name: string; versions: { id: string; version: number }[] }[];
  contracts: { id: string; title: string; version: number }[];
  nextPosition: number;
}) {
  const a = activity;
  const cfg = (a?.config ?? {}) as Record<string, Json>;
  const { url: url0, checklist: list0, session_label: label0 } = cfg;
  // Lo que tiene campo propio no se repite en el JSON avanzado.
  const rest = Object.fromEntries(Object.entries(cfg).filter(([k]) => !["url", "checklist", "session_label", "video_title", "items", "faq"].includes(k)));
  const [type, setType] = useState<ActType>(a?.type ?? "video_module");
  const [url, setUrl] = useState(typeof url0 === "string" ? url0 : "");
  const [items, setItems] = useState<ChecklistItem[]>(Array.isArray(list0) ? (list0 as ChecklistItem[]) : []);
  const [extra, setExtra] = useState(Object.keys(rest).length ? JSON.stringify(rest, null, 2) : "");
  const [label, setLabel] = useState(typeof label0 === "string" ? label0 : "");
  const [extraItems, setExtraItems] = useState<Item[]>(parseItems(cfg));
  const [vTitle, setVTitle] = useState(videoTitle(cfg));
  const isModule = type === "video_module";
  const move = (i: number, d: -1 | 1) => {
    const next = [...extraItems];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setExtraItems(next);
  };
  const [faq, setFaq] = useState<Faq[]>(parseFaq(cfg));

  const config = (() => {
    let base: Record<string, unknown> = {};
    if (extra.trim()) {
      try { base = JSON.parse(extra); } catch { return extra; } // el servidor avisa de que no es JSON válido
    }
    const clean = items.filter((i) => i.label.trim());
    const taken = new Set<string>();
    const checklist = clean.map((i) => {
      let key = i.key || slug(i.label);
      for (let n = 2; taken.has(key); n++) key = `${slug(i.label)}_${n}`;
      taken.add(key);
      return { key, label: i.label.trim(), due_days: i.due_days ?? 0 };
    });
    return JSON.stringify(buildConfig(base, {
      url,
      checklist,
      sessionLabel: uses("sessionLabel", type) ? label : "",
      videoTitle: isModule ? vTitle : "",
      items: uses("items", type) ? extraItems : [],
      faq: uses("faq", type) ? faq : [],
    }));
  })();

  const selectedForm = forms.find((f) => f.versions.some((v) => v.id === a?.form_version_id));

  return (
    <ActionForm action={saveActivity} className="ae">
      <input type="hidden" name="version" value={versionId} />
      {a && <input type="hidden" name="id" value={a.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="config" value={config} />

      <div className="field">
        <label>¿Qué es?</label>
        <div className="ae-types" role="radiogroup" aria-label="Tipo de actividad">
          {ACTIVITY_TYPES.map(([v, l]) => <button key={v} type="button" aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>)}
        </div>
      </div>

      <div className="ae-grid">
        <div className="field wide"><label htmlFor={`t-${a?.id}`}>Título</label><input id={`t-${a?.id}`} className="input" name="title" defaultValue={a?.title} required placeholder="Lo que ve la pareja" /></div>
        <div className="field wide"><label htmlFor={`s-${a?.id}`}>Resumen</label><input id={`s-${a?.id}`} className="input" name="summary" defaultValue={a?.summary ?? ""} placeholder="Una línea: qué pasa en esta actividad" /></div>

        {uses("asset", type) && (
          <div className="field"><label>{type === "contract" ? "Video de preguntas frecuentes" : type === "group_session" ? "Video de presentación" : isModule ? "Video 1 (el principal)" : "Video o archivo"}</label>
            <select className="input" name="asset" defaultValue={a?.asset_id ?? ""}>
              <option value="">—</option>{assets.map((x) => <option key={x.id} value={x.id}>{x.kind === "video" ? "🎬" : "📄"} {x.title}</option>)}
            </select>
            <span className="hint"><Link href="/equipo/contenidos" target="_blank" style={{ textDecoration: "underline" }}>Subir uno nuevo ↗</Link></span>
          </div>
        )}
        {isModule && (
          <div className="field"><label>Título del video 1</label>
            <input className="input" value={vTitle} onChange={(e) => setVTitle(e.target.value)} placeholder="Ej.: Qué es un ciclo negativo" />
            <span className="hint">Se ve cuando el módulo tiene varios videos. Vacío: el título del módulo.</span>
          </div>
        )}
        {uses("form", type) && (
          <div className="field"><label>{isModule ? "Tarea del módulo" : "Formulario"}</label>
            <select className="input" name="form" defaultValue={a?.form_version_id ?? ""}>
              <option value="">—</option>
              {forms.map((f) => (
                <optgroup key={f.formId} label={f.name}>
                  {f.versions.map((v, i) => <option key={v.id} value={v.id}>{f.name} · v{v.version}{i === 0 ? " (la más reciente)" : ""}</option>)}
                </optgroup>
              ))}
            </select>
            <span className="hint">
              {selectedForm && <><Link href={`/equipo/formularios/${selectedForm.formId}`} target="_blank" style={{ textDecoration: "underline" }}>Editar este formulario ↗</Link> · </>}
              <Link href="/equipo/formularios/nuevo" target="_blank" style={{ textDecoration: "underline" }}>Crear uno nuevo ↗</Link>
            </span>
          </div>
        )}
        {uses("form", type) && (
          <div className="field"><label>Respuestas</label>
            <select className="input" name="scope" defaultValue={a?.response_scope ?? (type === "form" ? "individual" : "shared")}>
              <option value="shared">Compartidas (en pareja)</option><option value="individual">Individuales (privadas)</option>
            </select>
          </div>
        )}
        {uses("contract", type) && (
          <div className="field"><label>Contrato</label>
            <select className="input" name="contract" defaultValue={a?.contract_template_id ?? ""}>
              <option value="">—</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.title} (v{c.version})</option>)}
            </select>
            <span className="hint">Créalo abajo, en «Contratos».</span>
          </div>
        )}
        {uses("sessionLabel", type) && (
          <div className="field wide"><label>Tipo de sesión (lo ve la pareja)</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej.: Sesión de terapia de pareja · Sesión individual · Sesión de coaching en pareja" />
            <span className="hint">Si lo dejas vacío: «Sesión individual» o «Sesión de terapia de pareja» según quién participa.</span>
          </div>
        )}
        {uses("url", type) && (
          <div className="field wide"><label>Enlace</label><input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
        )}

        <div className="field"><label>Área (fila del cuadro)</label>
          <select className="input" name="track" defaultValue={a?.track_id ?? ""}><option value="">—</option>{tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </div>
        <div className="field"><label>Responsable</label>
          <select className="input" name="role" defaultValue={a?.responsible_role_id ?? ""}><option value="">—</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </div>
        <div className="field"><label>Quién participa</label>
          <select className="input" name="participants" defaultValue={a?.participants ?? "all"}>{PARTICIPANTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
      </div>

      {uses("items", type) && (
        <div className="field">
          <label>{isModule ? "Más videos (lecciones 2, 3…) y material para descargar" : "Más contenido (se despliega en el módulo)"}</label>
          {isModule && <span className="hint">Cada video es una lección: la pareja la abre directo desde la lista de módulos. Los PDF van aparte, como material.</span>}
          <div className="ae-list">
            {extraItems.map((it, i) => (
              <div className="row" key={i}>
                <select className="input" value={it.asset_id} aria-label={`Contenido ${i + 1}`}
                  onChange={(e) => setExtraItems(extraItems.map((x, j) => (j === i ? { ...x, asset_id: e.target.value } : x)))}>
                  <option value="">—</option>{assets.map((x) => <option key={x.id} value={x.id}>{x.kind === "video" ? "🎬" : "📄"} {x.title}</option>)}
                </select>
                <input className="input" value={it.title} placeholder="Título (p. ej. Validación emocional)" aria-label="Título"
                  onChange={(e) => setExtraItems(extraItems.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                {isModule && <button type="button" className="btn ghost sm" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>}
                {isModule && <button type="button" className="btn ghost sm" aria-label="Bajar" disabled={i === extraItems.length - 1} onClick={() => move(i, 1)}>↓</button>}
                <button type="button" className="btn ghost sm" aria-label="Quitar" onClick={() => setExtraItems(extraItems.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setExtraItems([...extraItems, { asset_id: "", title: "" }])}>{isModule ? "+ Añadir video o PDF" : "+ Añadir video o recurso"}</button>
          </div>
        </div>
      )}

      {uses("faq", type) && (
        <div className="field">
          <label>Preguntas frecuentes</label>
          <div className="ae-list">
            {faq.map((f, i) => (
              <div className="row" key={i} style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <input className="input" value={f.q} placeholder="Pregunta" aria-label={`Pregunta ${i + 1}`}
                    onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                  <textarea className="input" value={f.a} placeholder="Respuesta" aria-label={`Respuesta ${i + 1}`} rows={3}
                    onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
                </div>
                <button type="button" className="btn ghost sm" aria-label="Quitar" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setFaq([...faq, { q: "", a: "" }])}>+ Añadir pregunta</button>
          </div>
        </div>
      )}

      {uses("checklist", type) && (
        <div className="field">
          <label>Lista de pasos {type === "staff_task" ? "del equipo" : ""}</label>
          <div className="ae-list">
            {items.map((it, i) => (
              <div className="row" key={i}>
                <input className="input" value={it.label} placeholder="Ej.: Crear grupo de WhatsApp" aria-label={`Paso ${i + 1}`}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className="input" type="number" min={0} style={{ width: 110 }} value={it.due_days ?? 0} aria-label="Días de plazo" title="Días de plazo desde que se activa"
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, due_days: Number(e.target.value) } : x)))} />
                <span className="small muted" style={{ whiteSpace: "nowrap" }}>días</span>
                <button type="button" className="btn ghost sm" aria-label="Quitar" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setItems([...items, { key: "", label: "", due_days: 0 }])}>+ Añadir paso</button>
          </div>
        </div>
      )}

      <details>
        <summary>Tiempos, orden e identificador</summary>
        <div className="ae-grid" style={{ marginTop: 12 }}>
          <div className="field"><label>Clave corta</label><input className="input" name="key" defaultValue={a?.key} placeholder="Se genera sola (S1, M3…)" /><span className="hint">Única dentro del servicio</span></div>
          <div className="field"><label>Minutos estimados</label><input className="input" name="minutes" type="number" min={0} defaultValue={a?.estimated_minutes ?? ""} /></div>
          <div className="field"><label>Orden en la lista</label><input className="input" name="position" type="number" defaultValue={a?.position ?? nextPosition} /></div>
          <div className="field"><label>Día sugerido desde el inicio</label><input className="input" name="offset" type="number" min={0} defaultValue={a?.suggested_offset_days ?? ""} /></div>
          <div className="field"><label>Días desde la anterior</label><input className="input" name="gap" type="number" min={0} defaultValue={a?.suggested_gap_days ?? ""} /></div>
        </div>
      </details>
      <details>
        <summary>Avanzado (JSON)</summary>
        <textarea className="input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="{}" spellCheck={false} aria-label="Configuración avanzada"
          style={{ marginTop: 10, minHeight: 70, fontFamily: "ui-monospace, monospace", fontSize: 12 }} />
        <span className="small muted">Solo para ajustes que no tienen campo propio (p. ej. group_program_key).</span>
      </details>

      <button className="btn sm" style={{ alignSelf: "flex-start" }}>{a ? "Guardar actividad" : "Crear actividad"}</button>
    </ActionForm>
  );
}
