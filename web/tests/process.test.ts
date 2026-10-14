import { test } from "node:test";
import assert from "node:assert/strict";
import { hiddenNav, nextSessionInfo, reqSummary, stepTone, todayActions, upcoming } from "../lib/process.ts";
import type { Hub } from "../lib/data/hub.ts";

const today = new Date("2026-10-14T15:00:00Z");
function hub(over: Partial<Hub> = {}): Hub {
  return {
    me: { id: "u1", name: "Pedro Demo" },
    enrollment: { enrollment_id: "e1", starts_on: "2026-09-01", days_left: 100 } as never,
    unitKind: "couple",
    members: [{ profileId: "u1", memberIndex: 1, name: "Pedro Demo" }, { profileId: "u2", memberIndex: 2, name: "Andrea Demo" }],
    steps: [], requirements: [], activities: [], tracks: [], group: null, groupSessions: [], sessions: [],
    staff: [{ careRoleId: "r1", roleKey: "lead_therapist", roleName: "Terapeuta", personName: "Emilia Ruiz" }],
    mine: { viewed: [], submitted: [] }, onboardingForms: [], configs: {}, today,
    ...over,
  };
}
const step = (o: Record<string, unknown>) => ({ step_id: "s1", position: 1, state: "current", activity_id: "a1", activity_type: "therapy_session", activity_key: "S4", title: "Sesión 4", responsible_role_id: "r1", blocking_unmet: 0, ...o }) as never;
const act = (o: Record<string, unknown>) => ({ activity_id: "a1", type: "therapy_session", is_completed: false, suggested_on: null, track_position: 1, ...o }) as never;

test("cuenta atrás con sesión agendada", () => {
  const h = hub({ steps: [step({})], activities: [act({})], sessions: [{ id: "x1", enrollment_activity_id: "a1", scheduled_at: "2026-10-19T16:00:00Z", status: "scheduled", meeting_url: null }] });
  const info = nextSessionInfo(h)!;
  assert.equal(info.state, "booked");
  assert.equal(info.days, 5);
  assert.equal(info.staffName, "Emilia Ruiz");
  assert.deepEqual(info.cta, { label: "Añadir al calendario", href: "/calendario/sesion/x1" });
});

test("sin agendar y con requisitos pendientes: bloqueada, sin días", () => {
  const info = nextSessionInfo(hub({ steps: [step({ blocking_unmet: 2 })], activities: [act({})] }))!;
  assert.equal(info.state, "blocked");
  assert.equal(info.days, null);
  assert.equal(info.cta.label, "Ver qué falta");
});

test("sin agendar y lista: botón Agendar", () => {
  const info = nextSessionInfo(hub({ steps: [step({})], activities: [act({})] }))!;
  assert.equal(info.state, "ready");
  assert.deepEqual(info.cta, { label: "Agendar", href: "/terapia#S4" });
});

test("semáforo: hecho, sigue, atrasado, por venir", () => {
  const h = hub({ activities: [act({ activity_id: "a1", suggested_on: "2026-10-01" }), act({ activity_id: "a2", suggested_on: "2026-10-30" })] });
  assert.equal(stepTone(h, step({ state: "completed" })), "d");
  assert.equal(stepTone(h, step({ state: "current", activity_id: "a1" })), "x");
  assert.equal(stepTone(h, step({ state: "current", activity_id: "a2" })), "n");
  assert.equal(stepTone(h, step({ state: "locked", activity_id: "a2" })), "l");
});

test("menú: oculta lo completado y lo que el servicio no tiene", () => {
  const h = hub({
    onboardingForms: ["f1"],
    activities: [
      act({ activity_id: "w1", type: "video_module", track_position: 1, is_completed: true }),
      act({ activity_id: "f1", type: "form", track_position: 2, is_completed: false }),
      act({ activity_id: "c1", type: "contract", track_position: 2, is_completed: true }),
    ],
  });
  assert.deepEqual(hiddenNav(h).sort(), ["/bienvenida", "/contrato", "/radiografia"]);
});

test("coaching futuro sin título y con calendario", () => {
  const h = hub({ groupSessions: [{ id: "g1", scheduled_at: "2026-10-20T01:00:00Z", title: "Ciclo negativo", status: "scheduled" }] });
  const g = upcoming(h).find((u) => u.t === "Sesión de coaching grupal")!;
  assert.equal(g.s, "");
  assert.deepEqual(g.cta, { label: "Añadir al calendario", href: "/calendario/coaching/g1" });
});

