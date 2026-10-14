"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action}>
      <div>
        <h2>Hola de nuevo</h2>
        <p className="muted small" style={{ marginTop: 6 }}>
          Entra con tu correo y tu contraseña. Este acceso es solo para ti; tu pareja tiene el suyo.
        </p>
      </div>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state.email} />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && <p className="formerr" role="alert">{state.error}</p>}
      <button className="btn" type="submit" style={{ justifyContent: "center" }} disabled={pending}>
        {pending ? "Entrando…" : "Entrar"} <Icon name="arrow" size={16} />
      </button>
      <a className="btn ghost" href="/recuperar" style={{ justifyContent: "center" }}>¿Olvidaste tu contraseña?</a>
      <p className="small muted">¿Es tu primera vez? Usa el enlace de invitación que te enviamos por correo para crear tu contraseña.</p>
    </form>
  );
}
