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

/**
 * `userId` is the name Nextcloud files the account under, which is what its WebDAV path wants: it
 * differs from `loginName` for a hero who signs in with an email or through LDAP. Absent on an
 * account whose id could not be read; the login name is the right guess for everyone else.
 */
export type NextcloudAccount = {
  server: string;
  loginName: string;
  appPassword: string;
  userId?: string;
};

/** Where sync reads and writes: one folder on a WebDAV server, and how to sign in to it. */
export type DavTarget = { folderUrl: string; user: string; password: string };

/**
 * A file in the sync folder, with the server's version of it: a changed etag is a new write.
 * `modified` is epoch ms from `getlastmodified`, 0 when a server leaves it out. `size` is
 * `getcontentlength` when the server gives one.
 */
export type RemoteFile = { name: string; etag: string; modified: number; size?: number };

/**
 * What an upload is called until it is moved into place. Not `.part`: Nextcloud refuses any name
 * ending in `.part` or `.filepart` (its `blacklist_files_regex`, on by default) with a 400, so every
 * upload to a Nextcloud failed with "HTTP 400" right after the login. Pinned by
 * `__tests__/cloudSync-upload.test.ts`.
 */
const TEMP_SUFFIX = ".upload";

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

/**
 * The one place plain HTTP may go: this phone itself, where Round Sync serves rclone. Mirrors
 * plugins/withAndroidNetworkSecurity.js, which is what actually enforces it in a release build.
 */
export function isOnThisDevice(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url.trim());
}

/** A plain `http://` address that is not this phone: Android would refuse it anyway. */
export class InsecureAddressError extends Error {}

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
  // The server names the page to open and the endpoint to poll. Both must be web addresses on it
  // (or on https): an `intent:` or foreign URL here would be the server steering the phone.
  if (!sameOriginOrHttps(flow.login, server) || !sameOriginOrHttps(flow.poll.endpoint, server)) {
    throw new Error("Login flow pointed outside the server");
  }

  await Linking.openURL(flow.login);

  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  while (Date.now() < deadline && !isCancelled()) {
    await new Promise((resolve) => setTimeout(resolve, LOGIN_POLL_MS));
    // Cancelled during the wait: an approval arriving now must not connect a screen the hero left.
    if (isCancelled()) return null;
    const poll = await request(flow.poll.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `token=${encodeURIComponent(flow.poll.token)}`,
    }).catch(() => null);
    // 404 is "not yet"; a dropped connection is retried on the next beat.
    if (poll?.ok) {
      const done = (await poll.json()) as NextcloudAccount;
      // The address the hero typed, not the one the server reports: sync goes where they chose.
      const account = { ...done, server };
      const userId = await nextcloudUserId(account);
      return userId === null ? account : { ...account, userId };
    }
  }
  return null;
}

