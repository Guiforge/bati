import assert from "node:assert/strict";
import { syntheticFixes } from "@/db/devSeedExpedition";

jest.mock("@/db/client", () => ({ db: {}, schema: {} }));

import { toTrace } from "@/src/gps/trace";
import { accept, EMPTY } from "@/src/gps/track";

/**
 * The seeded outing goes through the code the app calls. A 2.9 +/- 0.9 m/s walker tops out at
 * 3.8 m/s: nothing here may read faster than that, the average may not leave the colour ramp, and
 * moving time must agree with distance over the generator's mean speed.
 */
const fixes = syntheticFixes(0);
let track = EMPTY;
for (const fix of fixes) track = accept(track, fix);
const trace = toTrace(fixes);

it("reports a best league the walker could have run", () => {
  assert(trace.bestLeague);
  const secPerKm = (trace.bestLeague.ms / trace.bestLeague.metres) * 1000;
  expect(secPerKm).toBeGreaterThan(1000 / 3.8);
});

it("keeps the average pace between the ramp's ends", () => {
  assert(trace.speedRange);
  const avg = track.distanceM / (track.movingMs / 1000);
  expect(avg).toBeGreaterThanOrEqual(trace.speedRange[0]);
  expect(avg).toBeLessThanOrEqual(trace.speedRange[1]);
});

it("moving time agrees with distance over the walker's mean speed", () => {
  const expected = track.distanceM / 2.9;
  expect(track.movingMs / 1000).toBeGreaterThan(expected * 0.9);
  expect(track.movingMs / 1000).toBeLessThan(expected * 1.1);
});
