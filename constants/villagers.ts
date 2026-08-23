/**
 * The villagers — who they are, when they speak, and what they say.
 *
 * A cameo is one villager, cut out and posed over whatever screen is showing, saying one line.
 * The layer exists because nothing in Bati has a face: numbers rise, a village grows, a boss
 * loses HP, and the only character who ever spoke was the boss taunting you.
 *
 * The pact, and the reason this file is short on purpose:
 *
 *   A villager never appears to fill space. They appear because something just happened, they
 *   say it in one breath, and they leave.
 *
 * That is the lesson BossTauntOverlay already learnt the hard way — it used to fire on a random
 * 15-45s schedule and talked over your set about nothing. Every moment below is keyed to a signal
 * the app already has.
 *
 * **The lines live in `locales/en.json` and `locales/fr.json`, under `villagers.<id>.<moment>`.**
 * Not here: they are user-facing copy and belong with the rest of it, and i18next is what applies
 * the interpolation an event line needs ("{{delta}} more than last time"). This file keeps only
 * the structure — who exists, who may speak when, and the limits the lines must respect.
 *
 * **Every villager has their own pool for every moment they carry.** The smith and the champion
 * both react to a record and say completely different things about it, because a voice is not a
 * label on a shared sentence.
 *
 * ## The two writing rules
 *
 * **Ambient never cites data. An event speaks only about its data.** villageFlavour.ts found the
 * first half for the weather line — "nothing may name a number, a muscle or a streak — the moment
 * one does, it is a stat in disguise, and it will contradict the tiles beside it". Here it
 * generalises: the villager encouraging you mid-rest does not know how many reps are left. And
 * the smith celebrating a record does not repeat the number — `NewRecordsBadge` is already
 * showing it, and two sources for one value is how they drift apart.
 *
 * `__tests__/villagers.test.ts` enforces what a machine can: no digits in an ambient pool, the
 * length caps, and `en`/`fr` the same length in every pool. The rest is on whoever writes a line.
 *
 * ## The cast
 *
 * Four named villagers, each anchored to a building the village already paints, so the cast
 * cannot drift into inventing places that do not exist:
 *
 * | id | who | building | owns |
 * |---|---|---|---|
 * | `smith` | the Smith — gruff, concrete, talks about material | `armory` | records, strength |
 * | `watcher` | the Watcher — dry, tactical, sees things coming | `watchtower` | bosses, adventures |
 * | `sage` | the Sage — slow, sententious, takes the long view | `observatory` | guides, rest, returns |
 * | `champion` | the Champion — brief, technical, peer to peer | `champion_arena` | victories, firsts |
 * | `herbalist` | the Herbalist — brisk, knowing, unbribable | `druid_grove` | recovery, deloads |
 * | `minstrel` | the Minstrel — delighted, already telling it | `campfire` | streaks, comebacks |
 * | `farmer` | the Farmer — calm, unimpressed by hardship | `barn` | the ordinary daily work |
 *
 * **Villagers do not have glowing eyes.** The six player avatars all do, because the player is
 * the exceptional one. That single rule is what stops a villager reading as a second player
 * character, and it is written into `scripts/generate-villagers.py`'s style block as well as here.
 *
 * Full design: docs/gameplay/villagers.md.
 */

export const VILLAGER_IDS = [
  "smith",
  "watcher",
  "sage",
  "champion",
  "herbalist",
  "minstrel",
  "farmer",
] as const;
export type VillagerId = (typeof VILLAGER_IDS)[number];

/**
 * Five poses, each answering a moment the app has rather than a spread for its own sake:
 * `talk` for guides and rest, `cheer` for a record or a victory, `urge` for the grinding end of a
 * set, `concern` for a deload the app is about to suggest, `salute` for a boss going down.
 */
export const VILLAGER_POSES = ["talk", "cheer", "urge", "concern", "salute"] as const;
export type VillagerPose = (typeof VILLAGER_POSES)[number];