/** The account's user id, from the OCS API, or `null` when the server does not say. */
async function nextcloudUserId(account: NextcloudAccount): Promise<string | null> {
  const answer = await request(`${account.server}/ocs/v2.php/cloud/user?format=json`, {
    headers: {
      ...authHeader({ folderUrl: "", user: account.loginName, password: account.appPassword }),
      "OCS-APIRequest": "true",
    },
  })
    .then((r) => (r.ok ? (r.json() as Promise<{ ocs?: { data?: { id?: unknown } } }>) : null))
    .catch(() => null);
  const id = answer?.ocs?.data?.id;
  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * Revokes the app password Nextcloud gave Bati, so "Stop" leaves no working credential behind.
 * Best effort: a server that cannot be reached keeps it until the hero removes it there, which
 * the stop message says.
 */
export async function revokeNextcloudAppPassword(account: NextcloudAccount): Promise<boolean> {
  const answer = await request(`${account.server}/ocs/v2.php/core/apppassword`, {
    method: "DELETE",
    headers: {
      ...authHeader({ folderUrl: "", user: account.loginName, password: account.appPassword }),
      "OCS-APIRequest": "true",
    },
  }).catch(() => null);
  return answer?.ok ?? false;
}

function sameOriginOrHttps(url: string, server: string): boolean {
  const origin = (u: string) => /^(https?:\/\/[^/]+)/i.exec(u)?.[1]?.toLowerCase();
  return origin(url) === origin(server) || /^https:\/\//i.test(url);
}

/** A Nextcloud account's sync folder, under its user's WebDAV root. */
export function nextcloudTarget(account: NextcloudAccount): DavTarget {
  // The path wants the account's id, which is not always the name it signs in with: an email works
  // on a recent Nextcloud and is a 404 on an older one. When the server did not say the id,
  // `/remote.php/webdav` is the signed-in user's own root whatever the login name was.
  const root =
    account.userId === undefined
      ? `${account.server}/remote.php/webdav`
      : `${account.server}/remote.php/dav/files/${encodeURIComponent(account.userId)}`;
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

/** Any other answer the server gave, with its status: 507 is a full account, 5xx is the server. */
export class DavHttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function refused(what: string, status: number): Error {
  return status === 401 || status === 403
    ? new DavAuthError(`${what}: HTTP ${status}`)
    : new DavHttpError(`${what}: HTTP ${status}`, status);
}

/**
 * `refused`, plus what the server said about it: Sabre (Nextcloud, ownCloud) answers an error with
 * `<s:message>`, and "HTTP 400" alone says nothing about which request it disliked. Only the error
 * trail ("Send me the details") carries it; the hero's message stays the one line.
 */
async function refusedWithReason(what: string, response: Response): Promise<Error> {
  const body = await response.text().catch(() => "");
  const reason = /<s:message>([^<]{1,200})<\/s:message>/.exec(body)?.[1]?.trim();
  const error = refused(what, response.status);
  if (reason) error.message += ` (${reason})`;
  return error;
}

/**
 * Which layer a sync failed at, so the hero reads "the server refused your app password" or
 * "your storage is full" rather than "could not reach your server" for everything, at every launch.
 */
export type SyncFailure = {
  kind: "offline" | "credentials" | "storage" | "certificate" | "server" | "encryption" | "unknown";
  status?: number;
};

export function failureOf(error: unknown): SyncFailure {
  if (error instanceof DavAuthError) return { kind: "credentials" };
  if (error instanceof DavHttpError) {
    return error.status === 507
      ? { kind: "storage", status: 507 }
      : { kind: "server", status: error.status };
  }
  const message = error instanceof Error ? error.message : String(error);
  // OkHttp and fetch say these in their own words; the words are all that crosses the bridge.
  if (/certif|CertPath|SSLHandshake|SSLPeerUnverified|trust anchor/i.test(message)) {
    return { kind: "certificate" };
  }
  if (
    /network request failed|unable to resolve host|unknownhost|timeout|timed out|failed to connect|connection refused|econnrefused|aborted/i.test(
      message,
    )
  ) {
    return { kind: "offline" };
  }
  return { kind: "unknown" };
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
  if (response.status !== 207) throw await refusedWithReason("Listing", response);
  return parseListing(await response.text());
}

/** One question the connection test asked the server, and what it answered. */
export type DiagnosticStep = {
  id: "reach" | "account" | "folder" | "list" | "write";
  ok: boolean;
  /** The HTTP status the server gave, when it gave one. */
  status?: number;
  /** The layer it failed at, in `failureOf`'s words, so the screen can say what to do. */
  kind?: SyncFailure["kind"];
  /** What the server said about the refusal (Sabre's `<s:message>`). */
  reason?: string;
};

/** A name no device reads as a peer, with the temporary suffix: the one file a diagnostic writes and removes, never a device's. */
const DIAGNOSTIC_FILE = `bati-diagnostic${TEMP_SUFFIX}`;

/**
 * Asks the server, one step at a time, what sync needs from it, and stops at the first it refuses:
 * the server answers, the account is known (Nextcloud), the folder is there, it can be read, a small
 * file can be written and removed. Nothing is thrown: a failure is the result. The one write is a
 * four-byte file removed right after, under a name no device reads. `account` is the Nextcloud
 * sign-in the target came from, whose server and id the first two steps ask about.
 */
export async function diagnoseServer(
  target: DavTarget,
  account?: NextcloudAccount,
): Promise<DiagnosticStep[]> {
  const steps: DiagnosticStep[] = [];
  /** Runs one step, records it, and tells whether the next one may run. */
  const step = async (
    id: DiagnosticStep["id"],
    ask: () => Promise<{ status: number; ok: boolean; reason?: string }>,
  ): Promise<boolean> => {
    try {
      const answer = await ask();
      steps.push({
        id,
        ok: answer.ok,
        status: answer.status,
        ...(answer.ok ? {} : { kind: failureOf(refused(id, answer.status)).kind }),
        ...(answer.reason ? { reason: answer.reason } : {}),
      });
      return answer.ok;
    } catch (error) {
      steps.push({ id, ok: false, kind: failureOf(error).kind });
      return false;
    }
  };
  const reasonOf = async (response: Response) =>
    /<s:message>([^<]{1,200})<\/s:message>/
      .exec(await response.text().catch(() => ""))?.[1]
      ?.trim();

  const origin = new URL(account ? account.server : target.folderUrl).origin;
  const reached = await step("reach", async () => {
    // Any answer says the server is there; what it says is for the later steps to judge.
    const answer = await request(account ? `${account.server}/status.php` : `${origin}/`, {
      headers: authHeader(target),
    });
    return { status: answer.status, ok: true };
  });
  if (!reached) return steps;

  if (account) {
    const known = await step("account", async () => {
      const answer = await request(`${account.server}/ocs/v2.php/cloud/user?format=json`, {
        headers: { ...authHeader(target), "OCS-APIRequest": "true" },
      });
      return {
        status: answer.status,
        ok: answer.ok,
        reason: answer.ok ? undefined : await reasonOf(answer),
      };
    });
    // A server that does not say who the account is is not a failure: the path then has no id.
    if (!known && steps.at(-1)?.status === 401) return steps;
  }

  const folder = await step("folder", async () => {
    const answer = await request(`${target.folderUrl}/`, {
      method: "MKCOL",
      headers: authHeader(target),
    });
    // 405 and 409 are "already there" on the servers that say so; the listing right after decides.
    const ok = answer.status < 400 || answer.status === 405 || answer.status === 409;
    return { status: answer.status, ok, reason: ok ? undefined : await reasonOf(answer) };
  });
  if (!folder) return steps;

  const listed = await step("list", async () => {
    const answer = await request(`${target.folderUrl}/`, {
      method: "PROPFIND",
      headers: { ...authHeader(target), Depth: "1", "Content-Type": "application/xml" },
      body: PROPFIND_BODY,
    });
    return {
      status: answer.status,
      ok: answer.status === 207,
      reason: answer.status === 207 ? undefined : await reasonOf(answer),
    };
  });
  if (!listed) return steps;

  const file = `${target.folderUrl}/${DIAGNOSTIC_FILE}`;
  await step("write", async () => {
    const answer = await request(file, {
      method: "PUT",
      headers: authHeader(target),
      body: "bati",
    });
    const ok = answer.status >= 200 && answer.status < 300;
    const reason = ok ? undefined : await reasonOf(answer);
    // Best effort: the next test overwrites it, and no device reads a temporary file.
    if (ok)
      await request(file, { method: "DELETE", headers: authHeader(target) }).catch(() => null);
    return { status: answer.status, ok, reason };
  });
  return steps;
}

/** The inner text of the first `<prefix:tag>` in `xml`, whatever namespace prefix it carries. */
function field(xml: string, tag: string): string | undefined {
  return new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([^<]*)</(?:[\\w-]+:)?${tag}>`, "i").exec(
    xml,
  )?.[1];
}

/**
 * The files in a PROPFIND answer, by name and version. A regex rather than an XML parser: only
 * four fields are read, and it is tested on what real servers send.
 *
 * ponytail: regex over XML. Ceiling: a server that puts CDATA, comments or a `<` inside a field;
 *           none of Nextcloud, Apache mod_dav or rclone does. Upgrade: a small SAX pass, the day a
 *           real server's answer fails the tests in __tests__/cloudSync.test.ts. Namespace prefixes vary
 * (`d:` from Nextcloud, `D:` and `lp1:` from Apache), so none is assumed.
 *
 * - The folder itself, and any sub-folder, is skipped by its `<collection/>` resource type, or by
 *   a trailing `/` on servers that leave the type out.
 * - The version is the etag, quotes stripped (Nextcloud escapes them as `&quot;`). A server with
 *   no etag gets modification time and size instead: a changed file changes one of them.
 * - The weak marker `W/` is dropped too: Apache answers the same file `W/"x"` to one request and
 *   `"x"` to the next (mod_deflate decides per request), and a version that flickers looks like a
 *   file replaced behind this device's back, so every idle sync re-sent its file.
 */
export function parseListing(xml: string): RemoteFile[] {
  const files: RemoteFile[] = [];
  for (const response of xml.split(/<(?:[\w-]+:)?response[\s>]/i).slice(1)) {
    const href = field(response, "href");
    if (!href || href.endsWith("/") || /<(?:[\w-]+:)?collection\s*\/?>/i.test(response)) continue;
    const etag = field(response, "getetag")
      ?.replace(/^W\//, "")
      .replace(/&quot;|"/g, "");
    const lastModified = field(response, "getlastmodified");
    const version = etag || [lastModified, field(response, "getcontentlength")].join("|");
    const name = decodedName(href);
    const modified = Date.parse(lastModified ?? "");
    if (name && version !== "|") {
      // What the server says it holds, so a download that comes back a different size (an empty
      // 200, a login page, another file) is not taken for the file.
      const size = sizeOf(response);
      files.push({
        name,
        etag: version,
        modified: Number.isNaN(modified) ? 0 : modified,
        ...(size === undefined ? {} : { size }),
      });
    }
  }
  return files;
}

/** `getcontentlength` as a number, or `undefined` when the server leaves it out or says nonsense. */
function sizeOf(response: string): number | undefined {
  const text = field(response, "getcontentlength");
  const size = Number(text);
  return text && Number.isFinite(size) ? size : undefined;
}

/** The last path segment, or "" for one no browser would have sent: skipped, not fatal. */
function decodedName(href: string): string {
  try {
    return decodeURIComponent(href.split("/").pop() ?? "");
  } catch {
    // A malformed escape is a file some other client named; it is not one of ours either way.
    return "";
  }
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
export async function uploadRemote(
  target: DavTarget,
  source: File,
  name: string,
): Promise<string | undefined> {
  await ensureFolder(target);
  const final = `${target.folderUrl}/${encodeURIComponent(name)}`;
  // Written under a name no device reads, then moved into place: a PUT cut off halfway left a
  // truncated file that every other device read as unreadable until this one's next upload.
  const part = await putTemporary(target, source, final);
  const moved = await request(part, {
    method: "MOVE",
    headers: { ...authHeader(target), Destination: final, Overwrite: "T" },
  });
  if (moved.ok) return confirmHolds(target, final, source.size);
  if (moved.status !== 405 && moved.status !== 501) throw refused("Upload", moved.status);
  // A server without MOVE: the direct write, and the stray temporary file goes on a best effort.
  await put(target, source, final);
  await request(part, { method: "DELETE", headers: authHeader(target) }).catch(
    // Harmless if it stays: no device reads it, and the next upload overwrites it.
    () => null,
  );
  return confirmHolds(target, final, source.size);
}

/**
 * The temporary copy of an upload. A PUT cut off halfway leaves its name locked on the server for a
 * while (Nextcloud's file locking, rclone's WebDAV locks: measured at over thirty seconds), and every
 * retry under that name answers 423 until it lets go, so the next sync would fail the same way. The
 * retry takes another name; the abandoned one is a stray no device reads, which the server drops or
 * the next upload overwrites.
 */
async function putTemporary(target: DavTarget, source: File, final: string): Promise<string> {
  const part = `${final}${TEMP_SUFFIX}`;
  try {
    await put(target, source, part);
    return part;
  } catch (error) {
    if (!(error instanceof DavHttpError) || error.status !== 423) throw error;
    const other = `${final}.${Math.floor(Math.random() * 0xffffff).toString(16)}${TEMP_SUFFIX}`;
    await put(target, source, other);
    return other;
  }
}

/**
 * Asks the server whether it holds the file, at the size sent. A MOVE that answers 2xx has not always
 * moved: a redirect to a login page is re-issued as a GET and ends in a 200, and some servers
 * answer 201 and do nothing. Believing it wrote the "uploaded" marker, so the stale file stayed
 * until this device's history moved again. Unverifiable when the server gives no size: then the
 * answer stands. Returns the file's version on the server, when it says one.
 */
async function confirmHolds(
  target: DavTarget,
  final: string,
  size: number,
): Promise<string | undefined> {
  const answer = await request(final, {
    method: "PROPFIND",
    headers: { ...authHeader(target), Depth: "0", "Content-Type": "application/xml" },
    body: PROPFIND_BODY,
  });
  if (answer.status !== 207) throw refused("Upload", answer.status === 404 ? 404 : answer.status);
  const body = await answer.text();
  const listed = sizeOf(body);
  if (listed !== undefined && listed !== size) {
    throw new DavHttpError(`Upload: the server holds ${listed} bytes, ${size} were sent`, 409);
  }
  // The version the server gives it, in the same form a listing does: what a later listing is
  // compared with, to notice that the file was replaced behind this device's back.
  return parseListing(body)[0]?.etag;
}

/**
 * One file as the server holds it, by name: what a listing would say of it, or `null` when it is not
 * there. For a file the listing leaves out and this device already knows (a NAS, a WebDAV or an rclone
 * that serves an old directory for a while): the server answers for the file itself when it does not
 * for the folder. Throws on anything but 207 and 404, so a failing server is not read as "gone".
 */
export async function statRemote(target: DavTarget, name: string): Promise<RemoteFile | null> {
  const answer = await request(`${target.folderUrl}/${encodeURIComponent(name)}`, {
    method: "PROPFIND",
    headers: { ...authHeader(target), Depth: "0", "Content-Type": "application/xml" },
    body: PROPFIND_BODY,
  });
  if (answer.status === 404) return null;
  if (answer.status !== 207) throw refused("Stat", answer.status);
  const file = parseListing(await answer.text())[0];
  return file?.name === name ? file : null;
}

async function put(target: DavTarget, source: File, url: string): Promise<void> {
  const result = await source.upload(url, {
    httpMethod: "PUT",
    uploadType: UploadType.BINARY_CONTENT,
    headers: { ...authHeader(target), "Content-Type": "application/octet-stream" },
  });
  if (result.status < 200 || result.status >= 300) throw refused("Upload", result.status);
}
