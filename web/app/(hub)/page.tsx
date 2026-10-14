import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { getHub, type Hub } from "@/lib/data/hub";
import { getStaff } from "@/lib/data/staff";
import {
  blocksOf, currentStep, firstName, fmtDay, fmtTime, nextSessionInfo, roleClass, staffFor, stepLabel,
  lateActivities, stepRequirements, stepTarget, todayActions, trackLines, upcoming, weekGrid, weekOf,
} from "@/lib/process";

export default function ProcessPage() {
  return (
    <Suspense fallback={<div className="hero" style={{ minHeight: 320 }} aria-busy="true" />}>
      <Process />
    </Suspense>
  );
}

async function Process() {
  const { me, hub } = await getHub();
  if (!hub && (await getStaff())) redirect("/equipo");
  if (!me || !hub) {
    return (
      <section className="card empty">
        <h2>Todavía no tienes un proceso activo</h2>
        <p className="muted" style={{ marginTop: 8 }}>Cuando el equipo confirme tu servicio, aquí verás tu camino paso a paso.</p>
      </section>
    );
  }
  const step = currentStep(hub);
  const actions = todayActions(hub);
  const [first, ...rest] = actions;
  const { total, months, todayWeek } = weekGrid(hub);

  return (
    <>
      <Hero hub={hub} name={firstName(me.name)} first={first} />
      <section className="card">
        <div className="ch">
          <div>
            <p className="eyebrow">El proceso</p>
            <h2>Resumen de su proceso</h2>
            <p className="muted small">Estas son las áreas de su proceso. Avanzan a la vez. La línea dorada es hoy: lo que está a su izquierda ya debería estar hecho.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <StatusChip hub={hub} />
            <Link className="btn ghost sm" href="/proceso">Ver el proceso completo <Icon name="arrow" size={14} /></Link>
          </div>
        </div>
        <Gantt hub={hub} total={total} months={months} todayWeek={todayWeek} />
      </section>
      <div className="grid2e">
        <section className="card">
          <h2 style={{ marginBottom: 14 }}>También puedes</h2>
          {rest.length === 0 ? (
            <p className="muted">Por ahora, nada más. ¡Vas al día!</p>
          ) : (
            <div className="list">
              {rest.map((a) => (
                <div className="li" key={a.title}>
                  <span className="ico info"><Icon name={a.icon} /></span>
                  <div className="tx"><b>{a.title}</b><span>{a.why}</span></div>
                  <Link className="btn soft sm" href={a.href}>{a.cta}{a.minutes ? ` · ${a.minutes} min` : ""}</Link>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card agenda">
          <h2>Lo que viene</h2>
          <Upcoming hub={hub} />
        </section>
      </div>
      {first && (
        <div className="pager">
          <span className="lab">Tu siguiente paso</span>
          <Link className="btn" href={first.href}>{first.title} <Icon name="arrow" /></Link>
        </div>
      )}
      {step === null && <p className="muted">Completaron todos los pasos del proceso.</p>}
    </>
  );
}

function StatusChip({ hub }: { hub: Hub }) {
  const late = lateActivities(hub).length;
  if (late > 0) {
    return <span className="chip crit"><Icon name="clock" size={14} /> {late === 1 ? "1 cosa atrasada" : `${late} cosas atrasadas`}</span>;
  }
  const left = hub.enrollment.days_left;
  if (left !== null && left <= 21) {
    return <span className="chip warn"><Icon name="clock" size={14} /> Quedan {left} días</span>;
  }
  return <span className="chip ok"><Icon name="check" size={14} /> Van al día</span>;
}

function Hero({ hub, name, first }: { hub: Hub; name: string; first?: ReturnType<typeof todayActions>[number] }) {
  const step = currentStep(hub);
  const reqs = step ? stepRequirements(hub, step.step_id) : [];
  const unmet = reqs.filter((r) => !r.is_met).length;
  const total = hub.steps.length;
  const blocks = blocksOf(hub);
  const next = nextSessionInfo(hub);

  return (
    <section className="hero">
      <div className="ph">
        <div>
          <p className="eyebrow herok">Por dónde vamos hoy</p>
          <div className="where">
            <span>{step?.block_name ?? "Cierre"}</span>
            <span>Semana {weekOf(hub, hub.today)}</span>
          </div>
          <h1>{step ? `${name}, están en el paso ${step.position} de ${total}.` : `${name}, terminaron su proceso.`}</h1>
        </div>
        <StatusChip hub={hub} />
      </div>

      {next && (
        <div className={`countdown ${roleClass(next.roleKey)}`}>
          <div className="num">
            {next.days === null ? <Icon name="cal" size={30} /> : next.days === 0 ? "Hoy" : <>{next.days}<small>{next.days === 1 ? "día" : "días"}</small></>}
          </div>
          <div className="tx">
            <span className="k">{next.days === null ? (next.state === "requested" ? "Solicitud enviada" : "Su siguiente sesión") : next.days === 0 ? "Su sesión es hoy" : "Faltan para su siguiente sesión"}</span>
            <b>{next.title}{next.staffName ? ` · con ${firstName(next.staffName)}` : ""}</b>
            <span className="why">{next.when ? `${fmtDay(next.when)} · ${fmtTime(next.when)}` : next.state === "blocked" ? "Aún no pueden agendarla: les falta un requisito." : next.state === "ready" ? "Ya pueden agendarla." : "El equipo les confirmará la hora."}</span>
          </div>
          <Link className="btn" href={next.cta.href} {...(next.cta.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{next.cta.label} <Icon name="arrow" size={16} /></Link>
        </div>
      )}

      {!step ? (
        <p className="lead">Completaron su proceso. ¡Felicidades!</p>
      ) : next && step.activity_type === "therapy_session" ? null : unmet > 0 ? (
        <div className="nextup">
          <Icon name="lock" size={22} />
          <div>
            <span className="k">Para su siguiente {step.activity_type === "therapy_session" ? "sesión" : "paso"}</span>
            <b>Para entrar a {stepTarget(hub, step)} les {unmet === 1 ? "falta una cosa" : `faltan ${unmet} cosas`}.</b>
          </div>
        </div>
      ) : (
        <div className="nextup ok">
          <Icon name="check" size={22} />
          <div>
            <span className="k">Van al día</span>
            <b>Ya cumplen todo para {stepTarget(hub, step)}.</b>
          </div>
        </div>
      )}

      <div>
        <div className="path" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-label={step ? `Paso ${step.position} de ${total}` : undefined}>
          {hub.steps.map((s) => {
            const staff = staffFor(hub, s.responsible_role_id);
            const isSession = s.activity_type === "therapy_session";
            const st = s.state === "completed" ? "d" : s.state === "current" ? "n" : "f";
            return (
              <div key={s.step_id} className={`c ${st}${isSession ? ` ses ${roleClass(staff?.roleKey)}` : ""}`}
                title={`Paso ${s.position} · ${s.title}${isSession && staff ? ` · con ${staff.personName}` : ""}`}>
                {stepLabel(s)}
                <small>{isSession ? firstName(staff?.personName ?? "") : `Paso ${s.position}`}</small>
              </div>
            );
          })}
        </div>
        <div className="blocks" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
          {blocks.map((b, i) => (
            <span key={`${b.name}-${i}`} className={b.current ? "on" : ""} style={{ gridColumn: `span ${b.span}` }}>{b.name}</span>
          ))}
        </div>
        <div className="herolegend">
          <span className="muted small">Cada casilla es un paso. Las sesiones llevan el color de quien las da:</span>
          {hub.staff.filter((s) => s.roleKey !== "coordinator").map((s) => (
            <span key={s.careRoleId} className={`whochip ${roleClass(s.roleKey)}`}><i>{s.personName.charAt(0)}</i>{firstName(s.personName)}</span>
          ))}
        </div>
      </div>

      {first && (
        <div className="mission">
          <span className="k">Lo que puedes avanzar ahora</span>
          <b>{first.title}</b>
          <span className="why">{first.why}</span>
          {step && reqs.length > 0 && (
            <div>
              <span className="small" style={{ color: "#8E9AC0", fontWeight: 700 }}>Para entrar a {stepTarget(hub, step)}:</span>
              <div className="reqs">
                {reqs.map((r) => (
                  <span key={r.id} className={`req ${r.is_met ? "ok" : "no"}`}>
                    <Icon name={r.is_met ? "check" : "lock"} size={13} /> {r.label ?? r.required_title}
                  </span>
                ))}
              </div>
            </div>
          )}
          <Link className="btn" href={first.href}>
            {first.cta}{first.minutes ? ` · ${first.minutes} min` : ""} <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}

function Gantt({ hub, total, months, todayWeek }: { hub: Hub; total: number; months: { label: string; span: number }[]; todayWeek: number }) {
  const lines = trackLines(hub, total);
  const cols = { gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` };
  const today = { left: `calc(${((Math.min(todayWeek, total) - 0.5) / total) * 100}% - 1px)` };
  return (
    <>
      <div className="scrollx">
        <div className="gantt">
          <div />
          <div className="gmonths" style={cols}>
            {months.map((m, i) => <span key={`${m.label}-${i}`} style={{ gridColumn: `span ${m.span}` }}>{m.label}</span>)}
          </div>
          {lines.map((l) => (
            <TrackRow key={l.key} line={l} cols={cols} today={today} />
          ))}
        </div>
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--accent)" }} />Hecho</span>
        <span><i style={{ background: "var(--hi)", borderColor: "var(--hi)" }} />Lo siguiente</span>
        <span><i style={{ background: "var(--warn-soft)", borderColor: "var(--warn)" }} />Video visto, falta la tarea</span>
        <span><i style={{ background: "var(--crit-soft)", borderColor: "var(--crit)" }} />Pendiente o atrasado</span>
        <span><i style={{ borderStyle: "dashed", borderColor: "var(--muted)" }} />Por venir</span>
        <span className="legsep">Sesiones con:</span>
        {hub.staff.filter((s) => s.roleKey !== "coordinator").map((s) => (
          <span key={s.careRoleId}><i className={`w ${roleClass(s.roleKey)}`} />{firstName(s.personName)}</span>
        ))}
      </div>
    </>
  );
}

function TrackRow({ line, cols, today }: { line: ReturnType<typeof trackLines>[number]; cols: React.CSSProperties; today: React.CSSProperties }) {
  return (
    <>
      <div className="lab">
        {line.name}
        <span>{line.sub}</span>
        <span className={`chip ${line.chip.tone}`}>
          <Icon name={line.chip.lock ? "lock" : line.chip.tone === "ok" ? "check" : "clock"} size={12} /> {line.chip.text}
        </span>
      </div>
      <div className="gtrack" style={cols}>
        <span className="t" style={today} />
        {line.markers.map((m, i) => (
          <span key={i} className={`gm ${m.dot ? "dot " : ""}${m.state}${m.roleClass ? ` ses ${m.roleClass}` : ""}`} style={{ gridColumn: m.col }}
            title={m.state === "x" ? `${m.title} · atrasado` : m.title}>
            {m.label}
          </span>
        ))}
      </div>
    </>
  );
}

function Upcoming({ hub }: { hub: Hub }) {
  const items = upcoming(hub);
  if (items.length === 0) return <p className="muted" style={{ marginTop: 12 }}>No hay nada agendado por ahora.</p>;
  return (
    <div className="list" style={{ marginTop: 12 }}>
      {items.map((u) => (
        <div className={`li${u.role ? ` upc ${roleClass(u.role)}` : ""}`} key={u.t}>
          <span className="d">{u.d}<small>{u.sm}</small></span>
          <div className="tx"><b>{u.t}</b><span>{u.s}</span></div>
          {u.cta && (
            <Link className="btn soft sm" href={u.cta.href} {...(u.cta.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{u.cta.label}</Link>
          )}
        </div>
      ))}
    </div>
  );
}
