import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { createService } from "@/lib/actions/catalog";
import { getStaff } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import { fmtDay } from "@/lib/process";

export default function ServicesPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Services />
    </Suspense>
  );
}

const STATUS = { draft: { t: "Borrador", c: "warn" }, published: { t: "Publicada", c: "ok" }, retired: { t: "Retirada", c: "" } } as const;

async function Services() {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <section className="card empty">Solo un admin puede gestionar servicios.</section>;
  const supabase = await createClient();
  const [{ data: services }, { data: versions }, { data: enrollments }] = await Promise.all([
    supabase.from("services").select("id, name, slug, unit_kind, price_cents, currency, status").is("archived_at", null).order("created_at"),
    supabase.from("service_versions").select("id, service_id, version, status, published_at, created_at").order("version", { ascending: false }),
    supabase.from("enrollments").select("service_version_id, status"),
  ]);

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Servicios</h1>
          <p className="lead">Cada servicio tiene versiones. Para cambiar uno, crea un borrador desde la versión publicada, edítalo y publícalo: las parejas en curso siguen con su versión.</p>
        </div>
      </div>
      {(services ?? []).map((svc) => {
        const list = (versions ?? []).filter((v) => v.service_id === svc.id);
        return (
          <section className="card" key={svc.id}>
            <div className="ch">
              <div>
                <h2>{svc.name}</h2>
                <p className="muted small">{svc.unit_kind === "couple" ? "Pareja" : svc.unit_kind === "individual" ? "Individual" : "Grupo"} · {(svc.price_cents / 100).toLocaleString("es")} {svc.currency}</p>
              </div>
            </div>
            <div className="list">
              {list.map((v) => {
                const active = (enrollments ?? []).filter((e) => e.service_version_id === v.id && e.status === "active").length;
                const st = STATUS[v.status];
                return (
                  <Link className="li" key={v.id} href={`/equipo/servicios/${v.id}`}>
                    <span className={`chip ${st.c}`}>{st.t}</span>
                    <div className="tx">
                      <b>Versión {v.version}</b>
                      <span>{v.published_at ? `Publicada el ${fmtDay(v.published_at)}` : `Creada el ${fmtDay(v.created_at)}`} · {active} proceso{active === 1 ? "" : "s"} activo{active === 1 ? "" : "s"}</span>
                    </div>
                    <span className="btn ghost sm">{v.status === "draft" ? "Editar" : "Ver"}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
      <section className="card">
        <div className="ch"><h2>Crear un servicio nuevo</h2></div>
        <ActionForm action={createService}>
          <div className="grid2e">
            <div className="field"><label htmlFor="name">Nombre</label><input className="input" id="name" name="name" required /></div>
            <div className="field"><label htmlFor="unit_kind">Para</label>
              <select className="input" id="unit_kind" name="unit_kind"><option value="couple">Pareja</option><option value="individual">Individual</option><option value="group">Grupo</option></select>
            </div>
            <div className="field"><label htmlFor="price">Precio</label><input className="input" id="price" name="price" type="number" min="0" step="1" /></div>
            <div className="field"><label htmlFor="currency">Moneda</label><input className="input" id="currency" name="currency" defaultValue="USD" /></div>
            <div className="field"><label htmlFor="duration">Duración esperada (días)</label><input className="input" id="duration" name="duration" type="number" min="1" /></div>
            <div className="field"><label htmlFor="access">Acceso a la app (días)</label><input className="input" id="access" name="access" type="number" min="1" /></div>
          </div>
          <div className="field"><label htmlFor="description">Descripción</label><input className="input" id="description" name="description" /></div>
          <button className="btn" style={{ alignSelf: "flex-start" }}>Crear y abrir el editor</button>
          <p className="small muted">También puedes duplicar un servicio existente desde su versión publicada.</p>
        </ActionForm>
      </section>
    </>
  );
}
