import * as SecureStore from "expo-secure-store";

import { batiCrypto } from "@/modules/bati-crypto";
import { reportError } from "@/src/reportError";

/**
 * This install's name, and the counter that will sit beside it in every sealed file.
 *
 * SecureStore, not the database: a restore or Android's own backup copies the database to a second
 * phone, and two devices under one name would take turns overwriting each other's history. One
 * item holds both values because they are born together and die together; SecureStore is outside
 * Android's backup, so a restored phone gets neither.
 *
 * `bati.sync.install` is the item the previous build wrote. Its id is adopted, not regenerated,
 * and the old item is left where it is: a device that renamed itself on update would leave its old
 * file on the server as a ghost, and a rollback to the previous build must still find its name.
 */
const STORE_IDENTITY = "bati.sync.identity";
const STORE_LEGACY_INSTALL = "bati.sync.install";

type Identity = { installId: string; counter: number };

let loading: Promise<Identity> | null = null;

async function randomId(): Promise<string> {
  const hex = Array.from(atob(await batiCrypto().randomBytes(16)), (c) =>
    c.charCodeAt(0).toString(16).padStart(2, "0"),
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

async function load(): Promise<Identity> {
  const stored = await SecureStore.getItemAsync(STORE_IDENTITY);
  // Parsed outside any catch that would replace it: an item that exists and cannot be read is a
  // keystore problem to surface, and a fresh id here would orphan this device's file for good.
  if (stored !== null) return JSON.parse(stored) as Identity;

  const identity: Identity = {
    installId: (await SecureStore.getItemAsync(STORE_LEGACY_INSTALL)) ?? (await randomId()),
    counter: 0,
  };
  await SecureStore.setItemAsync(STORE_IDENTITY, JSON.stringify(identity));
  return identity;
}

/** What a device's file is called in the sync folder, and the only shape that counts as one. */
export const fileFor = (id: string) => `bati-${id}.batb`;
export const PEER_FILE = /^bati-[0-9a-f-]{36}\.batb$/;

/** The name of this install in the sync folder. Throws: sync cannot run without one. */
export async function installId(): Promise<string> {
  if (!loading) {
    const attempt = load();
    // A failure is not remembered: the keystore can come back, and a rejected promise cached for
    // the life of the process would keep the widget and the app failing on a fine device.
    attempt.catch(() => {
      if (loading === attempt) loading = null;
    });
    loading = attempt;
  }
  return (await loading).installId;
}

/**
 * The first eight hex digits, for a file name that tells two devices apart in one folder. `null`
 * when the keystore is down, never a throw: `backupBeforeMigrations` forgets the folder on one, so
 * a keystore that fails at launch must cost a backup its device tag and never the feature.
 */
export async function shortInstallId(): Promise<string | null> {
  try {
    return (await installId()).replaceAll("-", "").slice(0, 8);
  } catch (error) {
    reportError("backup.installId", error);
    return null;
  }
}

/** Reservations one after another: two sealings at launch must not read the same counter. */
let reserving: Promise<unknown> = Promise.resolve();

/**
 * The next counter for a sealed file, saved before the file is written. A crash after this spends
 * a number and never reuses one, and two callers at once get two numbers. The counter is what lets
 * a device refuse a file older than the last it saw from a peer (replay), so a reused number
 * would be a hole and a skipped one costs nothing.
 *
 * A decimal string, because the file stores an unsigned 64-bit and JS is exact only to 2^53; past
 * that it refuses, which at one sealing a second is nine million years.
 */
export function reserveCounter(): Promise<string> {
  const run = reserving.then(async () => {
    // The id first, through its memo: on a fresh install a counter that loaded on its own would
    // create a second random id beside the one `installId()` is creating.
    await installId();
    // Read fresh each time, not from the memoised identity: that one is only for the id.
    const identity = await load();
    const next = identity.counter + 1;
    if (next > Number.MAX_SAFE_INTEGER) throw new Error("The sealing counter is exhausted");
    await SecureStore.setItemAsync(STORE_IDENTITY, JSON.stringify({ ...identity, counter: next }));
    return String(next);
  });
  reserving = run.catch(() => undefined);
  return run;
}
