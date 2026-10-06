import * as SecureStore from "expo-secure-store";
import { deletePreference, getPreference, setPreference } from "@/db/preferences";
import { batiCrypto, type HeaderInfo, type SlotInfo } from "@/modules/bati-crypto";
import {
  entropyToWords,
  RECOVERY_BYTES,
  type WordLanguage,
  wordCandidates,
} from "@/src/backupWords";
import { installId, reserveCounter } from "@/src/installId";
import { isLowMemory } from "@/src/lowMemory";

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
 * Header, all integers big-endian, authenticated as part of every segment's AAD:
 *
 *     "BATB" | version u8 | slot count u8 | slot × n | check (nonce 12 ‖ tag 16)
 *     slot:  kind u8 | iterations u32 | salt 16 | wrapped master key (nonce 12 ‖ key 32 ‖ tag 16)
 *
 * Body, written by BatiCryptoModule.kt: segments of at most 1 MiB of plaintext, each
 * `nonce 12 ‖ ciphertext ‖ tag 16` under the AAD `header ‖ index u32 ‖ last u8`. Version 1 was one
 * GCM over the whole file, which Android buffers whole: a 128 MB database failed to seal on a
 * 192 MB heap. It never left the branch that introduced it, so nothing reads it.
 *
 * `check` is the master key sealing nothing, over everything before it: it tells in one cheap
 * call whether a key this phone holds opens a file, without decrypting megabytes to find out.
 *
 * **Format 3** (Argon2id, a key per file, twelve words, a header read only in Kotlin) is described
 * in BatiCryptoV3.kt and docs/architecture/backup-and-sync.md. Every new vault is format 3. A vault
 * made by an older build keeps working as format 2 (it still seals and opens exactly as it did)
 * until the hero chooses to update it, which is a new key and a new password: keeping the old
 * password would leave every old file with a slot that opens under it, and so no gain.
 *
 * Rules this file keeps, each one a way a hero could lose their backups: a vault never goes back to
 * an older format (a v2 file opened with its password can only be *remembered*, never made primary
 * over a v3 vault); every key this phone has ever held stays in the keyring, so what it wrote keeps
 * opening; a file from a version this build does not know is reported as such, not as a wrong
 * password; and a password is only ever changed by making a new key (the hero's old one may have been
 * seen), while forgetting it only adds a slot to the same key (nothing was seen, so nothing to cut).
 */

const MAGIC = "BATB";
const VERSION = 2;
const SLOT_BYTES = 1 + 4 + 16 + 60;
const CHECK_BYTES = 28;

/**
 * What a format 2 header may ask for. A file is untrusted input: a slot demanding 2^31 iterations
 * would hold an import for hours the moment the hero typed their password.
 */
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 10_000_000;

/**
 * The largest file taken from another device. Memory no longer sets it (segments keep it flat);
 * disk and download time do. Raw GPS is what grows: 78 bytes a point at 1 Hz, about 0.28 MB an
 * hour outdoors (measured 2026-09-26), so this is some 900 hours of outings.
 */
export const MAX_SEALED_BYTES = 256 * 1024 * 1024;

const SLOT_PASSWORD = 1;
const SLOT_RECOVERY = 2;
/** Format 3's slots: Argon2id over a password, and the twelve words. */
const SLOT_ARGON = 3;
const SLOT_WORDS = 4;

/** SecureStore keys. Device-local by construction; see the header comment. */
/**
 * The master key and the header that wraps it, as one item: written in two, a crash or a backup
 * between the writes sealed files with the new key under the old key's header, which nothing then
 * opens.
 */
const STORE_VAULT = "bati.backup.vault";
const STORE_KEYRING = "bati.backup.keyring";
const STORE_RECOVERY = "bati.backup.recovery";
/**
 * "1" once the recovery key really sits behind the fingerprint. Not secret; it exists because
 * asking the guarded item itself would show the fingerprint prompt just to render a hint.
 */
const STORE_RECOVERY_KEPT = "bati.backup.recovery-kept";

