import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { nodeBatiCrypto } from "./helpers/nodeBatiCrypto";

/**
 * Encrypted backups, end to end on real bytes: the device is doubled (the crypto module by Node's
 * own Argon2id, AES-GCM and HKDF in helpers/nodeBatiCrypto*.ts, SecureStore and the preferences
 * table by Maps), the code under test never is. Every case encrypts and decrypts a real file.
 *
 * Format 2 is tested where it belongs, on files it wrote: `backup-v2-fixtures.test.ts` and
 * `backup-upgrade-from-2-9.test.ts`. Everything here is about vaults this build makes.
 *
 * "A phone" is a pair of Maps. `phone("B")` swaps them in and starts the module afresh, which is
 * what a second device is: its own keystore, its own install id, nothing shared but the files.
 */
const phones = new Map<string, { secure: Map<string, string>; prefs: Map<string, string> }>();
let current = "A";
const mockSecure = new Map<string, string>();
const mockPrefs = new Map<string, string>();
let mockBiometrics = false;
/** The options each SecureStore item was written with: a guarded item reads back only when asked for as guarded. */
let mockRejectSet: string | null = null;
const mockOptions = new Map<string, { requireAuthentication?: boolean }>();

jest.mock("@/modules/bati-crypto", () => ({
  batiCrypto: () => require("./helpers/nodeBatiCrypto").nodeBatiCrypto,
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string, options?: { requireAuthentication?: boolean }) =>
    Promise.resolve(
      mockOptions.get(key)?.requireAuthentication && !options?.requireAuthentication
        ? null
        : (mockSecure.get(key) ?? null),
    ),
  setItemAsync: (key: string, value: string, options?: { requireAuthentication?: boolean }) =>
    Promise.resolve().then(() => {
      if (key === mockRejectSet) throw new Error("prompt cancelled");
      mockSecure.set(key, value);
      if (options) mockOptions.set(key, options);
      else mockOptions.delete(key);
    }),
  deleteItemAsync: (key: string) =>
    Promise.resolve().then(() => {
      mockSecure.delete(key);
      mockOptions.delete(key);
    }),
  canUseBiometricAuthentication: () => mockBiometrics,
}));
jest.mock("@/db/preferences", () => ({
  getPreference: (key: string) => Promise.resolve(mockPrefs.get(key) ?? null),
  setPreference: (key: string, value: string) =>
    Promise.resolve().then(() => {
      mockPrefs.set(key, value);
    }),
  deletePreference: (key: string) =>
    Promise.resolve().then(() => {
      mockPrefs.delete(key);
    }),
}));

type Cipher = typeof import("@/src/backupCipher");
type Words = typeof import("@/src/backupWords");
type Ids = typeof import("@/src/installId");

let c: Cipher;
let words: Words;
let ids: Ids;
// The doubles' own knobs, as the module instance the cipher is using right now sees them: a fresh
// registry (a new phone) is a fresh instance, and a knob set on the old one would move nothing.
let argonCalls: typeof import("./helpers/nodeBatiCrypto").argonCalls;
let heap: typeof import("./helpers/nodeBatiCrypto").heap;
let segment: typeof import("./helpers/nodeBatiCrypto").segment;

/** The module as it is written, before any test lowers it. */
const DEFAULT_ARGON = (jest.requireActual("@/src/backupCipher") as Cipher).argon;
const WRITTEN = { ...DEFAULT_ARGON };

/** Switch to a phone (made empty the first time), with a fresh module and the floor Argon2. */
function phone(name: string) {
  phones.set(current, { secure: new Map(mockSecure), prefs: new Map(mockPrefs) });
  current = name;
  const next = phones.get(name);
  mockSecure.clear();
  mockPrefs.clear();
  for (const [k, v] of next?.secure ?? []) mockSecure.set(k, v);
  for (const [k, v] of next?.prefs ?? []) mockPrefs.set(k, v);
  jest.resetModules();
  c = require("@/src/backupCipher");
  words = require("@/src/backupWords");
  ids = require("@/src/installId");
  const double = require("./helpers/nodeBatiCrypto") as typeof import("./helpers/nodeBatiCrypto");
  ({ argonCalls, heap, segment } = double);
  // The floor a reader accepts, so each case runs in a fraction of a second.
  Object.assign(c.argon, { memoryKib: 19 * 1024, fallbackKib: 19 * 1024, passes: 2, lanes: 1 });
}

let dir: string;
const at = (name: string) => path.join(dir, name);
const PLAIN = "SQLite format 3\u0000 pretend this is a whole hero";
const PASSWORD = "correct horse battery staple";

