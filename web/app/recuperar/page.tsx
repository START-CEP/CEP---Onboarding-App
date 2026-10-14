import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/account-forms";

export const metadata: Metadata = { title: "Recuperar acceso · Creciendo en pareja" };

export default function ResetPage() {
  return (
    <AuthShell eyebrow="Recuperar acceso" title="Volvamos a abrir tu espacio."
      text="Le pasa a cualquiera. En un par de minutos tendrás una contraseña nueva.">
      <ResetForm />
    </AuthShell>
  );
}
