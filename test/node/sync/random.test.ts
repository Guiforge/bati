/**
 * Random days of a hero with three devices on one server (the model-based half of stage 1): sessions are made,
 * devices sync, the way to the server breaks and comes back, a clock jumps. Whatever the order, once the way is
 * back and everyone has synced, every device holds every session ever made (I1, no deletion in this model),
 * the server holds at most one file per device and none of them is plain SQLite (I4, I8), and one gesture
 * (the sync sheet's visit, a few rounds) is enough to get there (I6).
 *
 *   SYNC_RUNS=40 SYNC_SEED=123 SYNC_SERVER=nextcloud  node node_modules/jest/bin/jest.js --config test/node/jest.config.js random
 *
 * The seed fast-check prints on a failure replays it. Short mode (the default, a few minutes): 4 days of 10 events.
 */

import fs from "node:fs";
import fc from "fast-check";

import { type Device, newDevice, reports } from "../harness/device";
import {
  deviceFiles,
  letListingCatchUp,
  net,
  PASSWORD,
  SERVERS,
  USER,
  wipe,
} from "../harness/servers";
import {
  at,
  clockOf,
  converge,
  HERO_PASSWORD,
  hoursLater,
  joinVault,
  plainDatabasesOutside,
  serverFilesAreSound,
  startVault,
  sync,
  useDeviceClocks,
} from "../harness/world";

beforeAll(() => useDeviceClocks());

const server = SERVERS[process.env.SYNC_SERVER ?? "apache"] as (typeof SERVERS)[string];
const runs = Number(process.env.SYNC_RUNS ?? 4);
const seed = process.env.SYNC_SEED ? Number(process.env.SYNC_SEED) : undefined;
/** A failing case, replayed alone: the `path` fast-check prints beside the seed. */
const replay = process.env.SYNC_PATH;
const length = Number(process.env.SYNC_EVENTS ?? 10);

type Event =
  | { kind: "add"; device: number; count: number }
  | { kind: "sync"; device: number }
  | { kind: "fault"; how: "cut" | "reset" | "cutAfterBody" }
  | { kind: "heal" }
  | { kind: "delete"; device: number; pick: number }
  | { kind: "lockedDelete"; device: number; deleter: number; pick: number }
  | { kind: "tz"; device: number; zone: number }
  | { kind: "rewrap"; device: number; what: "password" | "words" }
  | { kind: "newKey"; device: number }
  | { kind: "androidRestore"; device: number }
  | { kind: "clock"; device: number; hours: number };

/** Where a phone may be when its clock is read: both sides of the date line, a half hour zone, DST zones. */
const ZONES = [
  "UTC",
  "Pacific/Auckland",
  "America/Los_Angeles",
  "Asia/Kolkata",
  "Europe/Paris",
  "Pacific/Kiritimati",
];

const device = fc.nat(2);
const event: fc.Arbitrary<Event> = fc.oneof(
  {
    weight: 4,
    arbitrary: fc.record({
      kind: fc.constant("add" as const),
      device,
      count: fc.integer({ min: 1, max: 3 }),
    }),
  },
  { weight: 5, arbitrary: fc.record({ kind: fc.constant("sync" as const), device }) },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("fault" as const),
      how: fc.constantFrom("cut" as const, "reset" as const, "cutAfterBody" as const),
    }),
  },
  { weight: 2, arbitrary: fc.constant({ kind: "heal" as const }) },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("tz" as const),
      device,
      zone: fc.nat(ZONES.length - 1),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("rewrap" as const),
      device,
      what: fc.constantFrom("password" as const, "words" as const),
    }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("newKey" as const), device }) },
  // Android restores the database onto a new phone and not the keystore: encryption is wanted, no key is there.
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("androidRestore" as const), device }) },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("delete" as const),
      device,
      pick: fc.nat(1000),
    }),
  },
  // S13: a device whose campaign moved past a session, and another device deleting it: it stays on the first, the
  // second one's tombstone must not keep the first from sending, and the third never gets it back.
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("lockedDelete" as const),
      device,
      deleter: device,
      pick: fc.nat(1000),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("clock" as const),
      device,
      hours: fc.integer({ min: -30, max: 30 }),
    }),
  },
);

function applyFault(how: "cut" | "reset" | "cutAfterBody") {
  net.clear(server);
  if (how === "cut") net.cut(server);
  else if (how === "reset") net.reset(server);
  else net.cutAfter(server, "upstream", 20_000);
}

