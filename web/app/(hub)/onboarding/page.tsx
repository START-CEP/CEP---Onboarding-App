import type { Metadata } from "next";
import { Suspense } from "react";
import { Questionnaires } from "@/components/questionnaires";

export const metadata: Metadata = { title: "Formulario de onboarding · CEP" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Questionnaires onboarding />
    </Suspense>
  );
}
