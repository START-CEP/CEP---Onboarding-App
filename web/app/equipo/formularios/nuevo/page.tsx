import Link from "next/link";
import { Suspense } from "react";
import { FormBuilder } from "@/components/form-builder";
import { getStaff } from "@/lib/data/staff";

export default function NewFormPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <NewForm />
    </Suspense>
  );
}

async function NewForm() {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <section className="card empty">Solo un admin puede crear formularios.</section>;
  return (
    <>
      <p><Link className="small muted" href="/equipo/formularios">← Formularios</Link></p>
      <FormBuilder formId={null} initial={{ name: "", kind: "homework", sections: [] }} nextVersion={1} />
    </>
  );
}