function forgetRecoveryKey(): Promise<void> {
  return Promise.all([
    SecureStore.deleteItemAsync(STORE_RECOVERY),
    SecureStore.deleteItemAsync(STORE_RECOVERY_KEPT),
  ]).then(() => undefined);
}

/** Database preference: the hero asked for encryption. See the header comment. */
const WANTED_PREFERENCE = "backupEncryption";

/**
 * Database preference: this phone made twelve words the hero has not yet proved they wrote down.
 * Set when words are made, cleared when two of them are typed back. It is what lets an abandoned
 * setup say so, once, instead of looking finished.
 */
const WORDS_PENDING = "backupWordsPending";

export async function wordsPending(): Promise<boolean> {
  return (await getPreference(WORDS_PENDING)) === "1";
}

export function confirmWords(): Promise<void> {
  return deletePreference(WORDS_PENDING);
}

type Slot = { kind: number; iterations: number; salt: Uint8Array; wrapped: Uint8Array };
type Header = { slots: Slot[]; bytes: Uint8Array };

// --- bytes -------------------------------------------------------------------------------------

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const utf8 = (value: string) => new TextEncoder().encode(value);

// --- header ------------------------------------------------------------------------------------

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

/**
 * Format 2 keeps the whole header every file starts with. Format 3 keeps only the key slots: the
 * rest of a v3 header (salt, nonce prefix, counter) is made fresh at every sealing.
 */
type StoredVault =
  | { key: string; header: string }
  | { key: string; format: 3; slots: StoredSlot[] };

/**
 * A slot as this phone keeps it: what the module gave, and the install that wrote it. Two devices
 * that re-wrap the same kind of slot at the same moment end up with the same generation and
 * different bytes; the smaller install id wins, the same on both, so they converge.
 */
type StoredSlot = SlotInfo & { writer: string };

async function storedVault(): Promise<StoredVault | null> {
  const value = await SecureStore.getItemAsync(STORE_VAULT);
  return value === null ? null : (JSON.parse(value) as StoredVault);
}

function storeVault(key: string, header: Uint8Array): Promise<void> {
  return SecureStore.setItemAsync(STORE_VAULT, JSON.stringify({ key, header: toB64(header) }));
}

function storeVaultV3(key: string, slots: StoredSlot[]): Promise<void> {
  return SecureStore.setItemAsync(STORE_VAULT, JSON.stringify({ key, format: 3, slots }));
}

/**
 * What every file sealed on this phone has in common, as a string that changes when the key or its
 * slots do, or `null` without a key. It is how sync knows the file it uploaded is sealed with a key
 * the other devices may no longer share. Not secret: every file carries it.
 *
 * Format 2: the header itself. Format 3: the key's id and each slot's kind, generation and salt,
 * since the header is different in every file.
 */
