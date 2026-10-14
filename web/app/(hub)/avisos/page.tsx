import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { markAllRead } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { fmtDay } from "@/lib/process";

export const metadata: Metadata = { title: "Avisos · CEP" };

export default function NoticesPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 300 }} aria-busy="true" />}>
      <Notices />
    </Suspense>
  );
}

async function Notices() {
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(50);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Avisos</p>
          <h1>Sus avisos</h1>
          <p className="lead">Recordatorios del equipo y de su proceso.</p>
        </div>
        {unread > 0 && <form action={markAllRead}><button className="btn ghost sm">Marcar todo como leído</button></form>}
      </div>
      <section className="card">
        {(data ?? []).length === 0 ? <p className="muted">No tienen avisos.</p> : (
          <div className="list">
            {data!.map((n) => (
              <Link className="li" key={n.id} href={n.link ?? "/"}>
                <span className={`ico ${n.read_at ? "" : "warn"}`}><Icon name="bell" /></span>
                <div className="tx"><b style={{ fontWeight: n.read_at ? 500 : 700 }}>{n.title}</b><span>{n.body} · {fmtDay(n.created_at)}</span></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
