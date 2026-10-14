import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { ActivityEditor } from "@/components/activity-editor";
import { ContractForm } from "@/components/contract-form";
import { Icon } from "@/components/icon";
import {
  addRequirement, addStep, cloneVersion, deleteDraft, deleteRow, duplicateAsNewService,
  moveStep, publishVersion, saveBlock, saveTrack, updateStep, updateVersion,
} from "@/lib/actions/catalog";
import { ACTIVITY_TYPES } from "@/lib/activity-types";
import { fmtDay } from "@/lib/process";
import { getStaff } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Activity = Database["public"]["Tables"]["service_activities"]["Row"];

export default function VersionPage({ params }: PageProps<"/equipo/servicios/[id]">) {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Version params={params} />
    </Suspense>
  );
}

const CRITERIA = [["viewed", "Vio el video / lo completó"], ["task_submitted", "Entregó la tarea"], ["form_submitted", "Envió el cuestionario"],
  ["signed", "Firmó"], ["attended", "Asistió a la sesión"], ["completed", "Completado"], ["staff_confirmed", "Confirmado por el equipo"]] as const;
const typeName = (t: Activity["type"]) => ACTIVITY_TYPES.find((x) => x[0] === t)?.[1] ?? t;

async function Version({ params }: { params: PageProps<"/equipo/servicios/[id]">["params"] }) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff?.isAdmin) return <section className="card empty">Solo un admin puede editar servicios.</section>;
  const supabase = await createClient();
  const { data: version } = await supabase.from("service_versions")
    .select("id, version, status, expected_duration_days, access_days, welcome_activity_id, notes, service_id, services(name, unit_kind)")
    .eq("id", id).maybeSingle();
  if (!version) return <section className="card empty">No encontramos esta versión.</section>;

  const [blocks, tracks, acts, steps, reqs, roles, assetsList, forms, contracts] = await Promise.all([
    supabase.from("service_blocks").select("*").eq("version_id", id).order("position"),
    supabase.from("service_tracks").select("*").eq("version_id", id).order("position"),
    supabase.from("service_activities").select("*").eq("version_id", id).order("position"),
    supabase.from("service_steps").select("*").eq("version_id", id).order("position"),
    supabase.from("service_requirements").select("*").eq("version_id", id),
    supabase.from("care_roles").select("id, name"),
    supabase.from("content_assets").select("id, kind, title").is("archived_at", null).order("title"),
    supabase.from("form_versions").select("id, version, form_id, forms(name, archived_at)").order("version", { ascending: false }),
    supabase.from("contract_templates").select("id, version, title, published_at").eq("service_id", version.service_id).order("version", { ascending: false }),
  ]);
  const draft = version.status === "draft";
  const A = acts.data ?? [];
  const actLabel = (aid: string | null) => { const a = A.find((x) => x.id === aid); return a ? `${a.key} · ${a.title}` : "—"; };

  const formGroups = [...new Map((forms.data ?? []).map((f) => [f.form_id, f])).values()]
    .filter((f) => !f.forms?.archived_at || A.some((a) => (forms.data ?? []).some((v) => v.form_id === f.form_id && v.id === a.form_version_id)))
    .map((f) => ({ formId: f.form_id, name: f.forms?.name ?? "Formulario", versions: (forms.data ?? []).filter((v) => v.form_id === f.form_id).map((v) => ({ id: v.id, version: v.version })) }));
  const formName = (vid: string | null) => { const f = (forms.data ?? []).find((v) => v.id === vid); return f ? `${f.forms?.name} v${f.version}` : null; };
  const assetName = (aid: string | null) => (assetsList.data ?? []).find((x) => x.id === aid)?.title ?? null;
  const contractName = (cid: string | null) => { const c = (contracts.data ?? []).find((x) => x.id === cid); return c ? `${c.title} v${c.version}` : null; };
  const editorProps = {
    versionId: id,
    tracks: (tracks.data ?? []).map((t) => ({ id: t.id, name: t.name })),
    roles: roles.data ?? [],
    assets: assetsList.data ?? [],
    forms: formGroups,
    contracts: contracts.data ?? [],
    nextPosition: ((A.at(-1)?.position ?? 0) + 10),
  };
  const stepOf = (aid: string) => (steps.data ?? []).filter((st) => st.activity_id === aid).map((st) => st.position);

  return (
    <>
      <p><Link className="small muted" href="/equipo/servicios">← Servicios</Link></p>
      <div className="ph">
        <div>
          <p className="eyebrow">{version.services?.name}</p>
          <h1>Versión {version.version} · {draft ? "Borrador" : version.status === "published" ? "Publicada" : "Retirada"}</h1>
          <p className="lead">{draft
            ? "Estás editando un borrador. Cuando esté listo, publícalo: se valida y las inscripciones nuevas usarán esta versión."
            : "Una versión publicada no se edita. Crea un borrador a partir de ella para hacer cambios."}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {draft ? (
            <>
              <ActionForm action={publishVersion} inline><input type="hidden" name="version" value={id} /><button className="btn"><Icon name="check" size={15} /> Publicar</button></ActionForm>
              <ActionForm action={deleteDraft} inline><input type="hidden" name="version" value={id} /><button className="btn ghost">Borrar borrador</button></ActionForm>
            </>
          ) : (
            <form action={cloneVersion.bind(null, id)}><button className="btn"><Icon name="pen" size={15} /> Crear borrador para editar</button></form>
          )}
        </div>
      </div>

      <nav className="subnav" aria-label="Secciones del servicio">
        <a href="#datos">Datos</a><a href="#estructura">Bloques y áreas</a><a href="#actividades">Actividades ({A.length})</a>
        <a href="#camino">El camino ({(steps.data ?? []).length})</a><a href="#formularios">Formularios y contratos</a>
      </nav>

      {!draft && (
        <section className="card">
          <div className="ch"><h3>Duplicar como servicio nuevo</h3></div>
          <ActionForm action={duplicateAsNewService} inline>
            <input type="hidden" name="version" value={id} />
            <input className="input" style={{ maxWidth: 320 }} name="name" placeholder="Nombre del servicio nuevo" required />
            <button className="btn ghost sm">Duplicar</button>
          </ActionForm>
        </section>
      )}

      <section className="card anchor" id="datos">
        <div className="ch"><h2>Datos de la versión</h2></div>
        <ActionForm action={updateVersion}>
          <input type="hidden" name="version" value={id} />
          <div className="grid2e">
            <div className="field"><label htmlFor="v-dur">Duración esperada (días)</label><input id="v-dur" className="input" name="duration" type="number" min={1} defaultValue={version.expected_duration_days ?? ""} disabled={!draft} /><span className="hint">Cuánto suele durar el proceso completo</span></div>
            <div className="field"><label htmlFor="v-acc">Acceso a la app (días)</label><input id="v-acc" className="input" name="access" type="number" min={1} defaultValue={version.access_days ?? ""} disabled={!draft} /><span className="hint">Desde la inscripción; luego el acceso se cierra</span></div>
            <div className="field"><label>Video de bienvenida</label>
              <select className="input" name="welcome" defaultValue={version.welcome_activity_id ?? ""} disabled={!draft}>
                <option value="">—</option>{A.filter((a) => a.type === "video_module").map((a) => <option key={a.id} value={a.id}>{a.key} · {a.title}</option>)}
              </select>
            </div>
            <div className="field"><label>Notas</label><input className="input" name="notes" defaultValue={version.notes ?? ""} disabled={!draft} /></div>
          </div>
          {draft && <button className="btn sm" style={{ alignSelf: "flex-start" }}>Guardar datos</button>}
        </ActionForm>
      </section>

      <section className="card anchor" id="estructura">
        <div className="ch"><h2>Bloques y áreas</h2><span className="muted small">Los bloques agrupan los pasos del camino; las áreas son las filas del cuadro de la pareja</span></div>
        <div className="grid2e">
          {([["Bloques del camino", blocks.data ?? [], saveBlock, "service_blocks"], ["Áreas", tracks.data ?? [], saveTrack, "service_tracks"]] as const).map(([title, rows, save, table]) => (
            <div key={table} className="qblock" style={{ gap: 10 }}>
              <h3>{title}</h3>
              <div className="list">
                {rows.map((r, i) => (
                  <div className="li" key={r.id} style={{ padding: "8px 0", gap: 8 }}>
                    <span className="num small muted" style={{ width: 18 }}>{i + 1}</span>
                    {draft ? (
                      <>
                        <ActionForm action={save} inline style={{ flex: 1 }} className="miniform">
                          <input type="hidden" name="version" value={id} /><input type="hidden" name="id" value={r.id} />
                          <input className="input" style={{ flex: 1, minWidth: 140 }} name="name" defaultValue={r.name} aria-label="Nombre" required />
                          <button className="btn ghost sm">Guardar</button>
                        </ActionForm>
                        <ActionForm action={deleteRow} inline><input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="version" value={id} /><button className="btn ghost sm" aria-label={`Borrar ${r.name}`}>×</button></ActionForm>
                      </>
                    ) : <div className="tx"><b>{r.name}</b></div>}
                  </div>
                ))}
              </div>
              {draft && (
                <ActionForm action={save} inline className="miniform">
                  <input type="hidden" name="version" value={id} />
                  <input className="input" style={{ flex: 1, minWidth: 140 }} name="name" placeholder={table === "service_blocks" ? "Nuevo bloque" : "Nueva área"} required aria-label="Nombre nuevo" />
                  <button className="btn soft sm">Añadir</button>
                </ActionForm>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card anchor" id="actividades">
        <div className="ch"><h2>Actividades</h2><span className="muted small">Todo lo que la pareja o el equipo hace. Luego las ordenas en «El camino».</span></div>
        {A.length === 0 && <p className="muted" style={{ marginBottom: 12 }}>Aún no hay actividades. Crea la primera abajo.</p>}
        <div className="list">
          {A.map((a) => {
            const locks = (reqs.data ?? []).filter((r) => r.target_activity_id === a.id);
            const lockBlock = (
              <div style={{ margin: "10px 0" }}>
                <div className="reqs">
                  <span className="small" style={{ fontWeight: 700 }}>Se abre cuando:</span>
                  {locks.length === 0 && <span className="small muted">siempre disponible (se puede adelantar)</span>}
                  {locks.map((r) => (
                    <span key={r.id} className="req" style={{ gap: 8 }}>
                      {r.label ?? actLabel(r.required_activity_id)} · {CRITERIA.find((c) => c[0] === r.criterion)?.[1]}
                      {draft && (
                        <ActionForm action={deleteRow} inline className="" style={{ display: "inline" }}>
                          <input type="hidden" name="table" value="service_requirements" /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="version" value={id} />
                          <button className="btn ghost sm" style={{ padding: "0 6px" }} aria-label="Quitar candado">×</button>
                        </ActionForm>
                      )}
                    </span>
                  ))}
                </div>
                {draft && (
                  <ActionForm action={addRequirement} style={{ marginTop: 8 }}>
                    <input type="hidden" name="version" value={id} /><input type="hidden" name="target_activity" value={a.id} />
                    <div className="ae-grid">
                      <div className="field"><label>Bloquear hasta que…</label><select className="input" name="criterion">{CRITERIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                      <div className="field"><label>…en la actividad</label><select className="input" name="required">{A.filter((x) => x.id !== a.id).map((x) => <option key={x.id} value={x.id}>{x.key} · {x.title}</option>)}</select></div>
                      <div className="field wide"><label>Texto para la pareja (opcional)</label><input className="input" name="label" placeholder="Ej.: Ver primero el Módulo 3" /></div>
                    </div>
                    <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Añadir candado</button>
                  </ActionForm>
                )}
              </div>
            );
            const links = [assetName(a.asset_id), formName(a.form_version_id), contractName(a.contract_template_id)].filter(Boolean);
            const inSteps = stepOf(a.id);
            return (
              <details className="actrow" key={a.id}>
                <summary>
                  <span className="k">{a.key}</span>
                  <span className="t">{a.title}</span>
                  <span className="typechip">{typeName(a.type)}</span>
                  {links.map((l) => <span key={l} className="chip info" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>{l}</span>)}
                  {inSteps.length > 0 ? <span className="small muted">paso {inSteps.join(", ")}</span> : <span className="small muted">sin paso</span>}
                </summary>
                {lockBlock}
                {draft ? (
                  <>
                    <ActivityEditor {...editorProps} activity={a} />
                    <ActionForm action={deleteRow} inline style={{ marginTop: 8 }}><input type="hidden" name="table" value="service_activities" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="version" value={id} /><button className="btn ghost sm fb-danger">Borrar actividad</button></ActionForm>
                  </>
                ) : <p className="small muted">{a.summary ?? "Sin resumen."}</p>}
              </details>
            );
          })}
        </div>
        {draft && (
          <details style={{ marginTop: 14 }}>
            <summary className="btn sm" style={{ display: "inline-flex", cursor: "pointer", listStyle: "none" }}>+ Nueva actividad</summary>
            <div style={{ marginTop: 12 }}><ActivityEditor {...editorProps} /></div>
          </details>
        )}
      </section>

      <section className="card anchor" id="camino">
        <div className="ch"><h2>El camino</h2><span className="muted small">{(steps.data ?? []).length} pasos · cada uno con su requisito para entrar</span></div>
        <div className="list">
          {(steps.data ?? []).map((st) => {
            const own = (reqs.data ?? []).filter((r) => r.target_step_id === st.id);
            return (
              <div className="li" key={st.id} style={{ display: "block" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b className="num" style={{ width: 28 }}>{st.position}</b>
                  <div className="tx" style={{ flex: 1 }}>
                    <b>{st.title}</b>
                    <span>{(blocks.data ?? []).find((b) => b.id === st.block_id)?.name ?? "Sin bloque"} · actividad {actLabel(st.activity_id)}</span>
                  </div>
                  {draft && (
                    <>
                      <ActionForm action={moveStep} inline><input type="hidden" name="version" value={id} /><input type="hidden" name="id" value={st.id} /><input type="hidden" name="dir" value="up" /><button className="btn ghost sm" aria-label="Subir">↑</button></ActionForm>
                      <ActionForm action={moveStep} inline><input type="hidden" name="version" value={id} /><input type="hidden" name="id" value={st.id} /><input type="hidden" name="dir" value="down" /><button className="btn ghost sm" aria-label="Bajar">↓</button></ActionForm>
                      <ActionForm action={deleteRow} inline><input type="hidden" name="table" value="service_steps" /><input type="hidden" name="id" value={st.id} /><input type="hidden" name="version" value={id} /><button className="btn ghost sm">Borrar</button></ActionForm>
                    </>
                  )}
                </div>
                <div className="reqs" style={{ margin: "8px 0 0 36px" }}>
                  {own.length === 0 && <span className="small muted">Sin requisito para entrar</span>}
                  {own.map((r) => (
                    <span key={r.id} className="req" style={{ gap: 8 }}>
                      {r.label ?? actLabel(r.required_activity_id)} · {CRITERIA.find((c) => c[0] === r.criterion)?.[1]}{r.is_mandatory ? "" : " · opcional"}{r.enforcement === "reminds" ? " · solo recuerda" : ""}
                      {draft && (
                        <ActionForm action={deleteRow} inline className="" style={{ display: "inline" }}>
                          <input type="hidden" name="table" value="service_requirements" /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="version" value={id} />
                          <button className="btn ghost sm" style={{ padding: "0 6px" }} aria-label="Quitar requisito">×</button>
                        </ActionForm>
                      )}
                    </span>
                  ))}
                </div>
                {draft && (
                  <details style={{ margin: "8px 0 0 36px" }}>
                    <summary className="small" style={{ cursor: "pointer" }}>Editar paso o añadir requisito</summary>
                    <ActionForm action={updateStep} style={{ marginTop: 8 }}>
                      <input type="hidden" name="id" value={st.id} />
                      <div className="ae-grid">
                        <div className="field"><label>Título del paso</label><input className="input" name="title" defaultValue={st.title} /></div>
                        <div className="field"><label>Actividad principal</label><select className="input" name="activity" defaultValue={st.activity_id}>{A.map((a) => <option key={a.id} value={a.id}>{a.key} · {a.title}</option>)}</select></div>
                        <div className="field"><label>Bloque</label><select className="input" name="block" defaultValue={st.block_id ?? ""}><option value="">Sin bloque</option>{(blocks.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                        <div className="field wide"><label>Qué pasa</label><input className="input" name="description" defaultValue={st.description ?? ""} /></div>
                      </div>
                      <button className="btn ghost sm" style={{ alignSelf: "flex-start" }}>Guardar paso</button>
                    </ActionForm>
                    <ActionForm action={addRequirement} style={{ marginTop: 14 }}>
                      <input type="hidden" name="version" value={id} /><input type="hidden" name="step" value={st.id} />
                      <h3 style={{ fontSize: 14 }}>Nuevo requisito para entrar a este paso</h3>
                      <div className="ae-grid">
                        <div className="field"><label>Antes hay que…</label><select className="input" name="criterion">{CRITERIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                        <div className="field"><label>…en la actividad</label><select className="input" name="required">{A.map((a) => <option key={a.id} value={a.id}>{a.key} · {a.title}</option>)}</select></div>
                        <div className="field"><label>Si no se cumple</label><select className="input" name="enforcement"><option value="blocks">Bloquea el paso</option><option value="reminds">Solo recuerda</option></select></div>
                        <div className="field"><label>¿Obligatorio?</label><select className="input" name="mandatory"><option value="yes">Obligatorio</option><option value="no">Opcional</option></select></div>
                        <div className="field wide"><label>Texto para la pareja (opcional)</label><input className="input" name="label" placeholder="Ej.: Ver el video de bienvenida" /></div>
                      </div>
                      <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Añadir requisito</button>
                    </ActionForm>
                  </details>
                )}
              </div>
            );
          })}
        </div>
        {draft && A.length > 0 && (
          <ActionForm action={addStep} style={{ marginTop: 14 }}>
            <input type="hidden" name="version" value={id} />
            <h3>Añadir paso al final</h3>
            <div className="ae-grid">
              <div className="field"><label>Título del paso</label><input className="input" name="title" required /></div>
              <div className="field"><label>Actividad principal</label><select className="input" name="activity">{A.map((a) => <option key={a.id} value={a.id}>{a.key} · {a.title}</option>)}</select></div>
              <div className="field"><label>Bloque</label><select className="input" name="block"><option value="">Sin bloque</option>{(blocks.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div className="field wide"><label>Qué pasa</label><input className="input" name="description" /></div>
            </div>
            <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Añadir paso</button>
          </ActionForm>
        )}
      </section>

      <div className="grid2e anchor" id="formularios">
        <section className="card">
          <div className="ch"><h2>Formularios</h2><Link className="btn soft sm" href="/equipo/formularios/nuevo">+ Crear formulario</Link></div>
          <p className="muted small" style={{ marginBottom: 12 }}>Los cuestionarios y tareas se construyen en la sección <Link href="/equipo/formularios" style={{ textDecoration: "underline" }}>Formularios</Link>, pregunta por pregunta. Luego se eligen en la actividad.</p>
          <div className="list">
            {A.filter((a) => a.form_version_id).map((a) => {
              const fv = (forms.data ?? []).find((v) => v.id === a.form_version_id);
              const newest = (forms.data ?? []).find((v) => v.form_id === fv?.form_id);
              return (
                <Link className="li" key={a.id} href={fv ? `/equipo/formularios/${fv.form_id}` : "/equipo/formularios"}>
                  <div className="tx"><b>{fv?.forms?.name ?? "Formulario"} · v{fv?.version}</b><span>Actividad {a.key} · {a.title}</span></div>
                  {newest && fv && newest.version > fv.version && <span className="chip warn">Hay v{newest.version}</span>}
                  <span className="btn ghost sm">Abrir</span>
                </Link>
              );
            })}
            {!A.some((a) => a.form_version_id) && <p className="muted small">Ninguna actividad de esta versión usa formularios.</p>}
          </div>
        </section>
        <section className="card">
          <div className="ch"><h2>Contratos</h2></div>
          {(contracts.data ?? []).length > 0 && (
            <div className="list" style={{ marginBottom: 14 }}>
              {(contracts.data ?? []).map((c) => (
                <div className="li" key={c.id}><div className="tx"><b>{c.title} · v{c.version}</b><span>{c.published_at ? `Publicado el ${fmtDay(c.published_at)}` : "Sin publicar"}</span></div></div>
              ))}
            </div>
          )}
          <details>
            <summary className="btn soft sm" style={{ display: "inline-flex", cursor: "pointer", listStyle: "none" }}>+ Nuevo contrato</summary>
            <div style={{ marginTop: 12 }}><ContractForm serviceId={version.service_id} /></div>
          </details>
        </section>
      </div>
    </>
  );
}
