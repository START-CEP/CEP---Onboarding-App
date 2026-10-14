import { test } from "node:test";
import assert from "node:assert/strict";
import { icsEvent } from "../lib/ics.ts";

test("evento iCalendar válido", () => {
  const ics = icsEvent({ uid: "abc", title: "Coaching, grupal", start: new Date("2026-10-22T16:00:00Z"), minutes: 90, url: "https://meet.example.com/x" });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261022T160000Z\r\n/);
  assert.match(ics, /DTEND:20261022T173000Z\r\n/);
  assert.match(ics, /SUMMARY:Coaching\\, grupal\r\n/);
  assert.match(ics, /UID:abc@cep\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});
