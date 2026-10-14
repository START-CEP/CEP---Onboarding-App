import type { IconName } from "@/components/icon";

// Secciones del hub de la pareja (menú lateral, barra móvil y página «Más»).
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
