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
 * ## The three writing rules
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
 * **A villager is a sentence shape before they are a subject.** The third rule arrived from a
 * count rather than a reading: 80% of the 201 lines here were once exactly two sentences, the
 * second commenting on the first, and all seven villagers sat between 75% and 84% of it, in both
 * languages. Seven characters can be given seven vocabularies and still speak with one mouth,
 * because what a reader hears as a voice is the rhythm, not the nouns. So each of them owns a
 * shape, and the shape is what a new line has to match:
 *
 * | id | dominant shape |
 * |---|---|
 * | `smith` | blunt and short. Often one sentence, sometimes no verb at all. |
 * | `sage` | one long breath carried by a subordinate clause, rather than two flat sentences. |
 * | `herbalist` | an imperative, then the clinical reason for it. |
 * | `minstrel` | performing: exclamations, questions, self-interruption, wildly uneven lengths. |
 * | `farmer` | one run-on chained with `et` / `alors`, never stopping in the middle. |
 * | `champion` | a verdict. Nominal, two or three words, no commentary. |
 * | `watcher` | report register: the first clause has no verb. |
 *
 * Dominant, not exclusive: a shape applied to twelve consecutive lines is a new metronome. The
 * test enforces the only part a machine can see, which is that no pool goes back to being mostly
 * one shape, and it is a ratchet like the rest of them.
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
  "village_visit",
  "menu_visit",
  "personal_record",
  "personal_record_beat",
  "boss_defeated",
  "comeback",
  "guide_home",
  "guide_quests",
  "guide_adventures",
  "guide_village",
  "guide_journal",
] as const;

/** The five first-visit guides, in the order a new hero is likely to meet them. */
export const GUIDE_MOMENTS = [
  "guide_home",
  "guide_quests",
  "guide_adventures",
  "guide_village",
  "guide_journal",
] as const satisfies readonly CueMoment[];
export type GuideMoment = (typeof GUIDE_MOMENTS)[number];
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
  // The village was silent in the village, which was the layer's biggest thematic hole: you opened
  // the screen that *is* their home and nobody lived there. Only the three who work it day to day
  // — the watcher is up her tower and the champion is in her arena.
  village_visit: {
    speakers: ["farmer", "minstrel", "herbalist"],
    priority: "ambient",
    pose: "talk",
  },
  // Quests, Adventures and Journal — the screens where the hero is choosing rather than doing.
  // Deliberately the three villagers `village_visit` does *not* use, so browsing around does not
  // keep producing the same three faces. The lines are about being near someone who is deciding,
  // never about the screen itself: one pool serves all three, and a villager who commented on
  // "your journal" would be describing UI back at you.
  menu_visit: { speakers: ["smith", "sage", "watcher"], priority: "ambient", pose: "talk" },
  // The highest-value moment in the whole layer, and the one with the strictest rule: shame is the
  // documented reason people stop opening a fitness app, so a returning hero is greeted and the
  // absence is never mentioned. Not one line in this pool asks where you were.
  comeback: { speakers: ["sage", "minstrel"], priority: "event", pose: "talk" },
  // One villager, one screen, one sentence, once ever. Who explains what follows who owns it.
  guide_home: { speakers: ["sage"], priority: "guide", pose: "talk" },
  guide_quests: { speakers: ["smith"], priority: "guide", pose: "talk" },
  guide_adventures: { speakers: ["watcher"], priority: "guide", pose: "talk" },
  guide_village: { speakers: ["farmer"], priority: "guide", pose: "talk" },
  guide_journal: { speakers: ["herbalist"], priority: "guide", pose: "talk" },
};

/**
 * The floor on a pool's size, per priority.
 *
 * One for a guide, because a guide is seen exactly once in a hero's life and a second variant of
 * a sentence nobody will read twice is work spent on nothing.
 *
 * Lower than the eighteen villageFlavour.ts argues for, and deliberately: these pools are *per
 * villager*. Five villagers carry `rest`, so twelve each is sixty distinct lines, drawn at most
 * three times a session and rotated across five faces. The repeat distance is far longer than a
 * single eighteen-line pool would give.
 */
export const MINIMUM_POOL: Record<CuePriority, number> = { ambient: 12, guide: 1, event: 8 };

/**
 * How long a bubble stays up *after* its line has finished appearing.
 *
 * Measured from the end of the typing rather than from the start, so a long line is not punished
 * with less reading time than a short one — the first version was a flat total, which meant the
 * guides (the longest lines in the app) got the least time to be read.
 *
 * An ambient line has no typing at all, so its linger is its whole life: glanced at between
 * breaths, gone before it becomes something to wait out.
 */
export const CAMEO_LINGER_MS: Record<CuePriority, number> = {
  event: 4000,
  // A guide is a whole screen explained in one breath, read once in a hero's life. At ~200 words
  // per minute a 20-word sentence takes about six seconds to read for the first time.
  guide: 6000,
  ambient: 3500,
};

/**
 * How fast a line types itself out, per character.
 *
 * Only guides and events type — the Pokémon rhythm belongs to moments the hero is reading, not to
 * a line glanced at between two sets, where waiting for a sentence to finish appearing would be
 * time taken from the session. Reduced motion switches it off entirely: a typewriter is motion.
 *
 * 24ms puts a 120-character guide at about three seconds, which reads as deliberate rather than
 * slow.
 */
export const TYPE_MS_PER_CHAR = 24;

/** The length caps the writing rules promise, enforced by `__tests__/villagers.test.ts`. */
export const LINE_LENGTH_CAP: Record<CuePriority, number> = {
  event: 140,
  guide: 200,
  ambient: 90,
};
