"use client";

import { useActionState, useEffect, useRef } from "react";
import { closeTicket, openTicket, replyTicket, type SupportState } from "@/lib/actions/support";

function useResetOnOk(state: SupportState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return ref;
}

export function NewTicket({ enrollmentId }: { enrollmentId: string }) {
  const [state, action, pending] = useActionState<SupportState, FormData>(openTicket, {});
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="qblock" style={{ gap: 12 }}>
      <input type="hidden" name="enrollment" value={enrollmentId} />
      <div className="field"><label htmlFor="subj">Asunto</label><input className="input" id="subj" name="subject" required maxLength={200} placeholder="Ej.: Cambio de método de pago" /></div>
      <div className="field"><label htmlFor="tbody">Tu consulta</label><textarea className="input" id="tbody" name="body" required maxLength={5000} rows={4} /></div>
      {state.error && <p className="formerr" role="alert">{state.error}</p>}
      {state.ok && <p className="formok" role="status">{state.ok}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>{pending ? "Enviando…" : "Enviar consulta"}</button>
    </form>
  );
}

export function Reply({ ticketId, canClose }: { ticketId: string; canClose: boolean }) {
  const [state, action, pending] = useActionState<SupportState, FormData>(replyTicket, {});
  const [closeState, close, closing] = useActionState<SupportState, FormData>(closeTicket, {});
  const ref = useResetOnOk(state);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <form ref={ref} action={action} className="qblock" style={{ gap: 8 }}>
        <input type="hidden" name="ticket" value={ticketId} />
        <textarea className="input" name="body" required maxLength={5000} rows={3} placeholder="Escribe tu respuesta…" aria-label="Respuesta" />
        {state.error && <p className="formerr" role="alert">{state.error}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn soft sm" type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar"}</button>
          {canClose && <button className="btn ghost sm" type="submit" formAction={close} formNoValidate disabled={closing}>Marcar como resuelta</button>}
        </div>
        {closeState.error && <p className="formerr" role="alert">{closeState.error}</p>}
      </form>
    </div>
  );
}
