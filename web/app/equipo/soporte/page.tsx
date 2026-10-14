import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Reply } from "@/components/support-forms";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, fmtTime } from "@/lib/process";

export const metadata: Metadata = { title: "Soporte · Equipo CEP" };

export default function StaffSupportPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Inbox />
    </Suspense>
  );
}

// Bandeja del equipo: la RLS muestra solo las consultas de las parejas que esta persona puede gestionar.
async function Inbox() {
  const supabase = await createClient();
  const { data: tickets } = await supabase.from("support_tickets")
    .select("id, enrollment_id, subject, status, is_private, created_at, enrollments(client_units(display_name)), support_messages(id, body, created_at, author_id, profiles(full_name))")
    .neq("status", "closed").order("updated_at", { ascending: false }).limit(100);
  const open = (tickets ?? []).filter((t) => t.status === "open").length;
  return (
    <>
      <div className="ph">
        <div><p className="eyebrow">Soporte</p><h1>Consultas abiertas</h1><p className="lead">Lo que las parejas preguntan por la app. Al responder, les llega un aviso.</p></div>
        <span className={`chip ${open ? "warn" : "ok"}`}>{open} sin responder</span>
      </div>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(tickets ?? []).length === 0 && <p className="muted">No hay consultas pendientes.</p>}
        {(tickets ?? []).map((t) => (
          <details key={t.id} className="ticket" open={t.status === "open"}>
            <summary>
              <b>{t.enrollments?.client_units?.display_name} · {t.subject}</b>
              <span className={`chip ${t.status === "open" ? "warn" : "info"}`}>{t.status === "open" ? "Sin responder" : "Respondida"}</span>
              {t.is_private && <span className="chip">Privada</span>}
              <span className="small muted">{fmtDay(t.created_at)}</span>
              <Link className="small" href={`/equipo/parejas/${t.enrollment_id}`}>Ver pareja</Link>
            </summary>
            <div className="thread">
              {[...(t.support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((m) => (
                <div key={m.id} className="msg team"><span className="small muted">{m.profiles?.full_name} · {fmtDay(m.created_at)} {fmtTime(m.created_at)}</span><p>{m.body}</p></div>
              ))}
            </div>
            <Reply ticketId={t.id} canClose />
          </details>
        ))}
      </section>
    </>
  );
}
