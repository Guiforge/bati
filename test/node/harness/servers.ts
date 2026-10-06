/**
 * The WebDAV server the Node tests run against: `test/infra/faulty/faulty.py` behind a toxiproxy proxy, on the host's
 * loopback (the workflow `.github/workflows/node-stage.yml` starts both). What a test may do to it (empty it, list its
 * device files, tell it to misbehave, break the way to it), and nothing the app itself would not do: no `fetch` here,
 * `curl`.
 */
import { execFileSync } from "node:child_process";

export type ServerSpec = {
  name: string;
  /** What a device types as the WebDAV address (the `Bati/` folder goes under it). */
  url: string;
  /** The toxiproxy proxy in front of it, to break the way to it. */
  proxy: string;
};

export const USER = "bati";
export const PASSWORD = "bati-test-password";

const DAV_ROOT = (port: number) => `http://127.0.0.1:${port}`;

export const SERVERS: Record<string, ServerSpec> = {
  faulty: { name: "faulty", url: DAV_ROOT(28090), proxy: "FAULTY" },
};

const FAULTY_ADMIN = "http://127.0.0.1:28090/_admin";

/** What FAULTY can be told to do to a listing or a file (test/infra/faulty/faulty.py). */
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

function curl(args: string[], auth = true): string {
  const base = auth ? ["-s", "-k", "-u", `${USER}:${PASSWORD}`] : ["-s"];
  return execFileSync("curl", [...base, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Forgets the faults, the files and the log of the server, so a test starts from nothing. */
export function wipe(server: ServerSpec): void {
  curl(["-X", "POST", "-d", "{}", `${server.url.replace(/\/$/, "")}/_admin/reset`], false);
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
