import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

/**
 * The files the release bench captured from real emulators running real release builds, frozen in
 * `fixtures/backup/emulator` (see its README and test/bench/capture_fixtures.py), opened here by the
 * real `src/backupCipher.ts` with the secrets the hero was shown.
 *
 * What this adds to the other frozen files: these were written by the *device* (Kotlin through the
 * Expo bridge, R8 on), not by a Node double, so they pin the bytes a phone really writes. The
 * 2.9 file is the one a hero on the previous release has in their folder today.
 *
 * Nothing regenerates them. A diff in that folder is the signal to stop.
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

import { openBackup } from "@/src/backupCipher";

const DIR = path.join(__dirname, "fixtures", "backup", "emulator");
const MANIFEST = path.join(DIR, "manifest.json");

type Entry = {
  id: string;
  file: string;
  format: 2 | 3;
  password: string;
  recovery?: string;
  words?: string[];
  sessions: string[];
  size: number;
  sha256: string;
};

const entries: Entry[] = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
let work: string;
const at = (name: string) => path.join(work, name);

const sessionsIn = (file: string): string[] => {
  const db = new Database(file, { readonly: true });
  try {
    return (
      db.prepare("SELECT uuid FROM completed_sessions WHERE uuid IS NOT NULL").all() as {
        uuid: string;
      }[]
    )
      .map((row) => row.uuid)
      .sort();
  } finally {
    db.close();
  }
};

beforeEach(() => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), "bati-emulator-"));
  mockSecure.clear();
  mockPrefs.clear();
});
afterEach(() => fs.rmSync(work, { recursive: true, force: true }));

describe("the files captured from emulators", () => {
  test("the manifest names four recipes and every file is there, byte for byte", () => {
    expect(entries.map((e) => e.id)).toEqual(["F1", "F2", "F2b", "F3"]);
    for (const entry of entries) {
      const bytes = fs.readFileSync(path.join(DIR, entry.file));
      expect(bytes.length).toBe(entry.size);
      expect(require("node:crypto").createHash("sha256").update(bytes).digest("hex")).toBe(
        entry.sha256,
      );
    }
  });

  describe.each(entries)("$id ($file)", (entry) => {
    const file = path.join(DIR, entry.file);

    test("opens with its password, and the database inside is the hero's", async () => {
      const opened = await openBackup(file, at("out.db"), entry.password);
      expect(opened.result).toBe("opened");
      expect(opened.format).toBe(entry.format);
      expect(sessionsIn(at("out.db"))).toEqual([...entry.sessions].sort());
    });

    test("opens with the recovery the hero was shown", async () => {
      const secret = entry.format === 2 ? (entry.recovery ?? "") : (entry.words ?? []).join(" ");
      const opened = await openBackup(file, at("out.db"), secret);
      expect(opened.result).toBe("opened");
      expect(sessionsIn(at("out.db"))).toEqual([...entry.sessions].sort());
    });

    test("refuses a wrong password and writes nothing", async () => {
      const opened = await openBackup(file, at("out.db"), "not the password at all, 15+");
      expect(opened.result).toBe("wrongSecret");
      expect(fs.existsSync(at("out.db"))).toBe(false);
    });
  });

  test("the second phone's file is another install's, with the first phone's sessions inside", () => {
    const f2 = entries.find((e) => e.id === "F2");
    const f3 = entries.find((e) => e.id === "F3");
    expect(f3?.sessions.length).toBeGreaterThan(f2?.sessions.length ?? 99);
    expect(f3?.sessions).toEqual(expect.arrayContaining(f2?.sessions ?? ["missing"]));
    expect((f3 as unknown as { installId: string }).installId).not.toBe(
      (f2 as unknown as { installId: string }).installId,
    );
  });
});
