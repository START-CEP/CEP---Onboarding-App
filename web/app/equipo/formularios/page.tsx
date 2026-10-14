import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { getStaff } from "@/lib/data/staff";
import { FORM_KINDS, parseSchema } from "@/lib/forms";
import { fmtDay } from "@/lib/process";
import { createClient } from "@/lib/supabase/server";

export default function FormsPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Forms />
    </Suspense>
  );
}

async function Forms() {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <section className="card empty">Solo un admin puede gestionar formularios.</section>;
  const supabase = await createClient();
  const [{ data: forms }, { data: versions }, { data: uses }] = await Promise.all([
    supabase.from("forms").select("id, key, name, kind, archived_at, created_at").order("created_at", { ascending: false }),
    supabase.from("form_versions").select("id, form_id, version, schema, published_at").order("version", { ascending: false }),
    supabase.from("service_activities").select("form_version_id, service_versions(status)").not("form_version_id", "is", null),
  ]);
  const kindName = (k: string) => FORM_KINDS.find(([v]) => v === k)?.[1] ?? k;
  const active = (forms ?? []).filter((f) => !f.archived_at);

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Formularios</h1>
          <p className="lead">Cuestionarios y tareas que responden las parejas. Se construyen pregunta por pregunta; cada vez que publicas se crea una versión nueva y las parejas en curso no ven el cambio.</p>
        </div>
        <Link className="btn" href="/equipo/formularios/nuevo"><Icon name="pen" size={15} /> Nuevo formulario</Link>
      </div>
      <section className="card">
        {active.length === 0 ? <p className="empty">Todavía no hay formularios.</p> : (
          <div className="list">
            {active.map((f) => {
              const vs = (versions ?? []).filter((v) => v.form_id === f.id);
              const last = vs[0];
              const questions = parseSchema(last?.schema).reduce((n, s) => n + (s.questions?.length ?? 0), 0);
              const inUse = (uses ?? []).filter((u) => vs.some((v) => v.id === u.form_version_id) && u.service_versions?.status !== "retired").length;
              return (
                <Link className="li" key={f.id} href={`/equipo/formularios/${f.id}`}>
                  <span className="ico info"><Icon name="pen" size={17} /></span>
                  <div className="tx">
                    <b>{f.name}</b>
                    <span>{kindName(f.kind)} · {questions} pregunta{questions === 1 ? "" : "s"} · versión {last?.version ?? "—"}{last?.published_at ? ` del ${fmtDay(last.published_at)}` : ""}</span>
                  </div>
                  {inUse > 0 ? <span className="chip ok">En {inUse} actividad{inUse === 1 ? "" : "es"}</span> : <span className="chip">Sin usar</span>}
                  <span className="btn ghost sm">Editar</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
