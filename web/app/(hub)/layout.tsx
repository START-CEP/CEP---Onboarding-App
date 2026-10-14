import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { BottomNav, Crumb, SideNav } from "@/components/nav";
import { getHub } from "@/lib/data/hub";
import { firstName } from "@/lib/process";
import { signOut } from "../login/actions";

async function TopUser() {
  const { me, hub } = await getHub();
  if (!me) return null;
  const partner = hub?.members.find((m) => m.profileId !== me.id);
  const total = hub?.steps.length ?? 0;
  const current = hub?.enrollment.current_step_position;
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("profile_id", me.id).is("read_at", null);
  return (
    <>
      <Link className="iconbtn" href="/avisos" aria-label={count ? `Avisos: ${count} sin leer` : "Avisos"}>
        <Icon name="bell" />{count ? <span className="dot" /> : null}
      </Link>
      {hub && current && <span className="chip info"><Icon name="route" size={14} /> Paso {current} de {total}</span>}
      <div className="who">
        <span className="av">{firstName(me.name).charAt(0) || "·"}</span>
        <div>
          <b>{me.name}</b>
          {partner && <span>Con {firstName(partner.name)}</span>}
        </div>
      </div>
    </>
  );
}

async function Service() {
  const { hub } = await getHub();
  return <>{hub?.enrollment.service_name ?? "CEP"}</>;
}

export default function HubLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="mark">C</span>
          <div>CEP<small>Su ruta de pareja</small></div>
        </div>
        <div className="navlabel">Menú</div>
        <Suspense>
          <SideNav />
        </Suspense>
        <div className="spacer" />
        <form action={signOut}>
          <button className="nav" type="submit"><Icon name="out" /><span>Cerrar sesión</span></button>
        </form>
      </aside>
      <main className="main">
        <div className="top">
          <div className="crumb">
            <Suspense fallback="CEP"><Service /></Suspense> · <Suspense><Crumb /></Suspense>
          </div>
          <div className="r">
            <Suspense><TopUser /></Suspense>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
      <Suspense>
        <BottomNav />
      </Suspense>
    </div>
  );
}
