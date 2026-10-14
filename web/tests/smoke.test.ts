import { test } from "node:test";
import assert from "node:assert/strict";
import { firstName } from "../lib/process.ts";

test("firstName toma el primer nombre", () => {
  assert.equal(firstName("  Andrea  Demo "), "Andrea");
});
