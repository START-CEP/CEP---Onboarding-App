import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Contrato · CEP" };

export default function Page() {
  return <ComingSoon title="Contrato" icon="pen" what="Qué firman y por qué, y la firma de cada uno." />;
}
