import type { Metadata } from "next";
import { Suspense } from "react";
import { Questionnaires } from "@/components/questionnaires";

export const metadata: Metadata = { title: "Radiografía Inicial · CEP" };

export default function IntakePage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Questionnaires onboarding={false} />
    </Suspense>
  );
}
