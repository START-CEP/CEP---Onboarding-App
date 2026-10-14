"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { NAV } from "@/lib/nav-items";

const MOBILE = ["/", "/proceso", "/modulos", "/terapia", "/coaching"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** `hidden`: secciones de un solo uso ya completadas (se siguen mostrando si estás en ellas). */
export function SideNav({ hidden = [] }: { hidden?: string[] }) {
  const pathname = usePathname();
  return (
    <>
      {NAV.filter((n) => !hidden.includes(n.href) || isActive(pathname, n.href)).map((n) => (
        <Link key={n.href} href={n.href} className="nav" aria-current={isActive(pathname, n.href) ? "page" : undefined}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </Link>
      ))}
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bnav" aria-label="Menú">
      {NAV.filter((n) => MOBILE.includes(n.href)).map((n) => (
        <Link key={n.href} href={n.href} aria-current={isActive(pathname, n.href) ? "page" : undefined}>
          <Icon name={n.icon} size={20} />
          {n.short}
        </Link>
      ))}
      <Link href="/mas" aria-current={pathname.startsWith("/mas") ? "page" : undefined}>
        <Icon name="menu" size={20} />
        Más
      </Link>
    </nav>
  );
}

export function Crumb() {
  const pathname = usePathname();
  const item = NAV.find((n) => isActive(pathname, n.href));
  return <b>{pathname.startsWith("/perfil") ? "Tu perfil" : pathname.startsWith("/mas") ? "Todas las secciones" : item?.label ?? ""}</b>;
}
