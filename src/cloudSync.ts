import { File, UploadType } from "expo-file-system";
import { Linking } from "react-native";

/**
 * The third host this app talks to, and the only one the hero names: their own WebDAV server.
 *
 * Everything that crosses the network for device sync is in this file, and nothing crosses it
 * that is not already sealed: callers hand over `.batb` files encrypted on the device
 * (src/backupCipher.ts), so the server stores bytes it cannot read, under a name that says only
 * which install wrote them. `.biome/plugins/noJsNetwork.grit` names this module, and the privacy
 * policy says what it sends and to whom.
 *
 * WebDAV because it is a standard, not a vendor: Nextcloud, ownCloud, Infomaniak kDrive, Koofr,
 * Synology and QNAP all speak it, and so does rclone (`rclone serve webdav`, or Round Sync on the
 * phone itself), which puts Proton Drive, Google Drive and some seventy others behind the same
 * five verbs. Nextcloud gets a nicer door, Login Flow v2: the hero signs in *in their own browser*
 * and the app receives a revocable app password, so no password is typed into Bati and no OAuth
 * client is registered anywhere. Every other server takes a URL, a user and an app password.
 *
 * Downloads and uploads go through expo-file-system's native transfer, so a snapshot of several MB
 * streams file to socket and never passes through JavaScript.
 */

export type NextcloudAccount = { server: string; loginName: string; appPassword: string };

/** Where sync reads and writes: one folder on a WebDAV server, and how to sign in to it. */
export type DavTarget = { folderUrl: string; user: string; password: string };

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

/** A Nextcloud account's sync folder, under its user's WebDAV root. */
export function nextcloudTarget(account: NextcloudAccount): DavTarget {
  const root = `${account.server}/remote.php/dav/files/${encodeURIComponent(account.loginName)}`;
  return { folderUrl: `${root}/${FOLDER}`, user: account.loginName, password: account.appPassword };
}

/**
 * Any other WebDAV server: the address the hero typed is where the `Bati` folder goes. An
 * address without a scheme is https; plain http is only ever sent to this phone itself (see
 * plugins/withAndroidNetworkSecurity.js), which is where Round Sync serves rclone.
 */
export function webdavTarget(url: string, user: string, password: string): DavTarget {
  return { folderUrl: `${normaliseServer(url)}/${FOLDER}`, user, password };
}

function authHeader(target: DavTarget): Record<string, string> {
  return { Authorization: `Basic ${btoa(`${target.user}:${target.password}`)}` };
}

/** Thrown when the server refuses the credentials, so the screen can say that and not "offline". */
export class DavAuthError extends Error {}

function refused(what: string, status: number): Error {
  return status === 401 || status === 403
    ? new DavAuthError(`${what}: HTTP ${status}`)
    : new Error(`${what}: HTTP ${status}`);
}

/**
 * Creates the folder if it is missing. 405 is "already there", which is the usual answer; some
 * servers say 301 or 409 for an existing collection, and the listing right after is what decides.
 */
async function ensureFolder(target: DavTarget): Promise<void> {
  const response = await request(`${target.folderUrl}/`, {
    method: "MKCOL",
    headers: authHeader(target),
  });
  if (response.status === 401 || response.status === 403) throw refused("Folder", response.status);
}

const PROPFIND_BODY =
  '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop>' +
  "<d:getetag/><d:getlastmodified/><d:getcontentlength/><d:resourcetype/>" +
  "</d:prop></d:propfind>";

/**
 * The folder's files. An error is thrown, never an empty list: Joplin inferred deletions from an
 * empty listing and a mount that failed to appear wiped hero after hero (#961, #6864). Here an
 * empty answer can only mean the server said so.
 */
export async function listRemote(target: DavTarget): Promise<RemoteFile[]> {
  await ensureFolder(target);
  const response = await request(`${target.folderUrl}/`, {
    method: "PROPFIND",
    headers: { ...authHeader(target), Depth: "1", "Content-Type": "application/xml" },
    body: PROPFIND_BODY,
  });
  if (response.status !== 207) throw refused("Listing", response.status);
  return parseListing(await response.text());
}

/** The inner text of the first `<prefix:tag>` in `xml`, whatever namespace prefix it carries. */
function field(xml: string, tag: string): string | undefined {
  return new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([^<]*)</(?:[\\w-]+:)?${tag}>`, "i").exec(
    xml,
  )?.[1];
}

/**
 * The files in a PROPFIND answer, by name and version. A regex rather than an XML parser: only
 * four fields are read, and it is tested on what real servers send. Namespace prefixes vary
 * (`d:` from Nextcloud, `D:` and `lp1:` from Apache), so none is assumed.
 *
 * - The folder itself, and any sub-folder, is skipped by its `<collection/>` resource type, or by
 *   a trailing `/` on servers that leave the type out.
 * - The version is the etag, quotes stripped (Nextcloud escapes them as `&quot;`). A server with
 *   no etag gets modification time and size instead: a changed file changes one of them.
 */
export function parseListing(xml: string): RemoteFile[] {
  const files: RemoteFile[] = [];
  for (const response of xml.split(/<(?:[\w-]+:)?response[\s>]/i).slice(1)) {
    const href = field(response, "href");
    if (!href || href.endsWith("/") || /<(?:[\w-]+:)?collection\s*\/?>/i.test(response)) continue;
    const etag = field(response, "getetag")?.replace(/&quot;|"/g, "");
    const version =
      etag || [field(response, "getlastmodified"), field(response, "getcontentlength")].join("|");
    const name = decodeURIComponent(href.split("/").pop() ?? "");
    if (name && version !== "|") files.push({ name, etag: version });
  }
  return files;
}

/**
 * Proves a server and its credentials work before they are remembered: creates the folder and
 * lists it. Throws `DavAuthError` for refused credentials, another error for anything else.
 */
export async function checkTarget(target: DavTarget): Promise<void> {
  await listRemote(target);
}

/** Streams `name` from the folder into `destination`, replacing whatever is there. */
export async function downloadRemote(
  target: DavTarget,
  name: string,
  destination: File,
): Promise<void> {
  await File.downloadFileAsync(`${target.folderUrl}/${encodeURIComponent(name)}`, destination, {
    headers: authHeader(target),
    idempotent: true,
  });
}

/** Streams a local sealed file into the folder under `name`, replacing this device's last one. */
export async function uploadRemote(target: DavTarget, source: File, name: string): Promise<void> {
  await ensureFolder(target);
  const result = await source.upload(`${target.folderUrl}/${encodeURIComponent(name)}`, {
    httpMethod: "PUT",
    uploadType: UploadType.BINARY_CONTENT,
    headers: { ...authHeader(target), "Content-Type": "application/octet-stream" },
  });
  if (result.status < 200 || result.status >= 300) throw refused("Upload", result.status);
}
