import { FIRST_QUEST_TITLE } from "@/constants/onboarding";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { formatList } from "@/src/i18n/list";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { getAdventureDetails, getAnyActiveAdventureRun } from "./adventures";
import { getBossFightByAdventure } from "./bossFights";
import { getSessionAggregates, getStalestQuest, hasSessionToday } from "./completed";
import { estimateQuestSeconds } from "./estimate";
import { getChainTo } from "./exercises";
import { hasOutdoorSlot } from "./expeditions";
import { MUSCLE_LABELS } from "./labels";
import { getSuggestedQuestsForWeakAreas } from "./muscleBalance";
import { getOathProgress, isOathFrozen, oathNeedsExercise } from "./oaths";
import { listOutings } from "./outings";
import { loadConfiguredQuest } from "./questConfig";
import { findQuestWithExercise, listQuestTemplates } from "./quests";

type ConfiguredQuest = NonNullable<Awaited<ReturnType<typeof loadConfiguredQuest>>>["quest"];

/** A quest the Home would put on its stage, loaded once so every reader names the same one. */
type QuestOffer = {
  quest: ConfiguredQuest;
  /** False for a quest that reads the position: its screen starts it, after its notice. */
  startable: boolean;
  seconds: number;
};

/**
 * What the Home offers tonight, as data. The Home turns it into a button, the reminders into a
 * sentence, and both read this one function, so the notification can never name a quest the stage
 * does not show.
 *
 * Every case the stage has, in the stage's order. A new case is a compile error in both readers
 * until each says something about it.
 */
export type HomeOffer =
  | {
      kind: "adventure";
      adventureId: number;
      /** Null when the adventure's details would not load: the stage says "Resume your journey". */
      title: string | null;
      imagePath: string | null;
      done: number;
      total: number;
      /** The step the hero stands on, 1-based. */
      step: number;
      /** A fight already swung at and not yet won: the reminder names it. */
      boss: { name: string; hp: number } | null;
    }
  | ({
      kind: "oath_exercise";
      /** The oath's exercise, the top of the ladder. */
      goal: string;
      /** Where on the ladder, when the oath names a chain. */
      rung: { position: number; total: number; name: string } | null;
    } & QuestOffer)
  | ({ kind: "oath_leagues"; target: number; done: number } & QuestOffer)
  | ({ kind: "weak_muscles"; muscles: string } & QuestOffer)
  | ({ kind: "stale_quest"; days: number } & QuestOffer)
  /** A session that counts was done today. `next`: what the stage will offer tomorrow, if a quest. */
  | { kind: "done_today"; next: QuestOffer | null }
  | ({ kind: "first_day" } & QuestOffer)
  /** `trained`: the hero has sessions, so the stage must not greet them as a beginner. */
  | { kind: "gallery"; trained: boolean };

async function questOffer(questId: number): Promise<QuestOffer | null> {
  const loaded = await loadConfiguredQuest(questId);
  if (!loaded) return null;
  const { quest } = loaded;
  return { quest, startable: !hasOutdoorSlot(quest), seconds: estimateQuestSeconds(quest) };
}

/**
 * Tonight's offer, or null when the read was abandoned (`isCancelled`).
 *
 * The order *is* the feature: an adventure under way, then the oath (an exercise, then leagues),
 * then what the last 30 days say is lagging, then the quest left longest, then a day already
 * done, then day one's on-ramp, then the gallery.
 */
