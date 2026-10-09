/**
 * Where the Village's figure stands: inside the painting, above the title.
 *
 * Its own module, and pure, for the reason sessionArt.ts gives: this answer decides whether the
 * figure can ever cover a card or a control, and that should be checkable without standing up a
 * render tree. The figure is a child of the hero (the painting and its title, edge to edge at the
 * top of the Village), so it scrolls with the painting and never reaches the list below it.
 *
 * The first version anchored it to the bottom of the window, above the tab bar, because that is
 * where a global overlay had to stand. On the Village that is over "Village tier" and "Next to
 * build", covering their text. The painting is the only ground this screen has for a figure.
 */

/**
 * The hero's bottom band that belongs to the title: village name, tier line, crest line, focus
 * line and the scrim's padding, about 160 dp at default font scale with a streak. The Village
 * pins its name this far above the hero's bottom (`villageTitleTop`), so the figure's band ends
 * exactly where the name starts: one number, read by both.
 */
export const TITLE_BLOCK = 160;

/** Gap kept under the status bar. */
const TOP_GAP = 8;

/** Below this a figure stops reading as a figure; the villager then stays home. */
const MIN_FIGURE = 96;

/** Tablets and landscape: past this a cameo stops reading as a figure at the edge of the scene. */
const HEIGHT_CAP = 200;

export type CameoBand = { top: number; height: number; figureHeight: number };

/**
 * The band, in the hero's own coordinates, where the figure and its bubble stand: from just under
 * the status bar to just above the title block. `null` when the hero is too short to hold a
 * figure (a compact window), in which case there is no villager rather than one over the title.
 *
 * ponytail: the title block is a constant shared with the Village's title pin. A wrapped village
 * name already grows the block downward, but it is pinned by its top, so the figure's band stays
 * correct. It breaks only if the title row gains height above its pinned top (a line above
 * the name): then measure it at the call site and keep this as the floor.
 */
export function cameoBand(
  heroHeight: number,
  safeTop: number,
  columnWidth: number,
): CameoBand | null {
  const top = safeTop + TOP_GAP;
  const height = heroHeight - TITLE_BLOCK - top;
  if (height < MIN_FIGURE) return null;
  // Width follows the source art's 3:4, so the figure is also capped against the column.
  const figureHeight = Math.min(height, Math.round(columnWidth * 0.45), HEIGHT_CAP);
  return { top, height, figureHeight };
}
