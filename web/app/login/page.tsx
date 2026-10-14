import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Creciendo en pareja" };

export default function LoginPage() {
  return (
    <AuthShell eyebrow="Su ruta de pareja" title="¡Bienvenidos!"
      text="Este es su espacio. Aquí siempre sabrán dónde están en su proceso y qué sigue.">
      <LoginForm />
    </AuthShell>
  );
}
