import { test } from "node:test";
import assert from "node:assert/strict";
import { moduleRows, summarize, weeksLeft, type ProgressAct, type ProgressInput } from "../lib/team-progress.ts";

const members = [{ profileId: "p", memberIndex: 1, name: "Pedro" }, { profileId: "a", memberIndex: 2, name: "Andrea" }];
const act = (o: Partial<ProgressAct>): ProgressAct => ({
  id: "x", key: "X", title: "X", type: "video_module", position: 1, participants: "each_member", responseScope: "individual",
  hasForm: true, isCompleted: false, isWelcome: false, responsibleStaffId: null, blockingUnmet: 0, ...o,
});
const base = (o: Partial<ProgressInput> = {}): ProgressInput => ({
  acts: [
    act({ id: "wel", key: "WEL", isWelcome: true, participants: "all", hasForm: false, position: 0 }),
    act({ id: "m0", key: "M0", position: 1 }),
    act({ id: "m1", key: "M1", position: 2 }),
    act({ id: "m2", key: "M2", position: 3 }),
    act({ id: "s1", key: "S1", type: "therapy_session", participants: "all", hasForm: false, isCompleted: true, position: 10 }),
    act({ id: "s2", key: "S2", type: "therapy_session", participants: "member_1", hasForm: false, position: 11, responsibleStaffId: "psi", blockingUnmet: 1 }),
  ],
  members,
  viewed: [{ activityId: "wel", profileId: "p" }, { activityId: "m0", profileId: "p" }, { activityId: "m0", profileId: "a" },
    { activityId: "m1", profileId: "p" }, { activityId: "m1", profileId: "a" }, { activityId: "m2", profileId: "p" }],
  submitted: [{ activityId: "m0", profileId: "p" }, { activityId: "m0", profileId: "a" }, { activityId: "m1", profileId: "p" }],
  sessions: [],
  now: new Date("2026-10-14T15:00:00Z"),
  ...o,
});

test("el video de bienvenida no cuenta como módulo", () => {
  assert.deepEqual(moduleRows(base()).map((r) => r.key), ["M0", "M1", "M2"]);
});

test("módulo visto y tarea entregada son cosas distintas", () => {
  const s = summarize(base());
  assert.equal(s.lastViewed?.key, "M1");
  assert.equal(s.lastSubmitted?.key, "M0");
  assert.deepEqual(s.partial, [{ key: "M1", who: "Pedro", what: "tarea" }, { key: "M2", who: "Pedro", what: "video" }]);
});

test("una tarea compartida la entrega uno por los dos", () => {
  const input = base({ acts: [act({ id: "m0", key: "M0", responseScope: "shared" })], submitted: [{ activityId: "m0", profileId: "a" }] });
  assert.equal(moduleRows(input)[0].submitted, true);
});

test("un módulo sin tarea no tiene tarea pendiente", () => {
  const input = base({ acts: [act({ id: "m0", key: "M0", hasForm: false })], submitted: [] });
  assert.equal(moduleRows(input)[0].submitted, null);
  assert.equal(summarize(input).lastSubmitted, null);
});

test("sesiones: hechas, siguiente y si falta agendarla", () => {
  const s = summarize(base());
  assert.equal(s.therapy.done, 1);
  assert.equal(s.therapy.total, 2);
  assert.equal(s.therapy.next?.key, "S2");
  assert.equal(s.therapy.next?.blockingUnmet, 1);
  assert.equal(s.toSchedule, true);
  const agendada = summarize(base({ sessions: [{ activityId: "s2", status: "scheduled", scheduledAt: "2026-10-20T18:00:00Z", staffId: "psi" }] }));
  assert.equal(agendada.toSchedule, false);
  assert.deepEqual(agendada.nextSession, { at: "2026-10-20T18:00:00Z", key: "S2" });
});

test("una sesión pasada no es la próxima", () => {
  const s = summarize(base({ sessions: [{ activityId: "s2", status: "scheduled", scheduledAt: "2026-10-01T18:00:00Z", staffId: null }] }));
  assert.equal(s.nextSession, null);
});

test("weeksLeft nunca baja de 1", () => {
  assert.equal(weeksLeft(null), 1);
  assert.equal(weeksLeft(0), 1);
  assert.equal(weeksLeft(15), 3);
});
