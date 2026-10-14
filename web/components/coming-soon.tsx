import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";

// Pantallas del menú que se construyen en las siguientes iteraciones (diseño ya aprobado en la maqueta).
export function ComingSoon({ title, icon, what }: { title: string; icon: IconName; what: string }) {
  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Próximamente</p>
          <h1>{title}</h1>
          <p className="lead">{what}</p>
        </div>
      </div>
      <section className="card empty">
        <span className="ico info" style={{ margin: "0 auto 12px" }}><Icon name={icon} /></span>
        <p>Esta sección llega en la siguiente iteración.</p>
        <p style={{ marginTop: 12 }}><Link className="btn soft sm" href="/">Volver a El proceso</Link></p>
      </section>
    </>
  );
}
