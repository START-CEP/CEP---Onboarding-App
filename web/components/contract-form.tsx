"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { createContract } from "@/lib/actions/catalog";

/** Contrato nuevo: puntos clave como filas (título + texto) y el texto completo. */
export function ContractForm({ serviceId }: { serviceId: string }) {
  const [points, setPoints] = useState([{ title: "", body: "" }]);
  const serialized = points.filter((p) => p.title.trim()).map((p) => `${p.title.replace(/:/g, " ").trim()}: ${p.body.trim()}`).join("\n");
  return (
    <ActionForm action={createContract}>
      <input type="hidden" name="service" value={serviceId} />
      <input type="hidden" name="points" value={serialized} />
      <div className="field"><label htmlFor="ct-title">Título</label><input id="ct-title" className="input" name="title" required placeholder="Acuerdo del proceso" /></div>
      <div className="field">
        <label>Puntos clave <span className="small muted" style={{ fontWeight: 500 }}>· lo que la pareja lee antes de firmar</span></label>
        <div className="ae-list">
          {points.map((p, i) => (
            <div className="row" key={i}>
              <input className="input" style={{ maxWidth: 200 }} value={p.title} placeholder="Qué incluye" aria-label={`Título del punto ${i + 1}`}
                onChange={(e) => setPoints(points.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <input className="input" value={p.body} placeholder="10 sesiones de terapia en pareja…" aria-label={`Texto del punto ${i + 1}`}
                onChange={(e) => setPoints(points.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
              <button type="button" className="btn ghost sm" aria-label="Quitar punto" disabled={points.length === 1} onClick={() => setPoints(points.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setPoints([...points, { title: "", body: "" }])}>+ Añadir punto</button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="ct-body">Texto completo</label>
        <textarea id="ct-body" className="input" name="body" style={{ minHeight: 180 }} placeholder={"# Acuerdo\n\nTexto del contrato…\n\n- Punto de lista"} />
        <span className="hint">Admite títulos con # y listas con -.</span>
      </div>
      <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Publicar contrato</button>
    </ActionForm>
  );
}
