/**
 * The bench's servers, as the Node harness reaches them (the same containers the emulators use, through the
 * same recording proxy, on the host's loopback). Their address, what a test may do to them (empty one, list
 * its device files, break the way to it), and nothing the app itself would not do: no `fetch` here, `curl`.
 */
import { execFileSync } from "node:child_process";

export type ServerSpec = {
  name: string;
  /** What a device types as the WebDAV address (the `Bati/` folder goes under it). */
  url: string;
  /** The recording proxy's route (docs/testing/release-check.md), to count what a device asked. */
  route: string;
  /** The toxiproxy proxy in front of it, to break the way to it. */
  proxy: string;
};

export const USER = "bati";
export const PASSWORD = "bati-test-password";

const DAV_ROOT = (port: number) => `http://127.0.0.1:${port}`;

export const SERVERS: Record<string, ServerSpec> = {
  rclone: { name: "rclone", url: DAV_ROOT(28081), route: "SRV-RCLONE", proxy: "SRV-RCLONE" },
  apache: { name: "apache", url: DAV_ROOT(28082), route: "SRV-APACHE", proxy: "SRV-APACHE" },
  sftpgo: { name: "sftpgo", url: DAV_ROOT(28083), route: "SRV-SFTPGO", proxy: "SRV-SFTPGO" },
  nextcloud: {
    name: "nextcloud",
    url: `${DAV_ROOT(28084)}/remote.php/dav/files/${USER}`,
    route: "SRV-NEXTCLOUD",
    proxy: "SRV-NEXTCLOUD",
  },
  "nextcloud-old": {
    name: "nextcloud-old",
    url: `${DAV_ROOT(28085)}/remote.php/dav/files/${USER}`,
    route: "SRV-NEXTCLOUD-OLD",
    proxy: "SRV-NEXTCLOUD-OLD",
  },
  faulty: { name: "faulty", url: DAV_ROOT(28090), route: "FAULTY", proxy: "FAULTY" },
  tls: { name: "tls", url: "https://127.0.0.1:28443", route: "SRV-TLS", proxy: "SRV-TLS" },
};

const FAULTY_ADMIN = "http://127.0.0.1:28090/_admin";

/** What FAULTY can be told to do to a listing or a file (test/infra/faulty/faulty.py); only that server has it. */
export const faulty = {
  /** Until `clear` unless `count` says how many times: a listing that hides a file, or answers empty. */
  fault(spec: Record<string, unknown>) {
    curl(["-X", "POST", "-d", JSON.stringify(spec), `${FAULTY_ADMIN}/fault`], false);
  },
  clear() {
    curl(["-X", "DELETE", `${FAULTY_ADMIN}/faults`], false);
  },
  /** Sets a file's modification time (epoch seconds): the server date that decides which vault is the newer. */
  mtime(name: string, epoch: number) {
    curl(["-X", "POST", "-d", JSON.stringify({ name, epoch }), `${FAULTY_ADMIN}/mtime`], false);
  },
  /** The device files FAULTY really holds, whatever its listing says. */
  files(): string[] {
    const held = JSON.parse(curl([`${FAULTY_ADMIN}/files`], false) || "{}") as Record<
      string,
      number
    >;
    return Object.keys(held)
      .map((name) => name.split("/").pop() ?? name)
      .filter((name) => /^bati-[0-9a-f-]{36}\.batb$/.test(name));
  },
};

const TOXIPROXY = "http://127.0.0.1:18474";
const TAP = "http://127.0.0.1:18091";

