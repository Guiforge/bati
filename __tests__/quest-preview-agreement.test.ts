import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * A card and the screen behind it must quote one duration and one reward.
 *
 * They quoted two. `db/preview.ts` read the template at the hero's level and stopped there;
 * `getQuestById` also serves the rung the hero actually works and prescribes a hold at 67% of
 * their own record. On a five-year journal 27 of the 37 seeded quests disagreed, "up to +207 XP"
 * on a Chop Wood card over "+200" on its screen, "+63 XP per step" on an adventure poster over
 * "+94" (verification 2026-09-15, B4).
 *
 * Both now go through `resolveSlot`, so this sweeps every seeded quest and fails the moment one
 * of the two paths learns something the other does not. The detail path here is the one the quest
 * screen composes: `getQuestById` at the saved level, then `applyQuestConfig`.
 */
describe("a quest card and its screen quote the same numbers", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    api().quests.invalidateQuestTemplates();
  });

  afterAll(() => t.close());

  function api() {
    return {
      quests: require("../db/quests") as typeof import("../db/quests"),
      preview: require("../db/preview") as typeof import("../db/preview"),
      config: require("../db/questConfig") as typeof import("../db/questConfig"),
      exercises: require("../db/exercises") as typeof import("../db/exercises"),
      estimate: require("../db/estimate") as typeof import("../db/estimate"),
      xp: require("../db/xp") as typeof import("../db/xp"),
    };
  }

  function idOf(enName: string): number {
    return (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(enName) as { id: number }
    ).id;
  }

  /** One session on `exerciseId`, at `value` in `unit`, on target. */
  function log(exerciseId: number, unit: "reps" | "time", value: number, daysAgo = 0): void {
    const at = Math.floor(Date.now() / 1000) - daysAgo * 24 * 60 * 60;
    const info = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(at);
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
            targetValue, performedAt)
         VALUES (?, ?, 0, 0, ?, ?, ?, ?, ?)`,
      )
      .run(Number(info.lastInsertRowid), exerciseId, unit, value, unit, value, at);
  }

  /**
   * Every seeded quest, priced both ways. Returns the quests whose two answers differ, named, so
   * a failure says which quest and by how much rather than "expected 27 to be 0".
   */
  async function disagreements(
    configs: Map<number, import("../db/questConfig").QuestConfig>,
  ): Promise<string[]> {
    const { quests, preview, config, exercises, estimate, xp } = api();
    const templates = await quests.listQuestTemplates();
    const catalogue = config.indexExercises(await exercises.listExercises());

    // The card: one batched read for the whole gallery.
    const cards = await preview.previewQuests(templates, catalogue, configs);

    const out: string[] = [];
    for (const template of templates) {
      const saved = configs.get(template.id) ?? null;
      const level = saved?.level ?? quests.Difficulty.Medium;
      const raw = await quests.getQuestById(template.id, level);
      if (!raw) throw new Error(`quest ${template.id} vanished`);
      const screen = config.applyQuestConfig(raw, saved, catalogue);

      const card = cards.get(template.id);
      const seconds = estimate.estimateQuestSeconds(screen);
      const reward = xp.estimateQuestXp(screen, level);

      if (card?.xp !== reward || card.seconds !== seconds) {
        out.push(
          `${template.enTitle}: card ${card?.seconds}s/+${card?.xp}XP, screen ${seconds}s/+${reward}XP`,
        );
      }
    }
    return out;
  }

  test("a hero with no history, so every ladder slot is substituted", async () => {
    expect(await disagreements(new Map())).toEqual([]);
  });

  test("a hero whose records move the holds and whose rungs move the movements", async () => {
    // A long plank pulls every plank slot up off `HOLD_FRACTION_OF_MAX`, and three clean wall
    // push-up sessions move the push-up slots one rung up the chain.
    log(idOf("Plank"), "time", 180, 1);
    for (const day of [2, 3, 4]) log(idOf("Wall Push-Up"), "reps", 10, day);

    expect(await disagreements(new Map())).toEqual([]);
  });

  test("a hero who saved a level and an override on a quest", async () => {
    const { quests } = api();
    const templates = await quests.listQuestTemplates();
    const chop = templates.find((q) => q.enTitle === "Chop Wood");
    const first = chop?.exercises[0];
    if (!chop || !first) throw new Error("Chop Wood has no slots");

    expect(
      await disagreements(
        new Map([
          [chop.id, { level: quests.Difficulty.Hard, rounds: 5, targets: { [first.id]: 7 } }],
        ]),
      ),
    ).toEqual([]);
  });
});