beforeEach(() => {
  phones.clear();
  current = "A";
  mockSecure.clear();
  mockPrefs.clear();
  mockOptions.clear();
  mockRejectSet = null;
  mockBiometrics = false;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-cipher-"));
  fs.writeFileSync(at("plain.db"), PLAIN);
  phone("A");
  argonCalls.length = 0;
  heap.freeKib = Number.POSITIVE_INFINITY;
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/** Encryption on, one file sealed with it, and the twelve words the hero was shown. */
async function sealedWith(password = PASSWORD, file = "backup.batb") {
  const recovery = await c.enableEncryption(password, "en");
  await c.sealBackup(at("plain.db"), at(file));
  return recovery;
}

const open = (file: string, out: string, secret?: string) =>
  c.openBackup(at(file), at(out), secret).then((o) => o.result);

/** A second device that knows the first's password and so shares its key. */
async function joinedPhoneB(file = "backup.batb") {
  phone("B");
  const outcome = await c.openBackup(at(file), at("joined.db"), PASSWORD);
  await outcome.join?.({ asPrimary: true });
  fs.rmSync(at("joined.db"), { force: true });
}

const headerOf = async (file: string) => {
  const read = await nodeBatiCrypto.readHeader(at(file));
  if (read.kind !== "ok") throw new Error(`not a v3 file: ${file}`);
  return read.header;
};

describe("a new vault", () => {
  test("is format 3, and its file is not the plaintext", async () => {
    await sealedWith();

    expect(await c.vaultFormat()).toBe(3);
    expect(fs.readFileSync(at("backup.batb")).includes(Buffer.from("pretend"))).toBe(false);
    expect(fs.readFileSync(at("backup.batb")).subarray(4, 5)).toEqual(Buffer.from([3]));
  });

  test("opens its own files without asking", async () => {
    await sealedWith();

    expect(await open("backup.batb", "out.db")).toBe("opened");
    expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);
  });

  test("gives twelve words, in the language asked", async () => {
    const english = await c.enableEncryption(PASSWORD, "en");
    expect(english.split(" ")).toHaveLength(12);

    phone("B");
    const french = await c.enableEncryption(PASSWORD, "fr");
    expect(french.split(" ")).toHaveLength(12);
    expect(words.wordCandidates(french).map((w) => w.language)).toContain("fr");
  });

  test("stretches the password with Argon2id at 64 MiB, 3 passes, one lane, as written", async () => {
    expect(WRITTEN).toEqual({ memoryKib: 65536, fallbackKib: 32768, passes: 3, lanes: 1 });
    Object.assign(c.argon, WRITTEN);

    await c.enableEncryption(PASSWORD, "en");

    expect(argonCalls).toEqual([{ memoryKib: 65536, passes: 3, lanes: 1 }]);
  });

  test("with the heap too small for 64 MiB, uses 32 MiB, and the slot says so", async () => {
    Object.assign(c.argon, WRITTEN);
    heap.freeKib = 40 * 1024;

    await c.enableEncryption(PASSWORD, "en");
    await c.sealBackup(at("plain.db"), at("backup.batb"));

    expect(argonCalls).toEqual([{ memoryKib: 32768, passes: 3, lanes: 1 }]);
    const slot = (await headerOf("backup.batb")).slots.find((s) => s.kind === 3);
    expect(slot?.memoryKib).toBe(32768);
    // Any phone reads it, because the slot carries what it used.
    phone("B");
    heap.freeKib = Number.POSITIVE_INFINITY;
    expect(await open("backup.batb", "out.db", PASSWORD)).toBe("opened");
  });

  test("with no room even for that, says so and creates nothing", async () => {
    Object.assign(c.argon, WRITTEN);
    heap.freeKib = 1024;

    await expect(c.enableEncryption(PASSWORD, "en")).rejects.toThrow("LOW_MEMORY");

    expect(await c.vaultFormat()).toBeNull();
    expect(await c.encryptionStatus()).toBe("off");
  });

  test.each([
    ["fourteen characters", "a".repeat(14), false],
    ["fifteen", "a".repeat(15), true],
    ["fifteen accented ones, whatever their bytes", "é".repeat(15), true],
    ["fifteen accents typed as two code points each", `${"é".repeat(14)}x`.normalize("NFD"), true],
    ["fourteen accented ones", "é".repeat(14), false],
  ])("a password of %s is %s", async (_label, password, accepted) => {
    const made = c.enableEncryption(password, "en");
    if (accepted) await expect(made).resolves.toBeTruthy();
    else await expect(made).rejects.toThrow("PASSWORD_TOO_SHORT");
  });

  test("a rejected password leaves no vault behind", async () => {
    await expect(c.enableEncryption("short", "en")).rejects.toThrow();

    expect(await c.vaultFormat()).toBeNull();
    expect(mockSecure.has("bati.backup.vault")).toBe(false);
  });
});

describe("opening", () => {
  test("a new phone needs the password, refuses a wrong one, and adopts nothing on its own", async () => {
    await sealedWith();
    phone("B");

    expect(await c.encryptionStatus()).toBe("off");
    expect(await open("backup.batb", "out.db")).toBe("needsSecret");
    expect(await open("backup.batb", "out.db", "battery staple")).toBe("wrongSecret");
    expect(fs.existsSync(at("out.db"))).toBe(false);

    const outcome = await c.openBackup(at("backup.batb"), at("out.db"), PASSWORD);
    expect(outcome.result).toBe("opened");
    expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);
    // Opening is not joining: someone else's file must never quietly become this phone's key.
    expect(await c.encryptionStatus()).toBe("off");

    await outcome.join?.({ asPrimary: true });
    expect(await c.encryptionStatus()).toBe("on");
    fs.rmSync(at("out.db"));
    expect(await open("backup.batb", "out.db")).toBe("opened");
  });

  test("the twelve words open a file however they are typed", async () => {
    const twelve = await sealedWith();
    phone("B");

    const sloppy = twelve
      .toUpperCase()
      .split(" ")
      .map((word) => word.slice(0, 4))
      .join("  ");
    expect(await open("backup.batb", "out.db", sloppy)).toBe("opened");
  });

  test("an accented password is the same password however the keyboard composed it", async () => {
    await sealedWith("café crème, très bien");
    phone("B");
    // NFD: "e" followed by a combining accent, what another keyboard may send for the same word.
    expect(await open("backup.batb", "out.db", "café crème, très bien".normalize("NFD"))).toBe(
      "opened",
    );
  });

  test("a plain SQLite backup is not mistaken for an encrypted one", async () => {
    await c.enableEncryption(PASSWORD, "en");
    expect(await open("plain.db", "out.db")).toBe("notEncrypted");
  });

  test("one changed byte anywhere refuses the file and leaves nothing behind", async () => {
    await sealedWith();
    const good = fs.readFileSync(at("backup.batb"));

    for (const offset of [7, 40, 100, good.length - 30, good.length - 1]) {
      const bad = Buffer.from(good);
      bad[offset] = (bad[offset] ?? 0) ^ 1;
      fs.writeFileSync(at("bad.batb"), bad);

      // A header byte fails the key check, so no key opens it; a body byte passes the check and
      // fails the tag while decrypting, which rejects.
      const outcome = await open("bad.batb", "out.db", PASSWORD).catch(() => "rejected");
      expect(outcome).not.toBe("opened");
      expect(fs.existsSync(at("out.db"))).toBe(false);
    }
  });

  test("turning encryption off stops sealing and forgets every key this phone held", async () => {
    await sealedWith();
    await c.disableEncryption();

    expect(await c.encryptionStatus()).toBe("off");
    await expect(c.sealBackup(at("plain.db"), at("x.batb"))).rejects.toThrow("Encryption is off");
    expect(await open("backup.batb", "out.db")).toBe("needsSecret");
    expect(await open("backup.batb", "out.db", PASSWORD)).toBe("opened");
  });

  test("a phone Android restored without its key is locked, never plain", async () => {
    await sealedWith();
    mockSecure.clear(); // the database came back, the keystore did not
    phone("A");
    // phone() reloads from the saved copy of A, which still holds the keystore: wipe it as Android does.
    mockSecure.clear();

    expect(await c.encryptionStatus()).toBe("locked");
    await expect(c.sealBackup(at("plain.db"), at("x.batb"))).rejects.toThrow();
  });
});

