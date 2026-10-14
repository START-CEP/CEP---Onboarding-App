import Link from "next/link";
import { Suspense } from "react";
import { FormBuilder } from "@/components/form-builder";
import { getStaff } from "@/lib/data/staff";
import { parseSchema } from "@/lib/forms";
import { fmtDay } from "@/lib/process";
import { createClient } from "@/lib/supabase/server";

export default function FormPage({ params }: PageProps<"/equipo/formularios/[id]">) {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Form params={params} />
    </Suspense>
  );
}

async function Form({ params }: { params: PageProps<"/equipo/formularios/[id]">["params"] }) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff?.isAdmin) return <section className="card empty">Solo un admin puede editar formularios.</section>;
  const supabase = await createClient();
  const [{ data: form }, { data: versions }] = await Promise.all([
    supabase.from("forms").select("id, name, kind").eq("id", id).maybeSingle(),
    supabase.from("form_versions").select("id, version, schema, published_at").eq("form_id", id).order("version", { ascending: false }),
  ]);
  if (!form) return <section className="card empty">No encontramos este formulario.</section>;
  const last = versions?.[0];
  const { data: uses } = await supabase.from("service_activities")
    .select("id, key, title, form_version_id, version_id, service_versions(version, status, services(name))")
    .in("form_version_id", (versions ?? []).map((v) => v.id));
  const versionOf = (vid: string | null) => versions?.find((v) => v.id === vid)?.version;
  const live = (uses ?? []).filter((u) => u.service_versions?.status !== "retired");

  return (
    <>
      <p><Link className="small muted" href="/equipo/formularios">← Formularios</Link></p>
      <FormBuilder key={last?.id ?? "nuevo"} formId={form.id} initial={{ name: form.name, kind: form.kind, sections: parseSchema(last?.schema) }} nextVersion={(last?.version ?? 0) + 1} />
      <div className="grid2e">
        <section className="card">
          <div className="ch"><h2>Dónde se usa</h2></div>
          {live.length === 0 ? <p className="muted">Ninguna actividad usa este formulario todavía. Elígelo en una actividad de un servicio (en un borrador).</p> : (
            <div className="list">
              {live.map((u) => {
                const v = versionOf(u.form_version_id);
                const old = last && v !== last.version;
                return (
                  <Link className="li" key={u.id} href={`/equipo/servicios/${u.version_id}#actividades`}>
                    <div className="tx">
                      <b>{u.service_versions?.services?.name} · versión {u.service_versions?.version} ({u.service_versions?.status === "draft" ? "borrador" : "publicada"})</b>
                      <span>Actividad {u.key} · {u.title} · usa la versión {v} del formulario</span>
                    </div>
                    {old && <span className="chip warn">Hay una versión más nueva</span>}
                  </Link>
                );
              })}
            </div>
          )}
          <p className="small muted" style={{ marginTop: 12 }}>Para que un servicio use la versión nueva: abre un borrador del servicio, edita la actividad y elige la versión más reciente.</p>
        </section>
        <section className="card">
          <div className="ch"><h2>Historial</h2><span className="muted small">{versions?.length ?? 0} versiones</span></div>
          <div className="list">
            {(versions ?? []).map((v) => (
              <div className="li" key={v.id}>
                <div className="tx">
                  <b>Versión {v.version}</b>
                  <span>{v.published_at ? `Publicada el ${fmtDay(v.published_at)}` : "Sin publicar"} · {parseSchema(v.schema).reduce((n, s) => n + (s.questions?.length ?? 0), 0)} preguntas</span>
                </div>
                {v.id === last?.id && <span className="chip ok">La más reciente</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
