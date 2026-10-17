import { eq } from "drizzle-orm";
import { db, schema } from "./client";
import { canDo } from "./equipment";
import {
  type Exercise,
  fetchLadderRows,
  listExercises,
  type MovementRef,
  successorsOf,
} from "./exercises";
import { getExerciseHistory, ghostKey } from "./personalRecords";
import { preferences } from "./preferences";
import { CAP_SESSIONS, type SessionMark, TARGET_CAP } from "./progress";
import { getQuestConfig, saveQuestConfig, withoutSlotSwap } from "./questConfig";
import { movementRef, type QuestExercise, USER_QUEST_AUTHOR } from "./quests";
import type { QuestTargetType } from "./schema";
import type { UserLevel } from "./targets";
import { NON_REP_STYLE } from "./workUnits";
import { sparedExerciseIds } from "./zone";

/** "Plafond puis échelon": three sessions at the cap, and the rung above on offer. */
export type CapOffer = {
  questId: number;
  questExerciseId: number;
  from: MovementRef;
  next: MovementRef;
  /** The cap that was held, in the slot's unit. */
  type: QuestTargetType;
  value: number;
  /** The level the session was played at: a quest with no saved config is saved at it. */
  level: UserLevel;
};

type Slot = Pick<QuestExercise, "id" | "exercise" | "target" | "substitutedFor">;

/** The last `CAP_SESSIONS` sessions all met a prescription at or past the cap. */
function holdsCap(recent: readonly SessionMark[], cap: number): boolean {
  return (
    recent.length >= CAP_SESSIONS &&
    recent
      .slice(0, CAP_SESSIONS)
      .every((m) => m.met === true && m.prescribed !== null && m.prescribed >= cap)
  );
}

/**
 * The slots of the quest just played whose movement held the cap (20 reps, 60 s) for the last
 * three sessions, with the rung above it. Read after the save, from the journal, like every
 * other "what did this session change".
 *
 * No offer when: the quest is the hero's own (it runs exactly as written); the slot stands on an
 * easier rung of its written movement (`substitutedFor`: the ladder's own three clean sessions
 * already serve the next rung, and a swap onto the written movement would become a pin); the
 * slot is an outing; or the config already swaps it to the successor. The successor is the first
 * of the fork the hero owns the kit for and has not set aside, `alsoNext` otherwise, and none
 * when nothing qualifies.
 */
export async function checkCapOffers(
  questId: number,
  slots: readonly Slot[],
  level: UserLevel,
): Promise<CapOffer[]> {
  const [quest] = await db
    .select({ author: schema.quests.author })
    .from(schema.quests)
    .where(eq(schema.quests.id, questId))
    .limit(1);
  if (!quest || quest.author === USER_QUEST_AUTHOR) return [];

  const candidates = slots.filter((s) => !s.substitutedFor && s.exercise.style !== NON_REP_STYLE);
  if (candidates.length === 0) return [];

  const [history, rows, catalogue, owned, aside, spared, config] = await Promise.all([
    getExerciseHistory(candidates.map((s) => s.exercise.id)),
    fetchLadderRows(),
    listExercises(),
    preferences.getOwnedEquipment(),
    preferences.getSetAsideExercises(),
    sparedExerciseIds(),
    getQuestConfig(questId),
  ]);
  const ownedSet = owned === null ? null : new Set(owned);
  const byId = new Map(catalogue.map((e) => [e.id, e] as const));
  const away = new Set([...aside.map((e) => e.id), ...spared]);
  const reachable = (e: Exercise) =>
    e.retiredAt === null && !away.has(e.id) && canDo(e.equipment, ownedSet);

  const offers: CapOffer[] = [];
  for (const slot of candidates) {
    const { type } = slot.target;
    const recent = history.get(ghostKey(slot.exercise.id, type))?.recent ?? [];
    const cap = TARGET_CAP[type === "time" ? "time" : "reps"];
    const held = holdsCap(recent, cap);
    const fork = held ? successorsOf(rows, slot.exercise.id) : null;
    if (!fork) continue;
    const next = [fork.next, ...fork.alsoNext]
      .map((m) => byId.get(m.id))
      .find((e) => e !== undefined && reachable(e));
    if (!next || config?.swaps?.[String(slot.id)] === next.id) continue;
    offers.push({
      questId,
      questExerciseId: slot.id,
      from: movementRef(slot.exercise),
      next: movementRef(next),
      type,
      value: cap,
      level,
    });
  }
  return offers;
}

/**
 * One tap on the offer: the slot serves the successor from the next session. Written into the
 * quest's config like any swap, on this device (a config never travels).
 *
 * The config is read now and not at the start of the session: the hero may have changed the
 * quest since, on another screen of the same session or from the victory screen's own retry. A
 * quest with no config yet is saved at the level the session was played at.
 */
export async function acceptCapOffer(offer: CapOffer): Promise<void> {
  const config = await getQuestConfig(offer.questId);
  const base = config ? withoutSlotSwap(config, offer.questExerciseId) : { level: offer.level };
  await saveQuestConfig(offer.questId, {
    ...base,
    swaps: { ...base.swaps, [String(offer.questExerciseId)]: offer.next.id },
  });
}