describe("a file larger than one segment", () => {
  // 1 MiB on a phone; small here so a test crosses boundaries with a few kB.
  const SEGMENT = 1000;
  const STRIDE = SEGMENT + 16;
  beforeEach(() => {
    segment.bytes = SEGMENT;
  });
  afterEach(() => {
    segment.bytes = 1024 * 1024;
  });

  test.each([2500, 3000, 0])("%i bytes come back whole", async (size) => {
    const plain = Buffer.alloc(size, 7);
    fs.writeFileSync(at("plain.db"), plain);
    await sealedWith();
    expect(await open("backup.batb", "out.db")).toBe("opened");
    expect(fs.readFileSync(at("out.db")).equals(plain)).toBe(true);
  });

  test("segments swapped, or the file cut between two, are refused", async () => {
    fs.writeFileSync(at("plain.db"), Buffer.alloc(2500, 7));
    await sealedWith();
    const length = (await headerOf("backup.batb")).headerLength;
    const good = fs.readFileSync(at("backup.batb"));
    const first = good.subarray(length, length + STRIDE);
    const second = good.subarray(length + STRIDE, length + 2 * STRIDE);

    const swapped = Buffer.concat([
      good.subarray(0, length),
      second,
      first,
      good.subarray(length + 2 * STRIDE),
    ]);
    // Two whole segments: without the last flag in the nonce, this would open as a shorter hero.
    const cut = good.subarray(0, length + 2 * STRIDE);
    for (const bad of [swapped, cut]) {
      fs.writeFileSync(at("bad.batb"), bad);
      const outcome = await open("bad.batb", "out.db").catch(() => "rejected");
      expect(outcome).toBe("rejected");
      expect(fs.existsSync(at("out.db"))).toBe(false);
    }
  });
});

describe("the twelve words and the fingerprint", () => {
  test("can be shown again only when a fingerprint guards them", async () => {
    await c.enableEncryption(PASSWORD, "en");
    expect(await c.readRecoveryKey()).toBeNull();
    expect(await c.canShowRecoveryKeyAgain()).toBe(false);

    mockSecure.clear();
    mockBiometrics = true;
    const twelve = await c.enableEncryption(PASSWORD, "fr");
    expect(await c.readRecoveryKey()).toBe(twelve);
    expect(await c.canShowRecoveryKeyAgain()).toBe(true);
  });

  test("come back in the language they were shown in, whatever the app speaks by then", async () => {
    mockBiometrics = true;
    const french = await c.enableEncryption(PASSWORD, "fr");

    expect(await c.readRecoveryKey()).toBe(french);
  });

  test("a vault made by an older build kept sixty-four hex digits, and they are shown as they were", async () => {
    mockSecure.set("bati.backup.recovery", "ab".repeat(32));
    expect(await c.readRecoveryKey()).toBe(Array(16).fill("abab").join(" "));
  });
});

