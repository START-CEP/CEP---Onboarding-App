import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConfig, extrasPlan, parseFaq, parseItems, sessionLabel } from "../lib/activity-config.ts";

test("tipo de sesión: el configurado manda; si no, individual o de pareja", () => {
  assert.equal(sessionLabel({ session_label: "Sesión de coaching en pareja" }, "all"), "Sesión de coaching en pareja");
  assert.equal(sessionLabel({}, "member_1"), "Sesión individual");
  assert.equal(sessionLabel(null, "all"), "Sesión de terapia de pareja");
  assert.equal(sessionLabel({ session_label: "   " }, "all"), "Sesión de terapia de pareja");
});

test("contenidos extra: ignora lo mal formado", () => {
  assert.deepEqual(parseItems({ items: [{ asset_id: "a1", title: "Validación" }, { title: "sin asset" }, "x", { asset_id: 3 }] }), [{ asset_id: "a1", title: "Validación" }]);
  assert.deepEqual(parseItems({ items: "no es arreglo" }), []);
  assert.deepEqual(parseItems(null), []);
  assert.deepEqual(parseItems({ items: [{ asset_id: "a2" }] }), [{ asset_id: "a2", title: "" }]);
});

test("preguntas frecuentes: solo pares con pregunta y respuesta", () => {
  assert.deepEqual(parseFaq({ faq: [{ q: "¿Por qué coaching?", a: "Porque…" }, { q: "", a: "x" }, { q: "sola" }] }), [{ q: "¿Por qué coaching?", a: "Porque…" }]);
  assert.deepEqual(parseFaq([]), []);
});

test("buildConfig conserva claves desconocidas y limpia las vacías", () => {
  const cfg = buildConfig({ group_program_key: "cg" }, { url: " https://x.y ", sessionLabel: "", items: [{ asset_id: "a1", title: " Uno " }, { asset_id: "", title: "x" }], faq: [{ q: "P", a: "R" }, { q: " ", a: "" }] });
  assert.deepEqual(cfg, { group_program_key: "cg", url: "https://x.y", items: [{ asset_id: "a1", title: "Uno" }], faq: [{ q: "P", a: "R" }] });
  const cfg2 = buildConfig({ items: [{ asset_id: "old", title: "" }], session_label: "viejo" }, { items: [], sessionLabel: "Sesión individual" });
  assert.deepEqual(cfg2, { session_label: "Sesión individual" });
});

test("contenidos de un módulo bloqueado: no se prepara nada para firmar", () => {
  const assets = new Map([["v1", { kind: "video" }], ["p1", { kind: "pdf" }]]);
  const items = [{ asset_id: "v1", title: "Validación" }, { asset_id: "p1", title: "Guía" }, { asset_id: "x", title: "Sin asset" }];
  assert.deepEqual(extrasPlan(items, assets, true).map((e) => e.kind), ["locked", "locked", "locked"]);
  assert.deepEqual(extrasPlan(items, assets, false).map((e) => e.kind), ["video", "file", "missing"]);
  assert.equal(extrasPlan(items, assets, false)[2].title, "Sin asset");
});
