"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Destino de los enlaces de invitación y de recuperación de contraseña.
 * Admite los dos formatos de Supabase: tokens en el fragmento (#access_token) o ?code= (PKCE).
 */
export default function AcceptPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const next = url.searchParams.get("next") || "/cuenta/contrasena";
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = url.searchParams.get("code");

    (async () => {
      if (hash.get("error_description")) {
        setError(hash.get("error_description")!.replace(/\+/g, " "));
        return;
      }
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const { error: e } = access_token && refresh_token
        ? await supabase.auth.setSession({ access_token, refresh_token })
        : code
          ? await supabase.auth.exchangeCodeForSession(code)
          : { error: new Error("missing") };
      if (e) {
        setError("El enlace no es válido o ya caducó. Pide uno nuevo al equipo o recupera tu contraseña.");
        return;
      }
      router.replace(next);
    })();
  }, [router]);

  return (
    <div className="app">
      <div className="login">
        <div className="card" style={{ maxWidth: 480, textAlign: "center" }}>
          {error ? (
            <>
              <h2>No pudimos abrir tu acceso</h2>
              <p className="muted" style={{ marginTop: 8 }}>{error}</p>
              <p style={{ marginTop: 16 }}><a className="btn" href="/recuperar">Recuperar contraseña</a></p>
            </>
          ) : (
            <>
              <h2>Preparando tu espacio…</h2>
              <p className="muted" style={{ marginTop: 8 }}>Un momento, estamos confirmando tu acceso.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
