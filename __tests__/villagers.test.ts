import {
  CUE_MOMENTS,
  LINE_LENGTH_CAP,
  MINIMUM_POOL,
  MOMENT_CAST,
  POSES_AWAITING_A_MOMENT,
  VILLAGER_IDS,
  VILLAGER_POSES,
} from "@/constants/villagers";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

/**
 * The writing rules, enforced where a machine can enforce them.
 *
 * These are a ratchet, not a target. Every one is a bug this repo's flavour text has already
 * shipped at least once, or one the research says is the difference between a line that keeps
 * working and one that stops: a pool short enough that the rotation showed, a sentence that named
 * a number it had no business knowing, and — the silent one — an `fr` array that grew by a line
 * while `en` did not, so one index pair said two different things in two languages.
 *
 * The lines themselves live in locales/*.json, so this reads them from there. `constants/villagers.ts`
 * only says who exists and who may speak when.
 */

type Pools = Record<string, Record<string, string[]>>;
const EN = en.villagers as unknown as Pools;
const FR = fr.villagers as unknown as Pools;

/** Every (villager, moment) pair the cast table says should exist. */
const PAIRS = CUE_MOMENTS.flatMap((moment) =>
  MOMENT_CAST[moment].speakers.map((villager) => [villager, moment] as const),
);

describe("villager pools", () => {
  test.each(PAIRS)("%s has lines for %s, in both languages", (villager, moment) => {
    expect(EN[villager]?.[moment]).toBeDefined();
    expect(FR[villager]?.[moment]).toBeDefined();
    expect(EN[villager]?.[moment]?.length).toBeGreaterThan(0);
    // The anti-repetition ring keys on `villager:moment:index` so it survives a language switch,
    // which only holds while `en[i]` and `fr[i]` are the same line. Different lengths means they
    // are not, and one index pair is quietly saying two different things.
    expect(FR[villager]?.[moment]).toHaveLength(EN[villager]?.[moment]?.length ?? -1);
  });

  test.each(PAIRS)("%s has enough lines for %s that the rotation does not show", (v, moment) => {
    expect(EN[v]?.[moment]?.length ?? 0).toBeGreaterThanOrEqual(
      MINIMUM_POOL[MOMENT_CAST[moment].priority],
    );
  });

  test.each(PAIRS)("%s stays inside the bubble's cap for %s", (villager, moment) => {
    const cap = LINE_LENGTH_CAP[MOMENT_CAST[moment].priority];
    for (const line of [...(EN[villager]?.[moment] ?? []), ...(FR[villager]?.[moment] ?? [])]) {
      expect(line.length).toBeLessThanOrEqual(cap);
    }
  });

  /**
   * "Ambient never cites data" is not a style preference. An ambient villager has no data —
   * nothing just happened for them to have data *about* — so a number in an ambient line is
   * either invented or contradicts the counter on the same screen.
   */
  const AMBIENT = PAIRS.filter(([, m]) => MOMENT_CAST[m].priority === "ambient");
  test.each(AMBIENT)("%s cites no data at %s", (villager, moment) => {
    for (const line of [...(EN[villager]?.[moment] ?? []), ...(FR[villager]?.[moment] ?? [])]) {
      expect(line).not.toMatch(/\d/);
      expect(line).not.toContain("{{");
    }
  });

  /** The inverse: a `_beat` line that forgot its delta is a comparison to nothing. */
  const BEAT = PAIRS.filter(([, m]) => m === "personal_record_beat");
  test.each(BEAT)("%s names the number at %s", (villager, moment) => {
    for (const line of [...(EN[villager]?.[moment] ?? []), ...(FR[villager]?.[moment] ?? [])]) {
      expect(line).toContain("{{delta}}");
    }
  });

  /**
   * The hero's avatar has no fixed gender, so a French line may never agree a participle with
   * them. `tu t'es …` is the trap: it forces "arrêté" or "arrêtée" and there is no third option.
   * Explicit inclusive spellings are the other way the same mistake arrives.
   */
  test.each(PAIRS)("%s does not gender the hero at %s, in French", (villager, moment) => {
    for (const line of FR[villager]?.[moment] ?? []) {
      expect(line).not.toMatch(/tu t'es /i);
      expect(line).not.toMatch(/\(e\)|·e\b|é\(e\)/);
    }
  });

  /** A pool nobody is cast to speak is content that can never appear. */
  test("no villager carries a pool for a moment they never speak", () => {
    const expected = new Set(PAIRS.map(([v, m]) => `${v}.${m}`));
    const orphans: string[] = [];
    for (const villager of VILLAGER_IDS) {
      for (const moment of Object.keys(EN[villager] ?? {})) {
        if (!expected.has(`${villager}.${moment}`)) orphans.push(`${villager}.${moment}`);
      }
    }
    expect(orphans).toEqual([]);
  });
});

describe("villager cast", () => {
  test.each(CUE_MOMENTS)("%s has at least one speaker, and all of them exist", (moment) => {
    const { speakers } = MOMENT_CAST[moment];
    expect(speakers.length).toBeGreaterThan(0);
    for (const id of speakers) {
      expect(VILLAGER_IDS).toContain(id);
    }
  });

  /**
   * Art with no reader is the failure mode AGENTS.md calls out by name: knip cannot see it (the
   * module is imported), coverage cannot (the asset map counts as a hit), and the only question
   * that finds it is "who consumes this?". So the answer is written down and checked both ways —
   * a pose cannot quietly stay unused, and cannot quietly stay on the waiting list once wired.
   */
  test("every pose is either cued by a moment or listed as waiting for one", () => {
    const cued = new Set(CUE_MOMENTS.map((moment) => MOMENT_CAST[moment].pose));
    const waiting = new Set(POSES_AWAITING_A_MOMENT);

    for (const pose of VILLAGER_POSES) {
      expect(cued.has(pose) || waiting.has(pose)).toBe(true);
      expect(cued.has(pose) && waiting.has(pose)).toBe(false);
    }
  });
});