export async function sealingHeader(): Promise<string | null> {
  const vault = await storedVault();
  if (vault === null) return null;
  if (!("format" in vault)) return vault.header;
  const id = await batiCrypto().keyId(vault.key);
  return `v3:${id}:${vault.slots.map((slot) => `${slot.kind}.${slot.gen}.${slot.raw.slice(8, 24)}`).join(",")}`;
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

type Own =
  | { format: 2; key: string; header: Header }
  | { format: 3; key: string; slots: StoredSlot[] };

async function ownKey(): Promise<Own | null> {
  const vault = await storedVault();
  if (vault === null) return null;
  if ("format" in vault) return { format: 3, key: vault.key, slots: vault.slots };
  const header = parseHeader(fromB64(vault.header));
  return header === null ? null : { format: 2, key: vault.key, header };
}

/** 2 or 3 for the vault this phone seals with, `null` without one. */
export async function vaultFormat(): Promise<2 | 3 | null> {
  return (await ownKey())?.format ?? null;
}

export async function encryptionStatus(): Promise<EncryptionStatus> {
  if ((await ownKey()) !== null) return "on";
  return (await getPreference(WANTED_PREFERENCE)) === "on" ? "locked" : "off";
}

/**
 * Argon2id as it is written. The slot carries what it used, so any phone reads it back; these are
 * only what a new one asks for. A test lowers them, because 64 MiB makes every case slow: the app
 * never sets them.
 */
export const argon = { memoryKib: 64 * 1024, fallbackKib: 32 * 1024, passes: 3, lanes: 1 };

/**
 * The shortest password a new vault takes: NIST 800-63B-4, for a secret that an attacker holding
 * one backup file can guess offline. Counted in characters, so an accented one is not penalised.
 */
export const MIN_PASSWORD_LENGTH = 15;

function assertPassword(password: string): void {
  if ([...password.normalize("NFC")].length < MIN_PASSWORD_LENGTH) {
    throw new Error("PASSWORD_TOO_SHORT");
  }
}

/** The install that is writing, in the form a header carries it: 32 hex digits. */
async function writerId(): Promise<string> {
  return (await installId()).replaceAll("-", "");
}

/**
 * A password slot of `gen` for `key`. If the heap cannot hold the pass asked for, one smaller:
 * the slot says what it used, so every phone can read it, and a phone short of memory can still
 * make a vault.
 */
async function wrapPassword(key: string, password: string, gen: number): Promise<SlotInfo> {
  const secret = passwordBytes(password);
  const wrap = (memoryKib: number) =>
    batiCrypto().wrapSlot(key, secret, SLOT_ARGON, gen, memoryKib, argon.passes, argon.lanes);
  try {
    return await wrap(argon.memoryKib);
  } catch (error) {
    if (!isLowMemory(error)) throw error;
    return wrap(argon.fallbackKib);
  }
}

function wrapWords(key: string, entropy: Uint8Array, gen: number): Promise<SlotInfo> {
  return batiCrypto().wrapSlot(key, toB64(entropy), SLOT_WORDS, gen, 0, 0, 0);
}

/**
 * A fresh master key under `password` and twelve fresh words, made this phone's. The key it
 * replaces, if any, goes to the keyring: files it sealed must keep opening here. Returns the
 * words, for the one screen that will ever show them (`readRecoveryKey` shows them again behind a
 * fingerprint, when there is one).
 */
async function newVault(password: string, language: WordLanguage): Promise<string> {
  assertPassword(password);
  const key = await batiCrypto().randomBytes(32);
  const entropy = fromB64(await batiCrypto().randomBytes(RECOVERY_BYTES));
  const writer = await writerId();
  const slots: StoredSlot[] = [
    { ...(await wrapPassword(key, password, 1)), writer },
    { ...(await wrapWords(key, entropy, 1)), writer },
  ];

  const previous = await ownKey();
  if (previous !== null) await rememberInKeyring(previous.key);
  await storeVaultV3(key, slots);
  await setPreference(WANTED_PREFERENCE, "on");
  await setPreference(WORDS_PENDING, "1");
  await rememberRecoveryKey(entropy, language);
  return entropyToWords(entropy, language).join(" ");
}

/**
 * Turns encryption on with a fresh master key and returns its twelve words, for the one screen
 * that will ever show them.
 */
export function enableEncryption(password: string, language: WordLanguage): Promise<string> {
  return newVault(password, language);
}

/**
 * A new password is a new key, not a re-wrapped one: re-wrapping would leave every future file
 * open to whoever learned the old password and kept one old file. The old key stays in the
 * keyring so this phone still opens what it sealed before; other devices ask for the new password
 * once. Returns the new twelve words, which replace the old ones for everything written from now.
 *
 * It is also how a vault from an older build is updated: the same act, a new key in format 3.
 */
export function changePassword(password: string, language: WordLanguage): Promise<string> {
  return newVault(password, language);
}

/**
 * Whether `password` is the one of this phone's vault, for the question "is it still the right
 * one?". Nothing is stored or changed. Only the password slot that is current counts, so after a
 * "forgot" the old one reads as wrong, which it is for everything written from now.
 */
export async function checkPassword(password: string): Promise<boolean> {
  const own = await ownKey();
  if (own === null) return false;
  if (own.format === 2) return (await unwrap(own.header, password)) === own.key;
  const secret = passwordBytes(password);
  for (const slot of own.slots.filter((s) => s.kind === SLOT_ARGON)) {
    if ((await batiCrypto().unwrapSlot(secret, slot.raw)) === own.key) return true;
  }
  return false;
}

/** The vault this phone seals with, which must be format 3: the two re-wraps only exist there. */
async function v3Vault(): Promise<{ key: string; slots: StoredSlot[] }> {
  const own = await ownKey();
  if (own === null || own.format !== 3) throw new Error("Re-wrapping needs a format 3 vault");
  return own;
}

/** `slots` with `slot` in the place of the one of its kind, in a fixed order (password, words). */
function withSlot(slots: StoredSlot[], slot: StoredSlot): StoredSlot[] {
  return [...slots.filter((s) => s.kind !== slot.kind), slot].sort((a, b) => a.kind - b.kind);
}

const nextGen = (slots: StoredSlot[], kind: number) =>
  Math.max(0, ...slots.filter((s) => s.kind === kind).map((s) => s.gen)) + 1;

/**
 * "I don't remember it": a new password on the same key. Nothing was seen, so there is nothing to
 * cut off, and no other device is locked out: they pick the new slot up from the next file this
 * phone writes. The old password still opens the files that were sealed with its slot, which is
 * said where this is offered.
 */
export async function rewrapPassword(password: string): Promise<void> {
  assertPassword(password);
  const { key, slots } = await v3Vault();
  const slot = await wrapPassword(key, password, nextGen(slots, SLOT_ARGON));
  await storeVaultV3(key, withSlot(slots, { ...slot, writer: await writerId() }));
}

/**
 * New twelve words on the same key, for a hero who lost the paper. The old words keep opening the
 * files that carry their slot; for every file written from now only these do. Returns the words.
 */
export async function rewrapWords(language: WordLanguage): Promise<string> {
  const { key, slots } = await v3Vault();
  const entropy = fromB64(await batiCrypto().randomBytes(RECOVERY_BYTES));
  const slot = await wrapWords(key, entropy, nextGen(slots, SLOT_WORDS));
  await storeVaultV3(key, withSlot(slots, { ...slot, writer: await writerId() }));
  await setPreference(WORDS_PENDING, "1");
  await rememberRecoveryKey(entropy, language);
  return entropyToWords(entropy, language).join(" ");
}

/**
 * Takes in what another device did to the slots of a key both hold. A file that opens under this
 * phone's own key carries that device's slots; a higher generation of a kind is later than ours and
 * wins, and at the same generation the smaller install id does, so two devices that re-wrapped at
 * once keep one slot each of what the other did. Lower generations never replace anything, so an
 * old file from a folder cannot turn the slots back.
 *
 * New words from elsewhere mean the words this phone kept are no longer the current ones, and are
 * forgotten: showing them as "your twelve words" would be wrong.
 */
async function adoptSlots(header: HeaderInfo): Promise<void> {
  const vault = await storedVault();
  if (vault === null || !("format" in vault)) return;
  let slots = vault.slots;
  let wordsChanged = false;

  for (const theirs of header.slots) {
    // A slot this reader would skip is not adopted: one file under the key could otherwise spread a
    // slot nobody can use to every device, after which the password opens no new file anywhere.
    if (!readable(theirs)) continue;
    const mine = slots.find((slot) => slot.kind === theirs.kind);
    const wins =
      mine === undefined ||
      theirs.gen > mine.gen ||
      (theirs.gen === mine.gen && theirs.raw < mine.raw);
    if (!wins) continue;
    slots = withSlot(slots, { ...theirs, writer: header.installId });
    wordsChanged ||= theirs.kind === SLOT_WORDS;
  }
  if (slots === vault.slots) return;
  await storeVaultV3(vault.key, slots);
  if (wordsChanged) await forgetRecoveryKey();
}

/** Future backups are plain again. Files already encrypted stay encrypted, and openable elsewhere. */
export async function disableEncryption(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_VAULT);
  await forgetRecoveryKey();
  await SecureStore.deleteItemAsync(STORE_KEYRING);
  await deletePreference(WANTED_PREFERENCE);
  await deletePreference(WORDS_PENDING);
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
 * The entropy and the list it was shown in, so the same words come back whatever the language of
 * the app is by then.
 */
async function rememberRecoveryKey(entropy: Uint8Array, language: WordLanguage): Promise<void> {
  // The previous vault's key opens nothing this phone writes from now: never show it as current.
  await forgetRecoveryKey();
  if (!SecureStore.canUseBiometricAuthentication()) return;
  // Storing it asks for the fingerprint too. The key was shown and the hero was asked to write it
  // down; a cancelled prompt only loses "show it again", which `canShowRecoveryKeyAgain` then says.
  const kept = await SecureStore.setItemAsync(
    STORE_RECOVERY,
    JSON.stringify({ entropy: toB64(entropy), language }),
    { requireAuthentication: true },
  ).then(
    () => true,
    () => false,
  );
  if (kept) await SecureStore.setItemAsync(STORE_RECOVERY_KEPT, "1");
}

/**
 * The recovery key, after a fingerprint, or `null` when this phone never kept it. Twelve words for
 * a format 3 vault; a vault from an older build kept sixty-four hex digits, shown as it always was.
 */
export async function readRecoveryKey(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(STORE_RECOVERY, { requireAuthentication: true });
  if (stored === null) return null;
  if (!stored.startsWith("{")) return formatRecoveryKey(stored);
  const { entropy, language } = JSON.parse(stored) as { entropy: string; language: WordLanguage };
  return entropyToWords(fromB64(entropy), language).join(" ");
}

/** Whether `readRecoveryKey` has something to show: the key was really stored, not just could be. */
export async function canShowRecoveryKeyAgain(): Promise<boolean> {
  return (await SecureStore.getItemAsync(STORE_RECOVERY_KEPT)) === "1";
}

// --- files -------------------------------------------------------------------------------------

/** Enough bytes for any header this version can write: sixteen slots is far more than two. */
const MAX_HEADER = 6 + 16 * SLOT_BYTES + CHECK_BYTES;

async function readHeader(path: string): Promise<Header | null> {
  return parseHeader(fromB64(await batiCrypto().readPrefix(path, MAX_HEADER)));
}

/** Encrypts a plaintext snapshot at `plainPath` into `outPath` with this device's key. */
export async function sealBackup(plainPath: string, outPath: string): Promise<void> {
  const own = await ownKey();
  if (own === null) throw new Error("Encryption is off");
  if (own.format === 2) {
    await batiCrypto().sealFile(own.key, plainPath, outPath, toB64(own.header.bytes));
    return;
  }
  // Reserved before sealing: a crash after this spends a number and never reuses one.
  const counter = await reserveCounter();
  const id = (await installId()).replaceAll("-", "");
  await batiCrypto().sealFileV3(
    own.key,
    plainPath,
    outPath,
    own.slots.map((slot) => slot.raw),
    id,
    counter,
  );
}

export type OpenResult =
  | "opened"
  | "needsSecret"
  | "wrongSecret"
  | "notEncrypted"
  // A BATB file of a version this build does not know. The hero has to update; typing a password
  // again would only ever read as "wrong".
  | "newerVersion";

/**
 * What opening a file did. `join` is only there when the file opened with a secret, under a key
 * this phone did not hold: calling it makes that key this phone's (`asPrimary`, what a device
 * joining another does, and what an import may offer), or only remembers it for reading.
 */
export type OpenOutcome = {
  result: OpenResult;
  join?: (options: { asPrimary: boolean }) => Promise<void>;
  /** The file's format, when it is one of ours: sync orders vaults by it. */
  format?: 2 | 3;
  /**
   * The file opened with a key this phone keeps for reading, not the one it seals with. Such a
   * file is a vault this phone has left: sync must not merge it, or an old key would steer the
   * history of a hero who moved on.
   */
  viaKeyring?: boolean;
  /**
   * Who wrote a format 3 file and when in their own count: the install id (32 hex digits) and the
   * counter. Sync refuses a file whose counter went back for that install. Only what the file
   * says, and only worth believing when `viaKeyring` is false: the check passed under this
   * phone's own key.
   */
  sealedBy?: { installId: string; counter: string };
  /**
   * What a file this phone cannot open says about who wrote it and in which count. Unauthenticated: the check
   * needs the key. Worth using only to ignore a file that claims to be older than one already read here.
   */
  claims?: { installId: string; counter: string };
};

/**
 * How many formats this build reads. A verdict about a peer ("unreadable", "too new") is kept
 * with this number, so teaching the build a new format makes every such verdict be asked again.
 * Bump it with every format a build learns to read.
 */
export const CIPHER_READS = 3;

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
  switch (await formatOf(path)) {
    case "v3":
      return openV3(path, outPath, secret);
    case "newer":
      return { result: "newerVersion" };
    case "v2":
      return openV2(path, outPath, secret);
    default:
      return { result: "notEncrypted" };
  }
}

