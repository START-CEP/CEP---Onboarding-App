import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { getStaff } from "@/lib/data/staff";
import { answerText, parseSchema, type Question } from "@/lib/forms";
import { fmtDay } from "@/lib/process";
import { createClient } from "@/lib/supabase/server";

export default function SatisfactionPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Satisfaction />
    </Suspense>
  );
}

type Sub = { id: string; form_version_id: string | null; answers: unknown; submitted_at: string | null; who: string; couple: string };

async function Satisfaction() {
  const staff = await getStaff();
  if (!staff) return null;
  const supabase = await createClient();
  const { data: forms } = await supabase.from("forms").select("id, name, form_versions(id, version, schema)").eq("kind", "feedback").is("archived_at", null);
  const versionIds = (forms ?? []).flatMap((f) => f.form_versions.map((v) => v.id));
  const { data: subs } = versionIds.length
    ? await supabase.from("form_submissions")
      .select("id, form_version_id, answers, submitted_at, profiles!form_submissions_submitted_by_fkey(full_name), enrollments(client_units(display_name))")
      .in("form_version_id", versionIds).eq("status", "submitted").order("submitted_at", { ascending: false })
    : { data: [] };
  const all: Sub[] = (subs ?? []).map((s) => ({
    id: s.id, form_version_id: s.form_version_id, answers: s.answers, submitted_at: s.submitted_at,
    who: s.profiles?.full_name ?? "", couple: s.enrollments?.client_units?.display_name ?? "",
  }));

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Equipo</p>
          <h1>Satisfacción</h1>
          <p className="lead">Lo que responden las parejas en los formularios de feedback: promedios de las escalas, opciones más elegidas y sus comentarios.</p>
        </div>
        {staff.isAdmin && <Link className="btn" href="/equipo/formularios/nuevo"><Icon name="pen" size={15} /> Crear encuesta</Link>}
      </div>

      {(forms ?? []).length === 0 && (
        <section className="card">
          <div className="ch"><h2>Cómo pedir la satisfacción</h2></div>
          <ol className="small" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>En <Link href="/equipo/formularios" style={{ textDecoration: "underline" }}>Formularios</Link>, crea uno y elige «Cierre / feedback» (por ejemplo: «Del 1 al 10, ¿qué tan satisfechos están?», «¿Qué mejorarían?»).</li>
            <li>En <Link href="/equipo/servicios" style={{ textDecoration: "underline" }}>Servicios</Link>, añade una actividad «Cuestionario» con ese formulario donde quieras pedirlo (a mitad del proceso, al cierre…).</li>
            <li>Las respuestas aparecen aquí, juntas.</li>
          </ol>
        </section>
      )}

      {(forms ?? []).map((f) => {
        const ids = new Set(f.form_versions.map((v) => v.id));
        const mine = all.filter((s) => s.form_version_id && ids.has(s.form_version_id));
        const latest = [...f.form_versions].sort((a, b) => b.version - a.version)[0];
        const questions = parseSchema(latest?.schema).flatMap((s) => s.questions);
        return (
          <section className="card" key={f.id}>
            <div className="ch"><h2>{f.name}</h2><span className="chip info">{mine.length} respuesta{mine.length === 1 ? "" : "s"}</span></div>
            {mine.length === 0 ? <p className="muted">Todavía nadie la ha respondido.</p> : (
              <div className="qblock" style={{ gap: 18 }}>
                {questions.map((q) => <QuestionResult key={q.key} q={q} subs={mine} />)}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

function QuestionResult({ q, subs }: { q: Question; subs: Sub[] }) {
  const values = subs.map((s) => ({ s, v: (s.answers as Record<string, unknown> | null)?.[q.key] }))
    .filter((x) => x.v !== undefined && x.v !== null && x.v !== "" && !(Array.isArray(x.v) && x.v.length === 0));
  if (q.type === "scale" || q.type === "number") {
    const nums = values.map((x) => Number(x.v)).filter((n) => Number.isFinite(n));
    const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    return (
      <div className="field">
        <label>{q.label}</label>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <b style={{ fontFamily: "var(--display)", fontSize: 26 }}>{avg === null ? "—" : avg.toFixed(1)}</b>
          {q.type === "scale" && <span className="small muted">de {q.max ?? 5} · {nums.length} respuesta{nums.length === 1 ? "" : "s"}</span>}
        </div>
        {q.type === "scale" && avg !== null && <div className="bar" style={{ maxWidth: 360 }}><i style={{ width: `${((avg - (q.min ?? 1)) / ((q.max ?? 5) - (q.min ?? 1))) * 100}%` }} /></div>}
      </div>
    );
  }
  if (q.type === "single_choice" || q.type === "multi_choice" || q.type === "yes_no") {
    const opts = q.type === "yes_no" ? ["Sí", "No"] : (q.options ?? []);
    const count = (o: string) => values.filter((x) => (Array.isArray(x.v) ? x.v.includes(o) : x.v === o)).length;
    return (
      <div className="field">
        <label>{q.label}</label>
        <div className="tags">{opts.map((o) => <span key={o} className={count(o) ? "on" : ""}>{o} · {count(o)}</span>)}</div>
      </div>
    );
  }
  return (
    <div className="field">
      <label>{q.label}</label>
      {values.length === 0 ? <span className="small muted">Sin respuestas.</span> : (
        <div className="list">
          {values.map(({ s, v }) => (
            <div className="li" key={s.id} style={{ padding: "8px 0", alignItems: "flex-start" }}>
              <div className="tx"><b style={{ fontWeight: 500, whiteSpace: "pre-wrap" }}>{answerText(q, v)}</b><span>{s.who}{s.couple ? ` (${s.couple})` : ""}{s.submitted_at ? ` · ${fmtDay(s.submitted_at)}` : ""}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
