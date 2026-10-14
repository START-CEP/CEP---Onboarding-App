import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { PasswordForm } from "@/components/account-forms";

export const metadata: Metadata = { title: "Tu contraseña · Creciendo en pareja" };

export default function PasswordPage() {
  return (
    <AuthShell eyebrow="Bienvenida" title="Un último paso y entras a tu proceso."
      text="Crea tu contraseña personal. Con ella entrarás siempre a tu espacio.">
      <PasswordForm />
    </AuthShell>
  );
}
