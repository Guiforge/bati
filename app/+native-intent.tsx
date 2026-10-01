import { holdIncomingFile } from "@/src/incomingFile";

/**
 * Where a URL another app opened Bati with lands.
 *
 * A quest file tapped in a chat, a mail or Files arrives as `content://…`: `app.json` claims
 * `application/json` for that. Expo Router would read it as a path
 * and show the unmatched-route screen, so it goes to the import preview, which reads it at once.
 * The URI itself is held aside (`src/incomingFile.ts`), never put in the route: the router would
 * decode it into a URI Android did not grant. Anything else (`bati://…`) keeps its own path.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // `content:` only. A `file:` URI points into a filesystem, which a chat never hands over and
  // which another app could aim at `/dev/zero` or at Bati's own files.
  if (path.startsWith("content://")) {
    return `/quest-import?n=${holdIncomingFile(path)}`;
  }
  return path;
}
