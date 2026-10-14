import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { Icon } from "@/components/icon";
import {
  addRequirement, addStep, cloneVersion, createContract, createForm, deleteDraft, deleteRow, duplicateAsNewService,
  moveStep, publishVersion, saveActivity, saveBlock, saveTrack, updateStep, updateVersion,
} from "@/lib/actions/catalog";
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

const TYPES: [Activity["type"], string][] = [
  ["video_module", "Video (módulo)"], ["homework", "Tarea"], ["form", "Cuestionario"], ["contract", "Contrato"],
  ["therapy_session", "Sesión de terapia"], ["group_session", "Coaching grupal"], ["staff_task", "Tarea del equipo"],
  ["external_link", "Enlace externo"], ["reading", "Lectura"], ["checklist", "Checklist"],
];
const CRITERIA = [["viewed", "Vio el video / lo completó"], ["task_submitted", "Entregó la tarea"], ["form_submitted", "Envió el cuestionario"],
  ["signed", "Firmó"], ["attended", "Asistió a la sesión"], ["completed", "Completado"], ["staff_confirmed", "Confirmado por el equipo"]] as const;
const PARTICIPANTS = [["all", "Toda la unidad"], ["each_member", "Cada miembro"], ["member_1", "Solo persona 1"], ["member_2", "Solo persona 2"]] as const;