function curl(args: string[], auth = true): string {
  const base = auth ? ["-s", "-k", "-u", `${USER}:${PASSWORD}`] : ["-s"];
  return execFileSync("curl", [...base, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Removes the `Bati/` folder, so a test starts from a server with nothing on it. */
export function wipe(server: ServerSpec): void {
  // FAULTY forgets its faults, files and log in one call, and keeps no lock.
  if (server.name === "faulty") {
    curl(["-X", "POST", "-d", "{}", `${FAULTY_ADMIN}/reset`], false);
    return;
  }
  // Until it is empty: a server still finishing an upload a test cut (Nextcloud, rclone) puts the file
  // back after the first DELETE, or refuses it while it holds the lock.
  const started = Date.now();
  for (let attempt = 0; attempt < 120; attempt++) {
    curl(["-X", "DELETE", `${server.url}/Bati/`]);
    if (deviceFiles(server).length === 0) {
      if (attempt > 0) process.stderr.write(`wipe ${server.name}: ${Date.now() - started} ms\n`);
      return;
    }
    execFileSync("sleep", ["1"]);
  }
  throw new Error(`${server.name}: the folder would not empty`);
}

/** The device files in `Bati/`, by name. */
export function deviceFiles(server: ServerSpec): string[] {
  const listing = curl(["-X", "PROPFIND", "-H", "Depth: 1", `${server.url}/Bati/`]);
  // `<` closes the href: a name ending `.batb.upload` is a temporary copy, not a device's file.
  return [...new Set([...listing.matchAll(/bati-[0-9a-f-]{36}\.batb(?=<)/g)].map((m) => m[0]))];
}

/** One file, as the server holds it now. */
export function read(server: ServerSpec, name: string): Buffer {
  return Buffer.from(
    execFileSync("curl", ["-s", "-k", "-u", `${USER}:${PASSWORD}`, `${server.url}/Bati/${name}`], {
      maxBuffer: 256 * 1024 * 1024,
    }),
  );
}

/** Writes one file straight on the server, as a stranger with write access would. */
export function put(server: ServerSpec, name: string, data: Buffer): void {
  execFileSync(
    "curl",
    [
      "-s",
      "-k",
      "-u",
      `${USER}:${PASSWORD}`,
      "-X",
      "PUT",
      "--data-binary",
      "@-",
      `${server.url}/Bati/${name}`,
    ],
    {
      input: data,
      maxBuffer: 256 * 1024 * 1024,
    },
  );
}

/** Deletes one file straight on the server (only a test does: a device never deletes another's file). */
export function remove(server: ServerSpec, name: string): void {
  curl(["-X", "DELETE", `${server.url}/Bati/${name}`]);
}

/**
 * Time passing for a server whose listing is cached in memory: rclone serve (and the Caddy HTTPS server in front of
 * it) keeps an old directory for about five minutes after an upload was cut mid-body. A restart empties that cache
 * at once, which a test cannot wait five minutes for. A no-op on every other server.
 */
export function letListingCatchUp(server: ServerSpec): void {
  if (!["rclone", "tls"].includes(server.name)) return;
  execFileSync("podman", ["restart", "--time", "1", "batibench_rclone_1"], { stdio: "pipe" });
  for (let i = 0; i < 30; i++) {
    try {
      if (
        curl([
          "-o",
          "/dev/null",
          "-w",
          "%{http_code}",
          "-X",
          "PROPFIND",
          "-H",
          "Depth: 0",
          `${server.url}/`,
        ]) === "207"
      )
        return;
    } catch {
      // not up yet
    }
    execFileSync("sleep", ["1"]);
  }
}

// --- breaking the way to a server (toxiproxy) -----------------------------------------------------------
const proxyApi = (server: ServerSpec, path: string, method: string, body?: object) =>
  curl(
    [
      "-X",
      method,
      "-H",
      "Content-Type: application/json",
      ...(body ? ["-d", JSON.stringify(body)] : []),
      `${TOXIPROXY}/proxies/${server.proxy}${path}`,
    ],
    false,
  );

export const net = {
  clear(server: ServerSpec) {
    proxyApi(server, "", "POST", { enabled: true });
    const toxics = JSON.parse(proxyApi(server, "/toxics", "GET") || "[]") as { name: string }[];
    for (const toxic of toxics) proxyApi(server, `/toxics/${toxic.name}`, "DELETE");
  },
  cut(server: ServerSpec) {
    proxyApi(server, "", "POST", { enabled: false });
  },
  toxic(server: ServerSpec, type: string, stream: "upstream" | "downstream", attributes: object) {
    proxyApi(server, "/toxics", "POST", {
      type,
      stream,
      toxicity: 1,
      name: `${type}-${stream}`,
      attributes,
    });
  },
  /** The connection closes once this many bytes crossed in that direction: a cut mid-body. */
  cutAfter(server: ServerSpec, stream: "upstream" | "downstream", bytes: number) {
    this.toxic(server, "limit_data", stream, { bytes });
  },
  reset(server: ServerSpec) {
    this.toxic(server, "reset_peer", "downstream", { timeout: 0 });
  },
  /** Nothing ever answers. */
  blackhole(server: ServerSpec) {
    this.toxic(server, "timeout", "downstream", { timeout: 0 });
    this.toxic(server, "timeout", "upstream", { timeout: 0 });
  },
  latency(server: ServerSpec, ms: number) {
    this.toxic(server, "latency", "downstream", { latency: ms });
  },
  slow(server: ServerSpec, kbPerSecond: number) {
    this.toxic(server, "bandwidth", "downstream", { rate: kbPerSecond });
    this.toxic(server, "bandwidth", "upstream", { rate: kbPerSecond });
  },
};

// --- what the devices asked of a server (the recording proxy) -----------------------------------------------
export type Asked = { n: number; method: string; path: string; status: number };

export const tap = {
  /** A mark to read from: what was asked after it. */
  mark(server: ServerSpec): number {
    const rows = JSON.parse(curl([`${TAP}/log?route=${server.route}`], false) || "[]") as Asked[];
    return rows.at(-1)?.n ?? 0;
  },
  since(server: ServerSpec, mark: number): Asked[] {
    return JSON.parse(
      curl([`${TAP}/log?route=${server.route}&since=${mark}`], false) || "[]",
    ) as Asked[];
  },
};
