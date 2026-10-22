/**
 * An adventure file comes from someone else's phone. Whatever it holds, reading it ends in a refusal the app can say
 * (an AdventureFileError with a reason in ADVENTURE_FILE_REFUSALS) or in an adventure inside the rules of
 * data-rules.md R122 and R123: nothing else escapes, nothing the editors could not have made gets through, and what
 * was accepted reads the same once written out again.
 *
 * Random edits of a valid file, 300 per run by default (ADVENTURE_RUNS=5000 for a long one, ADVENTURE_SEED replays
 * a failure fast-check printed).
 */
import fc from "fast-check";

import { type Device, newDevice } from "../harness/device";

let device: Device;
beforeAll(async () => {
  device = await newDevice("A");
});
afterAll(() => device.close());
// The device's own copy of the module: its AdventureFileError is the one its parser throws.
const parse = (raw: string) => device.app.adventure.parseAdventureData(JSON.parse(raw));

const SEED = {
  kind: "bati-adventure",
  version: 1,
  adventure: {
    uuid: "0192b000-0000-7000-8000-000000000001",
    title: "The long road",
    description: "Three days to the pass.",
    cover: "the_golem",
    end: { kind: "boss", monster: "stone_golem" },
  },
  steps: [
    { quest: { official: "Iron Dawn" }, narrative: "The forest freezes.", outro: "You made it." },
    {
      quest: {
        own: {
          quest: {
            uuid: "0192b000-0000-7000-8000-000000000002",
            title: {
              en: "Iron morning",
              fr: "Matin de fer",
              de: "Eisenmorgen",
              es: "Mañana de hierro",
            },
            description: {
              en: "Three rounds.",
              fr: "Trois tours.",
              de: "Drei Runden.",
              es: "Tres rondas.",
            },
            rounds: 3,
            restSeconds: 30,
            roundRestSeconds: 60,
            image: null,
          },
          slots: [
            { movement: { official: "Squat" }, target: { type: "reps", min: 8, max: 12 } },
            {
              movement: {
                own: {
                  uuid: "0192b000-0000-7000-8000-000000000003",
                  name: "Garden dip",
                  description: "Between two chairs.",
                  image: "assets/placeholder.jpg",
                  muscles: ["chest", "arms"],
                  style: "calisthenics",
                  difficulty: "medium",
                  equipment: "dip_bar",
                  pattern: "push_vertical",
                  measure: "reps",
                  perSide: false,
                  secondsPerRep: 3,
                },
              },
              target: { type: "reps", min: 5, max: 10 },
            },
          ],
        },
      },
      narrative: "",
      outro: "",
    },
    { quest: { official: "Stone Hour" }, narrative: "The pass.", outro: "" },
  ],
};

type Path = (string | number)[];
function leaves(value: unknown, path: Path = []): Path[] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, [...path, Array.isArray(value) ? Number(key) : key]),
    );
  }
  return [path];
}
const PATHS = leaves(SEED);

function setAt(root: unknown, path: Path, value: unknown): unknown {
  if (path.length === 0) return value;
  const copy = Array.isArray(root) ? [...root] : { ...(root as object) };
  const [head, ...rest] = path as [string | number, ...Path];
  (copy as Record<string | number, unknown>)[head] = setAt(
    (root as Record<string | number, unknown>)[head],
    rest,
    value,
  );
  return copy;
}

/** Odd things a hostile writer puts in a field: huge, invisible, a URL, a number where text goes. */
const hostile = fc.oneof(
  fc.anything(),
  fc.string({ minLength: 0, maxLength: 20_000 }),
  fc.constantFrom(
    "http://evil.example/p.png",
    "file:///data/data/app/x",
    "content://x/y",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "../../etc/passwd",
    "a\u0000b‮c​d",
    "\u{1F468}‍\u{1F469}",
    "😀".repeat(70),
    -1e308,
    1e308,
    Number.NaN,
    "",
    "route",
    "boss",
  ),
);

const edited = fc
  .array(fc.tuple(fc.nat(PATHS.length - 1), hostile), { minLength: 1, maxLength: 4 })
  .map((edits) =>
    edits.reduce<unknown>((file, [index, value]) => setAt(file, PATHS[index] ?? [], value), SEED),
  );