describe("a new password", () => {
  test("is a new key: the old password and words no longer open what is written after", async () => {
    const oldWords = await sealedWith("old password, long enough", "before.batb");
    const newWords = await c.changePassword("new password, long enough", "en");
    await c.sealBackup(at("plain.db"), at("after.batb"));
    expect(newWords).not.toBe(oldWords);

    // This phone still opens both: the old key went to its keyring.
    expect(await open("before.batb", "a.db")).toBe("opened");
    expect(await open("after.batb", "b.db")).toBe("opened");

    phone("B");
    expect(await open("after.batb", "c.db", "old password, long enough")).toBe("wrongSecret");
    expect(await open("after.batb", "c.db", oldWords)).toBe("wrongSecret");
    expect(await open("after.batb", "c.db", "new password, long enough")).toBe("opened");
    phone("C");
    expect(await open("after.batb", "d.db", newWords)).toBe("opened");
    phone("D");
    expect(await open("before.batb", "e.db", "old password, long enough")).toBe("opened");
  });

  test("on a vault from an older build is the update: a new key in format 3, the old one kept", async () => {
    // Format 2 as v2.9 left it (frozen): this build must update it without losing a thing.
    const state = JSON.parse(
      fs.readFileSync(path.join(__dirname, "fixtures", "backup", "v2-phone-state.json"), "utf8"),
    ) as { secure: Record<string, string>; preferences: Record<string, string>; password: string };
    mockSecure.clear();
    mockPrefs.clear();
    for (const [k, v] of Object.entries(state.secure)) mockSecure.set(k, v);
    for (const [k, v] of Object.entries(state.preferences)) mockPrefs.set(k, v);
    expect(await c.vaultFormat()).toBe(2);

    await c.changePassword("a brand new password of course", "en");
    await c.sealBackup(at("plain.db"), at("after.batb"));

    expect(await c.vaultFormat()).toBe(3);
    const old = await c.openBackup(
      path.join(__dirname, "fixtures", "backup", "v2-phone.batb"),
      at("old.db"),
    );
    expect(old.result).toBe("opened");
    expect(await open("after.batb", "new.db")).toBe("opened");
  });

  test("the key it replaces joins the keyring once, however many times the password changes", async () => {
    await sealedWith("first password, long enough", "one.batb");
    await c.changePassword("second password, long enough", "en");
    await c.changePassword("third password, long enough", "en");

    expect(await open("one.batb", "out.db")).toBe("opened");
    expect(JSON.parse(mockSecure.get("bati.backup.keyring") ?? "[]")).toHaveLength(2);
  });
});

describe("joining another device's vault", () => {
  test("as primary takes its key; otherwise it is only remembered", async () => {
    await sealedWith("tablet password, long enough", "tablet.batb");

    phone("B");
    await c.enableEncryption("phone password, long enough", "en");
    const read = await c.openBackup(at("tablet.batb"), at("t.db"), "tablet password, long enough");
    await read.join?.({ asPrimary: false });
    // Remembered: opens without asking. Not adopted: this phone still writes under its own.
    fs.rmSync(at("t.db"));
    expect(await open("tablet.batb", "t.db")).toBe("opened");
    await c.sealBackup(at("plain.db"), at("phone.batb"));

    phone("C");
    expect(await open("phone.batb", "p.db", "phone password, long enough")).toBe("opened");

    phone("D");
    await c.enableEncryption("phone password, long enough", "en");
    const joined = await c.openBackup(
      at("tablet.batb"),
      at("j.db"),
      "tablet password, long enough",
    );
    await joined.join?.({ asPrimary: true });
    await c.sealBackup(at("plain.db"), at("joined.batb"));
    phone("E");
    expect(await open("joined.batb", "k.db", "tablet password, long enough")).toBe("opened");
  });
});

