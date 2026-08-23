import { create } from "zustand";
import {
  type CueMoment,
  MOMENT_CAST,
  type VillagerId,
  type VillagerPose,
} from "@/constants/villagers";
import { preferences } from "@/db";
import { i18n } from "@/i18n";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * Who is speaking, and the rules that decide whether anyone gets to.
 *
 * One store, one host component, one cameo on screen at a time. Every surface that wants a
 * villager calls `cue(moment)` and forgets about it — the surface never knows who answered, what
 * they said, or whether anyone came at all. That is deliberate: three separate cheer/coach/taunt
 * components would grow three separate frequency policies within a month, and nothing would
 * arbitrate when two of them wanted to speak at once.
 */

/**
 * How many ambient cameos may appear inside one window. One, deliberately.
 *
 * This started at three with a 90-second cooldown, and simulating the real rule against real quest
 * shapes is what showed the problem: a long quest (4 rounds x 5 exercises, nineteen rests) hit the
 * cap in 97% of sessions, so the probability decided nothing and the *budget* set the rate. Which
 * meant the number of villagers you met was a function of how long your quest was — 1.9 on a short
 * one, 3.0 on a long one — and nobody had chosen that.
 *
 * At one, quest length stops driving the rate. It only changes the odds that a villager comes at
 * all, never how many, which is the shape a cosmetic layer should have: a bit of life, not a
 * presence. There is no separate cooldown any more because there cannot be a second cameo to space
 * out — the window *is* the cooldown.
 */
const AMBIENT_PER_WINDOW = 1;

/**
 * How long the layer stays quiet before another ambient cameo becomes possible.
 *
 * The design says "once a session", but the chorus has no idea what a session is and giving it one
 * would mean a cross-store subscription for a counter. A quiet window is the same rule from the
 * hero's side, and costs no wiring at all. The only visible difference is a session longer than
 * half an hour, which earns a second villager rather than going silent for its whole second half.
 */
const AMBIENT_WINDOW_MS = 1_800_000;

/**
 * The odds an eligible rest actually produces a villager.
 *
 * Tuned against a simulation of the real rule rather than guessed: at 0.18 a short quest meets a
 * villager three times in four and a long one almost always, for an average under one per session
 * either way. The silence is the feature — a villager at every rest is furniture within two
 * sessions.
 */
const AMBIENT_CHANCE = 0.18;

/**
 * How many lines are remembered as "just said".
 *
 * Persisted, unlike BossTauntOverlay's pool which forgets everything on a cold start — the one
 * place repetition is most visible is the first rest of a fresh session, and that is exactly the
 * moment an in-memory ring is empty.
 */
const RECENT_MEMORY = 12;

export type Cameo = {
  id: number;
  moment: CueMoment;
  villager: VillagerId;
  pose: VillagerPose;
  line: string;
};

/**
 * Values an event line may name.
 *
 * Only events get one. "Ambient never cites data" is not a style rule — an ambient villager has
 * no data, because nothing just happened for them to have data *about*. An event does, and saying
 * it is what the research says makes a line land: generic encouragement fades inside two months,
 * a sentence tied to something real does not.
 */
export type CueParams = { delta?: string; exercise?: string };

interface ChorusState {
  current: Cameo | null;
  /** `moment:index` keys, most recent last. */
  recentKeys: string[];
  lastVillager: VillagerId | null;
  lastCameoAt: number;
  ambientShown: number;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  cue: (moment: CueMoment, params?: CueParams) => void;
  /** Takes the id so a timer belonging to a cameo that was already replaced cannot clear its successor. */
  dismiss: (id: number) => void;
}

/** Monotonic, so a repeated line still counts as a new appearance for the host's enter animation. */
let nextCameoId = 1;

/**
 * Whether an ambient cameo is allowed to fire, and what the budget then stands at.
 *
 * `null` means no — and refusing is most of this layer's job, so it gets its own function with a
 * name that says what a caller is asking. Every clause here is a way for the village to stay
 * quiet: someone is already speaking, the last one was too recent, the window is spent, or the
 * draw simply came up short.
 */
function ambientAllowance(state: ChorusState, now: number): number | null {
  // Overwritten, never queued: a reaction that arrives after its moment has passed is worse than
  // no reaction. An event may interrupt an ambient line; nothing interrupts an event.
  if (state.current) return null;

  const spent = now - state.lastCameoAt > AMBIENT_WINDOW_MS ? 0 : state.ambientShown;
  if (spent >= AMBIENT_PER_WINDOW) return null;
  if (Math.random() > AMBIENT_CHANCE) return null;

  return spent + 1;
}