/** Control characters (tab and new line allowed) and the invisible format ones R67 strips. */
const INVISIBLE = new Set([0x7f, 0x200b, 0x200e, 0x200f, 0xfeff]);
function noControls(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const control = code < 0x20 && code !== 0x09 && code !== 0x0a;
    const bidi = (code >= 0x202a && code <= 0x202e) || (code >= 0x2060 && code <= 0x2064);
    if (control || bidi || INVISIBLE.has(code)) return false;
  }
  return true;
}
const strings = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : value !== null && typeof value === "object"
      ? Object.values(value).flatMap(strings)
      : [];

const runs = Number(process.env.ADVENTURE_RUNS ?? 300);
const seed = process.env.ADVENTURE_SEED ? Number(process.env.ADVENTURE_SEED) : undefined;
const KEY = /^[a-z0-9_]{1,64}$/;
const lonePair = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

function attempt(file: unknown) {
  try {
    return { adventure: parse(JSON.stringify(file)) };
  } catch (error) {
    return { error };
  }
}

/** R122 and R123 as checks on what a parse returned. */
function insideTheRules(file: ReturnType<typeof parse>): void {
  expect(file.steps.length).toBeGreaterThanOrEqual(2);
  expect(file.steps.length).toBeLessThanOrEqual(8);
  const a = file.adventure;
  expect(a.title.length).toBeGreaterThan(0);
  expect(a.title.length).toBeLessThanOrEqual(60);
  expect(a.description.length).toBeLessThanOrEqual(280);
  expect(lonePair.test(a.title + a.description)).toBe(false);
  expect(a.cover === null || KEY.test(a.cover)).toBe(true);
  expect(a.end.kind !== "boss" || KEY.test(a.end.monster)).toBe(true);
  for (const step of file.steps) {
    expect(step.narrative.length).toBeLessThanOrEqual(160);
    expect(step.outro.length).toBeLessThanOrEqual(160);
    expect(lonePair.test(step.narrative + step.outro)).toBe(false);
    for (const text of strings(step)) expect(noControls(text)).toBe(true);
    if (!("own" in step.quest)) continue;
    const q = step.quest.own;
    expect(q.slots.length).toBeGreaterThanOrEqual(1);
    expect(q.slots.length).toBeLessThanOrEqual(40);
    expect(q.quest.title.en.length).toBeGreaterThan(0);
    for (const text of strings(q.quest)) expect(text.length).toBeLessThanOrEqual(2_000);
    // An image is a data: picture or a bundled asset path, never an address the app would fetch.
    const images = [
      q.quest.image,
      ...q.slots.map((s) => ("own" in s.movement ? s.movement.own.image : null)),
    ];
    for (const image of images) {
      if (image === null) continue;
      expect(image).toMatch(/^(data:image\/(jpeg|png|webp);base64,|[A-Za-z0-9_\-./]+$)/);
      expect(image).not.toContain("..");
    }
  }
}

describe("an adventure file with random damage", () => {
  test("the valid file is accepted as it is", () => {
    expect(attempt(SEED).error).toBeUndefined();
  });

  test("is refused with a reason the app can say, or accepted inside the rules", () => {
    fc.assert(
      fc.property(edited, (file) => {
        const { adventure, error } = attempt(file);
        // Refused with a reason the app can say, or not refused at all.
        expect(
          error === undefined ||
            (error instanceof device.app.adventure.AdventureFileError &&
              device.app.adventure.ADVENTURE_FILE_REFUSALS.includes(error.reason)),
        ).toBe(true);
        if (error) return;
        if (!adventure) throw new Error("expected an adventure");
        insideTheRules(adventure);
      }),
      { numRuns: runs, seed },
    );
  });

  test("what was accepted reads the same once written out again", () => {
    fc.assert(
      fc.property(edited, (file) => {
        const { adventure } = attempt(file);
        if (!adventure) return;
        expect(parse(JSON.stringify(adventure))).toEqual(adventure);
      }),
      { numRuns: runs, seed },
    );
  });
});
