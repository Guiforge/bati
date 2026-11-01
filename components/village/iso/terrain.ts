// Where the painted terrain lies (alentours.ts re-exports it): its own module so carteDemo.ts can
// frame inside it without a cycle.

/**
 * Where the painted terrain lies, map dp: everything the camera can show at tier 12 (monde.ts
 * `etendue` at the zoom floor, the widest of every tier) plus 8 dp, painted on this layout
 * (stage-2/loop-5, 4c890fa8) at 3 px a dp. Outside this box the ground stays vector.
 */
export const TERRAIN = { x: -348, y: -836, w: 1656, h: 2152 } as const;
/** The terrain's baked fade on the world's outer edge (32 px at 3 px a dp, 11 dp), dp: the vector ground starts half way into it. */
export const FONDU_TERRAIN = 5;
