import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { InitialSteps, type InitialItem } from "@/components/initial-steps";
import { sessionLabel } from "@/lib/activity-config";
import { getHub, type Hub, type RequirementRow } from "@/lib/data/hub";
import { getStaff } from "@/lib/data/staff";
import {
  actionForRequirement, currentStep, firstName, fmtDay, fmtTime, hrefFor, lateActivities, nextSessionInfo, reqSummary, roleClass,
  stepRequirements, stepTarget, todayActions, trackLines, upcoming, weekGrid, type SessionInfo,
} from "@/lib/process";

export default function ProcessPage() {
  return (
    <Suspense fallback={<div className="nowhero" style={{ minHeight: 320 }} aria-busy="true" />}>
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
  const [first] = actions;
  // Lo que ya está en la lista de arriba (requisitos y agendar la sesión) no se repite en «También puedes».
  const heroStep = nextSessionInfo(hub)?.stepId;
  const rest = actions.filter((a) => heroStep !== step?.step_id ? a !== first : a.icon === "chat");
  const { total, months, todayWeek } = weekGrid(hub);

  return (
    <>
      <Hero hub={hub} name={firstName(me.name)} />
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
        <InitialSteps items={initialItems(hub)} />
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

const COUNT_WHY: Record<SessionInfo["state"], string> = {
  booked: "", requested: "El equipo les confirmará la hora.", ready: "Ya pueden agendarla.",
  blocked: "Aún no pueden agendarla: les faltan requisitos.", upcoming: "Se abre cuando terminen el paso anterior.",
  partner: "Es la sesión individual de tu pareja.", closing: "El equipo la marcará como hecha en breve.",
};

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

const moduleNum = (label: string | null) => /^Módulo (\d+)/.exec(label ?? "")?.[1] ?? null;
/** «Módulo 0», «Módulo 1», «Módulo 2» → «Módulos 0, 1 y 2». */
function doneTitle(reqs: RequirementRow[]) {
  const nums = reqs.map((r) => moduleNum(r.label ?? r.required_title));
  if (nums.every(Boolean)) {
    return nums.length === 1 ? `Módulo ${nums[0]}` : `Módulos ${nums.slice(0, -1).join(", ")} y ${nums.at(-1)}`;
  }
  return reqSummary(reqs).doneText;
}

/** Inicio: la próxima sesión a la izquierda y, a la derecha, lo que falta para entrar a ella. */
function Hero({ hub, name }: { hub: Hub; name: string }) {
  const next = nextSessionInfo(hub);
  const sesStep = next ? hub.steps.find((s) => s.step_id === next.stepId) ?? null : null;
  const reqs = sesStep && next?.state !== "partner" ? stepRequirements(hub, sesStep.step_id) : [];
  const met = reqs.filter((r) => r.is_met);
  const target = sesStep ? stepTarget(hub, sesStep) : "";
  const todo = reqs
    .filter((r) => !r.is_met)
    .map((r) => ({ r, a: actionForRequirement(hub, r, target), act: hub.activities.find((x) => x.activity_id === r.required_activity_id) }))
    .sort((x, y) => Number(x.a.icon === "users") - Number(y.a.icon === "users"));
  const reqIds = new Set(reqs.map((r) => r.required_activity_id));
  const others = lateActivities(hub).filter((a) => !reqIds.has(a.activity_id) && a.activity_id !== next?.activityId);
  const sesAct = next ? hub.activities.find((a) => a.activity_id === next.activityId) : undefined;
  const who = next?.staffName ? firstName(next.staffName) : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

  // Sin sesiones por delante: lo que quede del proceso, en la misma lista.
  const fallback = !next ? todayActions(hub) : [];
  const step = currentStep(hub);

  const mods = reqs.filter((r) => moduleNum(r.label ?? r.required_title) !== null);
  const firstOpen = mods.find((r) => !r.is_met);

  let whenB = "Sin fecha todavía";
  let whenS = sesAct?.suggested_on ? `Sugerida: semana del ${fmtDay(sesAct.suggested_on)}` : next ? COUNT_WHY[next.state] : "";
  if (next?.state === "booked" && next.when) {
    whenB = `${fmtDay(next.when)} · ${fmtTime(next.when)}`;
    whenS = next.days === 0 ? "Es hoy" : `Faltan ${next.days} ${next.days === 1 ? "día" : "días"}`;
  } else if (next?.state === "requested") {
    whenB = "Solicitud enviada";
    whenS = COUNT_WHY.requested;
  } else if (next?.state === "closing" && next.when) {
    whenB = fmtDay(next.when);
    whenS = COUNT_WHY.closing;
  } else if (next?.state === "partner") {
    whenB = "Sesión de tu pareja";
    whenS = COUNT_WHY.partner;
  }

  return (
    <section className="nowhero">
      <div>
        <p className="hello">Hola, {name}</p>
        <h1>Esto es lo que importa ahora</h1>
      </div>
      {!next && !step ? (
        <p className="lead">Completaron su proceso. ¡Felicidades!</p>
      ) : (
        <div className={`nh-grid${next ? "" : " one"}`}>
          {next && sesStep && (
            <article className={`nh-sess ${roleClass(next.roleKey)}`} aria-label="Próxima sesión">
              <div className="top">Próxima sesión</div>
              <div className="body">
                <span className="num">{next.key}</span>
                <h2>{sessionLabel(hub.configs[sesStep.activity_id ?? ""], sesStep.participants)}{who ? ` con ${who}` : ""}</h2>
                {sesStep.title && <p className="t">{sesStep.title}</p>}
                {mods.length > 0 && (
                  <div className="mods" aria-label={`Módulos para entrar: ${mods.filter((r) => r.is_met).length} de ${mods.length} listos`}>
                    {mods.map((r) => (
                      <i key={r.id} className={r.is_met ? "" : r === firstOpen ? "p" : "f"}>
                        M{moduleNum(r.label ?? r.required_title)}{r.is_met && <Icon name="check" size={11} />}
                      </i>
                    ))}
                  </div>
                )}
                <div className="when">
                  <b>{whenB}</b>
                  <span>{whenS}</span>
                  {(next.state === "booked" || next.state === "closing") && (
                    <Link className="lnk" href={next.cta.href} {...ext(next.cta.href)}>{next.cta.label} <Icon name="arrow" size={14} /></Link>
                  )}
                </div>
              </div>
            </article>
          )}
          <div className="nh-check">
            <p className="k">{next ? (reqs.length ? `Antes de la ${next.key} · ${met.length} de ${reqs.length} listos` : `Para la ${next.key}`) : "Lo que sigue"}</p>
            <ul>
              {met.length > 0 && (
                <li className="ok">
                  <span className="ic"><Icon name="check" size={16} /></span>
                  <b>{doneTitle(met)}</b>
                  <small>{met.every((r) => r.criterion === "task_submitted") ? "Vistos y con tarea entregada" : "Listo"}</small>
                </li>
              )}
              {todo.map(({ r, a, act }, i) => (
                <li key={r.id}>
                  <span className="ic" />
                  <b>{a.title}</b>
                  <small>{a.icon === "users" ? a.why : [act?.task_pending ? "Ya vieron el video" : null, act?.estimated_minutes ? `${act.estimated_minutes} min` : null].filter(Boolean).join(" · ") || a.why}</small>
                  <Link className={`act ${i === 0 ? "pri" : "sec"}`} href={a.href}>{a.cta === "Entregar tarea" ? "Hacer ahora" : a.cta}</Link>
                </li>
              ))}
              {fallback.map((a, i) => (
                <li key={a.title}>
                  <span className="ic" />
                  <b>{a.title}</b>
                  <small>{a.why}</small>
                  <Link className={`act ${i === 0 ? "pri" : "sec"}`} href={a.href}>{a.cta}</Link>
                </li>
              ))}
              {next && next.state !== "partner" && (
                next.state === "blocked" || next.state === "upcoming" ? (
                  <li className="cal">
                    <span className="ic"><Icon name="cal" size={24} /></span>
                    <b>Agendar la {next.key}{who ? ` con ${who}` : ""}</b>
                    <small>{next.state === "blocked" ? "Se habilita al completar lo de arriba" : COUNT_WHY.upcoming}</small>
                  </li>
                ) : next.state === "ready" ? (
                  <li>
                    <span className="ic go"><Icon name="cal" size={16} /></span>
                    <b>Agendar la {next.key}{who ? ` con ${who}` : ""}</b>
                    <small>Ya pueden agendarla</small>
                    <Link className={`act ${todo.length ? "sec" : "pri"}`} href={next.cta.href}>Agendar</Link>
                  </li>
                ) : (
                  <li className="ok">
                    <span className="ic"><Icon name="check" size={16} /></span>
                    <b>{next.state === "requested" ? `${next.key} solicitada` : `${next.key} agendada`}</b>
                    <small>{next.state === "requested" ? COUNT_WHY.requested : whenB}</small>
                    <Link className="act sec" href={next.cta.href} {...ext(next.cta.href)}>{next.cta.label}</Link>
                  </li>
                )
              )}
            </ul>
            {others.length > 0 && (
              <p className="foot">
                También pendiente:{" "}
                {others.slice(0, 2).map((a, i) => (
                  <span key={a.activity_id}>{i > 0 ? " y " : ""}<Link href={hrefFor(hub, a.type ?? "checklist", a.activity_id)}>{lower(a.title)}</Link></span>
                ))}
                {others.length > 2 ? ` y ${others.length - 2} más` : ""}.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

const lower = (s: string | null) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : "");

/** Actividades de la pareja en el área de Inicio (contrato, radiografía, video de bienvenida…). */
function initialItems(hub: Hub): InitialItem[] {
  const partner = hub.members.find((m) => m.profileId !== hub.me.id);
  return hub.activities
    .filter((a) => a.track_key === "inicio" && a.type !== "staff_task")
    .sort((a, b) => (a.suggested_on ?? "").localeCompare(b.suggested_on ?? "") || (a.position ?? 0) - (b.position ?? 0))
    .map((a) => {
      const checkable = a.type === "video_module" || a.type === "external_link" || a.type === "checklist";
      const mine = checkable ? hub.mine.viewed.includes(a.activity_id ?? "") : hub.mine.submitted.includes(a.activity_id ?? "");
      return {
        id: a.activity_id ?? "",
        title: a.title ?? "",
        done: Boolean(a.is_completed),
        waitingPartner: !a.is_completed && mine && partner ? firstName(partner.name) : null,
        checkable,
        href: hrefFor(hub, a.type ?? "checklist", a.activity_id),
        cta: a.type === "contract" ? "Firmar" : a.type === "form" ? "Responder" : a.type === "video_module" ? "Ver" : "Abrir",
      };
    });
}

function Gantt({ hub, total, months, todayWeek }: { hub: Hub; total: number; months: { label: string; span: number }[]; todayWeek: number }) {
  // El área de Inicio va aparte, en el cuadro del proceso inicial.
  const lines = trackLines(hub, total).filter((l) => l.key !== "inicio");
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
