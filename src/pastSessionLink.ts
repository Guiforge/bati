/**
 * The reminder's "Fait ailleurs ?" arrives as `bati:///journal?add=past&day=yyyy-MM-dd`.
 * Anyone can launch that URL, so nothing is written from it: it only opens the sheet, and every
 * value is read strictly (`dayFromLink`).
 *
 * "Once" lives here, in module state, because the root layout remounts and a `ref` forgets: the
 * Journal asks `consume` with the link's params and gets true the first time only, until the
 * params are gone (the screen clears them) and the next link may open the sheet again.
 */
let handled = false;

export type PastSessionLink = { add?: string | string[]; day?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The link's `day` when it is a past-session link not yet consumed, else null. */
export function consumePastSessionLink(
  params: PastSessionLink,
): { day: string | undefined } | null {
  if (first(params.add) !== "past") {
    handled = false;
    return null;
  }
  if (handled) return null;
  handled = true;
  return { day: first(params.day) };
}
