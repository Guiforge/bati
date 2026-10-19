import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The quotas, proven on a real database built by the migrations. The only thing faked is the
 * source (a store without Bati+), never the rule. Modules are reloaded per test so each one has a
 * database of its own and the caches in db/* start cold; the source is therefore re-required after
 * the reset, which is what keeps the mock and the rule on the same instance.
 */
let t: ReturnType<typeof createTestDb>;

beforeEach(() => {
  jest.resetModules();
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  jest.doMock("@/src/plus/source", () => ({
    readEntitlements: jest.fn(() => ({ source: "none", plus: false })),
  }));
});

afterEach(() => t.close());

const access = () => require("@/src/plus/access") as typeof import("@/src/plus/access");
const adventures = () => require("../db/adventures") as typeof import("../db/adventures");
const exercises = () => require("../db/exercises") as typeof import("../db/exercises");
const quests = () => require("../db/quests") as typeof import("../db/quests");

function source(value: { source: "play" | "none"; plus: boolean }) {
  const { readEntitlements } = require("@/src/plus/source") as typeof import("@/src/plus/source");
  (readEntitlements as jest.Mock).mockReturnValue(value);
}
const freePlay = () => source({ source: "play", plus: false });
const paidPlay = () => source({ source: "play", plus: true });

function heroExercises(n: number, retired = 0) {
  for (let i = 0; i < n; i++) {
    t.sqlite
      .prepare(
        `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, difficulty, createdAt, updatedAt, retiredAt)
         VALUES (?, ?, '', '', 'hero', 'medium', 1, 1, ?)`,
      )
      .run(`Mine ${i}`, `Mine ${i}`, i < retired ? 1 : null);
  }
}

/** A hero quest with one slot of `exerciseId`. */
function heroQuest(title: string, exerciseId: number) {
  const id = Number(
    t.sqlite
      .prepare(
        `INSERT INTO quests (uuid, enTitle, frTitle, enDescription, frDescription, author, rounds, restSeconds, createdAt, updatedAt)
         VALUES (?, ?, ?, '', '', 'hero', 1, 0, 1, 1)`,
      )
      .run(`q-${title}`, title, title).lastInsertRowid,
  );
  t.sqlite
    .prepare(
      `INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax)
       VALUES (?, ?, 0, 'reps', 10, 10)`,
    )
    .run(id, exerciseId);
  return id;
}

function oneId(sql: string): number {
  return Number((t.sqlite.prepare(sql).get() as { id: number }).id);
}
const squat = () => oneId("SELECT id FROM exercises WHERE enName = 'Squat' AND creator = 'Admin'");
const walk = () => oneId("SELECT id FROM exercises WHERE style = 'expedition' LIMIT 1");

async function adventureId(enTitle: string): Promise<number> {
  const found = (await adventures().listAdventures()).find((a) => a.enTitle === enTitle);
  assert(found);
  return found.id;
}

const PLUS = [
  "The Golem",
  "The Ranger's Journey",
  "The Guardian's Oath",
  "The Iron Lord's Conquest",
];

describe("can()", () => {
  test("source none: everything is open, whatever the hero holds", async () => {
    heroExercises(12);
    for (let i = 0; i < 10; i++) heroQuest(`Q${i}`, squat());
    const { can, lockedAdventures } = access();
    expect(await can({ kind: "createExercise" })).toBe(true);
    expect(await can({ kind: "createQuest" })).toBe(true);
    for (const a of await adventures().listAdventures()) {
      expect(await can({ kind: "startAdventure", adventureId: a.id })).toBe(true);
    }
    expect((await lockedAdventures()).size).toBe(0);
  });

  test("a paid store source is open too", async () => {
    paidPlay();
    heroExercises(12);
    expect(await access().can({ kind: "createExercise" })).toBe(true);
    expect((await access().lockedAdventures()).size).toBe(0);
  });

  test("5 exercises: the 5th is the last, retired ones keep their slot", async () => {
    freePlay();
    heroExercises(4);
    expect(await access().can({ kind: "createExercise" })).toBe(true);
    t.sqlite.exec("DELETE FROM exercises WHERE creator = 'hero'");
    heroExercises(5, 1);
    exercises().invalidateExercisesCache();
    expect(await access().can({ kind: "createExercise" })).toBe(false);
  });

  test("3 quests, and a quest filed from an outing does not count", async () => {
    freePlay();
    heroQuest("A", squat());
    heroQuest("B", squat());
    expect(await access().can({ kind: "createQuest" })).toBe(true);
    for (let i = 0; i < 4; i++) {
      await quests().createQuestFromOuting(
        {
          enTitle: `Out${i}`,
          frTitle: `Out${i}`,
          deTitle: `Out${i}`,
          esTitle: `Out${i}`,
          enDescription: "",
          frDescription: "",
          deDescription: "",
          esDescription: "",
          imagePath: null,
          exercises: [{ exercise: { id: walk() } }],
        },
        1800,
      );
    }
    quests().invalidateQuestTemplates();
    expect(await access().countedHeroQuests()).toBe(2);
    expect(await access().can({ kind: "createQuest" })).toBe(true);
    heroQuest("C", squat());
    quests().invalidateQuestTemplates();
    expect(await access().can({ kind: "createQuest" })).toBe(false);
  });

  test("nothing is hidden beyond the quota", async () => {
    freePlay();
    heroExercises(7);
    for (let i = 0; i < 4; i++) heroQuest(`Q${i}`, squat());
    const mine = (await exercises().listExercises()).filter((e) => e.creator === "hero");
    expect(mine).toHaveLength(7);
    expect((await quests().listQuestTemplates()).filter((q) => q.author === "hero")).toHaveLength(
      4,
    );
    const last = mine[6];
    assert(last);
    await exercises().retireUserExercise(last.id);
    await exercises().unretireUserExercise(last.id);
    expect(await access().can({ kind: "createExercise" })).toBe(false);
    expect(await access().can({ kind: "createQuest" })).toBe(false);
  });
});

