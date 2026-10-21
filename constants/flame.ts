/**
 * Days of lit flame (pardon included) that make it Eternal: `getFlameLevel` 5, and the rare coat.
 * They are lit days, not calendar days: a flame that slept between two of them still counts both
 * (see `FLAME_DORMANT_DAYS`), so the Eternal can stretch over more than a hundred days.
 */
export const ETERNAL_FLAME_DAYS = 100;

/**
 * Days the flame may stay out, with no session on any of them, before its count is wiped. Until
 * then the count sleeps ("en veille") and the next lit day carries on from it. Any session that
 * counts resets the clock, lit or not.
 */
export const FLAME_DORMANT_DAYS = 56;

/**
 * The first day a gap in the flame may be bridged: a gap is only bridged when the day that
 * relights it falls after this date. Every gap closed before it stays a break, so no past
 * `current` or `best` moves and an update unlocks no burst of achievements (and the golden hero,
 * whose clock is frozen in March, does not move).
 *
 * ponytail: must equal the date of the real release tag (see .claude/skills/release/SKILL.md).
 * Ceiling: nothing checks it against the tag; moving it earlier than the tag rewrites the past
 * of heroes who update on the day, later leaves their sleeping flame reading 0 until then.
 */
export const FLAME_PIVOT = new Date(2026, 9, 22);
