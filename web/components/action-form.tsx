"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/catalog";

/** Formulario genérico para acciones de servidor (prev, formData) => { error?, ok? }. */
export function ActionForm({ action, children, className, style, inline = false }: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
}) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={run} className={className ?? (inline ? undefined : "qblock")} style={{ ...(inline ? { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } : {}), ...style }}>
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>{children}</fieldset>
      {state.error && <span className="formerr" role="alert">{state.error}</span>}
      {state.ok && <span className="chip ok" role="status">{state.ok}</span>}
    </form>
  );
}
