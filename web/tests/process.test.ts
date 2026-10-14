import { test } from "node:test";
import assert from "node:assert/strict";
import { hiddenNav, nextSessionInfo, stepTone, upcoming } from "../lib/process.ts";
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
    mine: { viewed: [], submitted: [] }, onboardingForms: [], today,
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
