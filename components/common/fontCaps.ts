/**
 * How far the system font size may grow a piece of text, one source: `AppText` reads it, and so
 * do the `H1`-`H6` and `Paragraph` that need a cap (those keep their Tamagui typography, which a
 * bare `Text` lacks, so they take `maxFontSizeMultiplier={FONT_CAPS.display}` by hand).
 *
 * - `body`: running text. 130 % is honoured in full, a 200 % system font stops at 150 %.
 * - `label`: text inside a fixed cell (the 52 dp strip, the outing tiles and their chips, the
 *   stage kicker, the rest's +10 s / +30 s).
 * - `display`: figures already drawn large (the rest timer, the countdown, the victory stat
 *   values, the big count), which at 130 % are wider than a 360 dp screen.
 *
 * ponytail: the numbers are a technical choice, not measured on a device; the 360x640 and 200 %
 * checks of the P-05 report confirm or move them.
 */
export const FONT_CAPS = { body: 1.5, label: 1.2, display: 1.0 } as const;

export type AppTextVariant = keyof typeof FONT_CAPS;
