import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Sesiones de Terapia · CEP" };

export default function Page() {
  return <ComingSoon title="Sesiones de Terapia" icon="heart" what="Sus sesiones, con quién son, qué se verá y cómo agendarlas." />;
}
