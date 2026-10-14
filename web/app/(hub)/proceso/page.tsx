import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { getHub } from "@/lib/data/hub";
import { firstName, roleClass, staffFor, stepRequirements, stepTone } from "@/lib/process";

export const metadata: Metadata = { title: "El proceso · CEP" };

export default function StepsPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Steps />
    </Suspense>
  );
}

async function Steps() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  const myIndex = hub.members.find((m) => m.profileId === me.id)?.memberIndex;
  const done = hub.steps.filter((s) => s.state === "completed").length;

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">El proceso</p>
          <h1>El camino completo: los {hub.steps.length} pasos de su proceso</h1>
          <p className="lead">Cada paso tiene un responsable y un requisito para entrar. El avance clínico lo marca su terapeuta en sesión, no el módulo visto.</p>
        </div>
        <span className="chip info">{done} de {hub.steps.length} completados</span>
      </div>
      <section className="card">
        <div className="legend" style={{ marginBottom: 16 }}>
          <span><i style={{ background: "var(--go)", borderColor: "var(--go)" }} />Hecho</span>
          <span><i style={{ background: "var(--warn)", borderColor: "var(--warn)" }} />Sigue</span>
          <span><i style={{ background: "var(--crit)", borderColor: "var(--crit)" }} />Atrasado</span>
          <span><i style={{ borderStyle: "dashed", borderColor: "var(--muted)" }} />Por venir</span>
        </div>
        {hub.steps.map((s, i) => {
          const head = s.block_name !== hub.steps[i - 1]?.block_name ? <div className="blockhead">{s.block_name}</div> : null;
          const tone = stepTone(hub, s);
          const staff = staffFor(hub, s.responsible_role_id);
          const reqs = stepRequirements(hub, s.step_id);
          const individual = s.participants === "member_1" || s.participants === "member_2";
          const mine = individual && myIndex === (s.participants === "member_1" ? 1 : 2);
          const owner = individual ? hub.members.find((m) => m.memberIndex === (s.participants === "member_1" ? 1 : 2)) : undefined;
          return (
            <div key={s.step_id}>
              {head}
              <div className={`vstep ${tone}`}>
                <span className="dotn">{tone === "d" ? <Icon name="check" size={16} /> : tone === "x" ? "!" : s.position}</span>
                <div className="body">
                  <div className="top3">
                    <b>{s.title}</b>
                    {staff && (
                      <span className={`whochip ${roleClass(staff.roleKey)}`}><i>{staff.personName.charAt(0)}</i>{firstName(staff.personName)}</span>
                    )}
                    {individual && (mine
                      ? <span className="chip pair"><Icon name="user" size={12} /> Tu sesión individual</span>
                      : <span className="chip">Sesión individual de {firstName(owner?.name ?? "")}</span>)}
                    {tone === "d" && <span className="chip go">Hecho</span>}
                    {tone === "n" && <span className="chip warn">Sigue</span>}
                    {tone === "x" && <span className="chip crit">Atrasado</span>}
                  </div>
                  {(!individual || mine) && s.description && <span className="small muted">{s.description}</span>}
                  {reqs.length > 0 ? (
                    <div>
                      <span className="small" style={{ fontWeight: 700 }}>Requisito para entrar:</span>
                      <div className="reqs">
                        {reqs.map((r) => {
                          const ok = r.is_met || tone === "d";
                          return (
                            <span key={r.id} className={`req ${ok ? "ok" : "no"}`}>
                              <Icon name={ok ? "check" : "lock"} size={13} /> {r.label ?? r.required_title}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className="small muted">Requisito para entrar: ninguno</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