/** What kind of Bati file this is, from its first five bytes. */
async function formatOf(path: string): Promise<"v2" | "v3" | "newer" | "none"> {
  const head = fromB64(await batiCrypto().readPrefix(path, 5));
  if (head.length < 5 || String.fromCharCode(...head.subarray(0, 4)) !== MAGIC) return "none";
  const version = head[4] as number;
  if (version === 2) return "v2";
  if (version === 3) return "v3";
  return version > 3 ? "newer" : "none";
}

async function openV2(path: string, outPath: string, secret?: string): Promise<OpenOutcome> {
  const header = await readHeader(path);
  if (header === null) return { result: "notEncrypted" };

  for (const { key, own } of await heldKeys()) {
    if (await keyOpens(key, header)) {
      await batiCrypto().openFile(key, path, outPath, header.bytes.length);
      return { result: "opened", format: 2, viaKeyring: !own };
    }
  }

  if (header.slots.length === 0) return { result: "notEncrypted" };
  if (secret === undefined) return { result: "needsSecret", format: 2 };
  const key = await unwrap(header, secret);
  if (key === null) return { result: "wrongSecret", format: 2 };

  await batiCrypto().openFile(key, path, outPath, header.bytes.length);
  return {
    result: "opened",
    format: 2,
    join: (options) => joinKey(key, { format: 2, bytes: header.bytes }, options),
  };
}

