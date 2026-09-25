import * as SecureStore from "expo-secure-store";

import { deletePreference, getPreference, setPreference } from "@/db/preferences";
import { batiCrypto } from "@/modules/bati-crypto";

/**
 * Encrypted backups: the file format and the keys that open it.
 *
 * **The model is Aegis's vault and Signal's recovery key.** One random master key encrypts every
 * snapshot. The hero never sees it; what they hold are two ways to unwrap it, stored in every
 * file's header as *slots*: a password they choose, stretched by PBKDF2, and a 64-character
 * recovery key drawn by the app and shown once. Changing the password re-wraps the master key and
 * touches no data. Losing both loses the data, and the setup screen says so in as many words.
 *
 * **The keys live on the device, in SecureStore, never in the database.** That is what keeps this
 * coherent with restore: swapping the database for a backup can never change the key, or leave a
 * slot pointing at a key this phone does not hold. It is also what Android's own backup cannot
 * carry (plugins/withAndroidBackupRules.js leaves it out; a Keystore-wrapped value would not
 * decrypt on another phone anyway). A new phone joins by opening an encrypted file with the
 * password, and only when the caller asks it to (`OpenOutcome.join`): adopting someone's key is
 * what makes every later backup open with *their* secret, so it is never silent.
 *
 * **The wish lives in the database.** `backupEncryption` says the hero asked for encryption, and
 * it does travel: a database restored by Android onto a new phone, where the key did not follow,
 * reads as `locked`, and nothing is written in plaintext until the password is given again. That
 * gap is the one where backups used to go back to plaintext without a word.
 *
 * **The fingerprint guards a view, not a key.** On this phone the master key is already in
 * SecureStore, so backups never prompt. On a new phone a fingerprint does not follow, so it cannot
 * be what opens anything. What it *can* do is let the hero look at their recovery key again
 * later, which is the one thing they will want and could otherwise never get back.
 *
 * Header, all integers big-endian, authenticated as the file's AAD:
 *
 *     "BATB" | version u8 | slot count u8 | slot × n | check (nonce 12 ‖ tag 16)
 *     slot:  kind u8 | iterations u32 | salt 16 | wrapped master key (nonce 12 ‖ key 32 ‖ tag 16)
 *
 * `check` is the master key sealing nothing, over everything before it: it tells in one cheap
 * call whether a key this phone holds opens a file, without decrypting megabytes to find out.
 */

const MAGIC = "BATB";
const VERSION = 1;
const SLOT_BYTES = 1 + 4 + 16 + 60;
const CHECK_BYTES = 28;
/** OWASP's floor for PBKDF2-HMAC-SHA256 (2023 and still in 2026). Written into each slot. */
export const PASSWORD_ITERATIONS = 600_000;

/**
 * What a header may ask for. A file is untrusted input: a slot demanding 2^31 iterations would
 * hold an import for hours the moment the hero typed their password.
 */
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 10_000_000;

/** Larger than any real hero by two orders of magnitude; the decryptor holds the file in memory. */
export const MAX_SEALED_BYTES = 256 * 1024 * 1024;

const SLOT_PASSWORD = 1;
const SLOT_RECOVERY = 2;

/** SecureStore keys. Device-local by construction; see the header comment. */
const STORE_KEY = "bati.backup.key";
const STORE_HEADER = "bati.backup.header";
const STORE_KEYRING = "bati.backup.keyring";
const STORE_RECOVERY = "bati.backup.recovery";

/** Database preference: the hero asked for encryption. See the header comment. */
const WANTED_PREFERENCE = "backupEncryption";

type Slot = { kind: number; iterations: number; salt: Uint8Array; wrapped: Uint8Array };
type Header = { slots: Slot[]; bytes: Uint8Array };

// --- bytes -------------------------------------------------------------------------------------

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const utf8 = (value: string) => new TextEncoder().encode(value);

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value);
  return out;
}

// --- header ------------------------------------------------------------------------------------

function slotBytes(slot: Slot): Uint8Array {
  return concat(Uint8Array.of(slot.kind), u32(slot.iterations), slot.salt, slot.wrapped);
}

/** The header without its check: what the check, and each file, authenticate. */
function headerBody(slots: Slot[]): Uint8Array {
  return concat(utf8(MAGIC), Uint8Array.of(VERSION, slots.length), ...slots.map(slotBytes));
}

