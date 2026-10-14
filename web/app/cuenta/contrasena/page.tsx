import type { Metadata } from "next";
import { PasswordForm } from "@/components/account-forms";

export const metadata: Metadata = { title: "Tu contraseña · CEP" };

export default function PasswordPage() {
  return (
    <div className="app">
      <div className="login">
        <div className="lbox">
          <div className="art">
            <div>
              <p className="eyebrow" style={{ color: "#F6C35B" }}>Bienvenida</p>
              <h2>Un último paso y entras a tu proceso.</h2>
            </div>
          </div>
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