test("el título de la sesión no repite la clave", () => {
  const info = nextSessionInfo(hub({ steps: [step({ title: "S5 · Definir el ciclo negativo", activity_key: "S5" })], activities: [act({})] }))!;
  assert.equal(info.title, "S5 · Definir el ciclo negativo");
  const plain = nextSessionInfo(hub({ steps: [step({ title: "Definir el ciclo", activity_key: "S5" })], activities: [act({})] }))!;
  assert.equal(plain.title, "S5 · Definir el ciclo");
});

test("sesión agendada que ya pasó y nadie cerró: no dice «Hoy» ni ofrece entrar", () => {
  const h = hub({ steps: [step({})], activities: [act({})], sessions: [{ id: "x1", enrollment_activity_id: "a1", scheduled_at: "2026-10-10T16:00:00Z", status: "scheduled", meeting_url: "https://meet.example.com/x" }] });
  const info = nextSessionInfo(h)!;
  assert.equal(info.state, "closing");
  assert.equal(info.days, null);
  assert.notEqual(info.cta.label, "Entrar a la sesión");
});

test("los días se cuentan en la hora de Ciudad de México, no la del servidor", () => {
  // 10:00 en CDMX del 14/oct; la sesión es el 14/oct a las 19:00 CDMX (= 15/oct 01:00Z).
  const h = hub({ today: new Date("2026-10-14T16:00:00Z"), steps: [step({})], activities: [act({})],
    sessions: [{ id: "x1", enrollment_activity_id: "a1", scheduled_at: "2026-10-15T01:00:00Z", status: "scheduled", meeting_url: "https://meet.example.com/x" }] });
  const info = nextSessionInfo(h)!;
  assert.equal(info.days, 0);
  assert.equal(info.cta.label, "Entrar a la sesión");
  // La noche anterior (13/oct 19:00 CDMX) todavía falta 1 día.
  const before = nextSessionInfo({ ...h, today: new Date("2026-10-14T01:00:00Z") })!;
  assert.equal(before.days, 1);
});

test("sesión individual del otro miembro: informa, no ofrece agendar", () => {
  const h = hub({ me: { id: "u2", name: "Andrea Demo" }, steps: [step({ participants: "member_1" })], activities: [act({})] });
  const info = nextSessionInfo(h)!;
  assert.equal(info.state, "partner");
  assert.match(info.title, /Pedro/);
  assert.notEqual(info.cta.label, "Agendar");
});

test("sesión de un paso que aún no se abre: no ofrece agendar", () => {
  const h = hub({ steps: [step({ step_id: "s0", activity_type: "video_module", activity_id: "m1", state: "current" }), step({ state: "locked" })], activities: [act({})] });
  const info = nextSessionInfo(h)!;
  assert.equal(info.state, "upcoming");
  assert.notEqual(info.cta.label, "Agendar");
});

test("«Lo que viene» usa la misma sesión que la cuenta atrás", () => {
  const h = hub({ steps: [step({ step_id: "a", activity_key: "S3", state: "locked" }), step({ step_id: "b", activity_key: "S4", activity_id: "a4", state: "current" })], activities: [act({}), act({ activity_id: "a4" })] });
  assert.equal(upcoming(h)[0].d, "S4");
});

test("requisitos: los cumplidos se resumen y los pendientes van uno a uno", () => {
  const r = (label: string, is_met: boolean) => ({ id: label, label, is_met });
  const s = reqSummary([r("Módulo 0", true), r("Módulo 1", true), r("Módulo 2", true), r("Módulo 3", false), r("Módulo 4", false)]);
  assert.equal(s.doneCount, 3);
  assert.deepEqual(s.pending.map((x) => x.label), ["Módulo 3", "Módulo 4"]);
  assert.equal(s.doneText, "Módulo 0 al Módulo 2");
  assert.equal(reqSummary([r("Módulo 0", true)]).doneText, "Módulo 0");
  assert.equal(reqSummary([]).doneCount, 0);
});

test("el «por qué» de una acción dice «indispensable», no «obligatorio»", () => {
  const h = hub({
    steps: [step({ blocking_unmet: 1 })],
    activities: [act({}), act({ activity_id: "m3", type: "video_module", title: "Módulo 3 · El rol de la personalidad" })],
    requirements: [{ id: "r1", target_step_id: "s1", required_activity_id: "m3", criterion: "viewed", is_mandatory: true, is_met: false, label: "Módulo 3" }] as never,
  });
  const [a] = todayActions(h);
  assert.match(a.why, /indispensable/);
  assert.doesNotMatch(a.why, /obligatorio/);
});
