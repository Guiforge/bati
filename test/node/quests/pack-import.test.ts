/**
 * A pack, from the phone that made it to the phone that receives it (`src/packFile.ts`): what one
 * hero ticked is written by `packToShare`, read back by `parsePackData` on another database, and
 * filed by `importPack`. Every test reads the rows afterwards, not the counts the writer returns.
 */
import { type Device, newDevice } from "../harness/device";
import { useDeviceClocks } from "../harness/world";

beforeAll(() => useDeviceClocks());

let a: Device;
let b: Device;
beforeEach(async () => {
  a = await newDevice("sender");
  b = await newDevice("receiver");
});
afterEach(() => {
  a.close();
  b.close();
});

/** SOI, a JFIF APP0, then SOF0: a header `safeImage` can size. `seed` makes two photos differ. */
function photo(seed: number): string {
  const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
  const text = (t: string) => [...t].map((c) => c.charCodeAt(0));
  const app0 = [0xff, 0xe0, ...be16(16), ...text("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof0 = [0xff, 0xc0, ...be16(17), 8, ...be16(48), ...be16(64), 3];
  const body = [0xff, 0xd8, ...app0, ...sof0, ...Array<number>(15).fill(0), seed, seed, seed];
  return `data:image/jpeg;base64,${Buffer.from(Uint8Array.from(body)).toString("base64")}`;
}

const count = (d: Device, table: string, where = "1") =>
  (d.sqlite.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${where}`).get() as { n: number }).n;
const counts = (d: Device) => ({
  movements: count(d, "exercises", "creator = 'hero'"),
  quests: count(d, "quests", "author = 'hero'"),
  bosses: count(d, "hero_bosses"),
  adventures: count(d, "adventures", "author = 'hero'"),
});

const movement = (d: Device, name: string, imagePath: string) =>
  d.app.exercises.createUserExercise({
    ...d.app.exercises.DEFAULT_USER_EXERCISE_DRAFT,
    name,
    description: "",
    imagePath,
  });

const quest = (d: Device, title: string, exerciseIds: number[], imagePath: string | null = null) =>
  d.app.quests.createQuestTemplate({
    enTitle: title,
    frTitle: title,
    deTitle: title,
    esTitle: title,
    ruTitle: title,
    zhTitle: title,
    enDescription: "",
    frDescription: "",
    deDescription: "",
    esDescription: "",
    ruDescription: "",
    zhDescription: "",
    rounds: 3,
    restSeconds: 30,
    roundRestSeconds: null,
    author: d.app.quests.USER_QUEST_AUTHOR,
    imagePath,
    exercises: exerciseIds.map((exerciseId) => ({
      exerciseId,
      images: [],
      baseTarget: { type: "reps", min: 8, max: 12 },
    })),
  });

/** What a hero made on `a`: three movements, two quests sharing one of them, a boss, an adventure. */
async function forge() {
  const push = await movement(a, "Porch push", photo(1));
  const dip = await movement(a, "Garden dip", photo(2));
  const alone = await movement(a, "Fence hang", photo(3));
  const morning = await quest(a, "Iron morning", [push, dip], photo(4));
  const evening = await quest(a, "Iron evening", [push]);
  const [monster] = await a.app.heroAdventures.listMonsters();
  if (!monster) throw new Error("no seeded monster");
  const bossId = await a.app.heroBosses.createHeroBoss({
    ...a.app.heroBosses.emptyHeroBossDraft(monster.key),
    name: "The landlord",
    art: { fresh: photo(5) },
  });
  const boss = await a.app.heroBosses.getHeroBoss(bossId);
  if (!boss) throw new Error("no boss");
  const adventure = await a.app.heroAdventures.createHeroAdventure({
    title: "The long road",
    description: "",
    imagePath: "the_golem",
    end: { kind: "boss", monster: monster.key, heroBoss: boss.uuid },
    steps: [
      { questId: morning, narrative: "Out.", outro: "" },
      { questId: evening, narrative: "Back.", outro: "" },
    ],
  });
  return { push, dip, alone, morning, evening, bossId, adventure };
}

const uuidOf = (d: Device, table: string, id: number) =>
  (d.sqlite.prepare(`SELECT uuid FROM ${table} WHERE id = ?`).get(id) as { uuid: string }).uuid;

/** The pack as `b` reads it, and every uuid in it ticked. */
async function received(json: string) {
  const file = await b.app.pack.parsePackData(JSON.parse(json));
  const all = {
    movements: new Set(file.movements.map((m) => m.uuid)),
    quests: new Set(file.quests.map((q) => q.quest.uuid)),
    bosses: new Set(file.bosses.map((x) => x.bossUuid)),
    adventures: new Set(file.adventures.map((x) => x.adventure.uuid)),
    useMine: new Set<string>(),
  };
  const none = {
    movements: new Set<string>(),
    quests: new Set<string>(),
    bosses: new Set<string>(),
    adventures: new Set<string>(),
    useMine: new Set<string>(),
  };
  return { file, all, none };
}

describe("a pack", () => {
  test("sent whole arrives whole, each photo once, and a second import adds nothing", async () => {
    const made = await forge();
    const out = await a.app.pack.packToShare({
      movements: [made.alone],
      quests: [],
      bosses: [],
      // The adventure alone: its quests, their movements and its boss come along.
      adventures: [made.adventure],
    });

    expect(out.counts).toEqual({ movements: 3, quests: 2, bosses: 1, adventures: 1 });
    expect(out).toMatchObject({ photos: 5, leftOut: 0 });
    // "Porch push" is in both quests and travels once.
    expect(out.json.split(photo(1)).length - 1).toBe(1);

    const { file, all } = await received(out.json);
    const before = counts(b);
    const done = await b.app.pack.importPack(file, all);
    const after = counts(b);

    expect(done).toEqual({ movements: 3, quests: 2, bosses: 1, adventures: 1 });
    expect(after).toEqual({
      movements: before.movements + 3,
      quests: before.quests + 2,
      bosses: before.bosses + 1,
      adventures: before.adventures + 1,
    });
    // The rows are the sender's, by uuid, photos included.
    const push = b.sqlite
      .prepare("SELECT imagePath FROM exercises WHERE uuid = ?")
      .get(uuidOf(a, "exercises", made.push)) as { imagePath: string };
    expect(push.imagePath).toBe(photo(1));
    const steps = b.sqlite
      .prepare(
        `SELECT q.uuid FROM adventure_steps s JOIN quests q ON q.id = s.questId
          WHERE s.adventureId = (SELECT id FROM adventures WHERE uuid = ?) ORDER BY s.stepIndex`,
      )
      .all(uuidOf(a, "adventures", made.adventure)) as { uuid: string }[];
    expect(steps.map((s) => s.uuid)).toEqual([
      uuidOf(a, "quests", made.morning),
      uuidOf(a, "quests", made.evening),
    ]);
    const ends = b.sqlite
      .prepare("SELECT heroBossUuid FROM adventures WHERE uuid = ?")
      .get(uuidOf(a, "adventures", made.adventure)) as { heroBossUuid: string };
    expect(ends.heroBossUuid).toBe(uuidOf(a, "hero_bosses", made.bossId));

    await b.app.pack.importPack(file, all);
    expect(counts(b)).toEqual(after);
  });

  test("only what is ticked is written, with what it needs", async () => {
    const made = await forge();
    const out = await a.app.pack.packToShare({
      movements: [made.alone],
      quests: [made.morning, made.evening],
      bosses: [made.bossId],
      adventures: [made.adventure],
    });
    const { file, none } = await received(out.json);
    const before = counts(b);

    await b.app.pack.importPack(file, {
      ...none,
      quests: new Set([uuidOf(a, "quests", made.evening)]),
    });

    // "Iron evening" and the one movement it names: no boss, no adventure, not the other quest.
    expect(counts(b)).toEqual({
      ...before,
      movements: before.movements + 1,
      quests: before.quests + 1,
    });
  });

  test("a quest ticked beside the adventure that names it is one quest", async () => {
    const made = await forge();
    const out = await a.app.pack.packToShare({
      movements: [],
      quests: [made.morning],
      bosses: [],
      adventures: [made.adventure],
    });
    const { file, none } = await received(out.json);
    const before = counts(b);

    await b.app.pack.importPack(file, {
      ...none,
      quests: new Set([uuidOf(a, "quests", made.morning)]),
      adventures: new Set([uuidOf(a, "adventures", made.adventure)]),
    });

    expect(counts(b).quests).toBe(before.quests + 2);
    expect(count(b, "quests", `uuid = '${uuidOf(a, "quests", made.morning)}'`)).toBe(1);
  });

  test("a movement merged into the hero's own of the same name writes no row", async () => {
    const made = await forge();
    const mine = await movement(b, "porch push ", photo(9));
    const out = await a.app.pack.packToShare({
      movements: [],
      quests: [made.evening],
      bosses: [],
      adventures: [],
    });
    const { file, all } = await received(out.json);
    const preview = await b.app.pack.previewPack(file, "en");
    expect(preview.movements).toEqual([{ here: false, sameName: true }]);
    const before = counts(b);

    const done = await b.app.pack.importPack(file, { ...all, useMine: all.movements });

    expect(done.movements).toBe(0);
    expect(counts(b).movements).toBe(before.movements);
    const slots = b.sqlite
      .prepare(
        "SELECT exerciseId FROM quest_exercises WHERE questId = (SELECT id FROM quests WHERE uuid = ?)",
      )
      .all(uuidOf(a, "quests", made.evening)) as { exerciseId: number }[];
    expect(slots).toEqual([{ exerciseId: mine }]);
  });

  test("what is already here changes only when it is ticked", async () => {
    const made = await forge();
    const out = await a.app.pack.packToShare({
      movements: [],
      quests: [made.morning, made.evening],
      bosses: [],
      adventures: [],
    });
    const { file, all, none } = await received(out.json);
    await b.app.pack.importPack(file, all);
    const morning = uuidOf(a, "quests", made.morning);
    const title = () =>
      (
        b.sqlite.prepare("SELECT enTitle FROM quests WHERE uuid = ?").get(morning) as {
          enTitle: string;
        }
      ).enTitle;
    b.sqlite.prepare("UPDATE quests SET enTitle = 'Mine now' WHERE uuid = ?").run(morning);
    b.app.quests.invalidateQuestTemplates();

    const preview = await b.app.pack.previewPack(file, "en");
    expect(preview.quests.map((q) => q.here)).toEqual([true, true]);
    await b.app.pack.importPack(file, {
      ...none,
      quests: new Set([uuidOf(a, "quests", made.evening)]),
    });
    expect(title()).toBe("Mine now");

    await b.app.pack.importPack(file, { ...none, quests: new Set([morning]) });
    expect(title()).toBe("Iron morning");
  });

  test("photos past what a pack may weigh stay on the phone, and the file is still one its reader takes", async () => {
    // 45 photos of 390,000 characters: more than the 16,000,000 bytes a pack is written in.
    const heavy = (seed: number) => {
      const small = Buffer.from(photo(seed).split(",")[1] ?? "", "base64");
      const body = Buffer.alloc(292_000);
      small.copy(body);
      body.writeUInt32BE(seed, body.length - 4);
      return `data:image/jpeg;base64,${body.toString("base64")}`;
    };
    const ids: number[] = [];
    for (let i = 0; i < 45; i++) ids.push(await movement(a, `Heavy ${i}`, heavy(i + 1)));

    const out = await a.app.pack.packToShare({
      movements: ids,
      quests: [],
      bosses: [],
      adventures: [],
    });

    expect(out.counts.movements).toBe(45);
    expect(out.photos + out.leftOut).toBe(45);
    expect(out.leftOut).toBeGreaterThan(0);
    expect(Buffer.byteLength(out.json)).toBeLessThanOrEqual(16_000_000);
    // Every movement travels, the ones past the limit without their photo.
    const { file } = await received(out.json);
    expect(file.movements.filter((m) => m.image.startsWith("data:"))).toHaveLength(out.photos);
  });

  // Not held here: that a failure halfway leaves nothing behind. This harness's
  // `transactionOrFallback` runs the body with no BEGIN (better-sqlite3 has no async transaction,
  // see `__tests__/helpers/testDb.ts`), so a rollback can only be seen on a device.

  test("a reference to something the pack does not list is refused", async () => {
    const made = await forge();
    const out = await a.app.pack.packToShare({
      movements: [],
      quests: [made.evening],
      bosses: [],
      adventures: [],
    });
    const data = JSON.parse(out.json) as { movements: unknown[] };
    data.movements = [];

    await expect(b.app.pack.parsePackData(data)).rejects.toMatchObject({ reason: "not_a_pack" });
  });
});