describe("re-wrapping: the same key, a new slot", () => {
  test("a new password on the same key: the key id does not move, the new password opens new files", async () => {
    await sealedWith(PASSWORD, "old.batb");
    const before = await c.sealingHeader();

    await c.rewrapPassword("a different password, long enough");
    await c.sealBackup(at("plain.db"), at("new.batb"));

    const after = await c.sealingHeader();
    expect(after).not.toBe(before);
    // v3:<key id>:<slots>: the key id is the part that must not change.
    expect(after?.split(":")[1]).toBe(before?.split(":")[1]);
    phone("B");
    expect(await open("new.batb", "a.db", "a different password, long enough")).toBe("opened");
    // The old password opens the files whose slot it was in, and no longer the new ones.
    expect(await open("old.batb", "b.db", PASSWORD)).toBe("opened");
    expect(await open("new.batb", "c.db", PASSWORD)).toBe("wrongSecret");
  });

  test("a new password leaves the words as they were", async () => {
    const twelve = await sealedWith(PASSWORD, "old.batb");
    await c.rewrapPassword("a different password, long enough");
    await c.sealBackup(at("plain.db"), at("new.batb"));

    phone("B");
    expect(await open("new.batb", "a.db", twelve)).toBe("opened");
  });

  test("new words on the same key: the new ones open new files, the old ones only the old", async () => {
    const oldWords = await sealedWith(PASSWORD, "old.batb");
    const newWords = await c.rewrapWords("en");
    await c.sealBackup(at("plain.db"), at("new.batb"));

    expect(newWords).not.toBe(oldWords);
    phone("B");
    expect(await open("new.batb", "a.db", newWords)).toBe("opened");
    expect(await open("new.batb", "b.db", oldWords)).toBe("wrongSecret");
    expect(await open("old.batb", "c.db", oldWords)).toBe("opened");
  });

  test("new words are the ones shown again, not the old", async () => {
    mockBiometrics = true;
    await c.enableEncryption(PASSWORD, "en");
    const fresh = await c.rewrapWords("es");

    expect(await c.readRecoveryKey()).toBe(fresh);
  });

  test("each re-wrap is a higher generation of its own slot and leaves the other alone", async () => {
    await sealedWith(PASSWORD, "g1.batb");
    await c.rewrapPassword("a different password, long enough");
    await c.sealBackup(at("plain.db"), at("g2.batb"));
    await c.rewrapWords("en");
    await c.sealBackup(at("plain.db"), at("g3.batb"));

    const gens = async (file: string) =>
      Object.fromEntries((await headerOf(file)).slots.map((s) => [s.kind, s.gen]));
    expect(await gens("g1.batb")).toEqual({ 3: 1, 4: 1 });
    expect(await gens("g2.batb")).toEqual({ 3: 2, 4: 1 });
    expect(await gens("g3.batb")).toEqual({ 3: 2, 4: 2 });
  });

  test("a vault from an older build cannot be re-wrapped: it has to be updated first", async () => {
    mockSecure.set("bati.backup.vault", JSON.stringify({ key: "AA==", header: "AA==" }));
    await expect(c.rewrapPassword("a different password, long enough")).rejects.toThrow("format 3");
    await expect(c.rewrapWords("en")).rejects.toThrow("format 3");
  });

  test("a short password is refused here too, and changes nothing", async () => {
    await sealedWith();
    const before = mockSecure.get("bati.backup.vault");

    await expect(c.rewrapPassword("short")).rejects.toThrow("PASSWORD_TOO_SHORT");

    expect(mockSecure.get("bati.backup.vault")).toBe(before);
  });
});

