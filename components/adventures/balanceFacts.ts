import type { TFunction } from "i18next";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/labels";
import {
  PULL_DEFICIT_RATIO,
  PULL_PATTERNS,
  PUSH_PATTERNS,
  WEAK_SHARE_OF_IDEAL,
} from "@/db/patterns";
import type { QuestTemplate } from "@/db/quests";
import { type MuscleCode, muscleCodes } from "@/db/schema";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { formatList } from "@/src/i18n/list";

export type BalanceFact =
  | { kind: "push_streak"; count: number }
  | { kind: "pull_deficit"; push: number; pull: number }
  | { kind: "absent"; muscles: MuscleCode[] }
  | { kind: "light"; muscles: MuscleCode[] };

/** Steps in a row that push without pulling before it is worth a sentence. */
const MIN_STREAK = 3;
/**
 * Push slots before the pull ratio means something: one pushing step is not an imbalance. A
 * threshold of these sentences alone, the Coach judges volume (`MIN_PUSH_VOLUME_TO_JUDGE`), which
 * an adventure's slots do not have. Only `PULL_DEFICIT_RATIO` is shared.
 */
const MIN_PUSH_SLOTS = 2;

type Counts = {
  hits: Map<MuscleCode, number>;
  pushSlots: number;
  pullSlots: number;
  streak: number;
};

/** Which family a movement belongs to; a hero movement with no pattern belongs to neither. */
function familyOf(ex: Exercise | undefined): "push" | "pull" | null {
  const pattern = ex?.pattern;
  if (!pattern) return null;
  if (PUSH_PATTERNS.includes(pattern)) return "push";
  return PULL_PATTERNS.includes(pattern) ? "pull" : null;
}

function count(steps: readonly QuestTemplate[], exercisesById: Record<number, Exercise>): Counts {
  const hits = new Map<MuscleCode, number>();
  const slots = { push: 0, pull: 0 };
  let streak = 0;
  let longest = 0;
  for (const step of steps) {
    const families = step.exercises.map((slot) => {
      const ex = exercisesById[slot.exerciseId];
      for (const m of ex?.muscles ?? []) hits.set(m, (hits.get(m) ?? 0) + 1);
      return familyOf(ex);
    });
    for (const f of families) if (f) slots[f] += 1;
    streak = families.includes("push") && !families.includes("pull") ? streak + 1 : 0;
    longest = Math.max(longest, streak);
  }
  return { hits, pushSlots: slots.push, pullSlots: slots.pull, streak: longest };
}

function pushPullFact({ pushSlots, pullSlots, streak }: Counts): BalanceFact | null {
  if (streak >= MIN_STREAK) return { kind: "push_streak", count: streak };
  if (pushSlots >= MIN_PUSH_SLOTS && pullSlots < pushSlots * PULL_DEFICIT_RATIO) {
    return { kind: "pull_deficit", push: pushSlots, pull: pullSlots };
  }
  return null;
}

function muscleFact({ hits }: Counts): BalanceFact | null {
  // Nothing to say about a muscle when no slot works any: six "absent" muscles is a sentence about nothing.
  const total = muscleCodes.reduce((sum, m) => sum + (hits.get(m) ?? 0), 0);
  if (total === 0) return null;
  const absent = muscleCodes.filter((m) => !hits.has(m));
  if (absent.length > 0) return { kind: "absent", muscles: absent };
  const light = muscleCodes.filter(
    (m) => (hits.get(m) ?? 0) / total < WEAK_SHARE_OF_IDEAL / muscleCodes.length,
  );
  return light.length > 0 ? { kind: "light", muscles: light } : null;
}

/**
 * Facts about the steps, derived and never typed: at most one push/pull fact and one muscle fact,
 * in that order. Slot hits are counted as `trainingFocus` counts them (one per muscle of each
 * slot's exercise); a movement with no pattern neither pushes nor pulls but its muscles count.
 */
export function balanceFacts(
  steps: readonly QuestTemplate[],
  exercisesById: Record<number, Exercise>,
): BalanceFact[] {
  const counts = count(steps, exercisesById);
  return [pushPullFact(counts), muscleFact(counts)].filter((f) => f !== null);
}

/** The sentence, muscles in `muscleCodes` order through MUSCLE_LABELS and formatList. */
export function balanceSentence(fact: BalanceFact, language: AppLanguage, t: TFunction): string {
  switch (fact.kind) {
    case "push_streak":
      return t("adventures.editor_balance_push_streak", { count: fact.count });
    case "pull_deficit":
      return t("adventures.editor_balance_pull_deficit", { push: fact.push, pull: fact.pull });
    case "absent":
    case "light":
      return t(`adventures.editor_balance_${fact.kind}`, {
        muscles: formatList(
          fact.muscles.map((m) => MUSCLE_LABELS[m]?.[language] ?? m),
          language,
        ),
      });
  }
}
