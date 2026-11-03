import { fromBase64Url, MAX_ENVELOPE_BYTES, toBase64Url } from "./envelope";

/**
 * The sealed link. Everything lives after the `#`, which a browser never sends: getbati.app serves
 * the same empty page to everyone and cannot learn what a link holds.
 *
 * A QR code carries this same text, so there is one way to read anything a hero is handed.
 */
const WEB_PREFIX = "https://getbati.app/d#";
const APP_PREFIX = "bati://d#";

/** Two base64url characters for three bytes, and the prefix. Past this a string is not ours. */
const MAX_LINK_CHARS = WEB_PREFIX.length + Math.ceil((MAX_ENVELOPE_BYTES * 4) / 3);

export function linkFor(bytes: Uint8Array): string {
  return WEB_PREFIX + toBase64Url(bytes);
}

/** The bytes a link or a scanned code holds, or null: whatever arrives here is untrusted. */
export function bytesOfLink(link: string): Uint8Array | null {
  if (link.length > MAX_LINK_CHARS) return null;
  const prefix = [WEB_PREFIX, APP_PREFIX].find((p) => link.startsWith(p));
  return prefix === undefined ? null : fromBase64Url(link.slice(prefix.length));
}

/** Whether a URL Android opened Bati with is one of these, the app's own schemes included. */
export function isSealedLink(url: string): boolean {
  return url.startsWith(WEB_PREFIX) || url.startsWith(APP_PREFIX);
}

/**
 * The link Android opened Bati with, held here and never in a route: an invite holds the pair's
 * secret, and a route's params are logged, decoded twice and kept in the navigation state
 * (see `src/incomingFile.ts`). Taken, not kept: one reading, then it is gone from memory.
 */
let held: string | null = null;
let arrivals = 0;

/** Returns what the route carries so a screen already open reads again: a count, nothing secret. */
export function holdIncomingLink(url: string): number {
  held = url;
  arrivals += 1;
  return arrivals;
}

export function takeIncomingLink(): string | null {
  const link = held;
  held = null;
  return link;
}
