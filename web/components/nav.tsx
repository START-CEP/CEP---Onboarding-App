"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

export const NAV: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: "/", label: "Inicio", short: "Inicio", icon: "home" },
  { href: "/proceso", label: "El proceso", short: "Proceso", icon: "route" },
  { href: "/bienvenida", label: "Bienvenida", short: "Bienvenida", icon: "play" },
  { href: "/onboarding", label: "Formulario de onboarding", short: "Onboarding", icon: "user" },
  { href: "/contrato", label: "Firmar contrato", short: "Contrato", icon: "pen" },
  { href: "/radiografia", label: "Radiografía Inicial", short: "Radiografía", icon: "pulse" },
  { href: "/modulos", label: "Módulos", short: "Módulos", icon: "book" },
  { href: "/terapia", label: "Sesiones de Terapia", short: "Terapia", icon: "heart" },
  { href: "/coaching", label: "Coaching Grupal", short: "Coaching", icon: "users" },
  { href: "/documentos", label: "Documentos", short: "Documentos", icon: "folder" },
  { href: "/soporte", label: "Soporte", short: "Soporte", icon: "chat" },
];

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
    </nav>
  );
}

export function Crumb() {
  const pathname = usePathname();
  const item = NAV.find((n) => isActive(pathname, n.href));
  return <b>{pathname.startsWith("/perfil") ? "Tu perfil" : item?.label ?? ""}</b>;
}
