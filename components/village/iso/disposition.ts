// Where the iso map lies in the village tab (L6-T21). Its own module, with no import, so the tab
// reads it without loading the map (VillageScene requires IsoVillage lazily).

/** The drawer's strip at the foot of the page (T45): one button, the same height in both orientations. */
export const HAUTEUR_BANDEAU = 56;

/**
 * The map's box in `w` x `h` dp, the screen's area above the tab bar: the whole page less the strip
 * that opens the drawer (T45), in portrait and in landscape alike. The list lives in the drawer.
 */
export function dispositionIso(w: number, h: number) {
  return { paysage: w > h, carteW: w, carteH: Math.max(0, h - HAUTEUR_BANDEAU) };
}

/**
 * The screen's area before its first layout, and while the window has turned and the area's
 * onLayout has not come back: the window less the tab bar (60 dp over the bottom inset, in flow).
 * The map is laid out in this, not in the whole window, so the layout it takes when the window turns
 * is the one the measured area confirms a frame later, with no second jump.
 */
export function aireDepuisFenetre(w: number, h: number, barre: number, insetBas: number) {
  return { w, h: Math.max(0, h - barre - insetBas) };
}

/**
 * Whether the root stack leaves the content column (CONTENT_MAX_WIDTH) to the tabs, for the root
 * screen `route`: the whole tab group, with the iso map on. The tabs then cap their bar and every
 * scene but the Village one (`app/(tabs)/_layout.tsx`), so the map gets the whole width and the
 * bar keeps one width from tab to tab.
 */
export function colonneLibre(route: string, integration: boolean) {
  return integration && route === "(tabs)";
}

/** The tab group's own column, with the flag on; nothing (the root's column) with it off. */
export function colonneOnglets(integration: boolean, maxWidth: number) {
  return integration
    ? { width: "100%" as const, maxWidth, alignSelf: "center" as const }
    : undefined;
}
