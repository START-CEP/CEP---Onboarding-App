import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Coaching Grupal · CEP" };

export default function Page() {
  return <ComingSoon title="Coaching Grupal" icon="users" what="Fechas, grabaciones, recursos para descargar y su pregunta para el próximo encuentro." />;
}