async function buildHeader(key: string, slots: Slot[]): Promise<Uint8Array> {
  const body = headerBody(slots);
  const check = fromB64(await batiCrypto().seal(key, "", toB64(body)));
  return concat(body, check);
}

/** `null` for anything that is not a version-1 Bati header, including a plain SQLite file. */
function parseHeader(bytes: Uint8Array): Header | null {
  if (bytes.length < 6 || String.fromCharCode(...bytes.subarray(0, 4)) !== MAGIC) return null;
  if (bytes[4] !== VERSION) return null;
  const count = bytes[5] ?? 0;
  const length = 6 + count * SLOT_BYTES + CHECK_BYTES;
  if (bytes.length < length) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset);
  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const at = 6 + i * SLOT_BYTES;
    const slot = {
      kind: bytes[at] ?? 0,
      iterations: view.getUint32(at + 1),
      salt: bytes.slice(at + 5, at + 21),
      wrapped: bytes.slice(at + 21, at + SLOT_BYTES),
    };
    if (!slotIsSane(slot)) return null;
    slots.push(slot);
  }
  return { slots, bytes: bytes.slice(0, length) };
}

/** A slot this version wrote, within the bounds it would write. Anything else is not our file. */
function slotIsSane(slot: Slot): boolean {
  if (slot.kind === SLOT_RECOVERY) return slot.iterations === 0;
  return (
    slot.kind === SLOT_PASSWORD &&
    slot.iterations >= MIN_ITERATIONS &&
    slot.iterations <= MAX_ITERATIONS
  );
}

/** Whether `key` is the master key behind `header`. Never throws: a wrong key is an answer. */
function keyOpens(key: string, header: Header): Promise<boolean> {
  const body = header.bytes.subarray(0, header.bytes.length - CHECK_BYTES);
  const check = header.bytes.subarray(header.bytes.length - CHECK_BYTES);
  return batiCrypto()
    .open(key, toB64(check), toB64(body))
    .then(
      () => true,
      () => false,
    );
}

// --- slots -------------------------------------------------------------------------------------

/**
 * The key that wraps the master key in a slot. A password is stretched; a recovery key is 32
 * random bytes already, and stretching those would cost the hero a second for no security.
 */
function wrappingKey(
  secret: string,
  kind: number,
  iterations: number,
  salt: Uint8Array,
): Promise<string | null> {
  if (kind === SLOT_RECOVERY) {
    const hex = normaliseRecoveryKey(secret);
    if (hex === null) return Promise.resolve(null);
    const bytes = Uint8Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
    return Promise.resolve(toB64(bytes));
  }
  return batiCrypto().pbkdf2(passwordBytes(secret), toB64(salt), iterations);
}

/**
 * The password as bytes: UTF-8 of its NFC form. Stretched as bytes, not as a Java `char[]`,
 * because how a platform turns chars into bytes is its own business, and "é" typed as one code
 * point on the phone and as two on the tablet must still be the same password.
 */
function passwordBytes(password: string): string {
  return toB64(utf8(password.normalize("NFC")));
}

async function makeSlot(key: string, secret: string, kind: number): Promise<Slot> {
  const salt = fromB64(await batiCrypto().randomBytes(16));
  const iterations = kind === SLOT_PASSWORD ? PASSWORD_ITERATIONS : 0;
  const wrapper = await wrappingKey(secret, kind, iterations, salt);
  if (wrapper === null) throw new Error("Recovery key is malformed");
  const wrapped = fromB64(await batiCrypto().seal(wrapper, key, toB64(Uint8Array.of(kind))));
  return { kind, iterations, salt, wrapped };
}

/**
 * The master key, if `secret` opens any slot. A secret that looks like a recovery key is tried
 * on recovery slots first — that is 32 bytes of AES, where a password slot costs 600,000 hashes.
 */
async function unwrap(header: Header, secret: string): Promise<string | null> {
  const order =
    normaliseRecoveryKey(secret) === null ? [SLOT_PASSWORD] : [SLOT_RECOVERY, SLOT_PASSWORD];
  for (const kind of order) {
    for (const slot of header.slots.filter((s) => s.kind === kind)) {
      const wrapper = await wrappingKey(secret, slot.kind, slot.iterations, slot.salt);
      if (wrapper === null) continue;
      const key = await batiCrypto()
        .open(wrapper, toB64(slot.wrapped), toB64(Uint8Array.of(slot.kind)))
        .catch(() => null);
      if (key !== null && (await keyOpens(key, header))) return key;
    }
  }
  return null;
}

