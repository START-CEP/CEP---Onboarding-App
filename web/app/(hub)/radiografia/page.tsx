import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeworkForm } from "@/components/homework";
import { Icon } from "@/components/icon";
import { getHub } from "@/lib/data/hub";
import { activityRows, formSchemas } from "@/lib/data/extra";
import { createClient } from "@/lib/supabase/server";
import { firstName, fmtDay } from "@/lib/process";

export const metadata: Metadata = { title: "Radiografía Inicial · CEP" };

export default function IntakePage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Intake />
    </Suspense>
  );
}

async function Intake() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  // Genérico: todos los formularios (cuestionarios) del servicio, no las tareas de los módulos.
  const forms = hub.activities.filter((a) => a.type === "form");
  if (forms.length === 0) return <section className="card empty">Este servicio no tiene cuestionarios.</section>;

  const supabase = await createClient();
  const rows = await activityRows(forms.map((a) => a.activity_id!));
  const schemas = await formSchemas(rows.map((r) => r.form_version_id!).filter(Boolean));
  const { data: subs } = await supabase
    .from("form_submissions")
    .select("id, enrollment_activity_id, submitted_by, status, answers, submitted_at")
    .in("enrollment_activity_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false });
  const partner = hub.members.find((m) => m.profileId !== me.id);
  const nameOf = (id: string) => firstName(hub.members.find((m) => m.profileId === id)?.name ?? "");

  // Paso que estos cuestionarios desbloquean (p. ej. la S1).
  const unlocks = hub.requirements
    .filter((r) => forms.some((f) => f.activity_id === r.required_activity_id) && r.target_step_position)
    .map((r) => hub.steps.find((s) => s.position === r.target_step_position))
    .filter(Boolean)[0];

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Su punto de partida</p>
          <h1>{forms.length > 1 ? shared(forms.map((f) => f.title ?? "")) : forms[0].title}</h1>
          <p className="lead">
            No es un diagnóstico: es una foto de su punto de partida para adaptar el proceso a ustedes.
            {unlocks ? ` Es requisito para ${unlocks.activity_type === "therapy_session" ? `la ${unlocks.activity_key}` : unlocks.title}.` : ""}
          </p>
        </div>
      </div>
      <div className="alert info">
        <Icon name="lock" />
        <div><b>Lo individual es privado.</b> Tus respuestas individuales solo las lee el equipo{partner ? `; ${firstName(partner.name)} no puede verlas` : ""}. Lo que responden en pareja queda en la ficha de los dos.</div>
      </div>
      {forms.map((f) => {
        const row = rows.find((r) => r.id === f.activity_id)!;
        const sections = schemas.get(row.form_version_id ?? "") ?? [];
        const isShared = row.response_scope === "shared";
        const mine = (subs ?? []).filter((s) => s.enrollment_activity_id === row.id && (isShared || s.submitted_by === me.id));
        const sent = mine.find((s) => s.status === "submitted");
        const draft = mine.find((s) => s.status === "draft");
        return (
          <section className="card qblock" key={row.id}>
            <div className="ch" style={{ margin: 0 }}>
              <div>
                <h2>{f.title}</h2>
                {row.summary && <p className="muted small">{row.summary}</p>}
              </div>
              {sent
                ? <span className="chip ok"><Icon name="check" size={14} /> Enviado{sent.submitted_at ? ` el ${fmtDay(sent.submitted_at)}` : ""}{isShared ? ` por ${nameOf(sent.submitted_by)}` : ""}</span>
                : isShared ? <span className="chip pair"><Icon name="users" size={13} /> Respóndanlo juntos</span>
                  : <span className="chip warn">Pendiente</span>}
            </div>
            <HomeworkForm
              key={`${row.id}-${sent ? "sent" : "draft"}`}
              activityId={row.id}
              sections={sections}
              initial={((sent ?? draft)?.answers ?? {}) as Record<string, never>}
              readOnly={Boolean(sent)}
              partnerName={partner ? firstName(partner.name) : undefined}
              submitLabel="Enviar respuestas"
              sentLabel="Respuestas enviadas."
            />
            {isShared && !sent && draft && <p className="small muted">Hay un borrador guardado; cualquiera de los dos puede continuarlo.</p>}
          </section>
        );
      })}
    </>
  );
}

function shared(titles: string[]) {
  const parts = titles.map((t) => t.split(" · ")[0]);
  return parts.every((p) => p === parts[0]) ? parts[0] : "Cuestionarios";
}