async function openV3(path: string, outPath: string, secret?: string): Promise<OpenOutcome> {
  const read = await batiCrypto().readHeader(path);
  if (read.kind === "newerVersion") return { result: "newerVersion" };
  if (read.kind !== "ok") return { result: "notEncrypted" };

  for (const { key, own } of await heldKeys()) {
    if (await batiCrypto().checkKey(key, path)) {
      await batiCrypto().openFileV3(key, path, outPath);
      // The file is under this phone's own key: whatever the writer did to the slots is news here.
      if (own) await adoptSlots(read.header);
      return { result: "opened", format: 3, viaKeyring: !own, sealedBy: sealedBy(read.header) };
    }
  }

  // A file nobody can open with any secret is not a vault to join: asking for a password that
  // can never work froze every device's sync, and every new phone's join, on one stray file.
  if (!read.header.slots.some(readable)) return { result: "notEncrypted" };
  if (secret === undefined)
    return { result: "needsSecret", format: 3, claims: sealedBy(read.header) };
  const key = await unwrapV3(read.header, path, secret);
  if (key === null) return { result: "wrongSecret", format: 3 };

  await batiCrypto().openFileV3(key, path, outPath);
  return {
    result: "opened",
    format: 3,
    sealedBy: sealedBy(read.header),
    join: (options) =>
      joinKey(key, { format: 3, slots: read.header.slots, writer: read.header.installId }, options),
  };
}

