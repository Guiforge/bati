import { redirectSystemPath } from "@/app/+native-intent";
import { holdIncomingFile, incomingFile, releaseIncomingFile } from "@/src/incomingFile";

/**
 * A quest file tapped in a chat, a mail or Files opens Bati with a `content://` URL. Expo Router
 * read it as a path and showed the unmatched-route screen; it has to land on the import preview
 * with the URL intact. Everything else is the app's own link and keeps its path.
 */
const redirect = (path: string, initial = true) => redirectSystemPath({ path, initial });
const counter = (target: string) => new URL(target, "bati://x").searchParams.get("n") ?? undefined;

/**
 * The URI never goes through the route. Expo Router decodes a param more than once, so a Downloads
 * URI (`raw%3A%2Fstorage`) reached the reader as `raw:/storage`, which Android had not granted:
 * "Permission Denial" on the emulator, and the hero was told the file was unreadable.
 */
test("a content:// file goes to the import preview, held exactly as Android granted it", () => {
  const uri =
    "content://com.android.providers.downloads.documents/document/raw%3A%2Fstorage%2Femulated%2F0%2FDownload%2Fq.json";
  const target = redirect(uri);
  expect(target).toMatch(/^\/quest-import\?n=\d+$/);
  expect(target).not.toContain("raw");
  expect(incomingFile(counter(target))).toBe(uri);
});

// A second file opened over the preview must read again, so its route has to differ.
test("every file gets its own route, cold start or warm", () => {
  const first = redirect("content://chat/1", true);
  const second = redirect("content://chat/2", false);
  expect(second).not.toBe(first);
  expect(incomingFile(counter(second))).toBe("content://chat/2");
});

// `bati://` is BROWSABLE: a web page could link `bati://quest-import?n=1` and reopen, with
// "Update my quest" one tap away, whatever file was held earlier in the process.
test("only the counter a file was held under reads it, and an imported file reads nothing", () => {
  const n = String(holdIncomingFile("content://chat/held"));
  expect(incomingFile(n)).toBe("content://chat/held");
  expect(incomingFile(String(Number(n) - 1))).toBeNull();
  expect(incomingFile(undefined)).toBeNull();

  releaseIncomingFile();
  expect(incomingFile(n)).toBeNull();
  // The counter keeps climbing: a released file's number never names the next one.
  expect(holdIncomingFile("content://chat/next")).toBeGreaterThan(Number(n));
});

// A `file:` URI points into a filesystem: `/dev/zero` never ends, and Bati's own files are not a
// quest someone sent. No chat hands one over.
test("a file:// URL is not taken for a quest file", () => {
  const n = String(holdIncomingFile("content://chat/kept"));
  const path = "file:///dev/zero";
  expect(redirect(path)).toBe(path);
  expect(incomingFile(n)).toBe("content://chat/kept");
});

// The app's own links (a reminder, the widget, a share) must not be swallowed by the import.
test("the app's own links and plain paths pass through unchanged", () => {
  for (const path of ["/", "bati://", "bati://quests/12", "/quests/12?from=widget", "session"]) {
    expect(redirect(path)).toBe(path);
  }
});

// Only a URL that starts with the scheme is a file: a link carrying one in its query is not.
test("a scheme that is only mentioned later in the path is not a file", () => {
  const path = "bati://share?next=content://evil/1";
  expect(redirect(path)).toBe(path);
});
