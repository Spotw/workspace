import test from "node:test";
import assert from "node:assert/strict";
import { clockAt, periodForHour } from "../public/coffee-time.js";

test("Vietnam lighting changes at 05:00, 12:00 and 18:00", () => {
  for (const [hour, period] of [[0, "evening"], [4, "evening"], [5, "morning"], [11, "morning"], [12, "afternoon"], [17, "afternoon"], [18, "evening"], [23, "evening"]]) {
    assert.equal(periodForHour(hour), period);
  }
});
test("clock uses Vietnam timezone, h23 and the local calendar date", () => {
  const midnight = clockAt(new Date("2026-11-19T17:00:00Z"));
  assert.equal(midnight.time, "00:00:00");
  assert.equal(midnight.period, "evening");
  assert.match(midnight.date, /20/);
  assert.equal(clockAt(new Date("2026-11-18T22:00:00Z")).period, "morning");
  assert.equal(clockAt(new Date("2026-11-19T05:00:00Z")).period, "afternoon");
});
