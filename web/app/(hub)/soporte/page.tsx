import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { NewTicket, Reply } from "@/components/support-forms";
import { whatsappUrl } from "@/lib/contact";
import { getHub } from "@/lib/data/hub";
import { createClient } from "@/lib/supabase/server";
import { firstName, fmtDay, fmtTime } from "@/lib/process";

export const metadata: Metadata = { title: "Soporte · CEP" };

const STATUS = { open: ["warn", "Esperando respuesta"], answered: ["info", "Respondida"], closed: ["go", "Resuelta"] } as const;

export default function SupportPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Support />
    </Suspense>
  );
}

async function Support() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  const supabase = await createClient();
  const { data: tickets } = await supabase.from("support_tickets")
    .select("id, subject, status, is_private, opened_by, created_at, support_messages(id, body, created_at, author_id, profiles(full_name))")
    .eq("enrollment_id", hub.enrollment.enrollment_id!).order("updated_at", { ascending: false });
  const members = new Set(hub.members.map((m) => m.profileId));
  const wa = whatsappUrl("Hola, tengo una consulta urgente.");

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Soporte</p>
          <h1>Consultas al equipo</h1>
          <p className="lead">Escríbenos aquí cualquier duda (pagos, accesos, agenda…). Queda registro de todo lo que te respondemos.</p>
        </div>
        {wa && <a className="btn ghost" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={15} /> ¿Es urgente? WhatsApp</a>}
      </div>
      <div className="grid2">
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2>Sus consultas</h2>
          {(tickets ?? []).length === 0 && <p className="muted">Todavía no han enviado consultas.</p>}
          {(tickets ?? []).map((t) => {
            const [tone, label] = STATUS[t.status as keyof typeof STATUS] ?? STATUS.open;
            const msgs = [...(t.support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
            return (
              <details key={t.id} className="ticket" open={t.status !== "closed"}>
                <summary>
                  <b>{t.subject}</b>
                  <span className={`chip ${tone}`}>{label}</span>
                  {t.is_private && <span className="chip">Privada</span>}
                  <span className="small muted">{fmtDay(t.created_at)}</span>
                </summary>
                <div className="thread">
                  {msgs.map((m) => {
                    const fromCouple = members.has(m.author_id);
                    const who = firstName(m.profiles?.full_name ?? "");
                    return (
                      <div key={m.id} className={`msg ${fromCouple ? "me" : "team"}`}>
                        <span className="small muted">{fromCouple ? who : `${who} · equipo`} · {fmtDay(m.created_at)} {fmtTime(m.created_at)}</span>
                        <p>{m.body}</p>
                      </div>
                    );
                  })}
                </div>
                {t.status !== "closed" && <Reply ticketId={t.id} canClose={t.opened_by === me.id} />}
              </details>
            );
          })}
        </section>
        <section className="card" style={{ alignSelf: "start" }}>
          <h2 style={{ marginBottom: 12 }}>Nueva consulta</h2>
          <NewTicket enrollmentId={hub.enrollment.enrollment_id!} couple={hub.members.length > 1} />
        </section>
      </div>
    </>
  );
}
