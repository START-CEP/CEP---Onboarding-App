import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Módulos · CEP" };

export default function Page() {
  return <ComingSoon title="Módulos" icon="book" what="Los videos de cada módulo y sus tareas, en línea o en PDF." />;
}
