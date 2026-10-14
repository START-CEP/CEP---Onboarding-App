"use client";

// Errores de una página: un mensaje fijo, sin detalles técnicos (quedan en los registros del servidor).
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 16 }}>
      <section className="card empty" style={{ maxWidth: 520, width: "100%" }}>
        <h1>Algo no salió bien</h1>
        <p>No pudimos cargar esta parte. Inténtalo de nuevo en un momento.</p>
        <button className="btn" type="button" onClick={() => reset()}>Reintentar</button>
      </section>
    </div>
  );
}
