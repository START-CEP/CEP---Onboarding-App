import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Bienvenida · CEP" };

export default function Page() {
  return <ComingSoon title="Bienvenida" icon="play" what="Video de bienvenida y los primeros pasos del onboarding." />;
}
