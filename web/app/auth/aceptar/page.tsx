"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Solo rutas internas: evita redirecciones abiertas (//otro-sitio, https://…). */
function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/cuenta/contrasena";
  return raw;
}

function emailFromJwt(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

/**
 * Destino de los enlaces de invitación y de recuperación de contraseña.
 * - ?code= (PKCE): ligado al navegador que lo pidió, se canjea directamente.
 * - #access_token (invitación): se pide confirmación mostrando la cuenta, para que un enlace ajeno
 *   no pueda abrir una sesión en otra cuenta sin que la persona lo note (login CSRF).
 */
export default function AcceptPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<{ email: string; access: string; refresh: string; next: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const next = safeNext(url.searchParams.get("next"));
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = url.searchParams.get("code");
    // Quitar los tokens de la barra de direcciones y del historial.
    window.history.replaceState(null, "", url.pathname);

    (async () => {
      if (hash.get("error_description")) {
        setError(hash.get("error_description")!.replace(/\+/g, " "));
        return;
      }
      const access = hash.get("access_token");
      const refresh = hash.get("refresh_token");
      if (access && refresh) {
        const email = emailFromJwt(access);
        if (!email) return setError("El enlace no es válido.");
        setPending({ email, access, refresh, next });
        return;
      }
      if (code) {
        const { error: e } = await supabase.auth.exchangeCodeForSession(code);
        if (e) return setError("El enlace no es válido o ya caducó. Pide uno nuevo.");
        router.replace(next);
        return;
      }
      setError("El enlace está incompleto.");
    })();
  }, [router]);

  const confirm = async () => {
    if (!pending) return;
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    const { error: e } = await supabase.auth.setSession({ access_token: pending.access, refresh_token: pending.refresh });
    if (e) return setError("El enlace no es válido o ya caducó. Pide uno nuevo al equipo.");
    router.replace(pending.next);
  };

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
          ) : pending ? (
            <>
              <h2>Bienvenida a tu espacio</h2>
              <p className="muted" style={{ marginTop: 8 }}>Vas a entrar con la cuenta <b>{pending.email}</b>. Si no es tu correo, cierra esta página.</p>
              <p style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="btn" onClick={confirm}>Sí, es mi cuenta</button>
                <a className="btn ghost" href="/login">No soy yo</a>
              </p>
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