/**
 * Poses whose art exists but which nothing cues yet, written down rather than left silent.
 *
 * `urge` waits on `set_grind` and `concern` on `rest_suggestion`, both of which need a trigger
 * inside the running session. They were rendered in the same batch as the rest on purpose — a
 * later batch drifts, because consistency across a family comes from one style block sent at one
 * moment. `__tests__/villagers.test.ts` fails if this list stops matching reality in either
 * direction, so a pose cannot quietly stay unused and cannot quietly stay listed once wired.
 */
export const POSES_AWAITING_A_MOMENT: readonly VillagerPose[] = ["urge", "concern"];

/**
 * What a cameo is allowed to interrupt.
 *
 * - `event` — something happened. Always shown; overwrites whatever is on screen.
 * - `guide`  — a first-visit explanation. Shown unless an event is speaking.
 * - `ambient` — atmosphere. Rate-limited, capped and probabilistic; the *absence* is what makes
 *   the presence worth noticing. A villager at every single rest is furniture within two sessions.
 */
export type CuePriority = "event" | "guide" | "ambient";

export const CUE_MOMENTS = [
  "rest",
  "personal_record",
  "personal_record_beat",
  "boss_defeated",
] as const;
export type CueMoment = (typeof CUE_MOMENTS)[number];

/**
 * Who may carry a moment, how loud it is, and how they stand.
 *
 * Typed on `Record<CueMoment, …>` for the same reason `REST_SUGGESTION_MESSAGES` is typed on
 * `Exclude<RestSuggestion["reason"], "none">`: a moment added to `CUE_MOMENTS` without an entry
 * here is a compile error, not a cameo that silently never fires.
 */
export const MOMENT_CAST: Record<
  CueMoment,
  { speakers: readonly VillagerId[]; priority: CuePriority; pose: VillagerPose }
> = {
  // Village chatter, so anyone who lives an ordinary life here may carry it. Not the watcher and
  // not the champion: one of them only speaks about what is coming, the other only about what you
  // just did, and putting either in the rest rotation is what would make them ordinary.
  rest: {
    speakers: ["smith", "sage", "herbalist", "minstrel", "farmer"],
    priority: "ambient",
    pose: "talk",
  },
  // The smith keeps the marks; the champion has stood where you are. Both react to a record,
  // neither ever names the number when there is nothing to compare it to.
  personal_record: { speakers: ["smith", "champion"], priority: "event", pose: "cheer" },
  // The same two, when there *is* something to compare it to. Separate from `personal_record`
  // rather than a branch inside it, because a line written around "{{delta}} more than last time"
  // cannot degrade gracefully into a first-ever record — it would read as a comparison to nothing.
  personal_record_beat: { speakers: ["smith", "champion"], priority: "event", pose: "cheer" },
  boss_defeated: { speakers: ["watcher", "champion"], priority: "event", pose: "salute" },
};

/**
 * The floor on a pool's size, per priority.
 *
 * Lower than the eighteen villageFlavour.ts argues for, and deliberately: these pools are *per
 * villager*. Five villagers carry `rest`, so twelve each is sixty distinct lines, drawn at most
 * three times a session and rotated across five faces. The repeat distance is far longer than a
 * single eighteen-line pool would give.
 */
export const MINIMUM_POOL: Record<CuePriority, number> = { ambient: 12, guide: 2, event: 8 };

/**
 * How long a bubble stays up, by priority.
 *
 * An event earns a beat longer because it lands on a screen the hero is already reading; an
 * ambient line is glanced at between breaths and must be gone before it becomes something to
 * wait out. Same order of magnitude as BossTauntOverlay's 4s, which reads well on device.
 */
export const CAMEO_DURATION_MS: Record<CuePriority, number> = {
  event: 5000,
  guide: 8000,
  ambient: 3500,
};

/** The length caps the writing rules promise, enforced by `__tests__/villagers.test.ts`. */
export const LINE_LENGTH_CAP: Record<CuePriority, number> = {
  event: 140,
  guide: 140,
  ambient: 90,
};