describe("two devices of one key that re-wrap", () => {
  /** Device A seals a file and B, joined to the same key, opens it: the way news travels. */
  async function bReads(file: string) {
    const here = current;
    phone("B");
    await c.openBackup(at(file), at("read.db"));
    fs.rmSync(at("read.db"), { force: true });
    return here;
  }

  test("a password changed on one is picked up by the other from the next file it writes", async () => {
    await sealedWith();
    await joinedPhoneB();
    phone("A");
    await c.rewrapPassword("a different password, long enough");
    await c.sealBackup(at("plain.db"), at("fromA.batb"));

    await bReads("fromA.batb");
    await c.sealBackup(at("plain.db"), at("fromB.batb"));

    phone("C");
    expect(await open("fromB.batb", "out.db", "a different password, long enough")).toBe("opened");
  });

  test("a password changed on one and the words on the other both survive, on both", async () => {
    await sealedWith();
    await joinedPhoneB();
    const newWords = await c.rewrapWords("en"); // B re-wraps the words
    await c.sealBackup(at("plain.db"), at("fromB.batb"));
    phone("A");
    await c.rewrapPassword("a different password, long enough"); // A re-wraps the password
    await c.sealBackup(at("plain.db"), at("fromA.batb"));

    // Each reads the other's file: both now hold gen 2 of both slots.
    await c.openBackup(at("fromB.batb"), at("x.db"));
    await c.sealBackup(at("plain.db"), at("a2.batb"));
    phone("B");
    await c.openBackup(at("fromA.batb"), at("y.db"));
    await c.sealBackup(at("plain.db"), at("b2.batb"));

    for (const file of ["a2.batb", "b2.batb"]) {
      phone("Z");
      expect(await open(file, `${file}.pw`, "a different password, long enough")).toBe("opened");
      phone("Y");
      expect(await open(file, `${file}.words`, newWords)).toBe("opened");
    }
  });

  const passwordSlotOf = async (file: string) =>
    (await headerOf(file)).slots.filter((slot) => slot.kind === 3).sort((x, y) => y.gen - x.gen)[0];

  test("the same slot re-wrapped on both at once ends the same on both: the smaller slot wins", async () => {
    await sealedWith();
    await joinedPhoneB();
    await c.rewrapPassword("password chosen on B, long enough");
    await c.sealBackup(at("plain.db"), at("fromB.batb"));
    const slotB = await passwordSlotOf("fromB.batb");
    phone("A");
    await c.rewrapPassword("password chosen on A, long enough");
    await c.sealBackup(at("plain.db"), at("fromA.batb"));
    const slotA = await passwordSlotOf("fromA.batb");
    expect(slotA?.gen).toBe(slotB?.gen);
    // Decided by the slots themselves, so it is the same wherever they are read from.
    const winner =
      (slotA?.raw ?? "") < (slotB?.raw ?? "")
        ? "password chosen on A, long enough"
        : "password chosen on B, long enough";

    await c.openBackup(at("fromB.batb"), at("x.db"));
    await c.sealBackup(at("plain.db"), at("a2.batb"));
    phone("B");
    await c.openBackup(at("fromA.batb"), at("y.db"));
    await c.sealBackup(at("plain.db"), at("b2.batb"));

    for (const file of ["a2.batb", "b2.batb"]) {
      phone(`check-${file}`);
      expect(await open(file, `${file}.out`, winner)).toBe("opened");
    }
  });

  test("a slot relayed by a third device wins or loses as it would from its author", async () => {
    await sealedWith(PASSWORD, "start.batb");
    await joinedPhoneB("start.batb");
    await c.rewrapPassword("password chosen on B, long enough");
    await c.sealBackup(at("plain.db"), at("fromB.batb"));
    const slotB = await passwordSlotOf("fromB.batb");
    phone("A");
    await c.rewrapPassword("password chosen on A, long enough");
    await c.sealBackup(at("plain.db"), at("fromA.batb"));
    const slotA = await passwordSlotOf("fromA.batb");
    const aWins = (slotA?.raw ?? "") < (slotB?.raw ?? "");
    const winner = aWins
      ? "password chosen on A, long enough"
      : "password chosen on B, long enough";

    // C joins the first vault, reads one side's file and writes its own: the other side's slot reaches it
    // only through C. Whoever C is, the same slot must win, or the devices end with different passwords.
    phone("C");
    const joined = await c.openBackup(at("start.batb"), at("c-join.db"), PASSWORD);
    await joined.join?.({ asPrimary: true });
    await c.openBackup(at("fromA.batb"), at("c1.db"));
    await c.sealBackup(at("plain.db"), at("relayA.batb"));
    await c.openBackup(at("fromB.batb"), at("c2.db"));
    await c.sealBackup(at("plain.db"), at("relayAB.batb"));

    phone("B");
    await c.openBackup(at("relayA.batb"), at("b-reads.db"));
    await c.sealBackup(at("plain.db"), at("b3.batb"));
    phone("A");
    await c.openBackup(at("relayAB.batb"), at("a-reads.db"));
    await c.sealBackup(at("plain.db"), at("a3.batb"));

    for (const file of ["relayAB.batb", "b3.batb", "a3.batb"]) {
      phone(`check-${file}`);
      expect(await open(file, `${file}.out`, winner)).toBe("opened");
    }
  });

  test("an older file does not turn the slots back", async () => {
    await sealedWith(PASSWORD, "gen1.batb");
    await c.rewrapPassword("a different password, long enough");
    const before = await c.sealingHeader();

    await open("gen1.batb", "out.db");

    expect(await c.sealingHeader()).toBe(before);
  });

  test("new words from the other device make this phone forget the words it kept", async () => {
    mockBiometrics = true;
    await sealedWith();
    await joinedPhoneB();
    mockBiometrics = true;
    await c.rewrapWords("en");
    await c.sealBackup(at("plain.db"), at("fromB.batb"));
    phone("A");
    expect(await c.canShowRecoveryKeyAgain()).toBe(true);

    await c.openBackup(at("fromB.batb"), at("x.db"));

    expect(await c.canShowRecoveryKeyAgain()).toBe(false);
    expect(await c.readRecoveryKey()).toBeNull();
  });

  test("a file opened with a key this phone only keeps adopts nothing", async () => {
    await sealedWith("first password, long enough", "one.batb");
    await c.changePassword("second password, long enough", "en");
    const before = await c.sealingHeader();

    await open("one.batb", "out.db");

    expect(await c.sealingHeader()).toBe(before);
  });

  test("the counter of a file is what this phone had reserved, and is never reused across files", async () => {
    await sealedWith();
    await c.sealBackup(at("plain.db"), at("two.batb"));
    await c.sealBackup(at("plain.db"), at("three.batb"));

    const counters = await Promise.all(
      ["backup.batb", "two.batb", "three.batb"].map(async (f) => (await headerOf(f)).counter),
    );
    expect(counters).toEqual(["1", "2", "3"]);
    expect((await headerOf("backup.batb")).installId).toBe(
      (await ids.installId()).replaceAll("-", ""),
    );
  });
});

describe("the words still to be checked", () => {
  test("a new vault has its words to check until the hero has", async () => {
    expect(await c.wordsPending()).toBe(false);
    await c.enableEncryption(PASSWORD, "en");

    expect(await c.wordsPending()).toBe(true);
    await c.confirmWords();
    expect(await c.wordsPending()).toBe(false);
  });

  test("new words are to be checked again, a new password is not", async () => {
    await c.enableEncryption(PASSWORD, "en");
    await c.confirmWords();

    await c.rewrapPassword("a different password, long enough");
    expect(await c.wordsPending()).toBe(false);

    await c.rewrapWords("en");
    expect(await c.wordsPending()).toBe(true);
  });

  test("a changed password is a new key with new words: to be checked", async () => {
    await c.enableEncryption(PASSWORD, "en");
    await c.confirmWords();

    await c.changePassword("a second password, long enough", "en");

    expect(await c.wordsPending()).toBe(true);
  });

  test("a vault joined from another device never has words of its own to check", async () => {
    await sealedWith();
    await joinedPhoneB();

    expect(await c.wordsPending()).toBe(false);
  });

  test("turning encryption off forgets it", async () => {
    await c.enableEncryption(PASSWORD, "en");
    await c.disableEncryption();

    expect(await c.wordsPending()).toBe(false);
  });
});

