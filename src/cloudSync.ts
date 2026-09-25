import { File, UploadType } from "expo-file-system";
import { Linking } from "react-native";

/**
 * The third host this app talks to, and the only one the hero names: their own Nextcloud.
 *
 * Everything that crosses the network for device sync is in this file, and nothing crosses it
 * that is not already sealed: callers hand over `.batb` files encrypted on the device
 * (src/backupCipher.ts), so the server stores bytes it cannot read, under a name that says only
 * which install wrote them. `.biome/plugins/noJsNetwork.grit` names this module, and the privacy
 * policy says what it sends and to whom.
 *
 * Nextcloud first because it asks nothing of this project: Login Flow v2 hands the app a
 * revocable app password after the hero signs in *in their own browser*, so no password is typed
 * into Bati, no OAuth client is registered anywhere, and nothing about a vendor ships in the APK.
 * WebDAV underneath is plain HTTP verbs. Dropbox and the rest need an app registered to this
 * project first (docs/planning/roadmap.md §4.18).
 *
 * Downloads and uploads go through expo-file-system's native transfer, so a snapshot of several MB
 * streams file to socket and never passes through JavaScript.
 */

export type NextcloudAccount = { server: string; loginName: string; appPassword: string };

/** A file in the sync folder, with the server's version of it. A changed etag is a new write. */
export type RemoteFile = { name: string; etag: string };

/** Where on the account this app keeps its files. One folder, created on first use. */
const FOLDER = "Bati";

/** Long enough for a slow server, short enough that a dead one does not hold a launch. */
const REQUEST_TIMEOUT_MS = 15_000;

/** Login Flow v2 gives the hero twenty minutes; polling stops with it. */
const LOGIN_POLL_MS = 2000;
const LOGIN_TIMEOUT_MS = 20 * 60 * 1000;

/** `fetch` with a deadline, the way src/updateCheck.ts does it: Hermes has no `AbortSignal.timeout`. */
function request(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** `https://cloud.example.org/` or `cloud.example.org` → `https://cloud.example.org`. */
export function normaliseServer(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Nextcloud's Login Flow v2: ask the server for a login page, open it in the hero's browser, and
 * poll until they have approved it there. Resolves to the account, or `null` if they never did.
 * `isCancelled` is checked between polls, so leaving the screen stops the loop.
 */
export async function loginToNextcloud(
  serverInput: string,
  isCancelled: () => boolean,
): Promise<NextcloudAccount | null> {
  const server = normaliseServer(serverInput);
  // Nextcloud names the app after its User-Agent on the page where the hero grants access, and
  // in their list of connected devices. Without this it said "okhttp/4.12.0".
  const start = await request(`${server}/index.php/login/v2`, {
    method: "POST",
    headers: { "User-Agent": "Bati (Android)" },
  });
  if (!start.ok) throw new Error(`Login flow refused: HTTP ${start.status}`);
  const flow = (await start.json()) as { login: string; poll: { token: string; endpoint: string } };

  await Linking.openURL(flow.login);

  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  while (Date.now() < deadline && !isCancelled()) {
    await new Promise((resolve) => setTimeout(resolve, LOGIN_POLL_MS));
    const poll = await request(flow.poll.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `token=${encodeURIComponent(flow.poll.token)}`,
    }).catch(() => null);
    // 404 is "not yet"; a dropped connection is retried on the next beat.
    if (poll?.ok) {
      const done = (await poll.json()) as NextcloudAccount;
      return { ...done, server: normaliseServer(done.server) };
    }
  }
  return null;
}

function folderUrl(account: NextcloudAccount): string {
  return `${account.server}/remote.php/dav/files/${encodeURIComponent(account.loginName)}/${FOLDER}`;
}

function authHeader(account: NextcloudAccount): Record<string, string> {
  return { Authorization: `Basic ${btoa(`${account.loginName}:${account.appPassword}`)}` };
}

/** Creates the folder if it is missing. 405 is "already there", which is the usual answer. */
async function ensureFolder(account: NextcloudAccount): Promise<void> {
  const response = await request(`${folderUrl(account)}/`, {
    method: "MKCOL",
    headers: authHeader(account),
  });
  if (!response.ok && response.status !== 405) {
    throw new Error(`Could not create the sync folder: HTTP ${response.status}`);
  }
}

/**
 * The folder's files. An error is thrown, never an empty list: Joplin inferred deletions from an
 * empty listing and a mount that failed to appear wiped hero after hero (#961, #6864). Here an
 * empty answer can only mean the server said so.
 */
export async function listRemote(account: NextcloudAccount): Promise<RemoteFile[]> {
  await ensureFolder(account);
  const response = await request(`${folderUrl(account)}/`, {
    method: "PROPFIND",
    headers: { ...authHeader(account), Depth: "1", "Content-Type": "application/xml" },
    body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getetag/></d:prop></d:propfind>',
  });
  if (response.status !== 207) throw new Error(`Listing refused: HTTP ${response.status}`);
  return parseListing(await response.text());
}

/**
 * The files in a PROPFIND answer, by name and etag. A regex rather than an XML parser: the
 * answer is one shape, from one kind of server, and only two fields of it are read. The folder
 * itself comes back as the first entry and ends in `/`, which is how it is skipped.
 */
export function parseListing(xml: string): RemoteFile[] {
  const files: RemoteFile[] = [];
  for (const response of xml.split(/<d:response>/i).slice(1)) {
    const href = /<d:href>([^<]+)<\/d:href>/i.exec(response)?.[1];
    // Nextcloud escapes the quotes around an etag (`&quot;abc&quot;`); other servers do not.
    const etag = /<d:getetag>([^<]+)<\/d:getetag>/i.exec(response)?.[1]?.replace(/&quot;|"/g, "");
    if (!href || !etag || href.endsWith("/")) continue;
    const name = decodeURIComponent(href.split("/").pop() ?? "");
    if (name) files.push({ name, etag });
  }
  return files;
}

/** Streams `name` from the folder into `destination`, replacing whatever is there. */
export async function downloadRemote(
  account: NextcloudAccount,
  name: string,
  destination: File,
): Promise<void> {
  await File.downloadFileAsync(`${folderUrl(account)}/${encodeURIComponent(name)}`, destination, {
    headers: authHeader(account),
    idempotent: true,
  });
}

/** Streams a local sealed file into the folder under `name`, replacing this device's last one. */
export async function uploadRemote(
  account: NextcloudAccount,
  source: File,
  name: string,
): Promise<void> {
  await ensureFolder(account);
  const result = await source.upload(`${folderUrl(account)}/${encodeURIComponent(name)}`, {
    httpMethod: "PUT",
    uploadType: UploadType.BINARY_CONTENT,
    headers: { ...authHeader(account), "Content-Type": "application/octet-stream" },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload refused: HTTP ${result.status}`);
  }
}
