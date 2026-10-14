import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { getHub, type Hub } from "@/lib/data/hub";
import { getStaff } from "@/lib/data/staff";
import {
  blocksOf, currentStep, firstName, fmtDay, fmtTime, nextGroupSession, roleClass, staffFor, stepLabel,
  stepRequirements, stepTarget, todayActions, trackLines, weekGrid, weekOf,
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
            <h2>Las áreas de su proceso</h2>
            <p className="muted small">Avanzan a la vez. La línea dorada es hoy: lo que está a su izquierda ya debería estar hecho.</p>
          </div>
          <StatusChip hub={hub} />
        </div>
        <Gantt hub={hub} total={total} months={months} todayWeek={todayWeek} />
      </section>
      <div className="grid2e">
        <section className="card">
          <h2 style={{ marginBottom: 14 }}>También pueden</h2>
          {rest.length === 0 ? (
            <p className="muted">Por ahora, nada más. ¡Van al día!</p>
          ) : (
            <div className="list">
              {rest.map((a) => (
                <div className="li" key={a.title}>
                  <span className="ico info"><Icon name={a.icon} /></span>
                  <div className="tx"><b>{a.title}</b><span>{a.why}</span></div>
                  <Link className="btn soft sm" href={a.href}>{a.minutes ? `${a.minutes} min` : "Ir"}</Link>
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
          <span className="lab">Su siguiente paso</span>
          <Link className="btn" href={first.href}>{first.title} <Icon name="arrow" /></Link>
        </div>
      )}
      {step === null && <p className="muted">Completaron todos los pasos del proceso.</p>}
    </>
  );
}

function StatusChip({ hub }: { hub: Hub }) {
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
  const lead = !step
    ? "Completaron su proceso. ¡Felicidades!"
    : unmet > 0
      ? `Para entrar a ${stepTarget(hub, step)} les ${unmet === 1 ? "falta una cosa" : `faltan ${unmet} cosas`}.`
      : "Van al día. Este es su siguiente paso.";

  return (
    <section className="hero">
      <div className="ph">
        <div>
          <p className="eyebrow">{step?.block_name ?? "Cierre"} · Semana {weekOf(hub, hub.today)}</p>
          <h1>{step ? `${name}, están en el paso ${step.position} de ${total}.` : `${name}, terminaron su proceso.`}</h1>
          <p className="lead">{lead}</p>
        </div>
        <StatusChip hub={hub} />
      </div>

      <div>
        <div className="path" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-label={step ? `Paso ${step.position} de ${total}` : undefined}>
          {hub.steps.map((s) => {
            const staff = staffFor(hub, s.responsible_role_id);
            const isSession = s.activity_type === "therapy_session";
            return (
              <div key={s.step_id} className={`c ${s.state === "completed" ? "d" : s.state === "current" ? "n" : "f"}`} title={`Paso ${s.position} · ${s.title}`}>
                {isSession && <span className={`wdot ${roleClass(staff?.roleKey)}`} />}
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
        <p className="muted small" style={{ marginTop: 10 }}>
          Cada casilla es un paso. Para entrar a cada paso hay un requisito. El punto de color indica con quién es la sesión.
        </p>
      </div>

      {first && (
        <div className="mission">
          <span className="k">La página de hoy</span>
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
            Empezar{first.minutes ? ` · ${first.minutes} min` : ""} <Icon name="arrow" size={16} />
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
        <span><i style={{ borderStyle: "dashed", borderColor: "var(--muted)" }} />Por venir</span>
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
          <span key={i} className={`gm ${m.dot ? "dot " : ""}${m.state}${m.roleClass ? ` ${m.roleClass}` : ""}`} style={{ gridColumn: m.col }} title={m.title}>
            {m.label}
            {m.roleClass && <span className="wdot" />}
          </span>
        ))}
      </div>
    </>
  );
}

function Upcoming({ hub }: { hub: Hub }) {
  const step = currentStep(hub);
  const items: { d: string; sm: string; t: string; s: string; role?: string; who?: string }[] = [];
  if (step?.activity_type === "therapy_session") {
    const staff = staffFor(hub, step.responsible_role_id);
    const booked = hub.sessions.find((x) => x.enrollment_activity_id === step.activity_id && x.scheduled_at && x.status !== "cancelled");
    const blocked = (step.blocking_unmet ?? 0) > 0;
    items.push({
      d: booked?.scheduled_at ? fmtDay(booked.scheduled_at) : step.activity_key ?? "",
      sm: booked?.scheduled_at ? fmtTime(booked.scheduled_at) : blocked ? "por agendar" : "lista para agendar",
      t: step.title ?? "",
      s: staff ? `Con ${staff.personName}` : "",
      role: staff?.roleKey,
      who: staff?.personName,
    });
  }
  const g = nextGroupSession(hub);
  if (g) {
    const isToday = new Date(g.scheduled_at).toDateString() === hub.today.toDateString();
    items.push({ d: fmtDay(g.scheduled_at), sm: `${isToday ? "hoy · " : ""}${fmtTime(g.scheduled_at)}`, t: "Coaching grupal", s: g.title ?? "" });
  }
  if (items.length === 0) return <p className="muted" style={{ marginTop: 12 }}>No hay nada agendado por ahora.</p>;
  return (
    <div className="list" style={{ marginTop: 12 }}>
      {items.map((u) => (
        <div className="li" key={u.t}>
          <span className="d">{u.d}<small>{u.sm}</small></span>
          <div className="tx"><b>{u.t}</b><span>{u.s}</span></div>
          {u.who && <span className={`whochip ${roleClass(u.role)}`}><i>{u.who.charAt(0)}</i>{firstName(u.who)}</span>}
        </div>
      ))}
    </div>
  );
}
