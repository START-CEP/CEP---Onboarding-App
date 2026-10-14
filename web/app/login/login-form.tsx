"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action}>
      <div>
        <h2>Entra a tu espacio</h2>
        <p className="muted small" style={{ marginTop: 6 }}>
          Tu pareja tiene su propio acceso. Lo que escribes en tus tareas individuales lo ve solo el equipo.
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
      <p className="small muted">¿Primera vez? Usa el enlace que te enviamos por email al confirmar tu proceso.</p>
    </form>
  );
}
