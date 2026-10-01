import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * A quest file arrives from someone else's phone, so every field of it is a trust boundary. What
 * is held here: what is refused and why, what a picture may be (never a URL the app would fetch),
 * and how a quest is recognised on the way in. By its uuid and nothing else: a second import
 * updates the first, a movement the receiver already has is reused even renamed, and an import
 * that fails halfway leaves nothing behind.
 */
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

type QuestFileModule = typeof import("../src/questFile");
type QuestFile = import("../src/questFile").QuestFile;

const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDA==";
const QUEST_UUID = "0192a000-0000-7000-8000-000000000001";
const DIP_UUID = "0192a000-0000-7000-8000-000000000002";

const t = createTestDb();

beforeAll(() => {
  jest.resetModules();
  // What this suite checks is that the import makes every write inside the callback it hands
  // `transactionOrFallback`, none before and none after. Whether that callback is atomic on the
  // phone is `db/client.ts`'s job, held by `db-transaction.test.ts` against Drizzle's real
  // behaviour. Here a plain BEGIN and ROLLBACK around the body stand in for it, which
  // better-sqlite3 can do statement by statement, so a failure halfway is judged by its rows.
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

const load = () => ({
  file: require("../src/questFile") as QuestFileModule,
  exercises: require("../db/exercises") as typeof import("../db/exercises"),
  quests: require("../db/quests") as typeof import("../db/quests"),
  uuid: require("../db/uuid") as typeof import("../db/uuid"),
});

const rows = (table: "exercises" | "quests") =>
  (t.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

/** A file as another phone would write it: one seed movement, one of the sender's own. */
function received(over: Partial<QuestFile["quest"]> = {}): QuestFile {
  return {
    kind: "bati-quest",
    version: 1,
    quest: {
      uuid: QUEST_UUID,
      title: { en: "Porch forge", fr: "Porch forge", de: "Porch forge", es: "Porch forge" },
      description: {
        en: "Before coffee.",
        fr: "Before coffee.",
        de: "Before coffee.",
        es: "Before coffee.",
      },
      rounds: 3,
      restSeconds: 45,
      roundRestSeconds: 90,
      image: PHOTO,
      ...over,
    },
    slots: [
      { movement: { official: "Push-ups" }, target: { type: "reps", min: 8, max: 12 } },
      {
        movement: {
          own: {
            uuid: DIP_UUID,
            name: "Porch dip",
            description: "Hands on the step behind you.",
            image: PHOTO,
            muscles: ["arms"],
            style: "strength",
            difficulty: "easy",
            equipment: "none",
            pattern: null,
            measure: "reps",
            secondsPerRep: 3,
          },
        },
        target: { type: "reps", min: 5, max: 10 },
      },
    ],
  };
}

describe("reading a quest file", () => {
  const parse = (raw: string) => load().file.parseQuestFile(raw);
  const reason = (value: unknown) => {
    try {
      parse(JSON.stringify(value));
    } catch (error) {
      assert(error instanceof load().file.QuestFileError);
      return error.reason;
    }
    return null;
  };

  test("a file as written is read back as written", () => {
    expect(parse(JSON.stringify(received()))).toEqual(received());
  });

  test("a missing translation reads as English, as untranslated seed rows do", () => {
    const file = received();
    const raw = { ...file, quest: { ...file.quest, title: { en: "Porch forge" } } };
    expect(parse(JSON.stringify(raw)).quest.title.fr).toBe("Porch forge");
  });

  test("says why a file is refused", () => {
    try {
      parse("{not json");
      throw new Error("parsed");
    } catch (error) {
      assert(error instanceof load().file.QuestFileError);
      expect(error.reason).toBe("unreadable");
    }
    expect(reason({ ...received(), kind: "something-else" })).toBe("not_a_quest");
    expect(reason({ ...received(), version: 2 })).toBe("newer");
    expect(reason({ ...received(), slots: [] })).toBe("not_a_quest");
    const badTarget = received();
    assert(badTarget.slots[0]);
    (badTarget.slots[0].target as { type: string }).type = "laps";
    expect(reason(badTarget)).toBe("not_a_quest");
  });

  test("the quest and every own movement must carry a lowercase uuid v7", () => {
    expect(reason(received({ uuid: undefined as never }))).toBe("not_a_quest");
    expect(reason(received({ uuid: QUEST_UUID.toUpperCase() }))).toBe("not_a_quest");
    // A v4 is a well-formed uuid and still not one this app writes.
    expect(reason(received({ uuid: "0192a000-0000-4000-8000-000000000001" }))).toBe("not_a_quest");
    const noDipUuid = received();
    const own = noDipUuid.slots[1]?.movement;
    assert(own && "own" in own);
    (own.own as { uuid?: string }).uuid = undefined;
    expect(reason(noDipUuid)).toBe("not_a_quest");
  });

  test("an own movement's codes must be ones the app knows", () => {
    const file = received();
    const own = file.slots[1]?.movement;
    assert(own && "own" in own);
    (own.own.muscles as string[]).push("wings");
    expect(reason(file)).toBe("not_a_quest");
  });

  test("a picture is carried in the file or shipped with the app, never fetched", () => {
    const { safeImage } = load().file;
    expect(safeImage(PHOTO)).toBe(PHOTO);
    expect(safeImage("assets/images/quests/forge.webp")).toBe("assets/images/quests/forge.webp");
    // Each of these would make the app reach a stranger's server or read this phone's files.
    expect(safeImage("https://tracker.example/pixel.png")).toBeNull();
    expect(safeImage("http://tracker.example/pixel.png")).toBeNull();
    expect(safeImage("file:///data/data/com.guiforge.bati/databases/bati.db")).toBeNull();
    expect(safeImage("content://media/external/images/1")).toBeNull();
    expect(safeImage("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(safeImage("../../secrets")).toBeNull();
  });
});

describe("writing a quest file", () => {
  test("a hero row is named when it is written, a seed row never is", async () => {
    const { exercises, quests, uuid } = load();
    const blank = {
      frTitle: "",
      deTitle: "",
      esTitle: "",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [],
    };
    const seed = await quests.createQuestTemplate({ ...blank, enTitle: "Seeded" });
    const mine = await quests.createQuestTemplate({
      ...blank,
      enTitle: "Mine",
      author: quests.USER_QUEST_AUTHOR,
    });
    const move = await exercises.createUserExercise({
      ...exercises.DEFAULT_USER_EXERCISE_DRAFT,
      name: "Named on write",
      description: "",
    });
    const uuidOf = (table: string, id: number) =>
      (
        t.sqlite.prepare(`SELECT uuid FROM ${table} WHERE id = ?`).get(id) as {
          uuid: string | null;
        }
      ).uuid;

    expect(uuidOf("quests", seed)).toBeNull();
    expect(uuidOf("quests", mine)).toMatch(uuid.UUID_V7_RE);
    expect(uuidOf("exercises", move)).toMatch(uuid.UUID_V7_RE);
  });

  test("carries the quest's uuid, and the photo and uuid of every own movement", async () => {
    const { file, exercises, quests, uuid } = load();
    const ownId = await exercises.createUserExercise({
      ...exercises.DEFAULT_USER_EXERCISE_DRAFT,
      name: "Wall sit",
      description: "Back flat.",
      imagePath: PHOTO,
      muscles: ["legs"],
    });
    const questId = await quests.createQuestTemplate({
      enTitle: "Hall drill",
      frTitle: "Hall drill",
      deTitle: "Hall drill",
      esTitle: "Hall drill",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      author: quests.USER_QUEST_AUTHOR,
      rounds: 2,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [
        { exerciseId: ownId, images: [], baseTarget: { type: "time", min: 30, max: 45 } },
      ],
    });
    const template = await quests.getQuestTemplateById(questId);
    assert(template);

    const written = file.questToFile(template, await exercises.listExercises());

    expect(written.quest.uuid).toMatch(uuid.UUID_V7_RE);
    expect(written.quest.uuid).toBe(template.uuid);
    const slot = written.slots[0]?.movement;
    assert(slot && "own" in slot);
    expect(slot.own.uuid).toMatch(uuid.UUID_V7_RE);
    expect(slot.own.image).toBe(PHOTO);
  });

  test("refuses a quest with no uuid rather than send one no import could recognise", async () => {
    const { file, exercises, quests } = load();
    const id = await quests.createQuestTemplate({
      enTitle: "Raw",
      frTitle: "Raw",
      deTitle: "Raw",
      esTitle: "Raw",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      author: quests.USER_QUEST_AUTHOR,
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [],
    });
    // What a dev seed in raw SQL leaves: a hero row 0066 never named.
    t.sqlite.prepare("UPDATE quests SET uuid = NULL WHERE id = ?").run(id);
    quests.invalidateQuestTemplates(id);
    const template = await quests.getQuestTemplateById(id);
    assert(template);
    expect(() => file.questToFile(template, [])).toThrow(/no uuid/);
  });
});

describe("importing a quest file", () => {
  const exerciseByUuid = (uuid: string) =>
    t.sqlite.prepare("SELECT * FROM exercises WHERE uuid = ?").get(uuid) as
      | { id: number; enName: string; imagePath: string; creator: string; retiredAt: number | null }
      | undefined;

  test("the first import writes the quest and its own movement under the sender's uuids", async () => {
    const { file, quests } = load();
    const pushUps = t.sqlite
      .prepare("SELECT id FROM exercises WHERE enName = 'Push-ups' AND creator = 'Admin'")
      .get() as { id: number };

    const { id, updated } = await file.importQuest(received());

    expect(updated).toBe(false);
    const quest = await quests.getQuestTemplateById(id);
    assert(quest);
    expect(quest.uuid).toBe(QUEST_UUID);
    expect(quest.author).toBe(quests.USER_QUEST_AUTHOR);
    expect(quest.imagePath).toBe(PHOTO);
    expect(quest.roundRestSeconds).toBe(90);
    const dip = exerciseByUuid(DIP_UUID);
    assert(dip);
    expect(dip.creator).toBe("hero");
    expect(dip.imagePath).toBe(PHOTO);
    expect(quest.exercises.map((e) => [e.exerciseId, e.baseTarget])).toEqual([
      [pushUps.id, { type: "reps", min: 8, max: 12 }],
      [dip.id, { type: "reps", min: 5, max: 10 }],
    ]);
  });

  test("a second import of the same quest updates it in place and writes no new row", async () => {
    const { file, quests } = load();
    const before = { quests: rows("quests"), exercises: rows("exercises") };
    const first = (await quests.listQuestTemplates()).find((q) => q.uuid === QUEST_UUID);
    assert(first);

    const again = received({
      title: {
        en: "Porch forge II",
        fr: "Porch forge II",
        de: "Porch forge II",
        es: "Porch forge II",
      },
      rounds: 4,
    });
    const { id, updated } = await file.importQuest(again);

    expect(updated).toBe(true);
    expect(id).toBe(first.id);
    expect({ quests: rows("quests"), exercises: rows("exercises") }).toEqual(before);
    const quest = await quests.getQuestTemplateById(id);
    expect(quest?.enTitle).toBe("Porch forge II");
    expect(quest?.rounds).toBe(4);
  });

  test("a movement the receiver renamed is still the one the slot points at, and keeps its name", async () => {
    const { file, quests } = load();
    const dip = exerciseByUuid(DIP_UUID);
    assert(dip);
    t.sqlite.prepare("UPDATE exercises SET enName = 'My dip' WHERE id = ?").run(dip.id);
    (require("../db/exercises") as typeof import("../db/exercises")).invalidateExercisesCache();

    const { id } = await file.importQuest(received());

    const quest = await quests.getQuestTemplateById(id);
    expect(quest?.exercises[1]?.exerciseId).toBe(dip.id);
    expect(exerciseByUuid(DIP_UUID)?.enName).toBe("My dip");
  });

  test("a movement the receiver retired comes back, since they are choosing it again", async () => {
    const { file, exercises } = load();
    const dip = exerciseByUuid(DIP_UUID);
    assert(dip);
    await exercises.retireUserExercise(dip.id);
    expect(exerciseByUuid(DIP_UUID)?.retiredAt).not.toBeNull();

    await file.importQuest(received());

    expect(exerciseByUuid(DIP_UUID)?.retiredAt).toBeNull();
  });

  test("a movement named twice in one file is written once", async () => {
    const { file } = load();
    const twice = received({ uuid: "0192a000-0000-7000-8000-000000000003" });
    const own = twice.slots[1]?.movement;
    assert(own && "own" in own);
    own.own.uuid = "0192a000-0000-7000-8000-000000000004";
    const slot = twice.slots[1];
    assert(slot);
    twice.slots.push(structuredClone(slot));
    const before = rows("exercises");

    await file.importQuest(twice);

    expect(rows("exercises")).toBe(before + 1);
  });

  test("a seed movement this version lacks refuses the file before writing anything", async () => {
    const { file } = load();
    const ahead = received({ uuid: "0192a000-0000-7000-8000-000000000005" });
    ahead.slots.unshift({
      movement: { official: "A movement from next year" },
      target: { type: "reps", min: 5, max: 5 },
    });
    const before = { quests: rows("quests"), exercises: rows("exercises") };

    await expect(file.importQuest(ahead)).rejects.toMatchObject({ reason: "unknown_movement" });

    expect({ quests: rows("quests"), exercises: rows("exercises") }).toEqual(before);
  });

  test("a write that fails halfway takes the movements it already wrote back with it", async () => {
    const { file, quests } = load();
    const fresh = received({ uuid: "0192a000-0000-7000-8000-000000000006" });
    const own = fresh.slots[1]?.movement;
    assert(own && "own" in own);
    own.own.uuid = "0192a000-0000-7000-8000-000000000007";
    const before = { quests: rows("quests"), exercises: rows("exercises") };
    // The movement is written, then the quest fails: the last write of the transaction.
    const failing = jest
      .spyOn(quests, "createQuestTemplate")
      .mockRejectedValueOnce(new Error("disk full"));

    await expect(file.importQuest(fresh)).rejects.toThrow("disk full");

    failing.mockRestore();
    expect({ quests: rows("quests"), exercises: rows("exercises") }).toEqual(before);
    expect(exerciseByUuid("0192a000-0000-7000-8000-000000000007")).toBeUndefined();
  });
});
