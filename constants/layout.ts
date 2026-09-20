/**
 * How wide the app's content column is allowed to get.
 *
 * Nothing here is laid out for a wide window. A quest card holds a fixed-height picture and takes
 * whatever width it is given, so at 800 dp it draws a 5.4:1 letterbox and at 1280 an 8.9:1 one,
 * with 150-character lines under it. Android 16 ignores the portrait lock on large screens, so
 * that window arrives whether or not this app asks for it: a tablet and an unfolded foldable get
 * it today.
 *
 * The answer is a column, not a tablet layout. 520 is what the screens that already thought about
 * this picked for their own cards (`maxW={520}`).
 *
 * Two places need the number and they must agree: `app/(tabs)/_layout.tsx` applies it, and
 * `VillageScene` sizes its painting against the column rather than against the window, which
 * `useWindowDimensions` cannot tell it.
 */
export const CONTENT_MAX_WIDTH = 520;