// ponytail: priority waterfall — the order *is* the feature, so it reads better flat than
//           split. Ceiling: a table of {predicate, action} once a seventh case lands.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above
export async function decideHomeOffer(
  language: AppLanguage,
  isCancelled: () => boolean = () => false,
): Promise<HomeOffer | null> {
  // 1. An adventure already under way outranks any suggestion: the hero committed to it.
  const active = await getAnyActiveAdventureRun();
  if (active && !isCancelled()) {
    const [details, fight] = await Promise.all([
      getAdventureDetails(active.adventureId),
      getBossFightByAdventure(active.adventureId),
    ]);
    if (isCancelled()) return null;

    const steps = active.activeRun.steps;
    const done = steps.filter((s) => s.status === "completed").length;
    const touched = fight && fight.defeatedAt === null && fight.currentHp < fight.totalHp;
    return {
      kind: "adventure",
      adventureId: active.adventureId,
      title: details ? localizedTitle(details.adventure, language) : null,
      imagePath: details?.adventure.imagePath ?? null,
      done,
      total: steps.length,
      step: Math.min(done + 1, steps.length),
      boss: touched ? { name: localizedName(fight, language), hp: fight.currentHp } : null,
    };
  }

  // 2. The oath the hero swore, walked one rung at a time. Above the weak-area rule on purpose —
  //    balance is the app's opinion, the oath is theirs.
  const oath = await getOathProgress();
  // A frozen oath (pause, or a zone on its exercise) is not served tonight: the stage falls through
  // to the rules below, which already know what to say.
  const oathFrozen = oath ? await isOathFrozen(oath.oath) : false;
  const oathExerciseId =
    oath && !oathFrozen && !oath.isFulfilled && oathNeedsExercise(oath.oath.metric)
      ? oath.oath.exerciseId
      : null;

  if (oathExerciseId !== null && !isCancelled()) {
    const chain = await getChainTo(oathExerciseId);
    const rung = chain ? chain.rungs[chain.position - 1] : null;
    // Train where the hero stands, not where they are headed: the top of the chain is the
    // oath, the rung under their feet is tonight.
    const questId = await findQuestWithExercise(rung?.exercise.id ?? oathExerciseId);

    if (questId !== null && !isCancelled()) {
      const goal = oath?.exerciseName?.[language] ?? "";
      const offer = await questOffer(questId);
      if (offer && !isCancelled()) {
        return {
          kind: "oath_exercise",
          goal,
          rung:
            chain && rung
              ? {
                  position: chain.position,
                  total: chain.rungs.length,
                  name: localizedName(rung.exercise, language),
                }
              : null,
          ...offer,
        };
      }
    }
  }

  // 2b. An oath in leagues names no exercise, so the chain above cannot serve it, and the
  //     muscle rule below never will: an outing carries no muscles by design (0041). The
  //     first door out is the answer; the hero picks the duration on the quest screen.
  if (
    oath &&
    !oathFrozen &&
    !oath.isFulfilled &&
    oath.oath.metric === "leagues" &&
    !isCancelled()
  ) {
    const outing = (await listOutings())[0];
    const offer = outing ? await questOffer(outing.quest.id) : null;
    if (offer && !isCancelled()) {
      return { kind: "oath_leagues", target: oath.oath.target, done: oath.current, ...offer };
    }
  }

  // 3. No oath to serve: fall back to what the last 30 days say is lagging.
  const suggestion = (await getSuggestedQuestsForWeakAreas(1))[0];
  if (suggestion && !isCancelled()) {
    const muscles = formatList(
      suggestion.matchingMuscles.map((m) => MUSCLE_LABELS[m]?.[language] ?? m),
      language,
    );
    const offer = await questOffer(suggestion.id);
    if (offer && !isCancelled()) return { kind: "weak_muscles", muscles, ...offer };
  }

  // 4. A hero who has trained and has no weak muscle (a balanced veteran, or one whose 30 days
  //    were quiet): the quest they left longest, one tap away. Asked of the journal, not inferred
  //    from the rules above going quiet. A quest done today is not left, so it is not offered.
  const { totalSessions } = await getSessionAggregates();
  const trained = totalSessions > 0;
  const stale = trained && !isCancelled() ? await getStalestQuest() : null;
  const left = stale ? await questOffer(stale.questId) : null;
  if (left && stale && stale.daysAgo >= 1 && !isCancelled()) {
    return { kind: "stale_quest", days: stale.daysAgo, ...left };
  }

  // 4b. The evening of a session, with nothing above to say: the day is done, and the stage says
  //     so rather than sending the hero shopping on their best moment (audit 2026-10-11, F5).
  //     The quest it names is rule 4's own answer with the "not done today" guard lifted, so it
  //     is the one rule 4 offers tomorrow. An outing reads no quest there: the sentence stands
  //     alone. Before rule 5, or a hero whose first session was a walk is greeted as day one.
  if (!isCancelled() && (await hasSessionToday())) return { kind: "done_today", next: left };

  // 5. A day-one hero: offer back the session onboarding just offered.
  const onRamp = trained
    ? undefined
    : (await listQuestTemplates()).find((tpl) => tpl.enTitle === FIRST_QUEST_TITLE);
  if (onRamp && !isCancelled()) {
    const offer = await questOffer(onRamp.id);
    if (offer && !isCancelled()) return { kind: "first_day", ...offer };
  }

  // 6. The seed is gone, or it would not load, or nothing qualifies. The gallery is still an
  //    honest answer.
  return isCancelled() ? null : { kind: "gallery", trained };
}
