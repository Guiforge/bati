import { Share } from "react-native";
import { dayKey } from "@/db/dates";
import { myPauseTouches, myWeekDays } from "@/db/duo";
import type { Pair } from "@/db/pairs";
import { getPreference, setPreference } from "@/db/preferences";
import { encodeBundle } from "./bundle";
import { type IsoWeek, isoWeekOf, previousWeek, weekStart } from "./duoWeek";
import { sealWeek } from "./envelope";
import { linkFor } from "./link";

/**
 * What "Envoyer mes coups" sends to one companion (E2, E3): the hero's week under way and the one
 * before, each as its full state, and on phone B the pairing answer until A has it. One link, so
 * one tap in the share sheet. The week before only if the pair existed then: an offline Sunday
 * outing sent on Monday still reaches its own week (F3).
 *
 * Works at zero hits: a pause has to reach the companion even when the hero does not train (S10).
 */
export async function coupsLink(pair: Pair, now = new Date()): Promise<string> {
  const current = isoWeekOf(now);
  const weeks = pair.createdAt < weekStart(current) ? [previousWeek(current), current] : [current];
  const sealed = await Promise.all(weeks.map((week) => sealMyWeek(pair, week, now)));
  return linkFor(encodeBundle(pair.reply ? [pair.reply, ...sealed] : sealed));
}

async function sealMyWeek(pair: Pair, week: IsoWeek, now: Date): Promise<Uint8Array> {
  const [days, paused] = await Promise.all([myWeekDays(week, now), myPauseTouches(week)]);
  return sealWeek(
    pair.secret,
    { pairId: pair.id, senderId: pair.selfId, ...week },
    {
      stamp: Math.floor(now.getTime() / 1000),
      goal: pair.goal,
      paused,
      days: days.map((hit) => (hit ? 1 : 0)),
    },
  );
}

/** "Prévenir maintenant" (E7): the pairing answer alone, a kind 4 as lot 0 sent it. */
export const replyLink = (reply: Uint8Array) => linkFor(reply);

const sentKey = (pairId: string) => `duo_sent_${pairId}`;

/**
 * "Envoyer mes coups", the one handler the victory line and the card both call (E1). Remembers the
 * day, on this phone, so the card knows whether a pause has gone out since it began (S10).
 */
export async function sendCoups(pair: Pair): Promise<void> {
  const now = new Date();
  await Share.share({ message: await coupsLink(pair, now) });
  await setPreference(sentKey(pair.id), dayKey(now));
}

/** The local day of the last "Envoyer mes coups" to this companion, or null. */
export const lastSentOn = (pairId: string) => getPreference(sentKey(pairId));