// --- recovery key ------------------------------------------------------------------------------

/** 64 hex digits in sixteen groups of four: long, but every character is unambiguous to type. */
export function formatRecoveryKey(hex: string): string {
  return (hex.match(/.{4}/g) ?? []).join(" ");
}

/** The 64 hex digits inside whatever was typed or pasted, or `null` if it is not one. */
export function normaliseRecoveryKey(input: string): string | null {
  const hex = input.toLowerCase().replace(/[\s-]/g, "");
  return /^[0-9a-f]{64}$/.test(hex) ? hex : null;
}

// --- device state ------------------------------------------------------------------------------

async function storedHeader(): Promise<Header | null> {
  const value = await SecureStore.getItemAsync(STORE_HEADER);
  return value === null ? null : parseHeader(fromB64(value));
}

async function keyring(): Promise<string[]> {
  const value = await SecureStore.getItemAsync(STORE_KEYRING);
  return value === null ? [] : (JSON.parse(value) as string[]);
}

/**
 * - `on`: this phone holds the key, backups are sealed.
 * - `locked`: the hero asked for encryption, but this phone has no key (a database restored by
 *   Android onto a new phone, a Keystore wiped). Backups are *not* written until it is unlocked.
 * - `off`: never asked for, or turned off.
 */
export type EncryptionStatus = "off" | "on" | "locked";

async function ownKey(): Promise<{ header: Header; key: string } | null> {
  const [header, key] = await Promise.all([storedHeader(), SecureStore.getItemAsync(STORE_KEY)]);
  return header !== null && key !== null ? { header, key } : null;
}

export async function encryptionStatus(): Promise<EncryptionStatus> {
  if ((await ownKey()) !== null) return "on";
  return (await getPreference(WANTED_PREFERENCE)) === "on" ? "locked" : "off";
}

function randomRecoveryHex(): Promise<string> {
  return batiCrypto()
    .randomBytes(32)
    .then((b64) => Array.from(fromB64(b64), (b) => b.toString(16).padStart(2, "0")).join(""));
}

/**
 * A fresh master key under `password` and a fresh recovery key, made this phone's. The key it
 * replaces, if any, goes to the keyring: files it sealed must keep opening here.
 */
async function newVault(password: string): Promise<string> {
  const key = await batiCrypto().randomBytes(32);
  const recovery = await randomRecoveryHex();
  const slots = [
    await makeSlot(key, password, SLOT_PASSWORD),
    await makeSlot(key, recovery, SLOT_RECOVERY),
  ];
  const header = await buildHeader(key, slots);

  const previous = await ownKey();
  if (previous !== null) await rememberInKeyring(previous.key);
  // Key before header: `ownKey` needs both, so a crash between the two leaves the old state.
  await SecureStore.setItemAsync(STORE_KEY, key);
  await SecureStore.setItemAsync(STORE_HEADER, toB64(header));
  await setPreference(WANTED_PREFERENCE, "on");
  await rememberRecoveryKey(recovery);
  return formatRecoveryKey(recovery);
}

/**
 * Turns encryption on with a fresh master key and returns the recovery key, formatted, for the
 * one screen that will ever show it, unless the device can guard it with a fingerprint, in
 * which case `readRecoveryKey` can show it again.
 */
export function enableEncryption(password: string): Promise<string> {
  return newVault(password);
}

/**
 * A new password is a new key, not a re-wrapped one: re-wrapping would leave every future file
 * open to whoever learned the old password and kept one old file. The old key stays in the
 * keyring so this phone still opens what it sealed before; other devices ask for the new password
 * once. Returns the new recovery key, which replaces the old one for everything written from now.
 */
export function changePassword(password: string): Promise<string> {
  return newVault(password);
}

/** Future backups are plain again. Files already encrypted stay encrypted, and openable elsewhere. */
export async function disableEncryption(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_HEADER);
  await SecureStore.deleteItemAsync(STORE_KEY);
  await SecureStore.deleteItemAsync(STORE_RECOVERY);
  await SecureStore.deleteItemAsync(STORE_KEYRING);
  await deletePreference(WANTED_PREFERENCE);
}

async function rememberInKeyring(key: string): Promise<void> {
  const known = await keyring();
  if (!known.includes(key)) {
    await SecureStore.setItemAsync(STORE_KEYRING, JSON.stringify([...known, key]));
  }
}

