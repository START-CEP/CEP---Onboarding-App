import type { Metadata } from "next";
import { ResetForm } from "@/components/account-forms";

export const metadata: Metadata = { title: "Recuperar acceso · CEP" };

export default function ResetPage() {
  return (
    <div className="app">
      <div className="login">
        <div className="lbox">
          <div className="art">
            <div>
              <p className="eyebrow" style={{ color: "#F6C35B" }}>Su ruta de pareja</p>
              <h2>Volvamos a abrir tu espacio.</h2>
            </div>
          </div>
          <ResetForm />
        </div>
      </div>
    </div>
  );
}
