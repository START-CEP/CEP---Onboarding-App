"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

type Item = { href: string; label: string; icon: IconName };

const TEAM: Item[] = [
  { href: "/equipo", label: "Parejas y agenda", icon: "users" },
  { href: "/equipo/coaching", label: "Coaching grupal", icon: "chat" },
  { href: "/equipo/soporte", label: "Soporte", icon: "chat" },
];
const SALES: Item[] = [{ href: "/equipo/inscribir", label: "Inscribir pareja", icon: "user" }];
const ADMIN: Item[] = [
  { href: "/equipo/servicios", label: "Servicios", icon: "route" },
  { href: "/equipo/formularios", label: "Formularios", icon: "pen" },
  { href: "/equipo/contenidos", label: "Videos y archivos", icon: "play" },
];

function active(pathname: string, href: string) {
  return href === "/equipo" ? pathname === "/equipo" || pathname.startsWith("/equipo/parejas") : pathname.startsWith(href);
}

export function StaffNav({ admin, sales }: { admin: boolean; sales: boolean }) {
  const pathname = usePathname();
  const link = (n: Item) => (
    <Link key={n.href} href={n.href} className="nav" aria-current={active(pathname, n.href) ? "page" : undefined}>
      <Icon name={n.icon} /><span>{n.label}</span>
    </Link>
  );
  return (
    <>
      <div className="navlabel">Equipo</div>
      {TEAM.map(link)}
      {sales && SALES.map(link)}
      {admin && <><div className="navlabel">Admin</div>{ADMIN.map(link)}</>}
    </>
  );
}

export function StaffBottomNav({ admin, sales }: { admin: boolean; sales: boolean }) {
  const pathname = usePathname();
  const items = [...TEAM, ...(sales ? SALES : []), ...(admin ? ADMIN : [])].slice(0, 5);
  return (
    <nav className="bnav" aria-label="Menú del equipo">
      {items.map((n) => (
        <Link key={n.href} href={n.href} aria-current={active(pathname, n.href) ? "page" : undefined}>
          <Icon name={n.icon} size={20} />
          {n.label.split(" ")[0]}
        </Link>
      ))}
    </nav>
  );
}