/** The hero deletes one session this device holds: it must disappear from every device (R29 to R33). */
async function deleteOne(d: Device, pick: number, made: Set<string>, gone: Set<string>) {
  const held = d.sessions();
  const uuid = held[pick % Math.max(held.length, 1)];
  if (uuid === undefined) return;
  const row = d.sqlite.prepare("SELECT id FROM completed_sessions WHERE uuid = ?").get(uuid) as {
    id: number;
  };
  const outcome = await at(d, () => d.app.completed.deleteSession(row.id));
  if (outcome === "deleted") {
    made.delete(uuid);
    gone.add(uuid);
  }
}

/** The holder's campaign moves past a session the deleter also has; the deleter then deletes it (S13). */
async function lockedDelete(
  holder: Device,
  deleter: Device,
  pick: number,
  locks: Map<string, Set<string>>,
  made: Set<string>,
  gone: Set<string>,
) {
  if (holder === deleter) return;
  const shared = holder.sessions().filter((s) => deleter.sessions().includes(s));
  const uuid = shared[pick % Math.max(shared.length, 1)];
  if (uuid === undefined || !holder.lockSession(uuid)) return;
  locks.set(holder.name, (locks.get(holder.name) ?? new Set()).add(uuid));
  await deleteOne(deleter, deleter.sessions().indexOf(uuid), made, gone);
}

/**
 * Android's restore onto a new phone: the database arrives, the keystore does not. The phone is a new install, says
 * encryption is wanted and holds no key. The invariant of the day: it stays that way (no vault of its own made, nothing
 * uploaded) until the hero unlocks it with what they already have.
 */
async function restoreOnNewPhone(devices: Device[], index: number, restored: Set<number>) {
  const old = devices[index] as Device;
  const file = old.copyOfDatabase();
  const fresh = await newDevice(old.name, file);
  fs.rmSync(file);
  old.close();
  devices[index] = fresh;
  restored.add(index);
  expect(await at(fresh, () => fresh.app.cipher.encryptionStatus())).toBe("locked");
}

/** The hero's way out, at the end: connect the server again (the account was in the keystore) and give the password. */
async function unlockRestored(devices: Device[], restored: Set<number>, secrets: string[]) {
  for (const index of restored) {
    const d = devices[index] as Device;
    // Before the hero does anything, the phone has neither a key nor an account and sends nothing.
    expect(await at(d, () => d.app.cipher.encryptionStatus())).toBe("locked");
    await at(d, () => d.app.deviceSync.connectWebDav(server.url, USER, PASSWORD));
    let outcome = "nothingToTry";
    for (const secret of secrets) {
      outcome = await at(d, () => d.app.unlock.unlockWith("server", secret));
      if (outcome === "unlocked") break;
    }
    expect(outcome).toBe("unlocked");
    expect(await at(d, () => d.app.cipher.encryptionStatus())).toBe("on");
  }
}

/** A phone's clock jumps, or the phone is somewhere else on the globe. */
function moveClock(d: Device, e: Extract<Event, { kind: "clock" | "tz" }>) {
  if (e.kind === "clock") hoursLater(d, e.hours);
  else clockOf(d).tz = ZONES[e.zone] ?? "UTC";
}

/** The two ways a hero changes the key of their backups: the same key under a new password or new words, or a new key. */
async function changeKey(
  d: Device,
  e: Extract<Event, { kind: "rewrap" | "newKey" }>,
  serial: number,
  secrets: string[],
  noKey: boolean,
) {
  // A phone with no key makes no key: a hero who wants a new one chooses it (not modelled), nothing else may.
  if (noKey) return;
  if (e.kind === "newKey") {
    // A new password is a new key: every other device asks for it once.
    const password = `new key password ${serial}`;
    secrets.push(password);
    await at(d, () => d.app.cipher.changePassword(password, "en"));
    return;
  }
  // "I don't remember" and "new words": the same key, so nobody is locked out and nothing is asked.
  // What the hero now holds is what they type when another device asks: the new password, or the new words.
  const secret = await at(d, async () => {
    if (e.what === "words") return d.app.cipher.rewrapWords("en");
    const password = `password ${serial} long enough`;
    await d.app.cipher.rewrapPassword(password);
    return password;
  });
  secrets.push(secret);
}

