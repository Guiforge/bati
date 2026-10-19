import type { CapOffer } from "@/db/capOffer";
import { legendaryKey } from "@/db/crestEvents";
import type { VillageGrowth, VillageTier } from "@/db/village";
import type { AgeNews, AnniversaryNews } from "@/db/villageNewsRules";
import { ageKey, anniversaryKey } from "@/db/villageNewsRules";
import type { SaveResult } from "@/stores/session";

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
    | "crestReveal"
  > &
    // Optional only for the fixtures that predate them: `saveSession` always sets these (null or
    // empty when there is nothing to announce). `savedResult` is never persisted.
    Partial<Pick<SaveResult, "rareCoat" | "crestLegendary" | "capOffers">>;
  /**
   * The campaign ended with this session: its epilogue is already full screen, so it holds the
   * place of the one big feast and says nothing in "Tonight" (its own screen says it).
   */
  epilogue?: boolean;
  /** The big feasts this phone has shown (`bigFeastsShown`); one in it is a card, not a screen. */
  shown?: string[];
  /** The boss this session felled, by name. */
  boss?: { name: string; finalBlow?: boolean; own?: boolean } | null;
  /** The newest Age not shown yet (`result.age`): `tonight` fills it in. */
  age?: AgeNews | null;
  /** The village's anniversary not shown yet (`result.anniversary`). */
  anniversary?: AnniversaryNews | null;
};

export type FeastSize = "small" | "medium" | "large";

type Of<K extends string, D = unknown> = { kind: K; size: FeastSize; id: string } & D;
type Result = FeastFacts["result"];

/** One thing tonight says, said once. `large` is shown full screen after "Continue". */
export type Feast =
  | Of<"reveal", NonNullable<Result["crestReveal"]>>
  | Of<"age", AgeNews>
  | Of<"anniversary", AnniversaryNews>
  | Of<"tier", { tier: VillageTier; level: number | null }>
  | Of<
      "legendary",
      Result["crestEvents"]["stageUp"][number] & {
        /** The hero crossed 500 on an earlier night (the update found them past it): "at least 500", not "tonight". */
        late: boolean;
      }
    >
  | Of<"coat", NonNullable<Result["rareCoat"]>>
  | Of<"secondJoins", NonNullable<Result["crestEvents"]["secondJoins"]>>
  | Of<"stageUp", Result["crestEvents"]["stageUp"][number]>
  | Of<"boss", { name: string; finalBlow?: boolean; own?: boolean }>
  | Of<"oath", { progress: NonNullable<Result["fulfilledOath"]>; bonusXp: number }>
  | Of<"level", { level: number }>
  | Of<"growth", { building: VillageGrowth }>
  | Of<"record", { record: Result["newRecords"][number] }>
  | Of<"standing", { standing: NonNullable<Result["standing"]> }>
  | Of<"rung", { step: Result["newRungs"][number] }>
  | Of<"cap", { offer: CapOffer }>
  | Of<"achievement", { achievement: Result["newAchievements"][number] }>;

type Built<T> = T extends Feast ? Omit<T, "size" | "id"> : never;

/**
 * Sorts tonight's facts into a line, a card or the one full-screen feast. Pure.
 *
 * One `large` at most, the first of: the campaign's epilogue (listed nowhere: its own screen is
 * the feast), the reveal, an Age, the anniversary, a legendary animal not shown yet, a village tier not shown yet. The others
 * become cards. A boss and an oath
 * are cards, always. A level reached on the same night as a tier is the tier card's own line, so
 * it is not said twice. Order of the list: the large one, the lines, then the cards (a demoted feast first).
 */
export function rankFeasts(facts: FeastFacts): Feast[] {
  const bigs = bigOnes(facts);
  const first = facts.epilogue ? undefined : bigs.find((f) => !isShown(f, facts.shown));
  const demoted = bigs.filter((f) => f !== first);
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
function bigOnes({ result: r, age, anniversary }: FeastFacts): Built<Feast>[] {
  const big: Built<Feast>[] = [];
  if (r.crestReveal) big.push({ kind: "reveal", ...r.crestReveal });
  if (age) big.push({ kind: "age", ...age });
  if (anniversary) big.push({ kind: "anniversary", ...anniversary });
  // One per count: the border's can turn legendary on another night than the centre's. Read off
  // the crest after the session (like the reveal), so a hero past 500 at the update sees it once.
  for (const up of r.crestLegendary ?? []) {
    const crossed = r.crestEvents.stageUp.some(
      (s) => s.stage === "legendary" && s.practice === up.practice,
    );
    big.push({ kind: "legendary", ...up, late: !crossed });
  }
  if (r.tierUp)
    big.push({ kind: "tier", tier: r.tierUp.newTier, level: r.levelUp?.newLevel ?? null });
  return big;
}

/** The id a big feast is marked under in `bigFeastsShown`: once per phone. */
export function feastKey(f: Built<Feast>): string {
  switch (f.kind) {
    case "tier":
      return `tier:${f.tier}`;
    case "legendary":
      return legendaryKey(f.practice);
    case "age":
      return ageKey(f.level);
    case "anniversary":
      return anniversaryKey(f.years);
    default:
      return f.kind;
  }
}

const isShown = (f: Built<Feast>, shown: string[] | undefined) =>
  shown?.includes(feastKey(f)) === true;

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
  if (boss) cards.push({ kind: "boss", ...boss });
  if (r.fulfilledOath)
    cards.push({ kind: "oath", progress: r.fulfilledOath, bonusXp: r.oathBonusXp });
  if (r.crestEvents.secondJoins) cards.push({ kind: "secondJoins", ...r.crestEvents.secondJoins });
  if (r.rareCoat) cards.push({ kind: "coat", ...r.rareCoat });
  for (const up of r.crestEvents.stageUp) {
    // The legendary is a big feast. The rare coat's card absorbs the adult card of its animal.
    if (up.stage === "legendary") continue;
    if (r.rareCoat?.animal === up.animal && up.stage === "adult") continue;
    cards.push({ kind: "stageUp", ...up });
  }
  for (const step of r.newRungs) cards.push({ kind: "rung", step });
  for (const offer of r.capOffers ?? []) cards.push({ kind: "cap", offer });
  for (const achievement of r.newAchievements) cards.push({ kind: "achievement", achievement });
  return cards;
}

/** Tonight as a save result tells it: the one place that reads the epilogue and the shown list. */
export const tonight = (result: SaveResult, boss: FeastFacts["boss"] = null) =>
  rankFeasts({
    result,
    epilogue: result.campaign?.isFinished === true,
    shown: result.bigFeastsShown,
    age: result.age,
    anniversary: result.anniversary,
    boss,
  });

/** The one feast that opens full screen after "Continue", or none. */
export const bigFeastOf = (result: SaveResult) => tonight(result).find((f) => f.size === "large");
