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