/**
 * Whether a reader of format 3 can use this slot at all: the twelve words, or a password within the
 * bounds the format allows (what the module checks before computing anything). Anything else is
 * skipped by the reader, so it must not be adopted from a peer either, nor make a file look like a
 * vault to join.
 */
const readable = (slot: SlotInfo) =>
  slot.kind === SLOT_WORDS ||
  (slot.kind === SLOT_ARGON &&
    slot.memoryKib >= 19 * 1024 &&
    slot.memoryKib <= 128 * 1024 &&
    slot.passes >= 2 &&
    slot.passes <= 4 &&
    slot.lanes >= 1 &&
    slot.lanes <= 4);

const sealedBy = (header: HeaderInfo) => ({ installId: header.installId, counter: header.counter });

/** Every key this phone holds, its own first: what it opens without asking. */
async function heldKeys(): Promise<{ key: string; own: boolean }[]> {
  const own = (await storedVault())?.key;
  return [
    ...(own === undefined ? [] : [{ key: own, own: true }]),
    ...(await keyring()).map((key) => ({ key, own: false })),
  ];
}

/**
 * The master key, if `secret` opens a slot of this v3 file. Words first: they cost one hash, where
 * a password costs a pass of Argon2. A password can be twelve valid words, so a secret that reads
 * as words and opens no words slot is still tried as a password.
 *
 * A slot asking for more than a reader accepts is skipped without being computed (it is a file
 * from someone else, not a reason to spend the heap); a heap too small for a slot that is fine is
 * the one failure that is passed on, so the hero hears "close other apps" and not "wrong password".
 */