const FORM_EXAMPLE = JSON.stringify({ sections: [{ key: "s1", title: "Sección", scope: "individual", questions: [
  { key: "q1", type: "textarea", label: "Pregunta abierta" }, { key: "q2", type: "scale", label: "Del 1 al 5", min: 1, max: 5 },
  { key: "q3", type: "single_choice", label: "Elige una", options: ["Sí", "No"] }] }] }, null, 2);

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
    supabase.from("form_versions").select("id, version, forms(name, kind)").order("created_at", { ascending: false }),
    supabase.from("contract_templates").select("id, version, title").eq("service_id", version.service_id).order("version", { ascending: false }),
  ]);
  const draft = version.status === "draft";
  const A = acts.data ?? [];
  const actLabel = (aid: string | null) => { const a = A.find((x) => x.id === aid); return a ? `${a.key} · ${a.title}` : "—"; };

  const activityFields = (a?: Activity) => (
    <>
      <input type="hidden" name="version" value={id} />
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid2e">
        <div className="field"><label>Clave (corta, única)</label><input className="input" name="key" defaultValue={a?.key} placeholder="S1, M3, RAD…" required /></div>
        <div className="field"><label>Tipo</label>
          <select className="input" name="type" defaultValue={a?.type ?? "video_module"}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Título</label><input className="input" name="title" defaultValue={a?.title} required /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Resumen / qué pasa</label><input className="input" name="summary" defaultValue={a?.summary ?? ""} /></div>
        <div className="field"><label>Área</label>
          <select className="input" name="track" defaultValue={a?.track_id ?? ""}><option value="">—</option>{(tracks.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </div>
        <div className="field"><label>Responsable</label>
          <select className="input" name="role" defaultValue={a?.responsible_role_id ?? ""}><option value="">—</option>{(roles.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </div>
        <div className="field"><label>Participan</label>
          <select className="input" name="participants" defaultValue={a?.participants ?? "all"}>{PARTICIPANTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className="field"><label>Respuestas</label>
          <select className="input" name="scope" defaultValue={a?.response_scope ?? "shared"}><option value="shared">Compartidas (en pareja)</option><option value="individual">Individuales (privadas)</option></select>
        </div>
        <div className="field"><label>Video / archivo</label>
          <select className="input" name="asset" defaultValue={a?.asset_id ?? ""}><option value="">—</option>{(assetsList.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.kind === "video" ? "🎬" : "📄"} {x.title}</option>)}</select>
        </div>
        <div className="field"><label>Formulario o tarea</label>
          <select className="input" name="form" defaultValue={a?.form_version_id ?? ""}><option value="">—</option>{(forms.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.forms?.name} (v{f.version})</option>)}</select>
        </div>
        <div className="field"><label>Contrato</label>
          <select className="input" name="contract" defaultValue={a?.contract_template_id ?? ""}><option value="">—</option>{(contracts.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.title} (v{c.version})</option>)}</select>
        </div>
        <div className="field"><label>Minutos estimados</label><input className="input" name="minutes" type="number" defaultValue={a?.estimated_minutes ?? ""} /></div>
        <div className="field"><label>Día sugerido (desde el inicio)</label><input className="input" name="offset" type="number" defaultValue={a?.suggested_offset_days ?? ""} /></div>
        <div className="field"><label>Ritmo: días desde la anterior</label><input className="input" name="gap" type="number" defaultValue={a?.suggested_gap_days ?? ""} /></div>
        <div className="field"><label>Orden</label><input className="input" name="position" type="number" defaultValue={a?.position ?? (A.length + 1) * 10} /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Configuración avanzada (JSON: checklist, url…)</label>
          <textarea className="input" name="config" defaultValue={a ? JSON.stringify(a.config ?? {}, null, 0) : ""} style={{ minHeight: 60, fontFamily: "monospace", fontSize: 12 }} />
        </div>
      </div>
    </>
  );

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

      <section className="card">
        <div className="ch"><h2>Datos de la versión</h2></div>
        <ActionForm action={updateVersion}>
          <input type="hidden" name="version" value={id} />
          <div className="grid2e">
            <div className="field"><label>Duración esperada (días)</label><input className="input" name="duration" type="number" defaultValue={version.expected_duration_days ?? ""} disabled={!draft} /></div>
            <div className="field"><label>Acceso a la app (días)</label><input className="input" name="access" type="number" defaultValue={version.access_days ?? ""} disabled={!draft} /></div>
            <div className="field"><label>Video de bienvenida</label>
              <select className="input" name="welcome" defaultValue={version.welcome_activity_id ?? ""} disabled={!draft}>
                <option value="">—</option>{A.filter((a) => a.type === "video_module").map((a) => <option key={a.id} value={a.id}>{a.key} · {a.title}</option>)}
              </select>
            </div>
            <div className="field"><label>Notas</label><input className="input" name="notes" defaultValue={version.notes ?? ""} disabled={!draft} /></div>
          </div>
          {draft && <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Guardar</button>}
        </ActionForm>
      </section>

      <div className="grid2e">
        {([["Bloques del camino", blocks.data ?? [], saveBlock, "service_blocks"], ["Áreas (filas del cuadro)", tracks.data ?? [], saveTrack, "service_tracks"]] as const).map(([title, rows, save, table]) => (
          <section className="card" key={table}>
            <div className="ch"><h2>{title}</h2></div>
            <div className="list">
              {rows.map((r) => (
                <div className="li" key={r.id}>
                  {draft ? (
                    <>
                      <ActionForm action={save} inline style={{ flex: 1 }}>
                        <input type="hidden" name="version" value={id} /><input type="hidden" name="id" value={r.id} />
                        <input className="input" name="name" defaultValue={r.name} aria-label="Nombre" />
                        <button className="btn ghost sm">Guardar</button>
                      </ActionForm>
                      <ActionForm action={deleteRow} inline><input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="version" value={id} /><button className="btn ghost sm">Borrar</button></ActionForm>
                    </>
                  ) : <div className="tx"><b>{r.position}. {r.name}</b></div>}
                </div>
              ))}
            </div>
            {draft && (
              <ActionForm action={save} inline style={{ marginTop: 10 }}>
                <input type="hidden" name="version" value={id} />
                <input className="input" name="name" placeholder="Nombre" required aria-label="Nombre nuevo" />
                <button className="btn soft sm">Añadir</button>
              </ActionForm>
            )}
          </section>
        ))}
      </div>

      <section className="card">
        <div className="ch"><h2>Actividades</h2><span className="muted small">{A.length} actividades · todo lo que la pareja o el equipo hace</span></div>
        <div className="list">
          {A.map((a) => (
            <details className="li" key={a.id} style={{ display: "block" }}>
              <summary style={{ cursor: "pointer" }}>
                <b>{a.key}</b> · {a.title} <span className="small muted">· {TYPES.find((t) => t[0] === a.type)?.[1]}{a.asset_id ? " · con video/archivo" : ""}{a.form_version_id ? " · con formulario" : ""}</span>
              </summary>
              <div style={{ marginTop: 12 }}>
                {draft ? (
                  <>
                    <ActionForm action={saveActivity}>{activityFields(a)}<button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Guardar actividad</button></ActionForm>
                    <ActionForm action={deleteRow} inline style={{ marginTop: 8 }}><input type="hidden" name="table" value="service_activities" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="version" value={id} /><button className="btn ghost sm">Borrar actividad</button></ActionForm>
                  </>
                ) : <p className="small muted">{a.summary}</p>}
              </div>
            </details>
          ))}
        </div>
        {draft && (
          <details style={{ marginTop: 14 }}>
            <summary className="btn soft sm" style={{ display: "inline-flex", cursor: "pointer" }}>Nueva actividad</summary>
            <div style={{ marginTop: 12 }}><ActionForm action={saveActivity}>{activityFields()}<button className="btn sm" style={{ alignSelf: "flex-start" }}>Crear actividad</button></ActionForm></div>
          </details>
        )}
      </section>

      <section className="card">
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
                      <div className="grid2e">
                        <input className="input" name="title" defaultValue={st.title} aria-label="Título del paso" />
                        <select className="input" name="block" defaultValue={st.block_id ?? ""} aria-label="Bloque"><option value="">Sin bloque</option>{(blocks.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                        <select className="input" name="activity" defaultValue={st.activity_id} aria-label="Actividad">{A.map((a) => <option key={a.id} value={a.id}>{a.key} · {a.title}</option>)}</select>
                        <input className="input" name="description" defaultValue={st.description ?? ""} placeholder="Qué pasa" aria-label="Descripción" />
                      </div>
                      <button className="btn ghost sm" style={{ alignSelf: "flex-start" }}>Guardar paso</button>
                    </ActionForm>
                    <ActionForm action={addRequirement} style={{ marginTop: 8 }}>
                      <input type="hidden" name="version" value={id} /><input type="hidden" name="step" value={st.id} />
                      <div className="grid2e">
                        <select className="input" name="required" aria-label="Actividad requerida">{A.map((a) => <option key={a.id} value={a.id}>{a.key} · {a.title}</option>)}</select>
                        <select className="input" name="criterion" aria-label="Criterio">{CRITERIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                        <select className="input" name="mandatory" aria-label="Obligatorio"><option value="yes">Obligatorio</option><option value="no">Opcional</option></select>
                        <select className="input" name="enforcement" aria-label="Efecto"><option value="blocks">Bloquea hasta cumplirlo</option><option value="reminds">Solo recuerda</option></select>
                        <input className="input" name="label" placeholder="Texto para la pareja (opcional)" aria-label="Texto" />
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
            <div className="grid2e">
              <input className="input" name="title" placeholder="Título del paso" required aria-label="Título" />
              <select className="input" name="activity" aria-label="Actividad que lo define">{A.map((a) => <option key={a.id} value={a.id}>{a.key} · {a.title}</option>)}</select>
              <select className="input" name="block" aria-label="Bloque"><option value="">Sin bloque</option>{(blocks.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              <input className="input" name="description" placeholder="Qué pasa" aria-label="Descripción" />
            </div>
            <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Añadir paso</button>
          </ActionForm>
        )}
      </section>

      <div className="grid2e">
        <section className="card">
          <div className="ch"><h2>Nuevo formulario o tarea</h2></div>
          <ActionForm action={createForm}>
            <div className="grid2e">
              <input className="input" name="key" placeholder="clave_unica" required aria-label="Clave" />
              <input className="input" name="name" placeholder="Nombre visible" required aria-label="Nombre" />
              <select className="input" name="kind" aria-label="Tipo"><option value="homework">Tarea</option><option value="intake">Cuestionario inicial</option><option value="test">Test</option><option value="feedback">Cierre / feedback</option></select>
            </div>
            <textarea className="input" name="schema" defaultValue={FORM_EXAMPLE} style={{ minHeight: 220, fontFamily: "monospace", fontSize: 12 }} aria-label="Estructura (JSON)" />
            <p className="small muted">Tipos de pregunta: text, textarea, number, scale (min/max), single_choice y multi_choice (options). «scope» de la sección: individual o shared. Si la clave ya existe se crea una versión nueva.</p>
            <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Publicar formulario</button>
          </ActionForm>
        </section>
        <section className="card">
          <div className="ch"><h2>Nuevo contrato</h2></div>
          <ActionForm action={createContract}>
            <input type="hidden" name="service" value={version.service_id} />
            <input className="input" name="title" placeholder="Título" required aria-label="Título" />
            <textarea className="input" name="points" placeholder={"Un punto por línea, «Título: texto»\nQué incluye: 10 sesiones…"} aria-label="Puntos clave" />
            <textarea className="input" name="body" placeholder="Texto completo (admite # títulos y listas con -)" style={{ minHeight: 160 }} aria-label="Texto completo" />
            <button className="btn soft sm" style={{ alignSelf: "flex-start" }}>Publicar contrato</button>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
