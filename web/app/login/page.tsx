import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · CEP" };

export default function LoginPage() {
  return (
    <div className="app">
      <div className="login">
        <div className="lbox">
          <div className="art">
            <div>
              <p className="eyebrow" style={{ color: "#F6C35B" }}>Su ruta de pareja</p>
              <h2>Siempre sabrán dónde están y qué sigue.</h2>
            </div>
            <svg viewBox="0 0 300 90" style={{ width: "100%", maxWidth: 340 }} aria-hidden="true">
              <path d="M10 70 C70 70 70 20 130 20 S190 70 250 50 S290 20 295 20" fill="none" stroke="#43D3C7"
                strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" />
              <circle cx="10" cy="70" r="7" fill="#43D3C7" />
              <circle cx="130" cy="20" r="7" fill="#F6C35B" />
              <circle cx="250" cy="50" r="7" fill="#0E1A3A" stroke="#8E9AC0" strokeWidth="3" />
            </svg>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
