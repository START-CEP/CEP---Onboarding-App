"use client";

import { useActionState, useState } from "react";
import { enrollCouple, type EnrollState } from "@/lib/actions/enroll";

type Version = { id: string; label: string; unitKind: string; roles: { id: string; key: string; name: string }[] };
type Person = { id: string; name: string };

export function EnrollForm({ versions, team, today }: { versions: Version[]; team: Person[]; today: string }) {
  const [state, action, pending] = useActionState<EnrollState, FormData>(enrollCouple, {});
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const version = versions.find((v) => v.id === versionId);
  const couple = version?.unitKind === "couple";
  return (
    <form action={action} className="qblock">
      <div className="grid2e">
        <div className="field">
          <label htmlFor="version">Servicio</label>
          <select className="input" id="version" name="version" value={versionId} onChange={(e) => setVersionId(e.target.value)}>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="starts_on">Fecha de inicio</label>
          <input className="input" id="starts_on" name="starts_on" type="date" defaultValue={today} required />
        </div>
      </div>
      {[1, ...(couple ? [2] : [])].map((i) => (
        <div className="grid2e" key={i}>
          <div className="field">
            <label htmlFor={`name${i}`}>{couple ? `Persona ${i}: nombre completo` : "Nombre completo"}</label>
            <input className="input" id={`name${i}`} name={`name${i}`} required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor={`email${i}`}>Correo</label>
            <input className="input" id={`email${i}`} name={`email${i}`} type="email" required autoComplete="off" />
          </div>
        </div>
      ))}
      {couple && <p className="small muted">La persona 1 y la persona 2 importan cuando el servicio tiene sesiones individuales (p. ej. S2 y S3).</p>}
      {version && version.roles.length > 0 && (
        <>
          <h3>Equipo asignado</h3>
          <div className="grid2e">
            {version.roles.map((r) => (
              <div className="field" key={r.id}>
                <label htmlFor={`role-${r.key}`}>{r.name}</label>
                <select className="input" id={`role-${r.key}`} name={`role:${r.key}`} required defaultValue="">
                  <option value="" disabled>Elige a alguien</option>
                  {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
      {state.error && <p className="formerr" role="alert">{state.error}</p>}
      <button className="btn" style={{ alignSelf: "flex-start" }} disabled={pending}>{pending ? "Inscribiendo…" : "Inscribir y enviar invitaciones"}</button>
      <p className="small muted">Cada persona recibe un correo para crear su contraseña. Si ya tenía cuenta, se usa la existente.</p>
    </form>
  );
}
