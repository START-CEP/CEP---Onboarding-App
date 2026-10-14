import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappUrl } from "../lib/contact.ts";

test("sin número configurado no hay enlace", () => {
  delete process.env.NEXT_PUBLIC_WHATSAPP_ASSISTANT;
  assert.equal(whatsappUrl("hola"), null);
});

test("arma wa.me con el texto codificado", () => {
  process.env.NEXT_PUBLIC_WHATSAPP_ASSISTANT = "+506 4070-1200";
  assert.equal(whatsappUrl("Cambiar S4 ¿sí?"), "https://wa.me/50640701200?text=Cambiar%20S4%20%C2%BFs%C3%AD%3F");
});
