"use client";

import { useActionState } from "react";
import { requestReset, setPassword, type AccountState } from "@/lib/actions/account";

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(setPassword, {});
  return (
    <form action={action}>
      <div>
        <h2>Crea tu contraseña</h2>
        <p className="muted small" style={{ marginTop: 6 }}>Con ella entrarás a tu espacio. Es personal: tu pareja tiene la suya.</p>
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña nueva</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <span className="hint">Al menos 10 caracteres.</span>
      </div>
      <div className="field">
        <label htmlFor="confirm">Repítela</label>
        <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      {state.error && <p className="formerr" role="alert">{state.error}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ justifyContent: "center" }}>{pending ? "Guardando…" : "Guardar y entrar"}</button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(requestReset, {});
  return (
    <form action={action}>
      <div>
        <h2>Recupera tu acceso</h2>
        <p className="muted small" style={{ marginTop: 6 }}>Escribe el correo con el que entras y te enviamos un enlace para crear una contraseña nueva.</p>
      </div>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error && <p className="formerr" role="alert">{state.error}</p>}
      {state.ok && <p className="chip ok" role="status" style={{ whiteSpace: "normal" }}>{state.ok}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ justifyContent: "center" }}>{pending ? "Enviando…" : "Enviar enlace"}</button>
      <p className="small"><a className="link" href="/login">Volver a entrar</a></p>
    </form>
  );
}
