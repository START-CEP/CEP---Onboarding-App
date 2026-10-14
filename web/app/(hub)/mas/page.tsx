import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { NAV } from "@/components/nav";
import { getHub } from "@/lib/data/hub";
import { hiddenNav } from "@/lib/process";
import { signOut } from "../../login/actions";

export const metadata: Metadata = { title: "Todas las secciones · CEP" };

// En el teléfono la barra de abajo muestra solo lo más usado; aquí está todo lo demás.
export default function MorePage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 300 }} aria-busy="true" />}>
      <More />
    </Suspense>
  );
}

async function More() {
  const { hub } = await getHub();
  const hidden = hub ? hiddenNav(hub) : [];
  return (
    <>
      <div className="ph"><div><p className="eyebrow">Menú</p><h1>Todas las secciones</h1></div></div>
      <section className="card">
        <div className="list">
          {NAV.filter((n) => !hidden.includes(n.href)).map((n) => (
            <Link className="li" key={n.href} href={n.href}>
              <span className="ico info"><Icon name={n.icon} /></span>
              <div className="tx"><b>{n.label}</b></div>
              <Icon name="arrow" size={16} />
            </Link>
          ))}
          <Link className="li" href="/perfil">
            <span className="ico info"><Icon name="user" /></span>
            <div className="tx"><b>Tu perfil</b><span>Foto, datos, avisos y contraseña</span></div>
            <Icon name="arrow" size={16} />
          </Link>
        </div>
        <form action={signOut} style={{ marginTop: 16 }}>
          <button className="btn ghost" type="submit"><Icon name="out" size={16} /> Cerrar sesión</button>
        </form>
      </section>
    </>
  );
}
