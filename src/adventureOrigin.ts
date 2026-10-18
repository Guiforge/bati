/**
 * Where the hero stood before an adventure page: `"home"` (Continue the adventure) or a Journal
 * path (Boss vaincus, a kill report). It rides the `from` param of the adventure page and the
 * `adventureFrom` param of its quests, so back from a step still ends where the hero began.
 */
export type AdventureOrigin = "home" | `/journal${string}`;

export function parseAdventureOrigin(raw: string | string[] | undefined): AdventureOrigin | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "home") return v;
  return v?.startsWith("/journal") && !v.includes("//") && !v.includes("..")
    ? (v as AdventureOrigin)
    : null;
}

/** `?from=…` for the adventure page, or nothing. */
export const adventureHref = (adventureId: number, origin: AdventureOrigin | null) =>
  `/adventures/${adventureId}${origin ? `?from=${encodeURIComponent(origin)}` : ""}`;

/** `&adventureFrom=…` to append to a quest link that already carries `adventureId`. */
export const questOriginQuery = (origin: AdventureOrigin | null) =>
  origin ? `&adventureFrom=${encodeURIComponent(origin)}` : "";

/** The route an origin returns to. */
export const originRoute = (origin: AdventureOrigin) => (origin === "home" ? "/" : origin);