async function unwrapV3(header: HeaderInfo, path: string, secret: string): Promise<string | null> {
  const opens = async (key: string | null) =>
    key !== null && (await batiCrypto().checkKey(key, path)) ? key : null;

  for (const { entropy } of wordCandidates(secret)) {
    for (const slot of header.slots.filter((s) => s.kind === SLOT_WORDS)) {
      const key = await opens(await batiCrypto().unwrapSlot(toB64(entropy), slot.raw));
      if (key !== null) return key;
    }
  }

  const bytes = passwordBytes(secret);
  for (const slot of header.slots.filter((s) => s.kind === SLOT_ARGON)) {
    try {
      const key = await opens(await batiCrypto().unwrapSlot(bytes, slot.raw));
      if (key !== null) return key;
    } catch (error) {
      if (isLowMemory(error)) throw error;
    }
  }
  return null;
}

/**
 * Makes a key unlocked from another device's file this phone's. As primary, its header becomes
 * ours, so what this phone writes opens with the same password everywhere, which is what makes
 * phone and tablet one hero rather than two vaults; the key it replaces goes to the keyring. Not
 * as primary, it is only remembered, so that device's files open here without asking again.
 */
type Joinable = { format: 2; bytes: Uint8Array } | { format: 3; slots: SlotInfo[]; writer: string };

async function joinKey(
  key: string,
  source: Joinable,
  { asPrimary }: { asPrimary: boolean },
): Promise<void> {
  const previous = await ownKey();
  // Never to an older format than the vault already is: the files this phone writes next would
  // stop opening for every device that moved on, and the phones that moved on would have to be
  // told to take a step back. A key from an older file is kept for reading, which loses nothing.
  const primary = asPrimary && (previous === null || previous.format <= source.format);
  if (!primary) {
    await rememberInKeyring(key);
    return;
  }
  if (previous !== null && previous.key !== key) await rememberInKeyring(previous.key);
  if (source.format === 3) {
    await storeVaultV3(
      key,
      source.slots.map((slot) => ({ ...slot, writer: source.writer })),
    );
  } else await storeVault(key, source.bytes);
  await setPreference(WANTED_PREFERENCE, "on");
  // The words are the other device's: this phone never made any, so it has none to check.
  await deletePreference(WORDS_PENDING);
  // The recovery key is the other device's; this phone never saw it, so it cannot show it again.
  await forgetRecoveryKey();
}
