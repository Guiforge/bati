import type { VillageGrowth, VillageTier } from "@/db/village";
import type { useSessionStore } from "@/stores/session";

type SaveResult = Awaited<ReturnType<ReturnType<typeof useSessionStore.getState>["saveSession"]>>;

/** What tonight can say, as the victory screen knows it. Nothing here is written anywhere. */
export type FeastFacts = {
  result: Pick<
    SaveResult,
    | "levelUp"
    | "tierUp"
    | "villageGrowth"
    | "newRecords"
    | "standing"
    | "newRungs"
    | "newAchievements"
    | "fulfilledOath"
    | "oathBonusXp"
    | "crestEvents"
  >;
  /** The campaign ended with this session: today's full-screen epilogue. */
  epilogue?: boolean;
  /** The boss this session felled, by name. */
  boss?: { name: string } | null;
  // V-03 has no producer yet: the types are here so the order below is the spec's, whole.
  age?: { name: string } | null;
  anniversary?: { years: number } | null;
};

export type FeastSize = "small" | "medium" | "large";

type Of<K extends string, D = unknown> = { kind: K; size: FeastSize; id: string } & D;
type Result = FeastFacts["result"];

/** One thing tonight says, said once. `large` is shown full screen after "Continue". */
export type Feast =
  | Of<"epilogue">
  | Of<"reveal", NonNullable<Result["crestEvents"]["reveal"]>>
  | Of<"age", { name: string }>
  | Of<"anniversary", { years: number }>
  | Of<"tier", { tier: VillageTier; level: number | null }>
  | Of<"secondJoins", NonNullable<Result["crestEvents"]["secondJoins"]>>
  | Of<"stageUp", Result["crestEvents"]["stageUp"][number]>
  | Of<"boss", { name: string }>
  | Of<"oath", { progress: NonNullable<Result["fulfilledOath"]>; bonusXp: number }>
  | Of<"level", { level: number }>
  | Of<"growth", { building: VillageGrowth }>
  | Of<"record", { record: Result["newRecords"][number] }>
  | Of<"standing", { standing: NonNullable<Result["standing"]> }>
  | Of<"rung", { step: Result["newRungs"][number] }>
  | Of<"achievement", { achievement: Result["newAchievements"][number] }>;

type Built<T> = T extends Feast ? Omit<T, "size" | "id"> : never;

/**
 * Sorts tonight's facts into a line, a card or the one full-screen feast. Pure.
 *
 * One `large` at most, the first of: the campaign's epilogue (already full screen today), the
 * reveal, an Age, the anniversary, a village tier. The others become cards. A boss and an oath
 * are cards, always. A level reached on the same night as a tier is the tier card's own line, so
 * it is not said twice. Order of the list: the large one, the lines, then the cards (a demoted feast first).
 */
export function rankFeasts(facts: FeastFacts): Feast[] {
  const [first, ...demoted] = bigOnes(facts);
  const sized = (items: Built<Feast>[], size: FeastSize) => items.map((f) => ({ ...f, size }));
  const ordered = [
    ...sized(first ? [first] : [], "large"),
    ...sized(lineOnes(facts.result), "small"),
    ...sized(demoted, "medium"),
    ...sized(cardOnes(facts), "medium"),
  ];
  return ordered.map((f, i) => ({ ...f, id: `${f.kind}-${i}` }) as Feast);
}

/** The candidates for the one full-screen feast, in the spec's order. */
function bigOnes({ result: r, epilogue, age, anniversary }: FeastFacts): Built<Feast>[] {
  const big: Built<Feast>[] = [];
  if (epilogue) big.push({ kind: "epilogue" });
  if (r.crestEvents.reveal) big.push({ kind: "reveal", ...r.crestEvents.reveal });
  if (age) big.push({ kind: "age", name: age.name });
  if (anniversary) big.push({ kind: "anniversary", years: anniversary.years });
  if (r.tierUp)
    big.push({ kind: "tier", tier: r.tierUp.newTier, level: r.levelUp?.newLevel ?? null });
  return big;
}

function lineOnes(r: Result): Built<Feast>[] {
  const lines: Built<Feast>[] = [];
  if (r.levelUp && !r.tierUp) lines.push({ kind: "level", level: r.levelUp.newLevel });
  for (const building of r.villageGrowth) lines.push({ kind: "growth", building });
  for (const record of r.newRecords) lines.push({ kind: "record", record });
  if (r.standing) lines.push({ kind: "standing", standing: r.standing });
  return lines;
}

function cardOnes({ result: r, boss }: FeastFacts): Built<Feast>[] {
  const cards: Built<Feast>[] = [];
  if (boss) cards.push({ kind: "boss", name: boss.name });
  if (r.fulfilledOath)
    cards.push({ kind: "oath", progress: r.fulfilledOath, bonusXp: r.oathBonusXp });
  if (r.crestEvents.secondJoins) cards.push({ kind: "secondJoins", ...r.crestEvents.secondJoins });
  for (const up of r.crestEvents.stageUp) cards.push({ kind: "stageUp", ...up });
  for (const step of r.newRungs) cards.push({ kind: "rung", step });
  for (const achievement of r.newAchievements) cards.push({ kind: "achievement", achievement });
  return cards;
}
