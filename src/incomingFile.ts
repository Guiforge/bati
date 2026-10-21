/**
 * The quest file the import preview reads, held here rather than in the route's URL.
 *
 * Android grants Bati the right to read a `content://` URI exactly as it was sent, and Expo Router
 * runs `decodeURIComponent` over a route's params more than once: a Downloads URI
 * (`…/document/raw%3A%2Fstorage%2F…`) reached `File` as `…/raw:/storage/…`, a URI nobody had
 * granted, and the provider refused it ("Permission Denial"). So the URI never goes through the
 * router. The route carries a random token instead, new for every file, so a second file opened
 * while the preview is showing reads again, and a link another app or a web page builds cannot
 * name the file held (a counter was 1 for the first file of the process).
 */
let held: { uri: string; n: string } | null = null;

/** Holds `uri` for the preview and returns the token its route carries. */
export function holdIncomingFile(uri: string): string {
  // ponytail: `Math.random()`, as `db/uuid.ts`: unguessable in one blind tap, not a secret. Swap
  //           for `expo-crypto` the day the token guards more than a preview that asks for a tap.
  const n = Math.random().toString(36).slice(2, 12).padEnd(10, "0");
  held = { uri, n };
  return n;
}

/**
 * The URI held under counter `n`. Kept, not taken: the screen can mount twice. Another token
 * reads nothing, so a `bati://quest-import?n=1` link on a web page cannot reopen a held file.
 */
export function incomingFile(n: string | undefined): string | null {
  return held !== null && held.n === n ? held.uri : null;
}

/** Once imported, the file is done with: nothing should read it again. */
export function releaseIncomingFile(): void {
  held = null;
}
