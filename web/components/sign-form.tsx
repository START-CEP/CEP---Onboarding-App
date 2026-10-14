"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { signContract } from "@/lib/actions/contract";

export function SignForm({ activityId, defaultName }: { activityId: string; defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form className="qblock" onSubmit={(e) => {
      e.preventDefault();
      start(async () => setError((await signContract(activityId, name, accepted)).error));
    }}>
      <div className="field">
        <label htmlFor="signer">Tu nombre completo (firma)</label>
        <input className="input" id="signer" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 4 }} />
        <span>He leído el contrato completo y acepto sus condiciones.</span>
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" type="submit" disabled={pending}><Icon name="pen" size={16} /> {pending ? "Firmando…" : "Firmar contrato"}</button>
        {error && <span className="formerr" role="alert">{error}</span>}
      </div>
      <p className="small muted">Se guardan tu nombre, la fecha y la dirección desde la que firmas. Cada uno firma desde su propio acceso.</p>
    </form>
  );
}
