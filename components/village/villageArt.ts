/**
 * How the village painting is cut to the window it lands in.
 *
 * Its own module for the reason `sessionArt.ts` is: a component module that exports a constant
 * loses Fast Refresh, and this rule is the one thing on that screen worth a test. The painting is
 * square (1024x1024) and `cover` crops whatever the slot does not match, so the slot is square
 * too and the whole painting shows, edge to edge, unless the window is too wide for that.
 */

/**
 * The widest a window may be, relative to its own height, before the square painting stops being
 * the whole picture and becomes a band.
 *
 * The test is the window's *shape*. It used to be `height < 700`, which is the same test only
 * while `width < height` holds: true on every phone, false on an unfolded foldable. At 700x841 dp
 * the old rule left a 700 dp painting on an 841 dp screen, 83 % of the fold, with the tier card
 * sliced in half by the tab bar. 0.5 keeps the behaviour it was written for, a 360x640 compact at
 * 0.56 and a 393x852 not at 0.46, and catches every window a phone never produces.
 */
const COMPACT_RATIO = 0.5;

/**
 * How tall the band is, as a fraction of the *window*.
 *
 * It was a fraction of the width, which says nothing once the width is the long side: 0.62 of a
 * 1280 dp landscape tablet is a band taller than the 800 dp screen holding it. On the 360x640 this
 * was tuned for, 0.35 of the height gives 224 dp where the old rule gave 223.
 */
const COMPACT_BAND = 0.35;

/** How far into the painting the band starts, so a crop takes the sky rather than the roofline. */
const COMPACT_CROP_TOP = 0.2;

/** The painting's slot: how tall it is, and how far the square is shifted up inside it. */
export function villageHeroSlot(
  width: number,
  height: number,
): { heroHeight: number; paintingTop: number } {
  if (width > height * COMPACT_RATIO) {
    return {
      heroHeight: Math.round(height * COMPACT_BAND),
      paintingTop: -Math.round(width * COMPACT_CROP_TOP),
    };
  }
  return { heroHeight: width, paintingTop: 0 };
}