/**
 * Stored behind the fingerprint when the phone has one enrolled, so it can be shown again; not
 * stored at all otherwise, because an unguarded copy next to the key it recovers is no copy.
 * A new fingerprint invalidates it (Android's rule, not ours), which costs a view, never a key.
 */
async function rememberRecoveryKey(recovery: string): Promise<void> {
  if (!SecureStore.canUseBiometricAuthentication()) return;
  await SecureStore.setItemAsync(STORE_RECOVERY, recovery, { requireAuthentication: true }).catch(
    // The key was shown and the hero was asked to write it down; a phone that refuses to guard
    // it only loses the "show it again" convenience.
    () => SecureStore.deleteItemAsync(STORE_RECOVERY),
  );
}

/** The recovery key, after a fingerprint, or `null` when this phone never kept it. */
export async function readRecoveryKey(): Promise<string | null> {
  const hex = await SecureStore.getItemAsync(STORE_RECOVERY, { requireAuthentication: true });
  return hex === null ? null : formatRecoveryKey(hex);
}

export function canShowRecoveryKeyAgain(): boolean {
  return SecureStore.canUseBiometricAuthentication();
}

// --- files -------------------------------------------------------------------------------------

/** Enough bytes for any header this version can write: sixteen slots is far more than two. */
const MAX_HEADER = 6 + 16 * SLOT_BYTES + CHECK_BYTES;

async function readHeader(path: string): Promise<Header | null> {
  return parseHeader(fromB64(await batiCrypto().readPrefix(path, MAX_HEADER)));
}

export async function isEncryptedBackup(path: string): Promise<boolean> {
  return (await readHeader(path)) !== null;
}

/** Encrypts a plaintext snapshot at `plainPath` into `outPath` with this device's key. */
export async function sealBackup(plainPath: string, outPath: string): Promise<void> {
  const own = await ownKey();
  if (own === null) throw new Error("Encryption is off");
  await batiCrypto().sealFile(own.key, plainPath, outPath, toB64(own.header.bytes));
}

export type OpenResult = "opened" | "needsSecret" | "wrongSecret" | "notEncrypted";

/**
 * What opening a file did. `join` is only there when the file opened with a secret, under a key
 * this phone did not hold: calling it makes that key this phone's (`asPrimary`, what a device
 * joining another does, and what an import may offer), or only remembers it for reading.
 */
export type OpenOutcome = {
  result: OpenResult;
  join?: (options: { asPrimary: boolean }) => Promise<void>;
};

/**
 * Decrypts `path` into `outPath`. Tries every key this phone already holds first, so a file it
 * wrote itself, or one from a device it has joined, never asks for anything. With a `secret`,
 * tries the file's own slots. Rejects on a body that does not authenticate.
 */
export async function openBackup(
  path: string,
  outPath: string,
  secret?: string,
): Promise<OpenOutcome> {
  const header = await readHeader(path);
  if (header === null) return { result: "notEncrypted" };

  const own = await SecureStore.getItemAsync(STORE_KEY);
  for (const key of [...(own === null ? [] : [own]), ...(await keyring())]) {
    if (await keyOpens(key, header)) {
      await batiCrypto().openFile(key, path, outPath, header.bytes.length);
      return { result: "opened" };
    }
  }

  if (secret === undefined) return { result: "needsSecret" };
  const key = await unwrap(header, secret);
  if (key === null) return { result: "wrongSecret" };

  await batiCrypto().openFile(key, path, outPath, header.bytes.length);
  return { result: "opened", join: (options) => joinKey(key, header, options) };
}

/**
 * Makes a key unlocked from another device's file this phone's. As primary, its header becomes
 * ours, so what this phone writes opens with the same password everywhere, which is what makes
 * phone and tablet one hero rather than two vaults; the key it replaces goes to the keyring. Not
 * as primary, it is only remembered, so that device's files open here without asking again.
 */
async function joinKey(
  key: string,
  header: Header,
  { asPrimary }: { asPrimary: boolean },
): Promise<void> {
  if (!asPrimary) {
    await rememberInKeyring(key);
    return;
  }
  const previous = await ownKey();
  if (previous !== null && previous.key !== key) await rememberInKeyring(previous.key);
  await SecureStore.setItemAsync(STORE_KEY, key);
  await SecureStore.setItemAsync(STORE_HEADER, toB64(header.bytes));
  await setPreference(WANTED_PREFERENCE, "on");
  // The recovery key is the other device's; this phone never saw it, so it cannot show it again.
  await SecureStore.deleteItemAsync(STORE_RECOVERY);
}