describe("adventures", () => {
  test("exactly the four Bati+ ones are locked, the free four never", async () => {
    freePlay();
    const locked = await access().lockedAdventures();
    const titles = (await adventures().listAdventures())
      .filter((a) => locked.has(a.id))
      .map((a) => a.enTitle);
    expect(titles.sort()).toEqual([...PLUS].sort());
  });

  test("a run of one makes it the hero's, and it plays to the end", async () => {
    const id = await adventureId("The Ranger's Journey");
    const started = await adventures().startAdventureRun({ adventureId: id });
    freePlay();
    expect((await access().lockedAdventures()).has(id)).toBe(false);
    expect(await access().can({ kind: "startAdventure", adventureId: id })).toBe(true);
    expect((await adventures().startAdventureRun({ adventureId: id })).run.id).toBe(started.run.id);

    let step = started.activeStep;
    let finished = false;
    while (step && !finished) {
      const session = Number(
        t.sqlite
          .prepare(
            "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 10, 1)",
          )
          .run(`s-${step.id}`).lastInsertRowid,
      );
      const done = await adventures().completeAdventureRunStep({
        runStepId: step.id,
        completedSessionId: session,
      });
      finished = done.isFinished;
      step = null;
      if (!finished && done.nextRunStepId) {
        step = (await adventures().getActiveAdventureRun(id))?.activeStep ?? null;
      }
    }
    expect(finished).toBe(true);
    expect(await access().can({ kind: "startAdventure", adventureId: id })).toBe(true);
  });

  test("a defeated boss stays defeated and the lock never touches the fight", async () => {
    const id = await adventureId("The Golem");
    await adventures().startAdventureRun({ adventureId: id });
    t.sqlite.exec(`UPDATE adventure_runs SET status = 'finished' WHERE adventureId = ${id}`);
    t.sqlite
      .prepare(
        "INSERT INTO boss_fights (adventureId, totalHp, currentHp, defeatedAt) VALUES (?, 100, 0, 5)",
      )
      .run(id);
    freePlay();
    expect(await access().can({ kind: "startAdventure", adventureId: id })).toBe(true);
    await access().lockedAdventures();
    const fight = t.sqlite.prepare("SELECT * FROM boss_fights WHERE adventureId = ?").get(id);
    expect(fight).toMatchObject({ currentHp: 0, defeatedAt: 5, totalHp: 100 });
  });

  test("Home never offers a locked adventure, only one under way", async () => {
    freePlay();
    const { decideHomeOffer } = require("../db/homeOffer") as typeof import("../db/homeOffer");
    expect((await decideHomeOffer("en"))?.kind).not.toBe("adventure");
    const id = await adventureId("The Golem");
    await adventures().startAdventureRun({ adventureId: id });
    const offer = await decideHomeOffer("en");
    expect(offer).toMatchObject({ kind: "adventure", adventureId: id });
  });

  test("every quest of a Bati+ adventure launches on its own", async () => {
    freePlay();
    const { loadConfiguredQuest } =
      require("../db/questConfig") as typeof import("../db/questConfig");
    const listed = new Set((await quests().listQuestTemplates()).map((q) => q.id));
    for (const title of PLUS) {
      const details = await adventures().getAdventureDetails(await adventureId(title));
      assert(details);
      for (const step of details.steps) {
        expect(listed.has(step.questId)).toBe(true);
        expect(await loadConfiguredQuest(step.questId)).toBeTruthy();
      }
    }
  });

  test("the bosses journal still lists the locked ones", async () => {
    freePlay();
    const { getStandingBosses } = require("../db/journal") as typeof import("../db/journal");
    const standing = new Set((await getStandingBosses()).map((b) => b.adventureId));
    const locked = await access().lockedAdventures();
    const bosses = (await adventures().listAdventures()).filter((a) => a.kind === "boss");
    const lockedBosses = bosses.filter((b) => locked.has(b.id));
    expect(lockedBosses.length).toBeGreaterThan(0);
    for (const b of lockedBosses) expect(standing.has(b.id)).toBe(true);
  });
});

// "Chaque quête reste jouable seule": nothing between Start and the victory may ask for Bati+
// (P-04.6). The cheapest way to keep it true is that these files never reach for the rule.
describe("no paid screen on the way to a victory", () => {
  test.each([
    "app/(tabs)/quests/[id].tsx",
    "components/session/VictoryView.tsx",
    "db/adventures.ts",
    "db/completed.ts",
    "db/merge.ts",
    "db/backup.ts",
    "db/homeOffer.ts",
  ])("%s never imports src/plus", (file) => {
    const source = require("node:fs").readFileSync(file, "utf8") as string;
    expect(source).not.toMatch(/src\/plus/);
  });
});
