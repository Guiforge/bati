/**
 * What a hero does with their devices, as functions, and what must be true afterwards, as checks.
 *
 * Every device action goes through `at(device, fn)`: the device's own clock and time zone are in force while
 * its code runs, so two devices disagree about the time the way two phones do. A test moves a device's clock
 * with `device.clock`. Only `Date` is faked (the real timers and the real network keep running).
 */
import fs from "node:fs";
import path from "node:path";

import type { Device } from "./device";
import { deviceFiles, PASSWORD, read, type ServerSpec, USER } from "./servers";

export const HERO_PASSWORD = "correct horse battery staple";

/** The clock and the zone of each device, kept by name. */
export const clocks = new Map<string, { now: number; tz: string }>();

export function useDeviceClocks(): void {
  jest.useFakeTimers({
    doNotFake: [
      "hrtime",
      "nextTick",
      "performance",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
    ],
    now: Date.now(),
  });
}

export function clockOf(device: Device) {
  let clock = clocks.get(device.name);
  if (!clock) {
    clock = { now: Date.now(), tz: process.env.TZ ?? "UTC" };
    clocks.set(device.name, clock);
  }
  return clock;
}

/** Runs `fn` as that device: its clock, its zone. */
export async function at<T>(device: Device, fn: () => Promise<T> | T): Promise<T> {
  const clock = clockOf(device);
  const before = process.env.TZ;
  jest.setSystemTime(clock.now);
  process.env.TZ = clock.tz;
  try {
    return await fn();
  } finally {
    process.env.TZ = before;
  }
}

export const hoursLater = (device: Device, hours: number) => {
  clockOf(device).now += hours * 3_600_000;
};

// --- the hero's gestures ------------------------------------------------------------------------------------
export function connect(device: Device, server: ServerSpec) {
  return at(device, () => device.app.deviceSync.connectWebDav(server.url, USER, PASSWORD));
}

/** A first device: turn the password on, connect, send. */
export async function startVault(
  device: Device,
  server: ServerSpec,
  password = HERO_PASSWORD,
): Promise<string> {
  const words = await at(device, () => device.app.cipher.enableEncryption(password, "en"));
  await connect(device, server);
  await at(device, () => device.app.deviceSync.syncNow({ snapshotFirst: true }));
  return words;
}

/** Another device: connect, be asked for the password, give it. */
export async function joinVault(
  device: Device,
  server: ServerSpec,
  secret: string,
): Promise<boolean> {
  await connect(device, server);
  const state = await at(device, () => device.app.deviceSync.serverState());
  if (state.kind !== "needsSecret")
    throw new Error(`expected to be asked for a password, got ${JSON.stringify(state)}`);
  return at(device, () => device.app.deviceSync.joinPeer(state.peer, secret));
}

export type Round = { states: Record<string, string>; merged: string[]; uploaded: boolean };

/**
 * One visit to the sync sheet: sync, answer what the app asks the way a hero who wants everything together
 * does (take what is ahead, merge what diverged), sync again until nothing new. Returns each round.
 */
type SyncOptions = { rounds?: number; merge?: boolean; secrets?: string[] };

/** What a hero does about one peer the app asks about: take or merge what is news, give a password for a locked one. */
async function answer(
  device: Device,
  peer: { name: string; state: string },
  options: SyncOptions,
): Promise<"merged" | "joined" | false> {
  const news = peer.state === "ahead" || peer.state === "diverged";
  if (news && options.merge !== false) {
    const outcome = await at(device, () =>
      device.app.deviceSync.mergeWithPeer({ name: peer.name }),
    );
    return outcome.result === "merged" ? "merged" : false;
  }
  if (peer.state === "locked") {
    for (const secret of options.secrets ?? []) {
      // The app syncs again after a join, from a fresh listing: nothing else is answered from this one.
      if (await at(device, () => device.app.deviceSync.joinPeer(peer.name, secret)))
        return "joined";
    }
  }
  return false;
}

export async function sync(device: Device, options: SyncOptions = {}): Promise<Round[]> {
  const rounds: Round[] = [];
  for (let n = 0; n < (options.rounds ?? 5); n++) {
    const result = await at(device, () =>
      device.app.deviceSync.syncNow({ snapshotFirst: n === 0 }),
    );
    const merged: string[] = [];
    for (const peer of result.peers) {
      const outcome = await answer(device, peer, options);
      if (outcome === "merged") merged.push(peer.name);
      // The app reloads after a merge and syncs again after a join: the next device is answered at the next sync.
      if (outcome) break;
    }
    rounds.push({
      states: Object.fromEntries(result.peers.map((p) => [p.name, p.state])),
      merged,
      uploaded: result.uploaded,
    });
    const waiting = result.peers.some((p) => p.state === "locked");
    if (merged.length === 0 && !waiting && n > 0) break;
  }
  return rounds;
}

/** Everyone syncs in turn until every device holds exactly `expected`; throws with each device's difference. */
export async function converge(
  devices: Device[],
  expected: string[],
  limit = 8,
  options: SyncOptions = {},
  /** Sessions a device keeps although they were deleted elsewhere (their campaign moved on). */
  kept: (device: Device) => string[] = () => [],
): Promise<number> {
  const wanted = (d: Device) => [...expected, ...kept(d)].sort();
  for (let round = 1; round <= limit; round++) {
    for (const device of devices) await sync(device, options);
    if (devices.every((d) => JSON.stringify(d.sessions()) === JSON.stringify(wanted(d))))
      return round;
  }
  const facts = devices.map((d) => ({
    device: d.name,
    missing: wanted(d).filter((s) => !d.sessions().includes(s)),
    extra: d.sessions().filter((s) => !wanted(d).includes(s)),
  }));
  throw new Error(`the devices never agreed after ${limit} rounds: ${JSON.stringify(facts)}`);
}

// --- what must be true (the invariants of docs/testing/data-rules.md, as checks) -----------------------------
/** The half about files: nothing readable in the clear lies in a device's folders but its live database. */
export function plainDatabasesOutside(device: Device): string[] {
  const live = `bati.v`;
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        !entry.name.startsWith(live) &&
        fs.readFileSync(full).subarray(0, 15).toString("latin1") === "SQLite format 3"
      )
        found.push(full);
    }
  };
  walk(device.dir);
  return found;
}

/** Every device file on the server is a whole BATB (right magic, readable header), none is plain SQLite. */
export function serverFilesAreSound(server: ServerSpec): { name: string; problem: string }[] {
  const bad: { name: string; problem: string }[] = [];
  for (const name of deviceFiles(server)) {
    const data = read(server, name);
    if (data.subarray(0, 15).toString("latin1") === "SQLite format 3")
      bad.push({ name, problem: "plain SQLite on the server" });
    else if (data.subarray(0, 4).toString("latin1") !== "BATB")
      bad.push({ name, problem: `not a BATB (${data.length} bytes)` });
  }
  return bad;
}
