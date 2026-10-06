/**
 * The GPX a hero hands to Strava, Garmin or Komoot (data-rules.md section 6): whatever the track and whatever the
 * name, the file is well-formed XML and valid against the GPX 1.1 schema (topografix.com, kept beside this test),
 * checked by xmllint, which is not our code and not forgiving.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import fc from "fast-check";

import { toGpx } from "../../../src/gps/gpx";

const XSD = path.join(__dirname, "gpx11.xsd");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-gpx-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

/** xmllint's verdict on `xml`: null when valid, its complaint when not. */
function complaint(xml: string): string | null {
  const file = path.join(dir, `${Math.random().toString(36).slice(2)}.gpx`);
  fs.writeFileSync(file, xml);
  try {
    execFileSync("xmllint", ["--noout", "--schema", XSD, file], { stdio: "pipe" });
    return null;
  } catch (error) {
    return String((error as { stderr?: Buffer }).stderr ?? error).slice(0, 400);
  }
}

const fix = fc.record({
  t: fc.integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2035, 0, 1) }),
  lat: fc.double({ min: -90, max: 90, noNaN: true }),
  lon: fc.double({ min: -180, max: 180, noNaN: true }),
  ele: fc.option(fc.double({ min: -500, max: 9000, noNaN: true }), { nil: null }),
  baro: fc.constant(null),
  acc: fc.double({ min: 1, max: 100, noNaN: true }),
  speed: fc.option(fc.double({ min: 0, max: 60, noNaN: true }), { nil: null }),
  distFromPrev: fc.double({ min: 0, max: 5000, noNaN: true }),
});

const runs = Number(process.env.GPX_RUNS ?? 60);
const seed = process.env.GPX_SEED ? Number(process.env.GPX_SEED) : undefined;

describe("toGpx", () => {
  test("a plain track is valid GPX 1.1", () => {
    const xml = toGpx(
      [
        {
          t: 1_700_000_000_000,
          lat: 48.85,
          lon: 2.35,
          ele: 35,
          baro: null,
          acc: 5,
          speed: 1.2,
          distFromPrev: 0,
        },
        {
          t: 1_700_000_005_000,
          lat: 48.8501,
          lon: 2.3501,
          ele: null,
          baro: null,
          acc: 5,
          speed: null,
          distFromPrev: 12,
        },
      ],
      { name: "Morning run", totalDistanceM: 12 },
    );
    expect(complaint(xml)).toBeNull();
  });

  test("no fix at all is still a valid file", () => {
    expect(complaint(toGpx([], { name: "Nothing recorded" }))).toBeNull();
  });

  test("any track is valid: coordinates at the edges, near zero, with and without altitude and speed", () => {
    fc.assert(
      fc.property(fc.array(fix, { maxLength: 30 }), (fixes) => {
        expect(complaint(toGpx(fixes, { name: "Track", totalDistanceM: 1234.5 }))).toBeNull();
      }),
      { numRuns: runs, seed },
    );
  });

  test("any name is valid: markup, quotes, emoji, control characters, very long", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ unit: "binary", maxLength: 300 }), fc.string({ maxLength: 5000 })),
        (name) => {
          const xml = toGpx(
            [
              {
                t: 1_700_000_000_000,
                lat: 1,
                lon: 2,
                ele: null,
                baro: null,
                acc: 5,
                speed: null,
                distFromPrev: 0,
              },
            ],
            { name },
          );
          expect(complaint(xml)).toBeNull();
        },
      ),
      { numRuns: runs, seed },
    );
  });
});
