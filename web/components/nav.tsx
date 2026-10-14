"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

export const NAV: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: "/", label: "Inicio", short: "Inicio", icon: "home" },
  { href: "/proceso", label: "El proceso", short: "Proceso", icon: "route" },
  { href: "/onboarding", label: "Onboarding", short: "Onboarding", icon: "user" },
  { href: "/bienvenida", label: "Bienvenida", short: "Bienvenida", icon: "play" },
  { href: "/contrato", label: "Contrato", short: "Contrato", icon: "pen" },
  { href: "/radiografia", label: "Radiografía Inicial", short: "Radiografía", icon: "pulse" },
  { href: "/modulos", label: "Módulos", short: "Módulos", icon: "book" },
  { href: "/terapia", label: "Sesiones de Terapia", short: "Terapia", icon: "heart" },
  { href: "/coaching", label: "Coaching Grupal", short: "Coaching", icon: "users" },
];

const MOBILE = ["/", "/proceso", "/modulos", "/terapia", "/coaching"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((n) => (
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
    </nav>
  );
}

export function Crumb() {
  const pathname = usePathname();
  const item = NAV.find((n) => isActive(pathname, n.href));
  return <b>{pathname.startsWith("/perfil") ? "Tu perfil" : item?.label ?? ""}</b>;
}