describe("checking the password", () => {
  test("says whether this is the password of this phone's vault, and changes nothing", async () => {
    await c.enableEncryption(PASSWORD, "en");
    const before = mockSecure.get("bati.backup.vault");

    expect(await c.checkPassword(PASSWORD)).toBe(true);
    expect(await c.checkPassword("not the password at all")).toBe(false);
    expect(await c.checkPassword(PASSWORD.normalize("NFD"))).toBe(true);
    expect(mockSecure.get("bati.backup.vault")).toBe(before);
  });

  test("follows the password that is current, not the first one", async () => {
    await c.enableEncryption(PASSWORD, "en");
    await c.rewrapPassword("a different password, long enough");

    expect(await c.checkPassword("a different password, long enough")).toBe(true);
    expect(await c.checkPassword(PASSWORD)).toBe(false);
  });

  test("is false without a vault, and the words are not a password", async () => {
    expect(await c.checkPassword(PASSWORD)).toBe(false);
    const twelve = await c.enableEncryption(PASSWORD, "en");
    expect(await c.checkPassword(twelve)).toBe(false);
  });

  test("works on a vault from an older build too", async () => {
    const state = JSON.parse(
      fs.readFileSync(path.join(__dirname, "fixtures", "backup", "v2-phone-state.json"), "utf8"),
    ) as { secure: Record<string, string>; preferences: Record<string, string>; password: string };
    mockSecure.clear();
    mockPrefs.clear();
    for (const [k, v] of Object.entries(state.secure)) mockSecure.set(k, v);
    for (const [k, v] of Object.entries(state.preferences)) mockPrefs.set(k, v);

    expect(await c.checkPassword(state.password)).toBe(true);
    expect(await c.checkPassword("not the password at all")).toBe(false);
  });
});

