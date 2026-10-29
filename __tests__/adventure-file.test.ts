import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * An adventure file arrives from someone else's phone, so every field of it is a trust boundary,
 * and a file Bati writes must never be one its own reader refuses (R122 to R125). Held here: what
 * is refused and why, the round trip, the worst cases the editors allow, what the preview says,
 * and what an import does and does not touch. The database is the real one (migrations included);
 * a plain BEGIN and ROLLBACK stand in for `transactionOrFallback`, as in `quest-file.test.ts`.
 */
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

type AdventureModule = typeof import("../src/adventureFile");
type AdventureFile = import("../src/adventureFile").AdventureFile;

const bytes = (...parts: (number | string)[]) =>
  Uint8Array.from(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : [p])),
  );
const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];

/** SOI, a JFIF APP0, then SOF0: a header `safeImage` can size. */
function jpeg(width: number, height: number, exif = false): Uint8Array {
  const app1 = exif ? [0xff, 0xe1, ...be16(10), "Exif\0\0", 0, 0] : [];
  const app0 = [0xff, 0xe0, ...be16(16), "JFIF\0", 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof0 = [0xff, 0xc0, ...be16(17), 8, ...be16(height), ...be16(width), 3];
  return bytes(0xff, 0xd8, ...app1, ...app0, ...sof0, ...Array<number>(15).fill(0));
}

/** A `data:` JPEG of `chars` characters (rounded down to what base64 allows), `width` x `height` by its header. */
function photo(chars: number, width = 64, height = 48, exif = false): string {
  const prefix = "data:image/jpeg;base64,";
  const size = Math.max(
    3 * Math.floor((chars - prefix.length) / 4),
    jpeg(width, height, exif).length,
  );
  const body = new Uint8Array(size);
  body.set(jpeg(width, height, exif));
  return `${prefix}${Buffer.from(body).toString("base64")}`;
}

const PLACEHOLDER = "assets/placeholder.jpg";
const MAX_FILE_BYTES = 8_000_000;
const utf8 = (s: string) => Buffer.byteLength(s, "utf8");

const t = createTestDb();

beforeAll(() => {
  jest.resetModules();
  jest.doMock("../db/client", () => ({
    ...clientMock(t),
    transactionOrFallback: async <T>(fn: (tx: never) => Promise<T>) => {
      t.sqlite.exec("BEGIN");
      try {
        const result = await fn(t.db as never);
        t.sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        t.sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  }));
});

afterAll(() => {
  t.close();
});

/** A file as the screen reads it: parsed JSON, then checked. */
const parseJson = (raw: string) => load().adv.parseAdventureData(JSON.parse(raw));

const load = () => ({
  adv: require("../src/adventureFile") as AdventureModule,
  quest: require("../src/questFile") as typeof import("../src/questFile"),
  hero: require("../db/heroAdventures") as typeof import("../db/heroAdventures"),
  adventures: require("../db/adventures") as typeof import("../db/adventures"),
  uuid: require("../db/uuid") as typeof import("../db/uuid"),
});

const count = (table: string) =>
  (t.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
const counts = () => ({
  quests: count("quests"),
  slots: count("quest_exercises"),
  exercises: count("exercises"),
  adventures: count("adventures"),
  steps: count("adventure_steps"),
});

const seedQuests = () =>
  t.sqlite
    .prepare("SELECT id, enTitle FROM quests WHERE author = 'Admin' ORDER BY id LIMIT 4")
    .all() as {
    id: number;
    enTitle: string;
  }[];
const seedMovement = () =>
  (
    t.sqlite
      .prepare(
        "SELECT enName FROM exercises WHERE creator = 'Admin' AND style = 'calisthenics' LIMIT 1",
      )
      .get() as { enName: string }
  ).enName;

/** Rows edited in SQL under the caches: the next read must see them. */
const refresh = () => {
  require("../db/quests").invalidateQuestTemplates();
  require("../db/exercises").invalidateExercisesCache();
};

// ---------------------------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------------------------

type OwnSpec = { uuid: string; name?: string; image?: string };

function movement(spec: OwnSpec) {
  return {
    movement: {
      own: {
        uuid: spec.uuid,
        name: spec.name ?? "Porch dip",
        description: "Hands on the step.",
        image: spec.image ?? PLACEHOLDER,
        muscles: ["arms"],
        style: "strength",
        difficulty: "easy",
        equipment: "none",
        pattern: null,
        measure: "reps",
        perSide: false,
        secondsPerRep: 3,
      },
    },
    target: { type: "reps", min: 5, max: 10 },
  };
}

/** A quest body as a file carries it: `own` movements by spec, `official` seed movements by name. */
function questBody(
  uuid: string,
  {
    title = "Porch forge",
    own = [],
    official = [],
    image = null,
  }: {
    title?: string;
    own?: OwnSpec[];
    official?: string[];
    image?: string | null;
  } = {},
) {
  // A quest with no movement is not a quest: the default is one seed movement.
  const officialNames = official.length === 0 && own.length === 0 ? [seedMovement()] : official;
  return {
    quest: {
      uuid,
      title: { en: title, fr: title, de: title, es: title },
      description: { en: "Before coffee.", fr: "", de: "", es: "" },
      rounds: 3,
      restSeconds: 45,
      roundRestSeconds: null,
      image,
    },
    slots: [
      ...officialNames.map((name) => ({
        movement: { official: name },
        target: { type: "reps", min: 8, max: 12 },
      })),
      ...own.map(movement),
    ],
  };
}

function adventureLiteral(
  uuid: string,
  steps: unknown[],
  over: Record<string, unknown> = {},
  end: unknown = { kind: "route" },
) {
  return {
    kind: "bati-adventure",
    version: 1,
    adventure: {
      uuid,
      title: "The long road",
      description: "Three days.",
      cover: null,
      end,
      ...over,
    },
    steps: steps.map((quest, i) => ({
      quest,
      narrative: `before ${i}`,
      outro: i === 0 ? "after" : "",
    })),
  };
}

/** Parsed through the real reader, so a test builds only what a reader can return. */
const fileOf = (literal: unknown): AdventureFile => load().adv.parseAdventureData(literal);

let seq = 0;
const nextUuid = () => {
  seq += 1;
  return `0192b000-0000-7000-8000-${String(seq).padStart(12, "0")}`;
};

/** A hero quest on the phone, made the way an import makes one, with the movements and pictures given. */
async function heroQuest(
  spec: Parameters<typeof questBody>[1] = {},
): Promise<{ id: number; uuid: string; movements: string[] }> {
  const { quest } = load();
  const uuid = nextUuid();
  const own = (spec.own ?? []).map((o) => ({ ...o }));
  const body = questBody(uuid, { ...spec, own, official: spec.official ?? [seedMovement()] });
  const { id } = await quest.importQuest({
    kind: "bati-quest",
    version: 1,
    ...quest.parseQuestBody(body),
  });
  return { id, uuid, movements: own.map((o) => o.uuid) };
}

function draftOf(
  questIds: number[],
  over: Partial<import("../db/heroAdventures").HeroAdventureDraft> = {},
) {
  return {
    title: "Tale",
    description: "A tale",
    imagePath: "the_golem" as const,
    end: { kind: "route" as const },
    steps: questIds.map((questId, i) => ({ questId, narrative: `before ${i}`, outro: "" })),
    ...over,
  };
}

async function heroAdventure(questIds: number[], over = {}) {
  const { hero } = load();
  const id = await hero.createHeroAdventure(draftOf(questIds, over));
  const draft = await hero.loadHeroAdventureDraft(id);
  assert(draft?.uuid);
  return { id, uuid: draft.uuid };
}

/** The distinct pictures a reader returns: movements by uuid, covers by quest uuid. */
function dataImages(file: AdventureFile): Set<string> {
  const found = new Set<string>();
  for (const s of file.steps) {
    if (!("own" in s.quest)) continue;
    if (s.quest.own.quest.image?.startsWith("data:")) found.add(`quest:${s.quest.own.quest.uuid}`);
    for (const slot of s.quest.own.slots) {
      if ("own" in slot.movement && slot.movement.own.image.startsWith("data:")) {
        found.add(slot.movement.own.uuid);
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

describe("reading an adventure file", () => {
  const valid = () => {
    const [a, b] = seedQuests();
    assert(a && b);
    return adventureLiteral(nextUuid(), [{ official: a.enTitle }, { official: b.enTitle }]);
  };
  const reason = (value: unknown) => {
    try {
      load().adv.parseAdventureData(value);
    } catch (error) {
      if (error instanceof load().adv.AdventureFileError) return error.reason;
      throw error;
    }
    return null;
  };
  const withAdventure = (over: Record<string, unknown>) => {
    const v = valid();
    return { ...v, adventure: { ...v.adventure, ...over } };
  };

  test("a valid file reads, and only the fields it names", () => {
    const read = load().adv.parseAdventureData(valid());
    expect(Object.keys(read).sort()).toEqual(["adventure", "kind", "steps", "version"]);
    expect(read.steps).toHaveLength(2);
  });

  // The preview lists every step and the import writes the first copy of a uuid, so two
  // contents under one uuid would show the hero one thing and write another.
  test("a uuid carried by two different quests or movements refuses the file", () => {
    const q = nextUuid();
    const m = nextUuid();
    const twice = (a: unknown, b: unknown) =>
      reason(adventureLiteral(nextUuid(), [{ own: a }, { own: b }]));
    expect(
      twice(
        questBody(q, { own: [{ uuid: m }] }),
        questBody(q, { title: "Other", own: [{ uuid: m }] }),
      ),
    ).toBe("not_an_adventure");
    expect(
      twice(
        questBody(nextUuid(), { own: [{ uuid: m, name: "Porch dip" }] }),
        questBody(nextUuid(), { own: [{ uuid: m, name: "Something else" }] }),
      ),
    ).toBe("not_an_adventure");
    // The same quest on two steps, and the same movement in two quests, are one thing each.
    expect(
      twice(questBody(q, { own: [{ uuid: m }] }), questBody(q, { own: [{ uuid: m }] })),
    ).toBeNull();
    expect(
      twice(
        questBody(nextUuid(), { own: [{ uuid: m }] }),
        questBody(nextUuid(), { own: [{ uuid: m }] }),
      ),
    ).toBeNull();
  });

  test.each([
    [
      "kind missing",
      (v: Record<string, unknown>) => ({ ...v, kind: undefined }),
      "not_an_adventure",
    ],
    [
      "a quest file",
      (v: Record<string, unknown>) => ({ ...v, kind: "bati-quest" }),
      "not_an_adventure",
    ],
    ["version 3", (v: Record<string, unknown>) => ({ ...v, version: 3 }), "newer"],
    ["version 0", (v: Record<string, unknown>) => ({ ...v, version: 0 }), "not_an_adventure"],
    ["version 1.5", (v: Record<string, unknown>) => ({ ...v, version: 1.5 }), "not_an_adventure"],
    [
      "version as a string",
      (v: Record<string, unknown>) => ({ ...v, version: "1" }),
      "not_an_adventure",
    ],
    [
      "one step",
      (v: Record<string, unknown>) => ({ ...v, steps: (v.steps as unknown[]).slice(0, 1) }),
      "not_an_adventure",
    ],
    [
      "nine steps",
      (v: Record<string, unknown>) => ({
        ...v,
        steps: Array((v.steps as unknown[]).length + 7).fill((v.steps as unknown[])[0]),
      }),
      "newer",
    ],
    [
      "steps an object",
      (v: Record<string, unknown>) => ({ ...v, steps: { 0: 1 } }),
      "not_an_adventure",
    ],
    [
      "adventure missing",
      (v: Record<string, unknown>) => ({ ...v, adventure: 3 }),
      "not_an_adventure",
    ],
    ["not an object", () => [1, 2], "not_an_adventure"],
  ])("%s", (_name, damage, expected) => {
    expect(reason(damage(valid() as unknown as Record<string, unknown>))).toBe(expected);
  });

  test.each([
    ["an uppercase uuid", { uuid: "0192B000-0000-7000-8000-000000000001" }],
    ["a v4 uuid", { uuid: "0192b000-0000-4000-8000-000000000001" }],
    ["an http cover", { cover: "http://x.test/a.png" }],
    ["a data cover", { cover: "data:image/png;base64,AAAA" }],
    ["a path cover", { cover: "../a" }],
    ["a numeric cover", { cover: 7 }],
    ["an undefined cover", { cover: undefined }],
    ["an empty title", { title: "​  " }],
    ["a title past 4x", { title: "x".repeat(241) }],
    ["an end that is not an object", { end: "boss" }],
    ["an end kind that is not a string", { end: { kind: 3 } }],
    ["a monster with a path", { end: { kind: "boss", monster: "../x" } }],
    ["a boss with no monster", { end: { kind: "boss" } }],
  ])("%s is not an adventure", (_name, over) => {
    expect(reason(withAdventure(over))).toBe("not_an_adventure");
  });

  test("an end kind this version lacks is newer", () => {
    expect(reason(withAdventure({ end: { kind: "dungeon" } }))).toBe("newer");
  });

  test.each([
    ["both official and own", (q: Record<string, unknown>) => ({ ...q, own: {} })],
    ["neither", () => ({})],
    ["a quest that is not an object", () => 7],
  ])("a step with %s is not an adventure", (_name, quest) => {
    const v = valid();
    const steps = [
      { ...v.steps[0], quest: quest(v.steps[0]?.quest as Record<string, unknown>) },
      v.steps[1],
    ];
    expect(reason({ ...v, steps })).toBe("not_an_adventure");
  });

  test("an embedded quest is held to every quest-file rule", () => {
    const v = valid();
    const own = (body: unknown) => ({
      ...v,
      steps: [{ ...v.steps[0], quest: { own: body } }, v.steps[1]],
    });
    const ok = () => questBody(nextUuid(), { official: [seedMovement()] });
    expect(reason(own(ok()))).toBeNull();
    const many = ok();
    many.slots = Array(41).fill(many.slots[0]);
    expect(reason(own(many))).toBe("not_an_adventure");
    const badUuid = questBody(nextUuid(), { own: [{ uuid: "nope" }] });
    expect(reason(own(badUuid))).toBe("not_an_adventure");
    const style = questBody(nextUuid(), { own: [{ uuid: nextUuid() }] });
    const first = style.slots[0];
    assert(first);
    (first.movement as { own: { style: string } }).own.style = "parkour";
    expect(reason(own(style))).toBe("newer");
  });

  test("texts are cleaned and cut: a title at 60, a narrative at 160, past 4x refused", () => {
    const read = (over: Record<string, unknown>, step: Record<string, unknown> = {}) => {
      const v = withAdventure(over);
      return load().adv.parseAdventureData({
        ...v,
        steps: [{ ...v.steps[0], ...step }, v.steps[1]],
      });
    };
    expect(read({ title: "x".repeat(200) }).adventure.title).toHaveLength(60);
    expect(read({}, { narrative: "y".repeat(500) }).steps[0]?.narrative).toHaveLength(160);
    expect(
      reason({
        ...withAdventure({}),
        steps: [{ ...valid().steps[0], narrative: "y".repeat(641) }, valid().steps[1]],
      }),
    ).toBe("not_an_adventure");
    // A bidi override and a zero-width space are out of the title and the narrative; a ZWJ stays.
    expect(read({ title: "Ro‮ad​" }).adventure.title).toBe("Road");
    expect(read({}, { narrative: "go​‮ on" }).steps[0]?.narrative).toBe("go on");
    expect(read({ title: "👩‍🚀" }).adventure.title).toBe("👩‍🚀");
  });

  // `text()` cuts by code point, the writer by UTF-16 unit: a title of 60 emoji must not be
  // recut by the writer into half a pair.
  test("a title is cut in UTF-16 units without leaving half a pair", () => {
    const title = load().adv.parseAdventureData(withAdventure({ title: `a${"😀".repeat(59)}` }))
      .adventure.title;
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toBe(`a${"😀".repeat(29)}`);
    expect(/[\ud800-\udbff](?![\udc00-\udfff])/.test(title)).toBe(false);
  });

  test("a cover this version lacks reads and lands as the default cover; a known one as itself", async () => {
    const { adv } = load();
    const [a, b] = seedQuests();
    assert(a && b);
    const steps = [{ official: a.enTitle }, { official: b.enTitle }];
    const future = fileOf(adventureLiteral(nextUuid(), steps, { cover: "some_future_art" }));
    expect(future.adventure.cover).toBe("some_future_art");
    const known = fileOf(adventureLiteral(nextUuid(), steps, { cover: "the_golem" }));

    const first = await adv.importAdventure(future, { asCopy: false });
    const second = await adv.importAdventure(known, { asCopy: false });
    const cover = (id: number) =>
      (
        t.sqlite.prepare("SELECT imagePath FROM adventures WHERE id = ?").get(id) as {
          imagePath: string;
        }
      ).imagePath;
    expect(cover(second.id)).toBe("the_golem");
    expect(cover(first.id)).not.toBe("some_future_art");
  });

  test("__proto__ and extra keys change nothing", () => {
    const v = JSON.parse(
      JSON.stringify(valid()).replace(
        '"kind":"bati-adventure"',
        '"__proto__":{"isActive":0},"kind":"bati-adventure"',
      ),
    );
    v.adventure.extra = 1;
    v.steps[0].isActive = 0;
    const read = load().adv.parseAdventureData(v);
    expect(Object.getPrototypeOf(read)).toBe(Object.prototype);
    expect("extra" in read.adventure).toBe(false);
    expect(Object.keys(read.steps[0] ?? {}).sort()).toEqual(["narrative", "outro", "quest"]);
  });

  test("an embedded movement photo that is a URL reads as the placeholder", () => {
    const v = valid();
    const body = questBody(nextUuid(), {
      own: [{ uuid: nextUuid(), image: "https://x.test/p.jpg" }],
    });
    const read = load().adv.parseAdventureData({
      ...v,
      steps: [{ ...v.steps[0], quest: { own: body } }, v.steps[1]],
    });
    const quest = read.steps[0]?.quest;
    assert(quest && "own" in quest);
    const slot = quest.own.slots[0]?.movement;
    assert(slot && "own" in slot);
    expect(slot.own.image).toBe(PLACEHOLDER);
  });
});

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

describe("writing an adventure file", () => {
  const written = async (id: number) => {
    const out = await load().adv.adventureToFile(id);
    assert(out);
    return out;
  };

  test("a seed quest travels by its title, a hero quest whole; a file reads back as written", async () => {
    const [seed] = seedQuests();
    assert(seed);
    const mine = await heroQuest({ own: [{ uuid: nextUuid(), image: photo(2_000) }] });
    const { id, uuid } = await heroAdventure([seed.id, mine.id]);

    const out = await written(id);

    expect(out.file.adventure.uuid).toBe(uuid);
    expect(out.file.steps[0]?.quest).toEqual({ official: seed.enTitle });
    const own = out.file.steps[1]?.quest;
    assert(own && "own" in own);
    expect(own.own.quest.uuid).toBe(mine.uuid);
    expect(out.photos).toBe(1);
    expect(out.leftOut).toBe(0);
    expect(out.stepsLeft).toBe(0);
    // Nothing of a run, a fight, a sender or a date.
    expect(Object.keys(out.file.adventure).sort()).toEqual([
      "cover",
      "description",
      "end",
      "title",
      "uuid",
    ]);
    expect(parseJson(out.json)).toEqual(out.file);
  });

  test("a step whose quest is gone is left out and counted; under two left there is no file", async () => {
    const [a, b, c] = seedQuests();
    assert(a && b && c);
    const { id } = await heroAdventure([a.id, b.id, c.id]);
    // The device runs with foreign keys off: a quest removed under an adventure leaves its step.
    t.sqlite.pragma("foreign_keys = OFF");
    t.sqlite
      .prepare("UPDATE adventure_steps SET questId = 0 WHERE adventureId = ? AND stepIndex = 2")
      .run(id);
    expect((await written(id)).stepsLeft).toBe(1);
    t.sqlite
      .prepare("UPDATE adventure_steps SET questId = 0 WHERE adventureId = ? AND stepIndex = 1")
      .run(id);
    expect(await load().adv.adventureToFile(id)).toBeNull();
    t.sqlite.pragma("foreign_keys = ON");
  });

  // The quest and movement editors set no maxLength; the reader refuses past 4x the limit.
  test("texts the editors allow and the reader refuses leave their step out, and the file reads back", async () => {
    const [s1, s2] = seedQuests();
    assert(s1 && s2);
    const longMovement = nextUuid();
    const a = await heroQuest({ title: "A" });
    const b = await heroQuest({ own: [{ uuid: longMovement }] });
    const c = await heroQuest({ title: "C" });
    const d = await heroQuest({ title: "D" });
    const set = (id: number, title: string) =>
      t.sqlite
        .prepare(
          "UPDATE quests SET enTitle = ?, frTitle = ?, deTitle = ?, esTitle = ? WHERE id = ?",
        )
        .run(title, title, title, title, id);
    set(a.id, "t".repeat(500));
    set(d.id, "d".repeat(300));
    t.sqlite
      .prepare("UPDATE exercises SET enDescription = ? WHERE uuid = ?")
      .run("x".repeat(9_000), longMovement);
    t.sqlite.prepare("DELETE FROM quest_exercises WHERE questId = ?").run(c.id);

    const four = await heroAdventure([a.id, b.id, c.id, d.id]);
    expect(await load().adv.adventureToFile(four.id)).toBeNull();

    const six = await heroAdventure([a.id, b.id, c.id, d.id, s1.id, s2.id]);
    const out = await written(six.id);
    expect(out.stepsLeft).toBe(3);
    expect(out.file.steps).toHaveLength(3);
    const kept = out.file.steps[0]?.quest;
    assert(kept && "own" in kept);
    expect(kept.own.quest.title.en).toHaveLength(120);
    expect(parseJson(out.json)).toEqual(out.file);

    const before = counts();
    const done = await load().adv.importAdventure(out.file, { asCopy: false });
    expect(done.updated).toBe(true);
    expect(counts().steps).toBe(before.steps - 6 + 3);
  });

  test("an adventure the reader would refuse is not written", async () => {
    const [a, b] = seedQuests();
    assert(a && b);
    const { id } = await heroAdventure([a.id, b.id], { title: "​​" });
    await expect(load().adv.adventureToFile(id)).rejects.toThrow(/fails its own reader/);
  });

  test("the worst case: 8 quests of 40 photographed movements stays under the limit and is accepted", async () => {
    const quests: number[] = [];
    for (let q = 0; q < 8; q++) {
      const own = Array.from({ length: 40 }, () => ({ uuid: nextUuid(), image: photo(100_000) }));
      quests.push((await heroQuest({ own, official: [] })).id);
    }
    const { id } = await heroAdventure(quests);

    const out = await written(id);

    expect(utf8(out.json)).toBeLessThanOrEqual(MAX_FILE_BYTES);
    expect(out.leftOut).toBeGreaterThan(0);
    expect(out.photos + out.leftOut).toBe(320);
    // Step order: the first quest keeps its pictures.
    const first = out.file.steps[0]?.quest;
    assert(first && "own" in first);
    expect(
      first.own.slots.every((s) => "own" in s.movement && s.movement.own.image.startsWith("data:")),
    ).toBe(true);
    expect(dataImages(parseJson(out.json)).size).toBe(out.photos);
    await expect(load().adv.importAdventure(out.file, { asCopy: false })).resolves.toBeDefined();
  });

  test("small photos all go in", async () => {
    const own = Array.from({ length: 40 }, () => ({ uuid: nextUuid(), image: photo(10_000) }));
    const q = await heroQuest({ own, official: [] });
    const { id } = await heroAdventure([q.id, (await heroQuest()).id]);
    const out = await written(id);
    expect(out.photos).toBe(40);
    expect(out.leftOut).toBe(0);
  });

  // One movement in 40 slots of 8 quests is 320 copies of its picture in the file.
  test("a photo is charged once per occurrence, and the walk continues past one that does not fit", async () => {
    const shared = nextUuid();
    const small = nextUuid();
    const make = async (photoChars: number) => {
      const ids: number[] = [];
      for (let q = 0; q < 8; q++) {
        const own = Array.from({ length: 40 }, (_, i) =>
          i === 0 && q === 0
            ? { uuid: small, image: photo(20_000) }
            : { uuid: shared, image: photo(photoChars) },
        );
        ids.push((await heroQuest({ own, official: [] })).id);
      }
      return heroAdventure(ids);
    };
    // The same uuid in every slot is one movement: the picture of the first import is the stored one.
    const big = await make(300_000);
    const out = await written(big.id);
    expect(utf8(out.json)).toBeLessThanOrEqual(MAX_FILE_BYTES);
    expect(out.photos + out.leftOut).toBe(2);
    expect(out.leftOut).toBe(1);
    expect(dataImages(parseJson(out.json)).size).toBe(out.photos);
  });

  test("a picture the reader would drop is not sent, charged or counted as sent", async () => {
    const tall = nextUuid();
    const q = await heroQuest({ own: [{ uuid: tall }] });
    // `encodePhoto` bounds only the width, so a tall picture is stored; an import would not take it.
    t.sqlite
      .prepare("UPDATE exercises SET imagePath = ? WHERE uuid = ?")
      .run(photo(5_000, 600, 2_000), tall);
    refresh();
    const ok = nextUuid();
    const q2 = await heroQuest({ own: [{ uuid: ok, image: photo(5_000) }] });
    const { id } = await heroAdventure([q.id, q2.id]);

    const out = await written(id);

    expect(out.photos).toBe(1);
    expect(out.leftOut).toBe(1);
    // With the tall picture already a placeholder, the file is byte for byte the same.
    t.sqlite.prepare("UPDATE exercises SET imagePath = ? WHERE uuid = ?").run(PLACEHOLDER, tall);
    refresh();
    expect((await written(id)).json).toBe(out.json);
  });

  test("a hero quest cover is a picture too: counted, and dropped when the reader would drop it", async () => {
    const withCover = await heroQuest({ image: photo(3_000) });
    const other = await heroQuest();
    const { id } = await heroAdventure([withCover.id, other.id]);
    const out = await written(id);
    expect(out.photos).toBe(1);
    expect(dataImages(parseJson(out.json)).size).toBe(1);

    t.sqlite
      .prepare("UPDATE quests SET imagePath = ? WHERE uuid = ?")
      .run(photo(3_000, 600, 2_000), withCover.uuid);
    refresh();
    const tall = await written(id);
    expect(tall.photos).toBe(0);
    expect(tall.leftOut).toBe(1);
    const own = tall.file.steps[0]?.quest;
    assert(own && "own" in own);
    expect(own.own.quest.image).toBeNull();
    expect(dataImages(parseJson(tall.json)).size).toBe(0);
  });

  test("the file is named for the adventure, in at most 255 bytes", () => {
    const stem = load().quest.fileStem("😀".repeat(100), "adventure");
    expect(utf8(`${stem}.bati-adventure.json`)).toBeLessThanOrEqual(255);
    expect(load().quest.fileStem("   ", "adventure")).toBe("adventure");
  });
});

// ---------------------------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------------------------

describe("previewing an adventure file", () => {
  const preview = (file: AdventureFile) => load().adv.previewAdventure(file, "en");

  test("here, brings and missing", async () => {
    const [a] = seedQuests();
    assert(a);
    const mine = await heroQuest();
    const steps = [
      { official: a.enTitle },
      { official: "A quest nobody wrote" },
      { own: questBody(mine.uuid, { title: "Renamed by the sender" }) },
      { own: questBody(nextUuid(), { title: "New one", official: [seedMovement()] }) },
      { own: questBody(nextUuid(), { official: ["A movement nobody made"] }) },
    ];
    const p = await preview(fileOf(adventureLiteral(nextUuid(), steps)));
    expect(p.steps.map((s) => s.status)).toEqual(["here", "missing", "here", "brings", "missing"]);
    expect(p.steps[0]?.questId).toBe(a.id);
    expect(p.steps[2]?.questId).toBe(mine.id);
    expect(p.steps[3]?.title).toBe("New one");
    expect(p.existing).toBeNull();
  });

  test("says what arrives, and names an exercise that clashes with the hero's own by name", async () => {
    const mine = nextUuid();
    await heroQuest({ own: [{ uuid: mine, name: "Weighted push-up" }] });
    const newcomer = nextUuid();
    const twin = nextUuid();
    const file = fileOf(
      adventureLiteral(nextUuid(), [
        {
          own: questBody(nextUuid(), {
            image: photo(2_000),
            // Here by uuid: not an arrival. Same name, other uuid: arrives, and clashes.
            own: [
              { uuid: mine, name: "Weighted push-up" },
              { uuid: twin, name: " weighted PUSH-up ", image: photo(2_000) },
              { uuid: newcomer, name: "Ring flip" },
            ],
          }),
        },
        { official: seedQuests()[0]?.enTitle },
      ]),
    );

    const { arrives } = await load().adv.previewAdventure(file, "en");

    expect(arrives).toEqual({
      quests: 1,
      movements: 2,
      photos: 2,
      clashes: [" weighted PUSH-up "].map((n) => n.trim()),
      gameNames: [],
      gameQuests: [],
    });
  });

  test("the adventure's own photo counts among the photos that arrive, as the sender's dialog counts it", async () => {
    const file = fileOf(
      adventureLiteral(
        nextUuid(),
        [{ official: seedQuests()[0]?.enTitle }, { official: seedQuests()[1]?.enTitle }],
        {
          photo: photo(2_000),
        },
      ),
    );
    expect((await load().adv.previewAdventure(file, "en")).arrives.photos).toBe(1);
    // Once the adventure is here, its photo is no arrival, as a quest already here is not.
    await load().adv.importAdventure(file, { asCopy: false });
    expect((await load().adv.previewAdventure(file, "en")).arrives.photos).toBe(0);
  });

  test("an exercise of the file that matches only a seed name is no clash: seed rows are not the hero's", async () => {
    const file = fileOf(
      adventureLiteral(nextUuid(), [
        { own: questBody(nextUuid(), { own: [{ uuid: nextUuid(), name: seedMovement() }] }) },
        { official: seedQuests()[0]?.enTitle },
      ]),
    );
    expect((await load().adv.previewAdventure(file, "en")).arrives.clashes).toEqual([]);
  });

  test("a seed title never matches a hero quest of the same name", async () => {
    const [a] = seedQuests();
    assert(a);
    const mine = await heroQuest({ title: a.enTitle });
    expect(mine.id).not.toBe(a.id);
    const p = await preview(
      fileOf(adventureLiteral(nextUuid(), [{ official: a.enTitle }, { official: a.enTitle }])),
    );
    expect(p.steps[0]?.questId).toBe(a.id);
  });

  test("an adventure here by uuid is found, retired included, and a run of it says so", async () => {
    const [a, b] = seedQuests();
    assert(a && b);
    const { id, uuid } = await heroAdventure([a.id, b.id], { title: "Mine" });
    const file = fileOf(adventureLiteral(uuid, [{ official: a.enTitle }, { official: b.enTitle }]));
    expect((await preview(file)).existing).toEqual({ id, title: "Mine" });
    expect((await preview(file)).running).toBe(false);

    await load().hero.retireHeroAdventure(id);
    expect((await preview(file)).existing?.id).toBe(id);

    await load().hero.updateHeroAdventure(id, draftOf([a.id, b.id]));
    t.sqlite.prepare("UPDATE adventures SET isActive = 1 WHERE id = ?").run(id);
    await load().adventures.startAdventureRun({ adventureId: id, difficultyOverride: "medium" });
    expect((await preview(file)).running).toBe(true);

    // A seeded adventure has no uuid and is never matched.
    const seeded = t.sqlite
      .prepare("SELECT id FROM adventures WHERE author = 'Admin' LIMIT 1")
      .get() as { id: number };
    expect(seeded.id).not.toBe(id);
    const other = fileOf(
      adventureLiteral(nextUuid(), [{ official: a.enTitle }, { official: b.enTitle }]),
    );
    expect((await preview(other)).existing).toBeNull();
  });

  test("a boss this version lacks arrives as a route, and the import writes one", async () => {
    const [a, b] = seedQuests();
    assert(a && b);
    const steps = [{ official: a.enTitle }, { official: b.enTitle }];
    const file = fileOf(
      adventureLiteral(nextUuid(), steps, {}, { kind: "boss", monster: "the_future_beast" }),
    );
    const p = await preview(file);
    expect(p.monsterUnknown).toBe(true);
    expect(p.monster).toBeNull();
    const { id } = await load().adv.importAdventure(file, { asCopy: false });
    expect(
      (t.sqlite.prepare("SELECT kind FROM adventures WHERE id = ?").get(id) as { kind: string })
        .kind,
    ).toBe("route");

    const monster = (await load().hero.listMonsters())[0];
    assert(monster);
    const known = await preview(
      fileOf(adventureLiteral(nextUuid(), steps, {}, { kind: "boss", monster: monster.key })),
    );
    expect(known.monster?.key).toBe(monster.key);
    expect(known.monsterUnknown).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------------------------

describe("importing an adventure file", () => {
  const rowOf = (id: number) =>
    t.sqlite.prepare("SELECT * FROM adventures WHERE id = ?").get(id) as Record<string, unknown>;
  const stepsOf = (id: number) =>
    t.sqlite
      .prepare(
        "SELECT stepIndex, questId, enNarrative FROM adventure_steps WHERE adventureId = ? ORDER BY stepIndex",
      )
      .all(id) as { stepIndex: number; questId: number; enNarrative: string }[];

  function brought(over: { advUuid?: string; end?: unknown; seeds?: string[] } = {}) {
    const dip = nextUuid();
    const q1 = nextUuid();
    const q2 = nextUuid();
    const [a] = seedQuests();
    assert(a);
    const file = fileOf(
      adventureLiteral(
        over.advUuid ?? nextUuid(),
        [
          { own: questBody(q1, { title: "First", own: [{ uuid: dip }] }) },
          { official: a.enTitle },
          {
            own: questBody(q2, {
              title: "Second",
              own: [{ uuid: dip }],
              official: [seedMovement()],
            }),
          },
        ],
        {},
        over.end,
      ),
    );
    return { file, dip, q1, q2 };
  }

  test("a first import writes the movements, the quests and the adventure under the sender's uuids", async () => {
    const monster = (await load().hero.listMonsters())[0];
    assert(monster);
    const { file, dip, q1 } = brought({ end: { kind: "boss", monster: monster.key } });
    const before = counts();

    const { id, updated } = await load().adv.importAdventure(file, { asCopy: false });

    expect(updated).toBe(false);
    const row = rowOf(id);
    expect(row).toMatchObject({
      author: "hero",
      uuid: file.adventure.uuid,
      sortOrder: 1000,
      bossTotalHp: null,
      kind: "boss",
      bossWeaknessMuscle: monster.weakness,
      bossResistanceMuscle: monster.resistance,
      isActive: 1,
    });
    expect(stepsOf(id).map((s) => s.enNarrative)).toEqual(["before 0", "before 1", "before 2"]);
    expect(counts()).toEqual({
      quests: before.quests + 2,
      slots: before.slots + 3,
      // One movement named by both quests is one row.
      exercises: before.exercises + 1,
      adventures: before.adventures + 1,
      steps: before.steps + 3,
    });
    expect(count(`exercises WHERE uuid = '${dip}'`)).toBe(1);
    expect(count(`quests WHERE uuid = '${q1}'`)).toBe(1);
  });

  test("a hero quest already here is not rewritten", async () => {
    const mine = await heroQuest({ title: "Mine" });
    t.sqlite.prepare("UPDATE quests SET updatedAt = 1700000000 WHERE id = ?").run(mine.id);
    const slotsBefore = count(`quest_exercises WHERE questId = ${mine.id}`);
    const [a] = seedQuests();
    assert(a);
    const file = fileOf(
      adventureLiteral(nextUuid(), [
        { own: questBody(mine.uuid, { title: "The sender's name", own: [{ uuid: nextUuid() }] }) },
        { official: a.enTitle },
      ]),
    );

    await load().adv.importAdventure(file, { asCopy: false });

    const q = t.sqlite
      .prepare("SELECT enTitle, updatedAt FROM quests WHERE id = ?")
      .get(mine.id) as {
      enTitle: string;
      updatedAt: number;
    };
    expect(q).toEqual({ enTitle: "Mine", updatedAt: 1700000000 });
    expect(count(`quest_exercises WHERE questId = ${mine.id}`)).toBe(slotsBefore);
  });

  test("a second import updates in place; a retired adventure comes back", async () => {
    const { file } = brought();
    const first = await load().adv.importAdventure(file, { asCopy: false });
    const afterFirst = counts();
    const stamp = rowOf(first.id).updatedAt as number;
    await load().hero.retireHeroAdventure(first.id);

    const second = await load().adv.importAdventure(file, { asCopy: false });

    expect(second).toEqual({ id: first.id, updated: true });
    expect(counts()).toEqual(afterFirst);
    expect(rowOf(first.id).isActive).toBe(1);
    expect(rowOf(first.id).updatedAt as number).toBeGreaterThanOrEqual(stamp);
    expect(stepsOf(first.id)).toHaveLength(3);
  });

  test("with a run under way it arrives beside, even when the hero asked to update", async () => {
    const { file } = brought();
    const first = await load().adv.importAdventure(file, { asCopy: false });
    await load().adventures.startAdventureRun({
      adventureId: first.id,
      difficultyOverride: "medium",
    });
    const stepsBefore = stepsOf(first.id);

    const second = await load().adv.importAdventure(file, { asCopy: false });

    expect(second.id).not.toBe(first.id);
    expect(second.updated).toBe(false);
    expect(rowOf(second.id).uuid).not.toBe(file.adventure.uuid);
    expect(rowOf(first.id).uuid).toBe(file.adventure.uuid);
    expect(stepsOf(first.id)).toEqual(stepsBefore);
    expect(
      (
        t.sqlite
          .prepare("SELECT status FROM adventure_runs WHERE adventureId = ?")
          .all(first.id) as { status: string }[]
      ).map((r) => r.status),
    ).toEqual(["active"]);
  });

  test("keeping both makes a second adventure over the same quest rows", async () => {
    const { file } = brought();
    await load().adv.importAdventure(file, { asCopy: false });
    const before = counts();

    const copy = await load().adv.importAdventure(file, { asCopy: true });

    expect(copy.updated).toBe(false);
    expect(counts()).toEqual({
      ...before,
      adventures: before.adventures + 1,
      steps: before.steps + 3,
    });
  });

  test("a seed quest this version lacks is left out and the steps stay contiguous", async () => {
    const [a, b] = seedQuests();
    assert(a && b);
    const file = fileOf(
      adventureLiteral(nextUuid(), [
        { official: a.enTitle },
        { official: "Nobody wrote me" },
        { official: b.enTitle },
      ]),
    );
    const { id } = await load().adv.importAdventure(file, { asCopy: false });
    expect(stepsOf(id).map((s) => s.stepIndex)).toEqual([0, 1]);
    // The step texts follow their quests, not their positions in the file.
    expect(stepsOf(id).map((s) => s.enNarrative)).toEqual(["before 0", "before 2"]);
    await expect(
      load().adventures.startAdventureRun({ adventureId: id, difficultyOverride: "medium" }),
    ).resolves.toBeDefined();
  });

  test("under two steps left, nothing is written", async () => {
    const [a] = seedQuests();
    assert(a);
    const before = counts();
    const file = fileOf(
      adventureLiteral(nextUuid(), [{ official: a.enTitle }, { official: "Nobody wrote me" }]),
    );
    await expect(load().adv.importAdventure(file, { asCopy: false })).rejects.toMatchObject({
      reason: "unknown_quest",
    });
    expect(counts()).toEqual(before);
  });

  test("a write that fails halfway leaves every count as it was", async () => {
    const { file } = brought();
    const before = counts();
    const spy = jest
      .spyOn(load().hero, "fileHeroAdventure")
      .mockRejectedValueOnce(new Error("disk full"));

    await expect(load().adv.importAdventure(file, { asCopy: false })).rejects.toThrow("disk full");

    spy.mockRestore();
    expect(counts()).toEqual(before);
  });

  test("the gallery and the detail show it without a restart", async () => {
    const { adventures } = load();
    await adventures.listAdventures();
    const { file } = brought();
    const { id } = await load().adv.importAdventure(file, { asCopy: false });
    expect((await adventures.listAdventures()).some((a) => a.id === id)).toBe(true);
    expect((await adventures.getAdventureDetails(id))?.adventure.id).toBe(id);
  });
});

// ---------------------------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------------------------

describe("copy", () => {
  const dir = path.join(__dirname, "..", "locales");
  const locales = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const get = (obj: unknown, key: string): unknown =>
    key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
  const plural = ["share_photos", "share_photos_left", "share_steps_left"];
  const plain = [
    "share",
    "share_title",
    "share_no_photo",
    "share_confirm",
    "share_failed",
    "share_too_few",
    "import_title",
    "import_failed",
    "import_done",
    "import_updated",
    "import_steps",
    "import_step_here",
    "import_step_brings",
    "import_step_missing",
    "import_boss_unknown",
    "import_existing",
    "import_choice_update",
    "import_choice_copy",
    "import_running",
    "import_confirm",
    "import_confirm_update",
  ];

  test("every sentence exists, non-empty, in each locale the app has", () => {
    expect(locales.sort()).toEqual([
      "de.json",
      "en.json",
      "es.json",
      "fr.json",
      "ru.json",
      "zh.json",
    ]);
    for (const file of locales) {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      const reasons = load().adv.ADVENTURE_FILE_REFUSALS.map((r) => `import_${r}`);
      for (const key of [...plain, ...reasons]) {
        expect({ file, key, value: typeof get(json, `adventures.${key}`) }).toEqual({
          file,
          key,
          value: "string",
        });
        expect((get(json, `adventures.${key}`) as string).length).toBeGreaterThan(0);
      }
      for (const key of plural) {
        const forms = Object.keys(json.adventures).filter((k) => k.startsWith(`${key}_`));
        expect({ file, key, forms: forms.length > 0 }).toEqual({ file, key, forms: true });
      }
      expect(typeof get(json, "common.file_received")).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------------------------
// The boss's voice (version 2)
// ---------------------------------------------------------------------------------------------

describe("the boss's voice in the file", () => {
  const readSteps = () => {
    const [a, b] = seedQuests();
    assert(a && b);
    return [{ official: a.enTitle }, { official: b.enTitle }];
  };
  const bossEnd = async (extra: Record<string, unknown> = {}) => {
    const monster = (await load().hero.listMonsters())[0];
    assert(monster);
    return { kind: "boss", monster: monster.key, ...extra };
  };
  const parse = (end: unknown, version = 2) =>
    load().adv.parseAdventureData({
      ...adventureLiteral(nextUuid(), readSteps(), {}, end),
      version,
    });
  const refusal = (end: unknown) => {
    try {
      parse(end);
    } catch (error) {
      if (error instanceof load().adv.AdventureFileError) return error.reason;
      throw error;
    }
    return null;
  };
  const columns = (id: number) =>
    t.sqlite.prepare("SELECT kind, heroBossUuid FROM adventures WHERE id = ?").get(id) as {
      kind: string;
      heroBossUuid: string | null;
    };
  const bossNamed = (uuid: string) =>
    (
      t.sqlite.prepare("SELECT name FROM hero_bosses WHERE uuid = ?").get(uuid) as
        | { name: string }
        | undefined
    )?.name;

  test("the format is version 1: a dev build's version 2 file is read as it, a version 3 is newer", () => {
    expect(parse({ kind: "route" }, 1).version).toBe(1);
    expect(parse({ kind: "route" }, 2).version).toBe(1);
    expect(() => parse({ kind: "route" }, 3)).toThrow("newer");
  });

  test("a boss is always written with its voice, in version 1, and round trips", async () => {
    const [a, b] = seedQuests();
    assert(a && b);
    const { hero, adv } = load();
    const heroBosses = require("../db/heroBosses") as typeof import("../db/heroBosses");
    const monster = (await hero.listMonsters())[0];
    assert(monster);
    const draft = draftOf([a.id, b.id], { end: { kind: "boss", monster: monster.key } });

    // A boss the hero made travels whole: name, lines, weakness, uuid.
    const lines = { intro: [], idle: ["Again."], crit: [], enrage: ["Enough."], defeat: [] };
    const bossId = await heroBosses.createHeroBoss({
      name: "Nightcoil",
      monster: monster.key,
      weakness: "chest",
      resistance: null,
      lines,
      art: {},
    });
    const made = await heroBosses.getHeroBoss(bossId);
    assert(made);
    const voiced = await hero.createHeroAdventure({
      ...draft,
      end: { kind: "boss", monster: monster.key, heroBoss: made.uuid },
    });
    const out = await adv.adventureToFile(voiced);
    assert(out);
    expect(out.file.version).toBe(1);
    expect(out.file.adventure.end).toEqual({
      kind: "boss",
      monster: monster.key,
      name: "Nightcoil",
      lines,
      weakness: "chest",
      bossUuid: made.uuid,
    });
    expect(parseJson(out.json)).toEqual(out.file);

    // A painted monster picked as it is: the voice fields are there, empty, and read back the same.
    const plain = await hero.createHeroAdventure(draft);
    const plainOut = await adv.adventureToFile(plain);
    assert(plainOut);
    expect(plainOut.file.adventure.end).toEqual({
      kind: "boss",
      monster: monster.key,
      name: "",
      lines: { intro: [], idle: [], crit: [], enrage: [], defeat: [] },
    });
    expect(parseJson(plainOut.json)).toEqual(plainOut.file);

    const route = await hero.createHeroAdventure(draftOf([a.id, b.id]));
    expect((await adv.adventureToFile(route))?.file.adventure.end).toEqual({ kind: "route" });
  });

  test("everything survives the trip to an empty phone: hero quests and movements, photos, texts, every moment", async () => {
    const { hero, adv } = load();
    const monster = (await hero.listMonsters())[0];
    assert(monster);
    const dip = nextUuid();
    const mine = await heroQuest({
      title: "Porch forge",
      image: photo(3_000),
      own: [{ uuid: dip, name: "Porch dip", image: photo(2_000) }],
    });
    t.sqlite
      .prepare("UPDATE quests SET enDescription = ? WHERE id = ?")
      .run("Line one.\nLine two, the story.", mine.id);
    refresh();
    const [seed] = seedQuests();
    assert(seed);
    const lines = {
      intro: ["Who dares?"],
      idle: ["Again."],
      crit: ["Ow."],
      enrage: ["Enough."],
      defeat: ["Not like this.", "Second."],
    };
    const bosses = require("../db/heroBosses") as typeof import("../db/heroBosses");
    const bossId = await bosses.createHeroBoss({
      name: "Nightcoil",
      monster: monster.key,
      weakness: "abs",
      resistance: "legs",
      lines,
      art: { fresh: photo(2_500), defeated: photo(2_400) },
    });
    const boss = await bosses.getHeroBoss(bossId);
    assert(boss);
    const id = await hero.createHeroAdventure({
      ...draftOf([mine.id, seed.id], {
        end: { kind: "boss", monster: monster.key, heroBoss: boss.uuid },
      }),
      description: "Three days.",
    });
    const out = await adv.adventureToFile(id);
    assert(out);
    const uuid = out.file.adventure.uuid;

    // The other phone has none of it.
    t.sqlite.exec(
      `DELETE FROM adventure_steps; DELETE FROM adventures WHERE uuid = '${uuid}';
       DELETE FROM quest_exercises WHERE questId = ${mine.id}; DELETE FROM quests WHERE id = ${mine.id};
       DELETE FROM exercises WHERE uuid = '${dip}'; DELETE FROM hero_bosses;`,
    );
    refresh();
    const read = parseJson(out.json);
    const { id: landed } = await adv.importAdventure(read, { asCopy: false });

    const draft = await hero.loadHeroAdventureDraft(landed);
    assert(draft);
    // The boss arrived as the receiver's own, by the uuid the sender named it with.
    expect(draft.end).toEqual({ kind: "boss", monster: monster.key, heroBoss: boss.uuid });
    const landedBoss = await bosses.getHeroBoss(
      (
        t.sqlite.prepare("SELECT id FROM hero_bosses WHERE uuid = ?").get(boss.uuid) as {
          id: number;
        }
      ).id,
    );
    expect(landedBoss).toMatchObject({
      name: "Nightcoil",
      weakness: "abs",
      resistance: "legs",
      lines,
      art: boss.art,
    });
    expect(draft.steps.map((s) => s.narrative)).toEqual(["before 0", "before 1"]);
    const quest = t.sqlite
      .prepare("SELECT enDescription, imagePath FROM quests WHERE uuid = ?")
      .get(mine.uuid) as { enDescription: string; imagePath: string };
    expect(quest.enDescription).toBe("Line one.\nLine two, the story.");
    expect(quest.imagePath.startsWith("data:")).toBe(true);
    const moved = t.sqlite
      .prepare("SELECT creator, imagePath FROM exercises WHERE uuid = ?")
      .get(dip) as { creator: string; imagePath: string };
    expect(moved.creator).toBe("hero");
    expect(moved.imagePath.startsWith("data:")).toBe(true);
  });

  test("a version 1 file with a painted boss still imports, as the monster alone", async () => {
    const file = parse(await bossEnd(), 1);
    const before = count("hero_bosses");
    const { id } = await load().adv.importAdventure(file, { asCopy: false });
    expect(columns(id)).toEqual({ kind: "boss", heroBossUuid: null });
    expect(count("hero_bosses")).toBe(before);
  });

  test("the name and the lines are cleaned and bounded", async () => {
    expect(refusal(await bossEnd({ name: "x".repeat(161) }))).toBe("not_an_adventure");
    expect(refusal(await bossEnd({ lines: "Again." }))).toBe("not_an_adventure");
    expect(refusal(await bossEnd({ lines: { idle: "Again." } }))).toBe("not_an_adventure");

    const end = (await bossEnd({
      name: "Nightcoil",
      lines: {
        idle: ["a", "  ", "", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
        crit: ["x".repeat(70)],
        enrage: [`${"y".repeat(59)}🔥🔥`],
        resist: ["a later Bati's moment"],
      },
    })) as Record<string, unknown>;
    const read = parse(end).adventure.end;
    assert(read.kind === "boss");
    // Cut to three before any element is read, so the blanks count against the three.
    expect(read.lines?.idle).toEqual(["a"]);
    expect(read.lines?.crit).toEqual(["x".repeat(60)]);
    expect(read.lines?.enrage).toEqual(["y".repeat(59)]);
    expect(Object.keys(read.lines ?? {})).toEqual(["intro", "idle", "crit", "enrage", "defeat"]);
  });

  test("an unknown monster with a voice arrives as a route and writes nothing of it", async () => {
    const file = parse({
      kind: "boss",
      monster: "the_future_beast",
      name: "Nightcoil",
      lines: { idle: ["Again."] },
    });
    const before = count("hero_bosses");
    const { id } = await load().adv.importAdventure(file, { asCopy: false });
    expect(columns(id)).toEqual({ kind: "route", heroBossUuid: null });
    expect(count("hero_bosses")).toBe(before);
  });

  test("a boss the phone already holds is kept as it is, never rewritten by a second import", async () => {
    const uuid = nextUuid();
    const make = async (extra: Record<string, unknown>) =>
      load().adv.parseAdventureData({
        ...adventureLiteral(uuid, readSteps(), {}, await bossEnd(extra)),
        version: 1,
      });
    const first = await load().adv.importAdventure(await make({ name: "One" }), { asCopy: false });
    // A dev file with no boss uuid names the boss after the adventure.
    expect(bossNamed(uuid)).toBe("One");
    expect(columns(first.id).heroBossUuid).toBe(uuid);
    const second = await load().adv.importAdventure(await make({ name: "Two" }), {
      asCopy: false,
    });
    expect(second).toEqual({ id: first.id, updated: true });
    expect(bossNamed(uuid)).toBe("One");
    // As a copy it is the same boss, not a second one.
    const before = count("hero_bosses");
    await load().adv.importAdventure(await make({ name: "Three" }), { asCopy: true });
    expect(count("hero_bosses")).toBe(before);
  });
});

describe("the adventure's own cover photo", () => {
  const written = async (id: number) => {
    const out = await load().adv.adventureToFile(id);
    assert(out);
    return out;
  };
  const coverOf = (id: number) =>
    (
      t.sqlite.prepare("SELECT imagePath FROM adventures WHERE id = ?").get(id) as {
        imagePath: string;
      }
    ).imagePath;
  const twoQuests = async () => [(await heroQuest()).id, (await heroQuest()).id];

  test("the photo rides in `photo`, a bundled cover stays in `cover`, and it is counted", async () => {
    const cover = photo(3_000);
    const { id } = await heroAdventure(await twoQuests(), { imagePath: cover });
    const out = await written(id);

    expect(out.photos).toBe(1);
    expect(out.leftOut).toBe(0);
    // An older version reads `cover` as a key and ignores `photo`: it must still pass that test.
    expect(out.file.adventure.cover).toMatch(/^[a-z0-9_]{1,64}$/);
    expect(out.file.adventure.photo).toBe(cover);
    expect(out.file.version).toBe(1);

    const back = parseJson(out.json);
    expect(back.adventure.photo).toBe(cover);
    // parse(write(a)) is write(a).
    expect(back).toEqual(out.file);
  });

  test("a photo cover survives a round trip through another phone", async () => {
    const cover = photo(3_000);
    const { id } = await heroAdventure(await twoQuests(), { imagePath: cover });
    const file = parseJson((await written(id)).json);

    const imported = await load().adv.importAdventure(
      { ...file, adventure: { ...file.adventure, uuid: nextUuid() } },
      { asCopy: false },
    );
    expect(coverOf(imported.id)).toBe(cover);
    expect((await load().hero.loadHeroAdventureDraft(imported.id))?.imagePath).toBe(cover);
  });

  test("a photo the reader would drop is left out and counted, and the bundled cover stands", async () => {
    const { id } = await heroAdventure(await twoQuests(), { imagePath: photo(3_000, 600, 2_000) });
    const out = await written(id);

    expect(out.photos).toBe(0);
    expect(out.leftOut).toBe(1);
    expect(out.file.adventure.photo).toBeUndefined();
    expect(out.file.adventure.cover).toMatch(/^[a-z0-9_]{1,64}$/);
    expect(parseJson(out.json).adventure.photo).toBeUndefined();
  });

  test("it counts with the quests' photos, in the same total", async () => {
    const withCover = await heroQuest({ image: photo(3_000) });
    const { id } = await heroAdventure([withCover.id, (await heroQuest()).id], {
      imagePath: photo(4_000),
    });
    expect((await written(id)).photos).toBe(2);
  });

  test("a file without `photo` is unchanged: its bundled cover lands as itself", async () => {
    const [a, b] = seedQuests();
    assert(a && b);
    const file = fileOf(
      adventureLiteral(nextUuid(), [{ official: a.enTitle }, { official: b.enTitle }], {
        cover: "the_golem",
      }),
    );
    expect(file.adventure.photo).toBeUndefined();
    const { id } = await load().adv.importAdventure(file, { asCopy: false });
    expect(coverOf(id)).toBe("the_golem");
  });

  test("a `photo` that is not a vouched-for image is ignored, never a reason to refuse the file", () => {
    const [a, b] = seedQuests();
    assert(a && b);
    const steps = [{ official: a.enTitle }, { official: b.enTitle }];
    for (const bad of ["https://example.com/x.jpg", "assets/images/adventures/x.jpg", 3, null]) {
      const file = fileOf(adventureLiteral(nextUuid(), steps, { cover: "the_golem", photo: bad }));
      expect(file.adventure.photo).toBeUndefined();
      expect(file.adventure.cover).toBe("the_golem");
    }
  });
});

describe("a quest shared alone", () => {
  test("is read back by its own reader, photos counted, and imports on another phone", async () => {
    const q = await heroQuest({
      image: photo(3_000),
      own: [{ uuid: nextUuid(), image: photo(2_000) }],
    });
    const out = await load().adv.questToShare(q.id);

    expect(out.photos).toBe(2);
    expect(out.leftOut).toBe(0);
    expect(utf8(out.json)).toBeLessThanOrEqual(MAX_FILE_BYTES);
    expect(load().quest.parseQuestData(JSON.parse(out.json))).toEqual(out.file);
    expect(out.file.slots.some((s) => "own" in s.movement)).toBe(true);
  });

  test("goes through the photo budget: what does not fit stays on the phone, and is counted", async () => {
    const own = Array.from({ length: 40 }, () => ({ uuid: nextUuid(), image: photo(300_000) }));
    const q = await heroQuest({ own, official: [] });
    const out = await load().adv.questToShare(q.id);

    expect(utf8(out.json)).toBeLessThanOrEqual(MAX_FILE_BYTES);
    expect(out.leftOut).toBeGreaterThan(0);
    expect(out.photos + out.leftOut).toBe(40);
    load().quest.parseQuestData(JSON.parse(out.json));
  });

  // The export never writes a photo the receiver's reader would drop, and one that still holds
  // EXIF is dropped: the file carries the placeholder and the count says it stayed on the phone.
  test("a photo that still holds EXIF is never written: it stays on the phone, and is counted", async () => {
    // Written straight to the rows: the importer itself refuses such a photo, an older build did not.
    const movement = nextUuid();
    const q = await heroQuest({
      image: photo(3_000),
      own: [{ uuid: movement, image: photo(2_000) }],
    });
    t.sqlite
      .prepare("UPDATE exercises SET imagePath = ? WHERE uuid = ?")
      .run(photo(2_000, 64, 48, true), movement);
    t.sqlite
      .prepare("UPDATE quests SET imagePath = ? WHERE uuid = ?")
      .run(photo(3_000, 64, 48, true), q.uuid);
    refresh();
    const out = await load().adv.questToShare(q.id);

    expect(out.photos).toBe(0);
    expect(out.leftOut).toBe(2);
    expect(out.json).not.toContain("data:image");
  });

  test("a quest its own reader would refuse is never written", async () => {
    const q = await heroQuest();
    t.sqlite
      .prepare("UPDATE quests SET enDescription = ? WHERE id = ?")
      .run("x".repeat(9_000), q.id);
    refresh();

    await expect(load().adv.questToShare(q.id)).rejects.toThrow("refused by its own reader");
  });

  test("a seed quest is not shared: it is on every phone", async () => {
    const [seed] = seedQuests();
    assert(seed);
    await expect(load().adv.questToShare(seed.id)).rejects.toThrow("not a quest of the hero");
  });
});

describe("what an imported adventure can and cannot touch", () => {
  const twoSeeds = () => {
    const [a, b] = seedQuests();
    assert(a && b);
    return [{ official: a.enTitle }, { official: b.enTitle }];
  };

  // The game's adventure rows carry no uuid, and only the hero's are looked up by one. If a
  // database ever had a seed row with a uuid (a restore across a migration, a hand edit), a file
  // carrying it must not rewrite the game's adventure: same rule as the quest and the movement.
  test("a seed adventure sharing the file's uuid is not the adventure the file updates", async () => {
    const seed = t.sqlite
      .prepare("SELECT id, enTitle, enDescription FROM adventures WHERE author = 'Admin' LIMIT 1")
      .get() as { id: number; enTitle: string; enDescription: string };
    const advUuid = nextUuid();
    t.sqlite.prepare("UPDATE adventures SET uuid = ? WHERE id = ?").run(advUuid, seed.id);
    const file = fileOf(adventureLiteral(advUuid, twoSeeds(), { title: "Owned" }));
    const before = counts();

    const preview = await load().adv.previewAdventure(file, "en");
    const outcome = await load()
      .adv.importAdventure(file, { asCopy: false })
      .catch((error: unknown) => error);
    const after = t.sqlite
      .prepare("SELECT id, enTitle, enDescription FROM adventures WHERE id = ?")
      .get(seed.id);
    const afterCounts = counts();
    t.sqlite.prepare("UPDATE adventures SET uuid = NULL WHERE id = ?").run(seed.id);

    expect(preview.existing).toBeNull();
    expect(after).toEqual(seed);
    // The hero's new row cannot take the uuid the seed holds: refused and rolled back whole.
    expect(String(outcome)).toMatch(/UNIQUE/);
    expect(afterCounts).toEqual(before);
  });

  // The import writes a quest, its movements and an adventure, and nothing a session earns: no
  // session (so no XP, streak or record), no run, no boss fight or damage. A hero boss that was
  // defeated anyway is no deed: the village shelf and the bestiary read the game's adventures only.
  test("an imported adventure grants no XP, no achievement and no boss kill", async () => {
    const monster = (await load().hero.listMonsters())[0];
    assert(monster);
    const earned = () => ({
      sessions: count("completed_sessions"),
      runs: count("adventure_runs"),
      fights: count("boss_fights"),
      damage: count("boss_damage_log"),
    });
    const standing = await require("../db/journal").getStandingBosses();
    const banners = await require("../db/village").getBossBanners();
    const before = earned();

    const file = fileOf(
      adventureLiteral(nextUuid(), twoSeeds(), {}, { kind: "boss", monster: monster.key }),
    );
    const { id } = await load().adv.importAdventure(file, { asCopy: false });
    expect(earned()).toEqual(before);

    t.sqlite
      .prepare(
        "INSERT INTO boss_fights (adventureId, totalHp, currentHp, defeatedAt) VALUES (?, 100, 0, ?)",
      )
      .run(id, Date.now());
    t.sqlite
      .prepare(
        "INSERT INTO adventure_runs (adventureId, status, startedAt, finishedAt) VALUES (?, 'finished', ?, ?)",
      )
      .run(id, 1_700_000_000, 1_700_000_100);

    expect(await require("../db/village").getBossBanners()).toEqual(banners);
    expect(await require("../db/journal").getStandingBosses()).toEqual(standing);
    expect(
      (await require("../db/adventures").listFinishedRunSummaries()).some(
        (s: { adventureId: number }) => s.adventureId === id,
      ),
    ).toBe(false);
  });
});

describe("a hero boss's pictures in the file", () => {
  const heroBosses = () => require("../db/heroBosses") as typeof import("../db/heroBosses");

  async function adventureWithBoss(
    art: import("../db/bossVoice").BossArt,
    quests?: number[],
  ): Promise<{ id: number; bossUuid: string }> {
    const monster = (await load().hero.listMonsters())[0];
    assert(monster);
    const bossId = await heroBosses().createHeroBoss({
      name: "Gorgo",
      monster: monster.key,
      weakness: null,
      resistance: null,
      lines: { intro: [], idle: [], crit: [], enrage: [], defeat: [] },
      art,
    });
    const boss = await heroBosses().getHeroBoss(bossId);
    assert(boss);
    const ids = quests ?? [(await heroQuest()).id, (await heroQuest()).id];
    const { id } = await heroAdventure(ids, {
      end: { kind: "boss", monster: monster.key, heroBoss: boss.uuid },
    });
    return { id, bossUuid: boss.uuid };
  }
  const written = async (id: number) => {
    const out = await load().adv.adventureToFile(id);
    assert(out);
    return out;
  };

  test("all four forms and none both round trip, counted as photos", async () => {
    const art = {
      fresh: photo(3_000),
      wounded: photo(3_100),
      defeated: photo(3_200),
      legendary: photo(3_300),
    };
    const full = await written((await adventureWithBoss(art)).id);
    expect(full.photos).toBe(4);
    expect(full.leftOut).toBe(0);
    const end = full.file.adventure.end;
    assert(end.kind === "boss");
    expect(end.art).toEqual(art);
    expect(parseJson(full.json)).toEqual(full.file);

    const none = await written((await adventureWithBoss({})).id);
    expect(none.photos).toBe(0);
    const bare = none.file.adventure.end;
    assert(bare.kind === "boss");
    expect(bare.art).toBeUndefined();
    expect(none.json).not.toContain('"art"');
    expect(parseJson(none.json)).toEqual(none.file);
  });

  test("a photo that holds EXIF is never written, and one in a received file is dropped, not refused", async () => {
    const { id, bossUuid } = await adventureWithBoss({
      fresh: photo(3_000),
      wounded: photo(3_000),
    });
    // Written straight to the row, as an older build could have left it.
    t.sqlite
      .prepare("UPDATE hero_bosses SET artJson = ? WHERE uuid = ?")
      .run(JSON.stringify({ fresh: photo(3_000), wounded: photo(3_000, 64, 48, true) }), bossUuid);
    const out = await written(id);
    expect(out.photos).toBe(1);
    expect(out.leftOut).toBe(1);
    const end = out.file.adventure.end;
    assert(end.kind === "boss");
    expect(Object.keys(end.art ?? {})).toEqual(["fresh"]);

    const received = JSON.parse(out.json);
    received.adventure.end.art.defeated = photo(3_000, 64, 48, true);
    received.adventure.end.art.legendary = "javascript:alert(1)";
    const read = load().adv.parseAdventureData(received);
    assert(read.adventure.end.kind === "boss");
    expect(Object.keys(read.adventure.end.art ?? {})).toEqual(["fresh"]);
  });

  test("under the budget the cover goes first, then the boss's normal picture, then the quests, then its other forms", async () => {
    const big = () => photo(390_000);
    // 18 pictures in the quest, 7.0M: with the cover and the normal picture it is 7.8M, and no other form fits after it.
    const own = Array.from({ length: 18 }, () => ({ uuid: nextUuid(), image: big() }));
    const mine = await heroQuest({ own, official: [] });
    const { id } = await adventureWithBoss({ fresh: big(), wounded: big(), defeated: big() }, [
      mine.id,
      (await heroQuest()).id,
    ]);
    t.sqlite.prepare("UPDATE adventures SET imagePath = ? WHERE id = ?").run(big(), id);
    refresh();
    const out = await written(id);
    const end = out.file.adventure.end;
    assert(end.kind === "boss");
    expect(out.file.adventure.photo).toBeDefined();
    expect(end.art?.fresh).toBeDefined();
    expect(end.art?.wounded).toBeUndefined();
    expect(end.art?.defeated).toBeUndefined();
    expect(dataImages(out.file).size).toBeGreaterThanOrEqual(18);
    expect(out.photos).toBe(20);
    expect(out.leftOut).toBe(2);
    expect(utf8(out.json)).toBeLessThanOrEqual(MAX_FILE_BYTES);
  });

  test("the preview counts the boss's pictures among what arrives, unless the phone already holds that boss", async () => {
    const { id } = await adventureWithBoss({ fresh: photo(3_000), defeated: photo(3_000) });
    const file = parseJson((await written(id)).json);
    // Another phone: nothing of it here.
    t.sqlite.exec("DELETE FROM hero_bosses");
    refresh();
    const fresh = await load().adv.previewAdventure(
      { ...file, adventure: { ...file.adventure, uuid: nextUuid() } },
      "en",
    );
    expect(fresh.arrives.photos).toBeGreaterThanOrEqual(2);
    const withBoss = fresh.arrives.photos;
    await load().adv.importAdventure(
      { ...file, adventure: { ...file.adventure, uuid: nextUuid() } },
      { asCopy: false },
    );
    // Now the boss is here: a second adventure naming it brings no picture for it.
    const again = await load().adv.previewAdventure(
      { ...file, adventure: { ...file.adventure, uuid: nextUuid() } },
      "en",
    );
    expect(again.arrives.photos).toBe(withBoss - 2);
  });

  test("a boss already here is the one the preview shows, as it is the one the import keeps", async () => {
    const { id, bossUuid } = await adventureWithBoss({ fresh: photo(3_000) });
    const file = parseJson((await written(id)).json);
    const end = file.adventure.end;
    assert(end.kind === "boss");
    const theirs = {
      ...file,
      adventure: {
        ...file.adventure,
        uuid: nextUuid(),
        end: {
          ...end,
          name: "Theirs",
          lines: { intro: [], idle: ["Not mine."], crit: [], enrage: [], defeat: [] },
          art: {},
        },
      },
    };
    const preview = await load().adv.previewAdventure(theirs, "en");
    expect(preview.boss?.uuid).toBe(bossUuid);
    expect(preview.boss?.name).toBe("Gorgo");
    expect(preview.boss?.art.fresh).toBeDefined();
    await load().adv.importAdventure(theirs, { asCopy: false });
    expect((await heroBosses().getHeroBossByUuid(bossUuid))?.name).toBe("Gorgo");
  });

  test("an older file without the fields imports with the painted monster", async () => {
    const monster = (await load().hero.listMonsters())[0];
    assert(monster);
    const [a, b] = seedQuests();
    assert(a && b);
    const file = load().adv.parseAdventureData(
      adventureLiteral(
        nextUuid(),
        [{ official: a.enTitle }, { official: b.enTitle }],
        {},
        { kind: "boss", monster: monster.key, name: "Old", lines: { idle: ["Hi."] } },
      ),
    );
    const { id } = await load().adv.importAdventure(file, { asCopy: false });
    const draft = await load().hero.loadHeroAdventureDraft(id);
    assert(draft?.end.kind === "boss");
    const boss = await heroBosses().getHeroBoss(
      (
        t.sqlite.prepare("SELECT id FROM hero_bosses WHERE uuid = ?").get(draft.end.heroBoss) as {
          id: number;
        }
      ).id,
    );
    expect(boss?.art).toEqual({});
    expect(boss?.monsterKey).toBe(monster.key);
  });
});
