import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { SignForm } from "@/components/sign-form";
import { getHub } from "@/lib/data/hub";
import { activityRows } from "@/lib/data/extra";
import { createClient } from "@/lib/supabase/server";
import { fmtDay } from "@/lib/process";

export const metadata: Metadata = { title: "Contrato · CEP" };

export default function ContractPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Contract />
    </Suspense>
  );
}

type Point = { title: string; body: string };

async function Contract() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  const contractActs = hub.activities.filter((a) => a.type === "contract");
  if (contractActs.length === 0) return <section className="card empty">Este servicio no tiene contrato en la app.</section>;

  const supabase = await createClient();
  const rows = await activityRows(contractActs.map((a) => a.activity_id!));
  const row = rows[0];
  const [{ data: tpl }, { data: sigs }] = await Promise.all([
    supabase.from("contract_templates").select("title, body_md, summary_points, version").eq("id", row.contract_template_id ?? "").maybeSingle(),
    supabase.from("contract_signatures").select("profile_id, signed_at, signer_name").eq("enrollment_id", row.enrollment_id),
  ]);
  const points = (Array.isArray(tpl?.summary_points) ? tpl.summary_points : []) as Point[];
  const signers = hub.members;
  const mySig = sigs?.find((s) => s.profile_id === me.id);
  const allSigned = signers.every((m) => sigs?.some((s) => s.profile_id === m.profileId));

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Inicio</p>
          <h1>{tpl?.title ?? "Su contrato"}</h1>
          <p className="lead">Antes de firmar, aquí está en palabras simples qué firman y por qué. Debajo tienen el texto completo.</p>
        </div>
        {allSigned
          ? <span className="chip ok"><Icon name="check" size={14} /> Firmado por {signers.length > 1 ? "ambos" : "ti"}</span>
          : <span className="chip warn">Pendiente de firma</span>}
      </div>
      <div className="grid2">
        <section className="card">
          <h2 style={{ marginBottom: 14 }}>Lo importante, en {points.length || "pocos"} puntos</h2>
          {points.length ? (
            <div className="list">
              {points.map((p) => (
                <div className="li" key={p.title}>
                  <span className="ico info"><Icon name="check" /></span>
                  <div className="tx"><b>{p.title}</b><span>{p.body}</span></div>
                </div>
              ))}
            </div>
          ) : <p className="muted">El equipo todavía no ha cargado el resumen.</p>}
        </section>
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2>Firmas</h2>
          <div className="list">
            {signers.map((m) => {
              const s = sigs?.find((x) => x.profile_id === m.profileId);
              return (
                <div className="li" key={m.profileId}>
                  <span className="av">{m.name.charAt(0)}</span>
                  <div className="tx"><b>{m.name}</b><span>{s ? `Firmó el ${fmtDay(s.signed_at)}` : "Pendiente"}</span></div>
                  <span className={`chip ${s ? "ok" : ""}`}>{s ? "Firmado" : "Pendiente"}</span>
                </div>
              );
            })}
          </div>
          {!mySig && <SignForm activityId={row.id} defaultName={me.name} />}
        </section>
      </div>
      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Texto completo</h2>
        <Markdown text={tpl?.body_md ?? ""} />
        {tpl?.version && <p className="small muted" style={{ marginTop: 12 }}>Versión {tpl.version} del contrato.</p>}
      </section>
    </>
  );
}

/** Markdown mínimo (títulos, listas y párrafos) para el texto del contrato. */
function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return <p className="muted">El texto del contrato todavía no está cargado.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: "70ch" }}>
      {blocks.map((b, i) => {
        if (b.startsWith("#")) {
          const level = b.match(/^#+/)![0].length;
          const content = b.replace(/^#+\s*/, "");
          return level <= 1 ? <h2 key={i}>{content}</h2> : <h3 key={i}>{content}</h3>;
        }
        if (/^[-*] /.test(b)) {
          return <ul key={i}>{b.split("\n").map((l, j) => <li key={j}>{l.replace(/^[-*]\s*/, "")}</li>)}</ul>;
        }
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}
