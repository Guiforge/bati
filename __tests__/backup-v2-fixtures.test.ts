import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Backups the way this build writes them today, frozen, and opened by whatever build comes next.
 *
 * Format 2 is on hero phones and in their folders, on their servers and in their drawers, and it
 * must open for as long as Bati exists. Every other test seals a file and opens it with the same
 * code a moment later, which proves the two halves agree with each other and nothing about the
 * bytes: change the header layout and the PBKDF2 loop together and all of them stay green while
 * every file already written stops opening. These files were written once; the tests below only
 * read them, and a diff in `fixtures/backup` is the signal to stop.
 *
 * There is nothing to regenerate them with, on purpose: this build no longer writes format 2 (a new
 * vault is format 3), so these files can only ever be the ones the v2.9 code wrote. Deleting or
 * replacing one is saying that a hero's old backup may stop opening, and the commit that does it has
 * to say why.
 */
const mockSecure = new Map<string, string>();
const mockPrefs = new Map<string, string>();

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
  canUseBiometricAuthentication: () => false,
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
  enableEncryption,
  normaliseRecoveryKey,
  openBackup,
  sealBackup,
} from "@/src/backupCipher";
import { pbkdf2Calls } from "./helpers/nodeBatiCrypto";

const FIXTURES = path.join(__dirname, "fixtures", "backup");
const MANIFEST = path.join(FIXTURES, "v2-manifest.json");

/** One recipe for the plaintext, so a fixture stores a size and a digest, never a database. */
const plain = (size: number) =>
  Buffer.from(Array.from({ length: size }, (_, i) => (i * 131 + Math.floor(i / 97)) & 0xff));
const sha256 = (bytes: Buffer) => crypto.createHash("sha256").update(bytes).digest("hex");

type Entry = {
  file: string;
  size: number;
  sha256: string;
  password: string;
  /** The recovery key as the hero was shown it. */
  recovery: string;
  /**
   * The master key (base64) and the header's length: what BatiCryptoCore opens a file with. A test
   * key for a test file, kept so the Kotlin side can read these very bytes without the TypeScript
   * format code (see V2FixturesTest.kt).
   */
  key: string;
  headerLength: number;
  note: string;
};

const PASSWORD = "correct horse battery staple";
/** "Élodie-à-Noël" typed once as NFC (what the keyboard sends) and read back as NFD (what a Mac sends). */
const ACCENTED_NFC = "Élodie-à-Noël 2026".normalize("NFC");
const ACCENTED_NFD = ACCENTED_NFC.normalize("NFD");

const FILES = [
  "v2-small.batb",
  "v2-two-segments.batb",
  "v2-exact-segment.batb",
  "v2-accented.batb",
];

function freshPhone() {
  mockSecure.clear();
  mockPrefs.clear();
}

let dir: string;
const at = (name: string) => path.join(dir, name);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-v2-"));
  freshPhone();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

{
  const manifest: Entry[] = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

  describe("format 2 files, frozen", () => {
    test("the manifest names every recipe and its file is there", () => {
      expect(manifest.map((e) => e.file)).toEqual(FILES);
      for (const entry of manifest)
        expect(fs.existsSync(path.join(FIXTURES, entry.file))).toBe(true);
    });

    test.each(manifest)(
      "$file opens with its password on a phone that has never seen it",
      async (entry) => {
        const outcome = await openBackup(
          path.join(FIXTURES, entry.file),
          at("out"),
          entry.password,
        );

        expect(outcome.result).toBe("opened");
        const bytes = fs.readFileSync(at("out"));
        expect(bytes.length).toBe(entry.size);
        expect(sha256(bytes)).toBe(entry.sha256);
      },
    );

    test.each(manifest)("$file opens with its recovery key, however it is typed", async (entry) => {
      const typed = entry.recovery.toLowerCase().replaceAll(" ", "").replaceAll("-", "");
      expect(normaliseRecoveryKey(entry.recovery)).not.toBeNull();

      const outcome = await openBackup(path.join(FIXTURES, entry.file), at("out"), typed);

      expect(outcome.result).toBe("opened");
      expect(sha256(fs.readFileSync(at("out")))).toBe(entry.sha256);
    });

    test.each(manifest)(
      "$file refuses a wrong password and leaves nothing behind",
      async (entry) => {
        const outcome = await openBackup(path.join(FIXTURES, entry.file), at("out"), "not the one");

        expect(outcome.result).toBe("wrongSecret");
        expect(fs.existsSync(at("out"))).toBe(false);
      },
    );

    test("an accented password opens from the NFD a Mac would send, too", async () => {
      const entry = manifest.find((e) => e.file === "v2-accented.batb");
      expect(entry).toBeDefined();
      expect(ACCENTED_NFD).not.toBe(ACCENTED_NFC);

      const outcome = await openBackup(
        path.join(FIXTURES, "v2-accented.batb"),
        at("out"),
        ACCENTED_NFD,
      );

      expect(outcome.result).toBe("opened");
      expect(sha256(fs.readFileSync(at("out")))).toBe(entry?.sha256);
    });

    test("a header asking for absurd work, or a slot kind nobody wrote, is not a backup", async () => {
      const good = fs.readFileSync(path.join(FIXTURES, "v2-small.batb"));

      const heavy = Buffer.from(good);
      heavy.writeUInt32BE(0x7fffffff, 7); // the first slot's iterations
      fs.writeFileSync(at("heavy.batb"), heavy);
      expect((await openBackup(at("heavy.batb"), at("out"), PASSWORD)).result).toBe("notEncrypted");

      const alien = Buffer.from(good);
      alien[6] = 9; // the first slot's kind
      fs.writeFileSync(at("alien.batb"), alien);
      expect((await openBackup(at("alien.batb"), at("out"), PASSWORD)).result).toBe("notEncrypted");
    });

    test("opening one with its password stretches it at the PBKDF2 floor it was written with", async () => {
      pbkdf2Calls.length = 0;
      await openBackup(path.join(FIXTURES, "v2-small.batb"), at("out"), PASSWORD);
      expect(pbkdf2Calls).toEqual([600_000]);
    });

    test("a phone whose password changed since still opens it with no question: the key is in its keyring", async () => {
      const entry = manifest[0];
      expect(entry).toBeDefined();
      if (!entry) return;
      // This phone learns the file's key once, as a device reading another's file, and not as its own...
      const joined = await openBackup(path.join(FIXTURES, entry.file), at("first"), entry.password);
      await joined.join?.({ asPrimary: false });
      // ...then has a vault of its own, under a new password, which is the usual way a key is retired.
      await enableEncryption("a different password entirely", "en");
      fs.rmSync(at("first"));

      const outcome = await openBackup(path.join(FIXTURES, entry.file), at("out"));

      expect(outcome.result).toBe("opened");
      expect(sha256(fs.readFileSync(at("out")))).toBe(entry.sha256);
    });

    test("a phone that changed its password after sealing still opens its own old file", async () => {
      freshPhone();
      await enableEncryption(PASSWORD, "en");
      fs.writeFileSync(at("plain"), plain(64));
      await sealBackup(at("plain"), at("sealed"));
      await changePassword("another password, a new key", "en");

      const outcome = await openBackup(at("sealed"), at("out"));

      expect(outcome.result).toBe("opened");
      expect(fs.readFileSync(at("out"))).toEqual(plain(64));
    });
  });
}
