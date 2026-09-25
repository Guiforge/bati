import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { pbkdf2Calls } from "./helpers/nodeBatiCrypto";

/**
 * The device is doubled twice, never the code under test: the crypto module by Node's own AES-GCM
 * and PBKDF2 (helpers/nodeBatiCrypto.ts), SecureStore by a Map. Every test encrypts and decrypts
 * real bytes. "A new phone" is the Map cleared: that is exactly what a phone that never saw this
 * hero holds, since the key is excluded from Android's backup.
 */
const mockSecure = new Map<string, string>();
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
  mockBiometrics = false;
  pbkdf2Calls.length = 0;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-cipher-"));
  fs.writeFileSync(at("plain.db"), PLAIN);
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/** Encryption on, one file sealed with it, and the recovery key the hero was shown. */
async function sealedWith(password: string) {
  const recovery = await enableEncryption(password);
  await sealBackup(at("plain.db"), at("backup.batb"));
  return recovery;
}

const newPhone = () => mockSecure.clear();

test("a sealed file is not the plaintext, and this phone opens it without asking", async () => {
  await sealedWith("correct horse");
  expect(fs.readFileSync(at("backup.batb")).includes(Buffer.from("pretend"))).toBe(false);
  expect(await isEncryptedBackup(at("backup.batb"))).toBe(true);

  expect(await openBackup(at("backup.batb"), at("out.db"))).toBe("opened");
  expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);
});

test("the password is stretched at OWASP's PBKDF2 floor", async () => {
  await enableEncryption("correct horse");
  expect(pbkdf2Calls).toEqual([PASSWORD_ITERATIONS]);
  expect(PASSWORD_ITERATIONS).toBeGreaterThanOrEqual(600_000);
});

test("a new phone needs the password, refuses a wrong one, and joins with the right one", async () => {
  await sealedWith("correct horse");
  newPhone();

  expect(await encryptionStatus()).toBe("off");
  expect(await openBackup(at("backup.batb"), at("out.db"))).toBe("needsSecret");
  expect(await openBackup(at("backup.batb"), at("out.db"), "battery staple")).toBe("wrongSecret");
  expect(fs.existsSync(at("out.db"))).toBe(false);

  expect(await openBackup(at("backup.batb"), at("out.db"), "correct horse")).toBe("opened");
  expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);

  // Joined: encryption is on here now, under the same key, so the next open asks nothing and
  // what this phone writes opens with the same password on the other one.
  expect(await encryptionStatus()).toBe("on");
  fs.rmSync(at("out.db"));
  expect(await openBackup(at("backup.batb"), at("out.db"))).toBe("opened");
});

test("the recovery key opens a file however it was typed", async () => {
  const recovery = await sealedWith("correct horse");
  expect(recovery).toMatch(/^([0-9a-f]{4} ){15}[0-9a-f]{4}$/);
  newPhone();

  const sloppy = recovery.toUpperCase().replace(/ /g, "-");
  expect(normaliseRecoveryKey(sloppy)).not.toBeNull();
  expect(await openBackup(at("backup.batb"), at("out.db"), sloppy)).toBe("opened");
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
    const outcome = await openBackup(at("bad.batb"), at("out.db"), "correct horse").catch(
      () => "rejected",
    );
    expect(outcome).not.toBe("opened");
    expect(fs.existsSync(at("out.db"))).toBe(false);
  }
});

test("a new password opens new files, old files keep the old one, the recovery key opens both", async () => {
  const recovery = await sealedWith("old password");
  fs.renameSync(at("backup.batb"), at("before.batb"));
  await changePassword("new password");
  await sealBackup(at("plain.db"), at("after.batb"));

  newPhone();
  expect(await openBackup(at("after.batb"), at("a.db"), "old password")).toBe("wrongSecret");
  expect(await openBackup(at("after.batb"), at("a.db"), "new password")).toBe("opened");

  newPhone();
  expect(await openBackup(at("before.batb"), at("b.db"), "old password")).toBe("opened");

  newPhone();
  expect(await openBackup(at("after.batb"), at("c.db"), recovery)).toBe("opened");
});

test("a plain SQLite backup is not mistaken for an encrypted one", async () => {
  await enableEncryption("correct horse");
  expect(await isEncryptedBackup(at("plain.db"))).toBe(false);
  expect(await openBackup(at("plain.db"), at("out.db"))).toBe("notEncrypted");
});

test("turning encryption off stops sealing but still opens what was sealed", async () => {
  await sealedWith("correct horse");
  await disableEncryption();

  expect(await encryptionStatus()).toBe("off");
  await expect(sealBackup(at("plain.db"), at("x.batb"))).rejects.toThrow("Encryption is off");
  expect(await openBackup(at("backup.batb"), at("out.db"), "correct horse")).toBe("opened");
});

test("the recovery key can be shown again only when a fingerprint guards it", async () => {
  await enableEncryption("correct horse");
  expect(await readRecoveryKey()).toBeNull();

  mockSecure.clear();
  mockBiometrics = true;
  const recovery = await enableEncryption("correct horse");
  expect(await readRecoveryKey()).toBe(recovery);
});

test("a phone that joined one vault keeps its own key and remembers the other", async () => {
  await sealedWith("tablet password");
  fs.renameSync(at("backup.batb"), at("tablet.batb"));

  newPhone();
  await enableEncryption("phone password");
  expect(await openBackup(at("tablet.batb"), at("t.db"), "tablet password")).toBe("opened");

  fs.rmSync(at("t.db"));
  expect(await openBackup(at("tablet.batb"), at("t.db"))).toBe("opened");
  await sealBackup(at("plain.db"), at("phone.batb"));
  newPhone();
  expect(await openBackup(at("phone.batb"), at("p.db"), "phone password")).toBe("opened");
});
