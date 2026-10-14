import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 16 }}>
      <section className="card empty" style={{ maxWidth: 520, width: "100%" }}>
        <h1>No encontramos esta página</h1>
        <p>Puede que el enlace esté incompleto o que ya no exista.</p>
        <Link className="btn" href="/">Volver al inicio</Link>
      </section>
    </div>
  );
}
