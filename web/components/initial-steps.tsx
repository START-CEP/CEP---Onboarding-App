"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { markViewed } from "@/lib/actions/activities";

export type InitialItem = {
  id: string;
  title: string;
  /** Hecho por toda la unidad. */
  done: boolean;
  /** Esta persona ya hizo su parte, falta su pareja. */
  waitingPartner: string | null;
  /** Se puede marcar a mano (videos y enlaces); lo demás se cumple al firmar o enviar. */
  checkable: boolean;
  href: string;
  cta: string;
};

/** Proceso inicial del resumen: abierto mientras falte algo; al completarlo se pliega y se puede volver a abrir. */
export function InitialSteps({ items }: { items: InitialItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const complete = doneCount === items.length;
  const [open, setOpen] = useState(!complete);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  if (items.length === 0) return null;

  if (!open) {
    return (
      <button type="button" className="initial-closed" onClick={() => setOpen(true)} aria-expanded="false">
        <Icon name="check" size={14} /> Proceso inicial completado · {doneCount} de {items.length}
        <span>Volver a abrir</span>
      </button>
    );
  }

  const check = (id: string) => {
    setBusy(id);
    start(async () => {
      const r = await markViewed(id);
      setError(r.error);
      setBusy(null);
    });
  };

  return (
    <div className={`initial${complete ? " ok" : ""}`}>
      <div className="initial-h">
        <div>
          <b>Proceso inicial</b>
          <span>{complete ? "Todo listo. Ya pueden ocultarlo." : `${doneCount} de ${items.length} hechos · márquenlos a medida que los completen`}</span>
        </div>
        {complete && (
          <button type="button" className="btn ghost sm" onClick={() => setOpen(false)} aria-expanded="true">Ocultar</button>
        )}
      </div>
      <ul className="initial-list">
        {items.map((i) => {
          const checked = i.done || Boolean(i.waitingPartner);
          const canCheck = i.checkable && !checked;
          return (
            <li key={i.id} className={checked ? "on" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!canCheck || pending}
                  onChange={() => canCheck && check(i.id)}
                  aria-describedby={`ini-${i.id}`}
                />
                <span className="tx">
                  <b>{i.title}</b>
                  <small id={`ini-${i.id}`}>
                    {i.done ? "Hecho" : i.waitingPartner ? `Tú ya lo hiciste · falta ${i.waitingPartner}` : busy === i.id ? "Guardando…" : i.checkable ? "Márquenlo cuando lo hayan hecho" : "Se marca solo al completarlo"}
                  </small>
                </span>
              </label>
              {!checked && <Link className="btn soft sm" href={i.href}>{i.cta}</Link>}
            </li>
          );
        })}
      </ul>
      {error && <p className="small" style={{ color: "var(--crit)" }}>{error}</p>}
    </div>
  );
}