describe("mutation survivors: the cipher's own state", () => {
  const FIXTURE = path.join(__dirname, "fixtures", "backup", "v2-small.batb");
  const FIXTURE_HEADER = fs.readFileSync(FIXTURE).subarray(0, 196).toString("base64");

  test("a format 2 vault joined as primary is stored as it came: same header, own key, then a keyring key after a new password", async () => {
    const outcome = await c.openBackup(FIXTURE, at("out.db"), PASSWORD);
    expect(outcome).toMatchObject({ result: "opened", format: 2 });
    await outcome.join?.({ asPrimary: true });

    expect(await c.vaultFormat()).toBe(2);
    expect(await c.encryptionStatus()).toBe("on");
    expect(await c.sealingHeader()).toBe(FIXTURE_HEADER);

    // Its own key now: no secret asked, and not a key kept for reading.
    fs.rmSync(at("out.db"));
    const again = await c.openBackup(FIXTURE, at("out.db"));
    expect(again).toMatchObject({ result: "opened", format: 2, viaKeyring: false });

    await c.changePassword("a brand new password of course", "en");
    fs.rmSync(at("out.db"));
    const later = await c.openBackup(FIXTURE, at("out.db"));
    expect(later).toMatchObject({ result: "opened", viaKeyring: true });
  });

  test("a rewrap replaces the slot of its kind and keeps password then words, generation by generation", async () => {
    await c.enableEncryption(PASSWORD, "en");
    const stored = () =>
      (
        JSON.parse(mockSecure.get("bati.backup.vault") ?? "{}") as {
          slots: { kind: number; gen: number }[];
        }
      ).slots;

    await c.rewrapPassword("a different password, long enough");
    expect(stored().map((s) => s.kind)).toEqual([3, 4]);
    expect(stored().map((s) => s.gen)).toEqual([2, 1]);

    await c.rewrapWords("en");
    expect(stored().map((s) => s.kind)).toEqual([3, 4]);
    expect(stored().map((s) => s.gen)).toEqual([2, 2]);
  });

  test("the words are stored behind the fingerprint, and only read back as guarded", async () => {
    mockBiometrics = true;
    const twelve = await c.enableEncryption(PASSWORD, "en");

    expect(mockOptions.get("bati.backup.recovery")).toEqual({ requireAuthentication: true });
    expect(await c.readRecoveryKey()).toBe(twelve);
  });

  test("any error but a low heap is passed on, and the smaller Argon2 is not tried", async () => {
    const double = (
      require("./helpers/nodeBatiCrypto") as typeof import("./helpers/nodeBatiCrypto")
    ).nodeBatiCrypto;
    const spy = jest.spyOn(double, "wrapSlot").mockRejectedValueOnce(new Error("disk full"));
    try {
      await expect(c.enableEncryption(PASSWORD, "en")).rejects.toThrow("disk full");
      expect(argonCalls).toEqual([]);
      expect(await c.vaultFormat()).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  test("joining the same vault for reading twice keeps its key in the keyring once", async () => {
    await sealedWith();
    phone("B");
    const outcome = await c.openBackup(at("backup.batb"), at("out.db"), PASSWORD);

    await outcome.join?.({ asPrimary: false });
    await outcome.join?.({ asPrimary: false });

    expect(JSON.parse(mockSecure.get("bati.backup.keyring") ?? "[]")).toHaveLength(1);
  });

  test("a fingerprint prompt that was cancelled does not claim the words can be shown again", async () => {
    mockBiometrics = true;
    mockRejectSet = "bati.backup.recovery";

    await c.enableEncryption(PASSWORD, "en");

    expect(await c.canShowRecoveryKeyAgain()).toBe(false);
    expect(await c.readRecoveryKey()).toBeNull();
  });

  describe("the words this phone kept", () => {
    const OTHER = "a different password, long enough";

    test("survive this phone reading its own file", async () => {
      mockBiometrics = true;
      await sealedWith();

      expect(await open("backup.batb", "out.db")).toBe("opened");

      expect(await c.canShowRecoveryKeyAgain()).toBe(true);
    });

    test("survive another device that only changed the password, and go when it changed the words", async () => {
      mockBiometrics = true;
      await sealedWith();
      await joinedPhoneB();
      await c.rewrapPassword(OTHER);
      await c.sealBackup(at("plain.db"), at("pw.batb"));
      await c.rewrapWords("en");
      await c.sealBackup(at("plain.db"), at("words.batb"));

      phone("A");
      const before = await c.sealingHeader();
      expect(await open("pw.batb", "a.db")).toBe("opened");
      expect(await c.sealingHeader()).not.toBe(before);
      expect(await c.canShowRecoveryKeyAgain()).toBe(true);

      expect(await open("words.batb", "b.db")).toBe("opened");
      expect(await c.canShowRecoveryKeyAgain()).toBe(false);
    });
  });
});

describe("error branches: format 2 and files that only look like ours", () => {
  const FIXTURE = path.join(__dirname, "fixtures", "backup", "v2-small.batb");
  const ENTRY = {
    key: "+Cc5km7Bkp/4bOWBR2eykIZeBnhbS/nE7ECTzfI14Bw=",
    recovery: "e5f7 9ad7 61de 2045 b221 256f efe6 7eca df5e e6c0 a0e9 e70b 6efd f639 b570 908d",
  };
  const header = () => fs.readFileSync(FIXTURE).subarray(0, 196);
  const keepV2Vault = (bytes: Buffer = header()) =>
    mockSecure.set(
      "bati.backup.vault",
      JSON.stringify({ key: ENTRY.key, header: bytes.toString("base64") }),
    );

  test("a v2 file opens with its recovery key, however it is typed", async () => {
    const typed = ENTRY.recovery.toUpperCase().replaceAll(" ", "-");

    const outcome = await c.openBackup(FIXTURE, at("out.db"), typed);

    expect(outcome).toMatchObject({ result: "opened", format: 2 });
    expect(fs.existsSync(at("out.db"))).toBe(true);
  });

  test("a v2 file refuses a wrong secret and writes nothing", async () => {
    const outcome = await c.openBackup(FIXTURE, at("out.db"), "not the password at all");

    expect(outcome).toEqual({ result: "wrongSecret", format: 2 });
    expect(fs.existsSync(at("out.db"))).toBe(false);
  });

  test("a stored v2 header of another version is no vault: not on, nothing sealed", async () => {
    const odd = Buffer.from(header());
    odd[4] = 1;
    keepV2Vault(odd);

    expect(await c.encryptionStatus()).toBe("off");
    await expect(c.sealBackup(at("plain.db"), at("out.batb"))).rejects.toThrow("Encryption is off");
    expect(fs.existsSync(at("out.batb"))).toBe(false);
  });

  test("a v2 vault seals in format 2 with its own header, and opens that file back", async () => {
    keepV2Vault();

    await c.sealBackup(at("plain.db"), at("v2.batb"));

    expect(fs.readFileSync(at("v2.batb")).subarray(0, 196)).toEqual(header());
    expect(await c.openBackup(at("v2.batb"), at("out.db"))).toMatchObject({
      result: "opened",
      format: 2,
      viaKeyring: false,
    });
    expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);
  });

  test("a v3 file under a v2 vault's key opens, and adopts no slot into a vault that has none", async () => {
    await sealedWith();
    const slots = (await headerOf("backup.batb")).slots.map((s: { raw: string }) => s.raw);
    keepV2Vault();
    await nodeBatiCrypto.sealFileV3(
      ENTRY.key,
      at("plain.db"),
      at("v3.batb"),
      slots,
      "0190a00000007000800000000000000a",
      "1",
    );
    const before = mockSecure.get("bati.backup.vault");

    const outcome = await c.openBackup(at("v3.batb"), at("out.db"));

    expect(outcome).toMatchObject({ result: "opened", format: 3, viaKeyring: false });
    expect(mockSecure.get("bati.backup.vault")).toBe(before);
  });

  test.each([0, 1])("a BATB file of version %i is not an encrypted backup", async (version) => {
    fs.writeFileSync(
      at("old.batb"),
      Buffer.concat([Buffer.from("BATB"), Buffer.of(version, 0, 0, 0)]),
    );

    expect(await c.openBackup(at("old.batb"), at("out.db"))).toEqual({ result: "notEncrypted" });
    expect(fs.existsSync(at("out.db"))).toBe(false);
  });

  test("a recovery key too short to hold four digits formats to nothing, not to a throw", () => {
    expect(c.formatRecoveryKey("abc")).toBe("");
    expect(c.formatRecoveryKey("abcd1234")).toBe("abcd 1234");
  });
});
