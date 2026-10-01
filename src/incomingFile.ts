/**
 * The quest file the import preview reads, held here rather than in the route's URL.
 *
 * Android grants Bati the right to read a `content://` URI exactly as it was sent, and Expo Router
 * runs `decodeURIComponent` over a route's params more than once: a Downloads URI
 * (`…/document/raw%3A%2Fstorage%2F…`) reached `File` as `…/raw:/storage/…`, a URI nobody had
 * granted, and the provider refused it ("Permission Denial"). So the URI never goes through the
 * router. The route carries a counter instead, which changes for every file, so a second file
 * opened while the preview is showing reads again.
 */
let held: { uri: string; n: number } | null = null;
let opened = 0;

/** Holds `uri` for the preview and returns the counter its route carries. */
export function holdIncomingFile(uri: string): number {
  opened += 1;
  held = { uri, n: opened };
  return opened;
}

/**
 * The URI held under counter `n`. Kept, not taken: the screen can mount twice. Another counter
 * reads nothing, so a `bati://quest-import?n=1` link on a web page cannot reopen a held file.
 */
export function incomingFile(n: string | undefined): string | null {
  return held !== null && String(held.n) === n ? held.uri : null;
}

/** Once imported, the file is done with: nothing should read it again. */
export function releaseIncomingFile(): void {
  held = null;
}
