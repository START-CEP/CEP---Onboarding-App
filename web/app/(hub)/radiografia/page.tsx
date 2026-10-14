import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Radiografía Inicial · CEP" };

export default function Page() {
  return <ComingSoon title="Radiografía Inicial" icon="pulse" what="El cuestionario de su punto de partida: una parte individual y otra en pareja." />;
}
