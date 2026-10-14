"use client";

// Error en el propio layout: reemplaza toda la página, así que trae su html y body.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <h1>Algo no salió bien</h1>
          <p>No pudimos cargar la app. Inténtalo de nuevo en un momento.</p>
          <button type="button" onClick={() => reset()}>Reintentar</button>
        </main>
      </body>
    </html>
  );
}