/** The same face twice running reads as a scripted sequence rather than a village. */
function pickSpeaker(
  speakers: readonly VillagerId[],
  lastVillager: VillagerId | null,
): VillagerId | undefined {
  const eligible = speakers.filter((id) => id !== lastVillager);
  const candidates = eligible.length > 0 ? eligible : speakers;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * The villager's next line, or `null` if there is nothing to say.
 *
 * The pools live in `locales/*.json` under `villagers.<id>.<moment>`, read through i18next rather
 * than imported, so the hero's language switch moves the villagers with everything else. Read in
 * two steps — the array to size it, then the one line by index — because `returnObjects` hands
 * back the raw strings with no interpolation applied, and an event line needs its `{{delta}}`.
 *
 * **This never throws, and that is the point.** `cue()` is called from render effects all over the
 * app; anything that escapes here lands in React's commit phase and takes the whole screen with
 * it. A decorative layer must not be able to do that — it is allowed to go quiet, and nothing
 * else. Reported rather than swallowed: a catalogue that has stopped resolving is a bug, it is
 * just not a bug worth a crash.
 */
function selectLine(
  villager: VillagerId,
  moment: CueMoment,
  recent: Set<string>,
  params: CueParams | undefined,
): { line: string; key: string } | null {
  // Keyed on the villager as well as the moment, so the smith not repeating himself does not also
  // stop the champion from saying her first line.
  const poolKey = `villagers.${villager}.${moment}`;
  try {
    const pool: unknown = i18n.t(poolKey, { returnObjects: true });
    const index = pickIndex(Array.isArray(pool) ? pool.length : 0, recent, poolKey);
    if (index < 0) return null;

    const line = i18n.t(`${poolKey}.${index}`, params ?? {});
    // i18next echoes the key back when it cannot resolve it, which would put "villagers.smith.rest.3"
    // in a speech bubble.
    if (!line || line === `${poolKey}.${index}`) return null;

    return { line, key: `${poolKey}:${index}` };
  } catch (error) {
    reportError("chorus.selectLine", error);
    return null;
  }
}

/** Picks from a pool of `size`, preferring anything not in `recent`. Returns -1 if empty. */
function pickIndex(size: number, recent: Set<string>, prefix: string): number {
  if (size === 0) return -1;
  const fresh: number[] = [];
  for (let i = 0; i < size; i++) {
    if (!recent.has(`${prefix}:${i}`)) fresh.push(i);
  }
  // Every line is recent only when the pool is smaller than the ring. Falling back to the whole
  // pool is right: silence would be worse than a repeat, and the ring will roll off next time.
  const candidates = fresh.length > 0 ? fresh : Array.from({ length: size }, (_, i) => i);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
}

export const useChorusStore = create<ChorusState>((set, get) => ({
  current: null,
  recentKeys: [],
  lastVillager: null,
  lastCameoAt: 0,
  ambientShown: 0,
  isHydrated: false,

  hydrate: async () => {
    const recentKeys = await preferences.getRecentCameoLines();
    set({ recentKeys, isHydrated: true });
  },

  cue: (moment, params) => {
    if (!useSettingsStore.getState().villagersEnabled) return;

    const rule = MOMENT_CAST[moment];
    const state = get();
    const now = Date.now();

    const allowance = rule.priority === "ambient" ? ambientAllowance(state, now) : null;
    if (rule.priority === "ambient" && allowance === null) return;

    const villager = pickSpeaker(rule.speakers, state.lastVillager);
    if (!villager) return;

    const selected = selectLine(villager, moment, new Set(state.recentKeys), params);
    // Nothing to say beats saying a raw translation key. The budget is spent below, only once a
    // villager actually has a line — a slot burned on a failed lookup would silence the next one.
    if (!selected) return;

    const recentKeys = [...state.recentKeys, selected.key].slice(-RECENT_MEMORY);
    set({
      current: { id: nextCameoId++, moment, villager, pose: rule.pose, line: selected.line },
      recentKeys,
      lastVillager: villager,
      lastCameoAt: now,
      ...(allowance === null ? {} : { ambientShown: allowance }),
    });

    // Fire and forget: a cameo must never wait on a disk write, and a ring that fails to persist
    // costs one possible repeat after a restart, not correctness.
    //
    // The try/catch is not belt-and-braces. A *synchronous* throw here — which `.catch()` does not
    // see — propagates into React's commit phase and takes the session screen down. Reported
    // rather than swallowed, because a ring that has quietly stopped persisting would otherwise
    // only surface as "the villagers repeat themselves" months later.
    try {
      preferences
        .setRecentCameoLines(recentKeys)
        .catch((error) => reportError("chorus.persistRecent", error));
    } catch (error) {
      reportError("chorus.persistRecent", error);
    }
  },

  dismiss: (id) => {
    if (get().current?.id !== id) return;
    set({ current: null });
  },
}));
