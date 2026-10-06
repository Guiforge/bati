/**
 * A quest file comes from someone else's phone. Whatever it holds, reading it ends in a refusal the app can say
 * (a QuestFileError) or in a quest inside the rules of data-rules.md R67 and R68: nothing else escapes, nothing
 * the editors could not have made gets through, and what was accepted reads the same once written out again.
 *
 * Random edits of a valid file, 300 per run by default (QUEST_RUNS=5000 for a long one, the seed is printed
 * by fast-check on a failure and replays it with QUEST_SEED).
 */
import fc from "fast-check";

import { type Device, newDevice } from "../harness/device";

let device: Device;
beforeAll(async () => {
  device = await newDevice("Q");
});
afterAll(() => device.close());
// The device's own copy of the module: its QuestFileError is the one its parser throws.
const parseQuestFile = (raw: string) => device.app.quest.parseQuestFile(raw);

const SEED = {
  kind: "bati-quest",
  version: 1,
  quest: {
    uuid: "0192a000-0000-7000-8000-000000000001",
    title: { en: "Iron morning", fr: "Matin de fer", de: "Eisenmorgen", es: "Mañana de hierro" },
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
          uuid: "0192a000-0000-7000-8000-000000000002",
          name: "Garden dip",
          description: "Between two chairs.",
          image: "",
          muscles: ["chest", "arms"],
          style: "calisthenics",
          difficulty: "medium",
          equipment: "dip_bar",
          pattern: "push_vertical",
          measure: "reps",
          secondsPerRep: 3,
        },
      },
      target: { type: "reps", min: 5, max: 10 },
    },
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
    -1e308,
    1e308,
    Number.NaN,
    "",
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

const runs = Number(process.env.QUEST_RUNS ?? 300);
const seed = process.env.QUEST_SEED ? Number(process.env.QUEST_SEED) : undefined;

function attempt(file: unknown) {
  try {
    return { quest: parseQuestFile(JSON.stringify(file)) };
  } catch (error) {
    return { error };
  }
}

/** R67 and R68 as checks on what a parse returned. */
function insideTheRules(quest: ReturnType<typeof parseQuestFile>): void {
  expect(quest.slots.length).toBeGreaterThanOrEqual(1);
  expect(quest.slots.length).toBeLessThanOrEqual(40);
  expect(quest.quest.title.en.length).toBeGreaterThan(0);
  for (const text of strings(quest.quest)) expect(text.length).toBeLessThanOrEqual(2_000);
  for (const text of strings(quest.slots)) expect(noControls(text)).toBe(true);
  // An image is a data: picture or a bundled asset path, never an address the app would fetch.
  const images = [
    quest.quest.image,
    ...quest.slots.map((s) => ("own" in s.movement ? s.movement.own.image : null)),
  ];
  for (const image of images) {
    if (image === null) continue;
    expect(image).toMatch(/^(data:image\/(jpeg|png|webp);base64,|[A-Za-z0-9_\-./]+$)/);
    expect(image).not.toContain("..");
  }
  for (const slot of quest.slots) {
    expect(slot.target.min).toBeLessThanOrEqual(slot.target.max);
    expect(Number.isFinite(slot.target.min) && Number.isFinite(slot.target.max)).toBe(true);
  }
}

describe("a quest file with random damage", () => {
  test("the valid file is accepted as it is", () => {
    expect(attempt(SEED).error).toBeUndefined();
  });

  test("is refused with a reason the app can say, or accepted inside the rules", () => {
    fc.assert(
      fc.property(edited, (file) => {
        const { quest, error } = attempt(file);
        if (error) {
          expect(error).toBeInstanceOf(device.app.quest.QuestFileError);
          expect(device.app.quest.QUEST_FILE_REFUSALS).toContain(
            (error as { reason: never }).reason,
          );
          return;
        }
        assert(quest);
        insideTheRules(quest);
      }),
      { numRuns: runs, seed },
    );
  });

  test("what was accepted reads the same once written out again", () => {
    fc.assert(
      fc.property(edited, (file) => {
        const { quest } = attempt(file);
        if (!quest) return;
        expect(parseQuestFile(JSON.stringify(quest))).toEqual(quest);
      }),
      { numRuns: runs, seed },
    );
  });
});

function assert(value: unknown): asserts value {
  if (!value) throw new Error("expected a quest");
}