/** The hero deletes a session, plain or against a campaign lock. */
function remove(
  devices: Device[],
  e: Extract<Event, { kind: "delete" | "lockedDelete" }>,
  made: Set<string>,
  gone: Set<string>,
  locks: Map<string, Set<string>>,
) {
  const d = devices[e.device] as Device;
  if (e.kind === "delete") return deleteOne(d, e.pick, made, gone);
  return lockedDelete(d, devices[e.deleter] as Device, e.pick, locks, made, gone);
}

/** One event of the day; `made` collects every session the hero ever made. */
async function play(
  devices: Device[],
  e: Event,
  serial: number,
  made: Set<string>,
  secrets: string[],
  restored: Set<number>,
  gone: Set<string>,
  locks: Map<string, Set<string>>,
) {
  if (e.kind === "fault") return applyFault(e.how);
  if (e.kind === "heal") return net.clear(server);
  const d = devices[e.device] as Device;
  if (e.kind === "androidRestore") return restoreOnNewPhone(devices, e.device, restored);
  if (e.kind === "clock" || e.kind === "tz") return moveClock(d, e);
  if (e.kind === "rewrap" || e.kind === "newKey")
    return changeKey(d, e, serial, secrets, restored.has(e.device));
  if (e.kind === "delete" || e.kind === "lockedDelete")
    return remove(devices, e, made, gone, locks);
  if (e.kind === "sync") await sync(d, { rounds: 2 }).catch(() => undefined);
  else for (const id of d.addSessions(e.count, `${d.name.toLowerCase()}${serial}`)) made.add(id);
}

async function oneDay(events: Event[]) {
  net.clear(server);
  wipe(server);
  reports.length = 0;
  const devices: Device[] = [await newDevice("A"), await newDevice("B"), await newDevice("C")];
  const [a, b, c] = devices as [Device, Device, Device];
  const made = new Set<string>([...a.addSessions(2, "a"), ...b.addSessions(1, "b")]);
  // Every password a device moved to: the hero knows them, and types the right one when a device asks.
  const secrets = [HERO_PASSWORD];
  // The devices Android restored onto a new phone, and still locked.
  const restored = new Set<number>();
  // Sessions the hero deleted somewhere, and the campaign locks that keep one on the device that holds it (S13).
  const gone = new Set<string>();
  const locks = new Map<string, Set<string>>();
  try {
    await startVault(a, server);
    // Joined with the right password: a device that is not in the vault cannot be part of the day.
    expect(await joinVault(b, server, HERO_PASSWORD)).toBe(true);
    expect(await joinVault(c, server, HERO_PASSWORD)).toBe(true);
    for (const [serial, e] of events.entries())
      await play(devices, e, serial, made, secrets, restored, gone, locks);
    net.clear(server);
    // Minutes pass on a server that keeps an old listing: the app cannot ask it to refresh, and a file nobody has
    // ever listed has no name to look for. Once the listing has caught up, the devices must agree.
    letListingCatchUp(server);
    await unlockRestored(devices, restored, secrets);
    // One visit each, as many rounds as the sheet takes: the hero does nothing else.
    // A session kept by a lock stays on its device and nowhere else; everything else reaches every device.
    const keptHere = (d: Device) => [...(locks.get(d.name) ?? [])].filter((s) => gone.has(s));
    await converge(devices, [...made].sort(), 6, { secrets }, keptHere);
    // One file per install: a missing one is a device that never published, an extra one a second vault. A restored
    // phone is a new install, and the file of the one it replaced may still be there (a ghost, never deleted).
    expect(deviceFiles(server).length).toBeGreaterThanOrEqual(3);
    expect(deviceFiles(server).length).toBeLessThanOrEqual(3 + restored.size);
    expect(serverFilesAreSound(server)).toEqual([]);
    for (const d of devices) expect(plainDatabasesOutside(d)).toEqual([]);
    // A network failure is reported as one (sync.peer, sync.run are the app saying so); anything else is a bug.
    expect(reports.map((r) => r.context).filter((c) => !/^sync\.(peer|run)$/.test(c))).toEqual([]);
  } finally {
    net.clear(server);
    for (const d of devices) d.close();
  }
}

describe(`three devices on ${server.name}, random days`, () => {
  // One test holds every run (fast-check shrinks inside it), so its time is the runs': about two minutes each.
  test(
    "every device ends up with every session, and nothing else goes wrong",
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.array(event, { minLength: 3, maxLength: length }), oneDay),
        { numRuns: runs, seed, endOnFailure: true, ...(replay ? { path: replay } : {}) },
      );
    },
    Math.max(300_000, runs * 240_000),
  );
});
