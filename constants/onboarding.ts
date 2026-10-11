/**
 * The on-ramp quest, named once.
 *
 * Eight minutes, four movements, no equipment, authored for a hero's first day. The title is the
 * identifier on purpose: the quest is seeded by an immutable migration
 * (drizzle/0016_seed_new_quests.sql) that keys on this exact string, so it cannot be looked up by
 * id and it must never be re-typed at a second call site.
 *
 * Two screens offer it now. The last onboarding step asks the hero to do it, and Home offers it
 * again to a hero with no history — because until it did, the eight minutes someone had just
 * agreed to vanished on the walk to the home screen, replaced by a card that said "Start your
 * journey", "Quick Workout" and "Pick a quest" in the same box. See
 * docs/design/audits/2026-09-10.md.
 */
export const FIRST_QUEST_TITLE = "The Squire's Awakening";

/** `assets/images/village/tier_1.webp`, and where the top of its chimney is in it. */
const HAMLET = { width: 1024, height: 861, chimney: { x: 395, y: 268 } } as const;

/**
 * Where the hamlet's chimney lands in a band of `width` x `height` that shows the painting with
 * `cover`, held vertically at `heldAt` (0 top, 1 bottom) and centred. The embers of the naming
 * screen leave from there; `null` when a short band has folded the chimney out of view.
 */
export function chimneyAnchor(
  width: number,
  height: number,
  heldAt: number,
): { x: number; y: number } | null {
  if (width <= 0 || height <= 0) return null;
  const scale = Math.max(width / HAMLET.width, height / HAMLET.height);
  const x = HAMLET.chimney.x * scale + (width - HAMLET.width * scale) / 2;
  const y = HAMLET.chimney.y * scale + (height - HAMLET.height * scale) * heldAt;
  return y < 0 || y > height || x < 0 || x > width ? null : { x, y };
}

/** Where the painting is held when the band is tall enough for the chimney and the window. */
const HELD_AT = 0.57;
/** The foot of the lit window, in the painting. */
const WINDOW_FOOT = 650;

/**
 * How far down the painting the band looks (0 its top, 1 its bottom). The lit window is the one
 * warm light of the plate, so a band a large font has made short follows it and lets the chimney
 * go, rather than keeping the roof and burying the fire.
 */
export function hamletHold(width: number, height: number): number {
  const scale = Math.max(width / HAMLET.width, height / HAMLET.height);
  const cropped = HAMLET.height * scale - height;
  if (cropped <= 0) return HELD_AT;
  return Math.min(1, Math.max(HELD_AT, (WINDOW_FOOT * scale + 24 - height) / cropped));
}

/**
 * The names a new village can arrive with, so the only mandatory step of onboarding needs no
 * keyboard: one is drawn, the hero keeps it or types their own. One list for every language,
 * because a place name is not translated. Each fits the 3 to 20 characters the field accepts.
 */
export const VILLAGE_NAMES = [
  "Kerbati",
  "Rochebrune",
  "Hautevigie",
  "Pierrefeu",
  "Brumeval",
  "Boisfer",
  "Montclair",
  "Valombre",
  "Ferrance",
  "Grandgué",
  "Clairmont",
  "Sombrepin",
  "Hauterive",
  "Pontfer",
  "Hurlevent",
  "Fort-Chêne",
  "Roc-Ardent",
  "Val-Hardi",
  "Bourg-Tison",
  "Haut-Rempart",
] as const;
