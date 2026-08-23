/**
 * Where a cameo sits, and how big it is allowed to get.
 *
 * Its own module, and pure, for the reason sessionArt.ts gives: these two answers decide whether
 * the layer obeys the one product rule it must never break — `PRODUCT.md`'s "never obstruct
 * logging or reading the next set" — and a rule that important should be checkable without
 * standing up a render tree, expo-image and a Tamagui provider first.
 *
 * Both numbers below were wrong on the first device run, in the same way: the design gave a
 * *target* (a figure about 150dp tall) and a *ceiling* (never more than 38% of the window), and
 * the first implementation shipped the ceiling as the value. On a 372x828dp phone that drew a
 * figure 314dp tall and 236dp wide — 63% of the screen width — sitting squarely on top of the
 * rest screen's "I'm ready" button. Nothing in the test suite caught it, because the test asserted
 * the ceiling was respected rather than that the button was still reachable.
 */

/** Roughly the plan's 150dp target on a normal phone, and it scales with the window. */
const HEIGHT_SHARE = 0.22;

/** Tablets and landscape: past this a cameo stops reading as a figure at the edge of the scene. */
const HEIGHT_CAP = 200;

/**
 * The band at the bottom of the window that a cameo must never enter.
 *
 * Every screen in this app puts something tappable there: the tab bar on the five tab routes, the
 * primary action ("Terminé", "Je suis prêt") on every session screen. 96dp clears the taller of
 * the two — a ~48dp button plus its margin — with room left over.
 *
 * ponytail: one constant rather than a measurement. Both bands are fixed-height in this app
 * today. If either becomes variable, measure it at the call site (`useBottomTabBarHeight()` for
 * the tab bar) and keep this as the floor.
 */
const ACTION_BAND = 96;

/** How far above the bottom edge the figure's feet sit. */
export function cameoBottomOffset(safeAreaBottom: number): number {
  return safeAreaBottom + ACTION_BAND;
}

/**
 * The figure's height. Width follows from it at the source art's 3:4, never given separately —
 * a cameo told its width independently is a cameo with the face cropped off.
 *
 * Capped against the width as well, because a height-only cap on a short wide window (landscape,
 * split screen) draws a 3:4 figure wider than the screen.
 */
export function cameoMaxHeight(windowWidth: number, windowHeight: number): number {
  return Math.min(
    Math.round(windowHeight * HEIGHT_SHARE),
    Math.round(windowWidth * 0.45),
    HEIGHT_CAP,
  );
}

/**
 * The top of the cameo, measured from the top of the window — what the safe-zone test asserts
 * against. Everything above this line belongs to the screen and must stay untouched.
 */
export function cameoTopEdge(windowWidth: number, windowHeight: number, safeAreaBottom: number) {
  return (
    windowHeight - cameoBottomOffset(safeAreaBottom) - cameoMaxHeight(windowWidth, windowHeight)
  );
}
