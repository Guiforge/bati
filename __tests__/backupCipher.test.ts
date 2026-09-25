import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { pbkdf2Calls } from "./helpers/nodeBatiCrypto";

/**
 * The device is doubled, never the code under test: the crypto module by Node's own AES-GCM and
 * PBKDF2 (helpers/nodeBatiCrypto.ts), SecureStore and the preferences table by Maps. Every test
 * encrypts and decrypts real bytes.
 *
 * Two kinds of "other phone": `newPhone` knows nothing of this hero (both Maps empty), and
 * `restoredPhone` is what Android's own backup produces, the database back and SecureStore not,
 * since the key is excluded from that backup.
 */
const mockSecure = new Map<string, string>();
const mockPrefs = new Map<string, string>();
let mockBiometrics = false;

jest.mock("@/modules/bati-crypto", () => ({
  batiCrypto: () => require("./helpers/nodeBatiCrypto").nodeBatiCrypto,
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string) => Promise.resolve(mockSecure.get(key) ?? null),
  setItemAsync: (key: string, value: string) =>
    Promise.resolve().then(() => {
      mockSecure.set(key, value);
    }),
  deleteItemAsync: (key: string) =>
    Promise.resolve().then(() => {
      mockSecure.delete(key);
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

import {
  changePassword,
  disableEncryption,
  enableEncryption,
  encryptionStatus,
  isEncryptedBackup,
  normaliseRecoveryKey,
  openBackup,
  PASSWORD_ITERATIONS,
  readRecoveryKey,
  sealBackup,
} from "@/src/backupCipher";

let dir: string;
const at = (name: string) => path.join(dir, name);
const PLAIN = "SQLite format 3\u0000 pretend this is a whole hero";

beforeEach(() => {
  mockSecure.clear();
  mockPrefs.clear();
  mockBiometrics = false;
  pbkdf2Calls.length = 0;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-cipher-"));
  fs.writeFileSync(at("plain.db"), PLAIN);
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/** Encryption on, one file sealed with it, and the recovery key the hero was shown. */
async function sealedWith(password: string, file = "backup.batb") {
  const recovery = await enableEncryption(password);
  await sealBackup(at("plain.db"), at(file));
  return recovery;
}

const newPhone = () => {
  mockSecure.clear();
  mockPrefs.clear();
};
const restoredPhone = () => mockSecure.clear();
const open = (file: string, out: string, secret?: string) =>
  openBackup(at(file), at(out), secret).then((o) => o.result);

test("a sealed file is not the plaintext, and this phone opens it without asking", async () => {
  await sealedWith("correct horse");
  expect(fs.readFileSync(at("backup.batb")).includes(Buffer.from("pretend"))).toBe(false);
  expect(await isEncryptedBackup(at("backup.batb"))).toBe(true);

  expect(await open("backup.batb", "out.db")).toBe("opened");
  expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);
});

test("the password is stretched at OWASP's PBKDF2 floor", async () => {
  await enableEncryption("correct horse");
  expect(pbkdf2Calls).toEqual([PASSWORD_ITERATIONS]);
  expect(PASSWORD_ITERATIONS).toBeGreaterThanOrEqual(600_000);
});

test("a new phone needs the password, refuses a wrong one, and adopts nothing on its own", async () => {
  await sealedWith("correct horse");
  newPhone();

  expect(await encryptionStatus()).toBe("off");
  expect(await open("backup.batb", "out.db")).toBe("needsSecret");
  expect(await open("backup.batb", "out.db", "battery staple")).toBe("wrongSecret");
  expect(fs.existsSync(at("out.db"))).toBe(false);

  const outcome = await openBackup(at("backup.batb"), at("out.db"), "correct horse");
  expect(outcome.result).toBe("opened");
  expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);
  // Opening is not joining: someone else's file must never quietly become this phone's key.
  expect(await encryptionStatus()).toBe("off");

  await outcome.join?.({ asPrimary: true });
  expect(await encryptionStatus()).toBe("on");
  fs.rmSync(at("out.db"));
  expect(await open("backup.batb", "out.db")).toBe("opened");
});

test("the recovery key opens a file however it was typed", async () => {
  const recovery = await sealedWith("correct horse");
  expect(recovery).toMatch(/^([0-9a-f]{4} ){15}[0-9a-f]{4}$/);
  newPhone();

  const sloppy = recovery.toUpperCase().replace(/ /g, "-");
  expect(normaliseRecoveryKey(sloppy)).not.toBeNull();
  expect(await open("backup.batb", "out.db", sloppy)).toBe("opened");
});

test("an accented password is the same password however the keyboard composed it", async () => {
  await sealedWith("café crème");
  newPhone();
  // NFD: "e" followed by a combining accent, what another keyboard may send for the same word.
  expect(await open("backup.batb", "out.db", "café crème")).toBe("opened");
});

test("one changed byte anywhere refuses the file and leaves nothing behind", async () => {
  await sealedWith("correct horse");
  const good = fs.readFileSync(at("backup.batb"));

  for (const offset of [7, 40, good.length - 30, good.length - 1]) {
    const bad = Buffer.from(good);
    bad[offset] = (bad[offset] ?? 0) ^ 1;
    fs.writeFileSync(at("bad.batb"), bad);

    // A header byte fails the key check, so no key opens it; a body byte passes the check and
    // fails the tag while decrypting, which rejects.
    const outcome = await open("bad.batb", "out.db", "correct horse").catch(() => "rejected");
    expect(outcome).not.toBe("opened");
    expect(fs.existsSync(at("out.db"))).toBe(false);
  }
});

test("a header asking for absurd work, or a slot kind nobody wrote, is not a backup", async () => {
  await sealedWith("correct horse");
  const good = fs.readFileSync(at("backup.batb"));

  const heavy = Buffer.from(good);
  heavy.writeUInt32BE(0x7fffffff, 7); // the first slot's iterations
  fs.writeFileSync(at("heavy.batb"), heavy);
  expect(await open("heavy.batb", "out.db", "correct horse")).toBe("notEncrypted");

  const alien = Buffer.from(good);
  alien[6] = 9; // the first slot's kind
  fs.writeFileSync(at("alien.batb"), alien);
  expect(await open("alien.batb", "out.db", "correct horse")).toBe("notEncrypted");
  expect(pbkdf2Calls).toEqual([PASSWORD_ITERATIONS]);
});

test("a new password is a new key: the old one no longer opens what is written after", async () => {
  const oldRecovery = await sealedWith("old password", "before.batb");
  const newRecovery = await changePassword("new password");
  await sealBackup(at("plain.db"), at("after.batb"));
  expect(newRecovery).not.toBe(oldRecovery);

  // This phone still opens both: the old key went to its keyring.
  expect(await open("before.batb", "a.db")).toBe("opened");
  expect(await open("after.batb", "b.db")).toBe("opened");

  newPhone();
  expect(await open("after.batb", "c.db", "old password")).toBe("wrongSecret");
  expect(await open("after.batb", "c.db", oldRecovery)).toBe("wrongSecret");
  expect(await open("after.batb", "c.db", "new password")).toBe("opened");
  newPhone();
  expect(await open("after.batb", "d.db", newRecovery)).toBe("opened");
  newPhone();
  expect(await open("before.batb", "e.db", "old password")).toBe("opened");
});

test("a plain SQLite backup is not mistaken for an encrypted one", async () => {
  await enableEncryption("correct horse");
  expect(await isEncryptedBackup(at("plain.db"))).toBe(false);
  expect(await open("plain.db", "out.db")).toBe("notEncrypted");
});

test("turning encryption off stops sealing and forgets every key this phone held", async () => {
  await sealedWith("correct horse");
  await disableEncryption();

  expect(await encryptionStatus()).toBe("off");
  await expect(sealBackup(at("plain.db"), at("x.batb"))).rejects.toThrow("Encryption is off");
  expect(await open("backup.batb", "out.db")).toBe("needsSecret");
  expect(await open("backup.batb", "out.db", "correct horse")).toBe("opened");
});

test("a phone Android restored without its key is locked, never plain", async () => {
  await sealedWith("correct horse");
  restoredPhone();
  expect(await encryptionStatus()).toBe("locked");
  await expect(sealBackup(at("plain.db"), at("x.batb"))).rejects.toThrow();
});

test("the recovery key can be shown again only when a fingerprint guards it", async () => {
  await enableEncryption("correct horse");
  expect(await readRecoveryKey()).toBeNull();

  mockSecure.clear();
  mockBiometrics = true;
  const recovery = await enableEncryption("correct horse");
  expect(await readRecoveryKey()).toBe(recovery);
});

test("joining as primary takes the other device's key; otherwise it is only remembered", async () => {
  await sealedWith("tablet password", "tablet.batb");

  newPhone();
  await enableEncryption("phone password");
  const read = await openBackup(at("tablet.batb"), at("t.db"), "tablet password");
  await read.join?.({ asPrimary: false });
  // Remembered: opens without asking. Not adopted: this phone still writes under its own.
  fs.rmSync(at("t.db"));
  expect(await open("tablet.batb", "t.db")).toBe("opened");
  await sealBackup(at("plain.db"), at("phone.batb"));

  newPhone();
  expect(await open("phone.batb", "p.db", "phone password")).toBe("opened");

  newPhone();
  await enableEncryption("phone password");
  const joined = await openBackup(at("tablet.batb"), at("j.db"), "tablet password");
  await joined.join?.({ asPrimary: true });
  await sealBackup(at("plain.db"), at("joined.batb"));
  newPhone();
  expect(await open("joined.batb", "k.db", "tablet password")).toBe("opened");
});
