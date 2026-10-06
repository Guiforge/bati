/**
 * `src/backupFiles.ts` is the only part of backup that touches the filesystem, and the only part
 * where a mistake costs the hero their history rather than an error message. It was covered "by
 * reading" until a review found that the swap it performed was not the swap its docstring
 * described — so it is covered by running now.
 *
 * The fake filesystem lives *inside* the `jest.mock` factory because babel hoists these calls
 * above every declaration in the file; a class defined at module scope is still in its temporal
 * dead zone when the factory runs. The test reaches its state back through the mocked module.
 *
 * It reproduces the one behaviour the bug turned on: `move` with `overwrite` **deletes the
 * destination before it renames**, exactly like expo-file-system's
 * `CopyMoveStrategy.LocalFile.prepareAsDestination`. A mock treating the move as one atomic step
 * would be green on the broken version, which is the only reason the deletion is modelled at all.
 */

jest.mock("expo-file-system", () => {
  /** uri, always without the `file://` prefix → contents. */
  const disk = new Map<string, string>();
  const ops: string[] = [];
  /** A filename; the next move *into* it throws, the way a full disk would. */
  const control: { failMoveInto: string | null; sizes: Record<string, number> } = {
    failMoveInto: null,
    sizes: {},
  };

  const strip = (uri: string) => uri.replace("file://", "");

  class File {
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    get path() {
      return strip(this.uri);
    }

    get name() {
      return this.path.split("/").pop() ?? "";
    }

    get exists() {
      return disk.has(this.path);
    }

    /** What the provider says the file weighs: a test names a size, the rest weigh nothing. */
    get size() {
      return control.sizes[this.name] ?? 0;
    }

    delete() {
      ops.push(`delete ${this.name}`);
      disk.delete(this.path);
    }

    // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
    async copy(destination: File | Directory, options?: { overwrite?: boolean }) {
      if (mockCopy.refuse) throw new Error("No space left on device (ENOSPC)");
      // Copying into a *directory* keeps this file's name, which is the whole reason
      // `saveBackupToFolder` can hand the picked folder straight to `copy`.
      const target =
        destination instanceof Directory
          ? `${strip(destination.uri)}/${this.name}`
          : destination.path;
      ops.push(`copy ${this.name} -> ${target}`);

      // The real one rejects with "Destination already exists" rather than overwriting. This
      // mock used to overwrite silently, which is exactly why the second save into the same
      // folder on the same day reached a device before it reached a test.
      if (disk.has(target) && !options?.overwrite) {
        throw new Error(`Destination already exists: ${target}`);
      }

      disk.set(target, disk.get(this.path) ?? "");
    }

    // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
    async move(destination: File, options?: { overwrite?: boolean }) {
      ops.push(`move ${this.name} -> ${destination.name}`);

      if (disk.has(destination.path)) {
        if (!options?.overwrite) throw new Error(`destination exists: ${destination.name}`);
        // The real implementation clears the destination *first*. See the header.
        disk.delete(destination.path);
      }

      if (control.failMoveInto === destination.name) {
        control.failMoveInto = null;
        throw new Error("no space left on device");
      }

      disk.set(destination.path, disk.get(this.path) ?? "");
      disk.delete(this.path);
      this.uri = destination.uri;
    }

    static pickFileAsync = jest.fn();
  }

  class Directory {
    static pickDirectoryAsync = jest.fn();

    // A plain field, not a TS parameter property: babel's jest-hoist plugin reads the latter as
    // an out-of-scope variable access and refuses the whole factory.
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    list() {
      const prefix = `${strip(this.uri)}/`;
      return (
        [...disk.keys()]
          .filter((key) => key.startsWith(prefix))
          // A key that already carries a scheme is a Storage Access Framework entry and keeps
          // its URI verbatim; only local paths get the `file://` back.
          .map((key) => new File(key.includes("://") ? key : `file://${key}`))
      );
    }
  }

  return { File, Directory, __disk: disk, __ops: ops, __control: control };
});

/** What the native Save-as was asked, in order, and what it answers. */
const mockSave: {
  calls: string[];
  picked: string | null;
  pickThrows: Error | null;
  writeThrows: Error | null;
  /** The provider takes the snapshot away when it writes (a move, not a copy). */
  consumes: boolean;
  name: string;
} = {
  calls: [],
  picked: "content://docs/d1",
  pickThrows: null,
  writeThrows: null,
  consumes: false,
  name: "x",
};
jest.mock("@/modules/bati-save", () => ({
  NO_FILE_PICKER: "NO_FILE_PICKER",
  batiSave: () => ({
    pickTarget: (name: string) => {
      mockSave.calls.push(`pick ${name}`);
      return mockSave.pickThrows
        ? Promise.reject(mockSave.pickThrows)
        : Promise.resolve(mockSave.picked);
    },
    discard: (uri: string) => {
      mockSave.calls.push(`discard ${uri}`);
      return Promise.resolve();
    },
    writeTo: (uri: string, source: string) => {
      const fs = require("expo-file-system") as FakeFs;
      // The snapshot must exist by now, and be the one that was made after the picker.
      mockSave.calls.push(`write ${uri} exists=${fs.__disk.has(source.replace("file://", ""))}`);
      if (mockSave.consumes) fs.__disk.delete(source.replace("file://", ""));
      return mockSave.writeThrows
        ? Promise.reject(mockSave.writeThrows)
        : Promise.resolve({ name: mockSave.name, bytes: 9 });
    },
  }),
}));

const mockSharingAvailable = jest.fn(async () => true);
jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => mockSharingAvailable(),
  shareAsync: () => {
    (require("expo-file-system") as FakeFs).__ops.push("share");
    return Promise.resolve();
  },
}));

// The literals are repeated rather than shared with the constants below: babel hoists every
// `jest.mock` above the imports, and `src/backupFiles.ts` reads `defaultDatabaseDirectory` at
// module scope — so a `const` declared here would still be in its dead zone and arrive undefined.
jest.mock("expo-sqlite", () => ({ defaultDatabaseDirectory: "/data/SQLite" }));

jest.mock("@/db/client", () => ({
  DB_NAME: "bati.v3.db",
  SAFETY_NAME: "bati.v3.db.bak",
  closeDatabase: () => {
    (require("expo-file-system") as FakeFs).__ops.push("close");
    return Promise.resolve(!(globalThis as { mockCloseFails?: boolean }).mockCloseFails);
  },
  // The real one queues behind in-flight transactions; there are none here.
  serializeOnDatabase: <T>(fn: () => Promise<T>) => fn(),
}));

/** A copy into the chosen folder that the provider refuses (a full quota). */
const mockCopy = { refuse: false };

/** A `VACUUM INTO` that runs out of room after writing part of the copy, and its journal. */
const mockSnapshot = { failHalfway: false };

jest.mock("@/db/backup", () => ({
  snapshotDatabaseTo: (destination: string) => {
    const fs = require("expo-file-system") as FakeFs;
    if (mockSnapshot.failHalfway) {
      fs.__disk.set(destination, "half a vacuum");
      fs.__disk.set(`${destination}-journal`, "its journal");
      return Promise.reject(new Error("database or disk is full"));
    }
    // Like `VACUUM INTO`, which refuses a file that is already there.
    if (fs.__disk.has(destination)) return Promise.reject(new Error("output file already exists"));
    fs.__ops.push(`snapshot ${destination.split("/").pop()}`);
    fs.__disk.set(destination, "snapshot");
    return Promise.resolve();
  },
}));

jest.mock("@/db/schemaVersion", () => ({ SCHEMA_VERSION: 3 }));

/** This device's tag in a file name. `null` is a keystore that is down: the pre-tag names. */
const mockTag: { value: string | null } = { value: null };
jest.mock("@/src/installId", () => ({
  ...jest.requireActual("@/src/installId"),
  shortInstallId: () => Promise.resolve(mockTag.value),
}));

/**
 * The cipher is tested for real in backupCipher.test.ts; here it only has to leave the same marks
 * on the fake disk: a sealed file is "sealed:" plus what it sealed, and opening one writes the
 * plaintext back. `mockCipher.status` is what the hero chose in Settings.
 */
const mockCipher: { status: "off" | "on" | "locked"; open: string; sealFails: boolean } = {
  status: "off",
  open: "opened",
  sealFails: false,
};
/** How many seals run at once: they share one plaintext scratch file, so it must stay at one. */
const mockSeals = { running: 0, most: 0 };
jest.mock("@/src/backupCipher", () => {
  const disk = () => (require("expo-file-system") as FakeFs).__disk;
  return {
    MAX_SEALED_BYTES: 256 * 1024 * 1024,
    encryptionStatus: () => Promise.resolve(mockCipher.status),
    sealBackup: async (plain: string, out: string) => {
      mockSeals.running += 1;
      mockSeals.most = Math.max(mockSeals.most, mockSeals.running);
      try {
        await new Promise((resolve) => setTimeout(resolve, 15));
        if (mockCipher.sealFails) throw new Error("seal failed");
        disk().set(out, `sealed:${disk().get(plain)}`);
      } finally {
        mockSeals.running -= 1;
      }
    },
    openBackup: (sealed: string, out: string) =>
      Promise.resolve().then(() => {
        if (mockCipher.open === "opened") {
          disk().set(out, String(disk().get(sealed)).replace(/^sealed:/, ""));
        }
        return { result: mockCipher.open };
      }),
  };
});

import type { Directory } from "expo-file-system";

import {
  clearPeerScratch,
  commitRestore,
  decryptStagedImport,
  discardStagedImport,
  exportBackup,
  peerScratch,
  pendingSyncSnapshot,
  pickBackupFolder,
  preRestoreFileStem,
  saveBackupAs,
  saveBackupToFolder,
  stageBackupForImport,
  writePreMigrationCopy,
  writeSyncSnapshot,
} from "@/src/backupFiles";
import { PEER_FILE } from "@/src/installId";

type FakeFs = {
  File: { new (uri: string): object; pickFileAsync: jest.Mock };
  // Typed as the real `Directory` rather than `object`, because `saveBackupToFolder` now takes
  // one as an argument. The fake implements the two members this file exercises — `uri` and
  // `list()` — so anything else reaching for the real API fails loudly here, which is the point.
  Directory: { new (uri: string): Directory; pickDirectoryAsync: jest.Mock };
  __disk: Map<string, string>;
  __ops: string[];
  __control: { failMoveInto: string | null; sizes: Record<string, number> };
};

const fs = require("expo-file-system") as FakeFs;

const mockDbDir = "/data/SQLite";
const mockDbName = "bati.v3.db";
const IMPORT_NAME = "bati-import.tmp.db";
const SAFETY_NAME = `${mockDbName}.bak`;

function at(name: string) {
  return `${mockDbDir}/${name}`;
}

function write(name: string, contents: string) {
  fs.__disk.set(at(name), contents);
}

/** What the picker hands back: a file living outside the database directory. */
function picks(contents: string) {
  fs.__disk.set("/downloads/backup.db", contents);
  fs.File.pickFileAsync.mockResolvedValue({
    canceled: false,
    result: new fs.File("file:///downloads/backup.db"),
  });
}

beforeEach(() => {
  mockTag.value = null;
  mockSave.calls = [];
  mockSave.picked = "content://docs/d1";
  mockSave.pickThrows = null;
  mockSave.writeThrows = null;
  mockSave.consumes = false;
  mockSave.name = "bati-export-v3-2026-10-04.db";
  mockCipher.status = "off";
  mockCipher.sealFails = false;
  mockSeals.running = 0;
  mockSeals.most = 0;
  fs.__disk.clear();
  fs.__ops.length = 0;
  fs.__control.failMoveInto = null;
  fs.__control.sizes = {};
  mockSharingAvailable.mockImplementation(async () => true);
  fs.File.pickFileAsync.mockReset();
  fs.Directory.pickDirectoryAsync.mockReset();
});

describe("commitRestore — the swap", () => {
  beforeEach(() => {
    (globalThis as { mockCloseFails?: boolean }).mockCloseFails = false;
    write(mockDbName, "the hero's year");
    write(IMPORT_NAME, "the backup");
  });

  test("the database ends up holding the import, and the old one survives as .bak", async () => {
    await commitRestore();

    expect(fs.__disk.get(at(mockDbName))).toBe("the backup");
    expect(fs.__disk.get(at(SAFETY_NAME))).toBe("the hero's year");
    expect(fs.__disk.has(at(IMPORT_NAME))).toBe(false);
  });

  /**
   * The handle has to close before any file moves, and the sidecars have to go before the swap:
   * a `-journal` describing the *old* database gets rolled back into the new one on the next
   * launch. Asserting the end state alone passes on both mistakes.
   */
  test("closes the handle and drops the sidecars before it touches the database", async () => {
    write(`${mockDbName}-journal`, "stale");
    write(`${mockDbName}-wal`, "stale");

    await commitRestore();

    expect(fs.__ops.indexOf("close")).toBe(0);
    expect(fs.__ops.indexOf(`delete ${mockDbName}-journal`)).toBeLessThan(
      fs.__ops.indexOf(`move ${mockDbName} -> ${SAFETY_NAME}`),
    );
    expect(fs.__disk.has(at(`${mockDbName}-wal`))).toBe(false);
  });

  /**
   * The bug this replaced: moving the import *over* the live database deletes it first, so a
   * failed rename left no database at all while the screen said nothing had been replaced.
   */
  test("vacates the real name before the import claims it, never overwriting in place", async () => {
    await commitRestore();

    expect(fs.__ops.indexOf(`move ${mockDbName} -> ${SAFETY_NAME}`)).toBeLessThan(
      fs.__ops.indexOf(`move ${IMPORT_NAME} -> ${mockDbName}`),
    );
  });

  test("a failed swap puts the original back and reports the failure", async () => {
    fs.__control.failMoveInto = mockDbName;

    await expect(commitRestore()).rejects.toThrow("no space left on device");

    expect(fs.__disk.get(at(mockDbName))).toBe("the hero's year");
  });

  test("the previous .bak is expendable, the live database never is", async () => {
    write(SAFETY_NAME, "two restores ago");
    fs.__control.failMoveInto = mockDbName;

    await expect(commitRestore()).rejects.toThrow();

    // Losing the older `.bak` is the documented cost of keeping only one generation. Losing the
    // database it was standing in for is not.
    expect(fs.__disk.get(at(mockDbName))).toBe("the hero's year");
  });

  // A handle that would not close can still hold committed frames in its WAL. Deleting that file
  // threw them away from the database that becomes `.bak`, the rollback target.
  test("a handle that did not close parks its WAL with the database instead of deleting it", async () => {
    (globalThis as { mockCloseFails?: boolean }).mockCloseFails = true;
    write(`${mockDbName}-wal`, "committed frames");

    await commitRestore();

    expect(fs.__disk.get(at(`${SAFETY_NAME}-wal`))).toBe("committed frames");
    expect(fs.__disk.has(at(`${mockDbName}-wal`))).toBe(false);
    expect(fs.__disk.get(at(mockDbName))).toBe("the backup");
  });

  test("a failed swap after a parked WAL puts the WAL back too", async () => {
    (globalThis as { mockCloseFails?: boolean }).mockCloseFails = true;
    write(`${mockDbName}-wal`, "committed frames");
    fs.__control.failMoveInto = mockDbName;

    await expect(commitRestore()).rejects.toThrow();

    expect(fs.__disk.get(at(mockDbName))).toBe("the hero's year");
    expect(fs.__disk.get(at(`${mockDbName}-wal`))).toBe("committed frames");
  });

  test("a first restore with no database yet still lands, with nothing to roll back", async () => {
    fs.__disk.delete(at(mockDbName));

    await commitRestore();

    expect(fs.__disk.get(at(mockDbName))).toBe("the backup");
    expect(fs.__disk.has(at(SAFETY_NAME))).toBe(false);
  });
});

describe("exportBackup", () => {
  test("writes a dated snapshot and hands it to the share sheet", async () => {
    await exportBackup();

    const written = [...fs.__disk.keys()].map((key) => key.split("/").pop());
    expect(written).toEqual([expect.stringMatching(/^bati-export-v3-\d{4}-\d{2}-\d{2}\.db$/)]);
    expect(fs.__ops).toContain("share");
  });

  /**
   * Without a share sheet the file lands in app-private storage the user cannot reach, so a
   * silent success would toast "backup ready" for a file nobody can open. It also has to fail
   * *before* writing, or every failed export leaves a stale snapshot behind.
   */
  test("refuses before writing anything when no share sheet exists", async () => {
    mockSharingAvailable.mockImplementation(async () => false);

    await expect(exportBackup()).rejects.toThrow();

    expect(fs.__disk.size).toBe(0);
    expect(fs.__ops).not.toContain("share");
  });

  /**
   * Cleared before writing rather than after sharing: when `shareAsync` resolves the receiving
   * app may still be reading, and deleting it then would hand the user a truncated backup.
   */
  test("clears the previous snapshot instead of accumulating them", async () => {
    write("bati-export-v3-2020-01-01.db", "last year's");

    await exportBackup();

    expect(fs.__disk.has(at("bati-export-v3-2020-01-01.db"))).toBe(false);
    expect(fs.__disk.size).toBe(1);
  });

  test("leaves the database and any staged import alone", async () => {
    write(mockDbName, "the hero's year");
    write(IMPORT_NAME, "staged");

    await exportBackup();

    expect(fs.__disk.get(at(mockDbName))).toBe("the hero's year");
    expect(fs.__disk.get(at(IMPORT_NAME))).toBe("staged");
  });
});

describe("saveBackupToFolder", () => {
  test("writes the snapshot into the folder the hero picked", async () => {
    fs.Directory.pickDirectoryAsync.mockResolvedValue(new fs.Directory("file:///sdcard/Documents"));

    expect(await saveBackupToFolder()).toBe(true);

    const copied = [...fs.__disk.keys()].filter((key) => key.startsWith("/sdcard/Documents/"));
    expect(copied).toEqual([expect.stringMatching(/bati-export-v3-\d{4}-\d{2}-\d{2}\.db$/)]);
  });

  /**
   * The folder picker reports "backed out" by *throwing*, so a naive caller turns every
   * cancellation into "the backup could not be created" — and, worse, would already have written
   * a snapshot by then. Nothing is written until the picker resolves.
   */
  test("a cancelled picker is not a failure, and leaves no snapshot behind", async () => {
    fs.Directory.pickDirectoryAsync.mockRejectedValue(
      Object.assign(new Error("The file picker was cancelled by the user"), {
        code: "ERR_PICKER_CANCELLED",
      }),
    );

    expect(await saveBackupToFolder()).toBe(false);
    expect(fs.__disk.size).toBe(0);
  });

  test("a real picker failure still surfaces", async () => {
    fs.Directory.pickDirectoryAsync.mockRejectedValue(new Error("no activity found"));

    await expect(saveBackupToFolder()).rejects.toThrow("no activity found");
  });

  test("leaves the database alone", async () => {
    write(mockDbName, "the hero's year");
    fs.Directory.pickDirectoryAsync.mockResolvedValue(new fs.Directory("file:///sdcard/Documents"));

    await saveBackupToFolder();

    expect(fs.__disk.get(at(mockDbName))).toBe("the hero's year");
  });

  /**
   * Snapshots are named by the day, so saving twice into the same folder aims at a name that is
   * already taken — and the destination refuses rather than overwriting. It reached a device
   * before it reached a test, because this file's `copy` used to overwrite in silence.
   *
   * Replacing is the right answer: the file being replaced is this app's own backup, from the
   * same day, under a name only this app writes.
   */
  /**
   * The whole point of `src/autoBackup.ts`: a tree granted once, written into with no picker in
   * sight. If this ever opens the picker again, automatic backup becomes a dialog that appears
   * while the app is starting up.
   */
  test("writes into a folder it was handed, without opening the picker", async () => {
    const remembered = new fs.Directory("content://tree/primary%3ADocuments");

    expect(await saveBackupToFolder(remembered)).toBe(true);

    expect(fs.Directory.pickDirectoryAsync).not.toHaveBeenCalled();
    const copied = [...fs.__disk.keys()].filter((key) => key.startsWith("content://tree/"));
    expect(copied).toEqual([expect.stringMatching(/bati-export-v3-\d{4}-\d{2}-\d{2}\.db$/)]);
  });

  /**
   * Unattended writes accumulate, and these are whole databases in the hero's own storage. The
   * prune sorts on the *day* rather than the whole name, because `v3` and `v10` do not sort as
   * numbers — a name-ordered prune would start by deleting the newest schema's backups.
   */
  test("copies dated in the future (a clock that ran ahead) are neither kept as 'newest' nor deleted, and today's survives", async () => {
    const folder = new fs.Directory("file:///sdcard/Documents");
    const future = ["2099-01-01", "2099-01-02", "2099-01-03", "2099-01-04", "2099-01-05"];
    for (const day of future) fs.__disk.set(`/sdcard/Documents/bati-export-v3-${day}.db`, day);

    await saveBackupToFolder(folder);

    const names = [...fs.__disk.keys()].filter((key) => key.startsWith("/sdcard/Documents/"));
    for (const day of future) expect(names).toContain(`/sdcard/Documents/bati-export-v3-${day}.db`);
    expect(names.filter((n) => !n.includes("2099"))).toHaveLength(1);
  });

  test("keeps the five newest snapshots and deletes the older ones", async () => {
    const folder = new fs.Directory("file:///sdcard/Documents");
    for (const day of ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"]) {
      fs.__disk.set(`/sdcard/Documents/bati-export-v10-${day}.db`, day);
    }
    // Older than every v10 above, and lexicographically larger than all of them.
    fs.__disk.set("/sdcard/Documents/bati-export-v3-2025-12-01.db", "oldest");

    await saveBackupToFolder(folder);

    const kept = [...fs.__disk.keys()].filter((key) => key.startsWith("/sdcard/Documents/")).sort();
    expect(kept).toHaveLength(5);
    expect(kept).not.toContain("/sdcard/Documents/bati-export-v3-2025-12-01.db");
  });

  /**
   * The shape a real Storage Access Framework tree produces, which the `file://` tests above
   * cannot reach: children come back as **document** URIs whose whole document id is one
   * percent-encoded segment. `File.name` recovers the filename from that only when React
   * Native's partial `URL` polyfill happens to parse `content://` — so a prune anchored on
   * `name` matches nothing here, deletes nothing, and stays green on every `file://` test in
   * this file while doing nothing at all on a device.
   */
  test("prunes a Storage Access Framework tree, where the filename arrives percent-encoded", async () => {
    const tree = "content://com.android.externalstorage.documents/tree/primary%3ADocuments";
    const folder = new fs.Directory(tree);
    const asDocument = (name: string) =>
      `${tree}/document/${encodeURIComponent(`primary:Documents/${name}`)}`;

    const oldest = asDocument("bati-export-v3-2025-12-01.db");
    for (const day of ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"]) {
      fs.__disk.set(asDocument(`bati-export-v10-${day}.db`), day);
    }
    fs.__disk.set(oldest, "oldest");
    fs.__disk.set(asDocument("taxes-2025.pdf"), "not ours");

    await saveBackupToFolder(folder);

    const left = [...fs.__disk.keys()].filter((key) => key.startsWith(tree));
    expect(left).toHaveLength(6); // five snapshots kept, plus the hero's own file
    expect(left).not.toContain(oldest);
    expect(fs.__disk.get(asDocument("taxes-2025.pdf"))).toBe("not ours");
  });

  /**
   * The folder is the hero's, and may well be their Documents root. Pruning only ever considers
   * names this app writes — never "everything but the newest five files in here".
   */
  test("never deletes a file it did not write", async () => {
    const folder = new fs.Directory("file:///sdcard/Documents");
    for (const day of ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01"]) {
      fs.__disk.set(`/sdcard/Documents/bati-export-v3-${day}.db`, day);
    }
    fs.__disk.set("/sdcard/Documents/taxes-2025.pdf", "not ours");
    fs.__disk.set("/sdcard/Documents/bati-export-notes.txt", "not ours either");

    await saveBackupToFolder(folder);

    expect(fs.__disk.get("/sdcard/Documents/taxes-2025.pdf")).toBe("not ours");
    expect(fs.__disk.get("/sdcard/Documents/bati-export-notes.txt")).toBe("not ours either");
  });

  /**
   * The copy a restore takes of what it is about to replace. Pruning keeps five *daily* files,
   * and a hero who trains every day would roll the pre-restore copy out within a week; it is the
   * only copy of that data anywhere they can reach, so the prune must never see it.
   */
  test("a pre-restore copy is kept under its own name, and the prune never takes it", async () => {
    const folder = new fs.Directory("file:///sdcard/Documents");
    const before = preRestoreFileStem(new Date(2026, 8, 19, 9, 5, 2));
    expect(before).toBe("bati-export-before-restore-v3-2026-09-19-090502");

    await saveBackupToFolder(folder, before);
    for (const day of ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"]) {
      fs.__disk.set(`/sdcard/Documents/bati-export-v3-${day}.db`, day);
    }
    await saveBackupToFolder(folder);

    expect(fs.__disk.has(`/sdcard/Documents/${before}.db`)).toBe(true);
  });

  test("saving twice into the same folder replaces the day's file", async () => {
    const folder = new fs.Directory("file:///sdcard/Documents");
    fs.Directory.pickDirectoryAsync.mockResolvedValue(folder);

    expect(await saveBackupToFolder()).toBe(true);
    expect(await saveBackupToFolder()).toBe(true);

    const saved = [...fs.__disk.keys()].filter((key) => key.startsWith("/sdcard/Documents/"));
    expect(saved).toHaveLength(1);
  });
});

describe("stageBackupForImport", () => {
  test("copies the picked file under a name of ours, touching nothing else", async () => {
    write(mockDbName, "the hero's year");
    picks("picked");

    const staged = await stageBackupForImport();

    expect(staged).toBe(at(IMPORT_NAME));
    expect(fs.__disk.get(at(IMPORT_NAME))).toBe("picked");
    expect(fs.__disk.get(at(mockDbName))).toBe("the hero's year");
  });

  test("backing out of the picker changes nothing at all", async () => {
    fs.File.pickFileAsync.mockResolvedValue({ canceled: true, result: null });

    expect(await stageBackupForImport()).toBeNull();
    expect(fs.__disk.size).toBe(0);
  });

  /** Two imports share one staged name, so the second must not inherit the first's leftovers. */
  test("replaces a leftover staged file rather than reusing it", async () => {
    write(IMPORT_NAME, "an earlier attempt");
    picks("picked");

    await stageBackupForImport();

    expect(fs.__disk.get(at(IMPORT_NAME))).toBe("picked");
  });

  test("discarding leaves the database untouched", () => {
    write(mockDbName, "the hero's year");
    write(IMPORT_NAME, "rejected");

    discardStagedImport();

    expect(fs.__disk.has(at(IMPORT_NAME))).toBe(false);
    expect(fs.__disk.get(at(mockDbName))).toBe("the hero's year");
  });
});

describe("encrypted backups", () => {
  beforeEach(() => {
    mockCipher.status = "on";
    mockCipher.open = "opened";
  });

  afterEach(() => {
    mockCipher.status = "off";
    mockSnapshot.failHalfway = false;
    mockCopy.refuse = false;
  });

  test("a snapshot is sealed as .batb, and no plaintext copy is left beside the database", async () => {
    await exportBackup();

    const local = [...fs.__disk.keys()].map((key) => key.split("/").pop());
    expect(local).toEqual([expect.stringMatching(/^bati-export-v3-\d{4}-\d{2}-\d{2}\.batb$/)]);
    expect([...fs.__disk.values()]).toEqual(["sealed:snapshot"]);
  });

  test("a copy the folder refuses costs none of the copies already there", async () => {
    const folder = new fs.Directory("file:///sdcard/Documents");
    // Six, as an earlier prune that failed can leave: the oldest is not deleted before the new one exists.
    for (const day of [
      "2026-09-19",
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
    ]) {
      fs.__disk.set(`/sdcard/Documents/bati-export-v3-${day}.batb`, day);
    }
    mockCopy.refuse = true;

    await expect(saveBackupToFolder(folder)).rejects.toThrow("No space left");
    mockCopy.refuse = false;

    const kept = [...fs.__disk.keys()].filter((key) => key.startsWith("/sdcard/Documents/"));
    expect(kept).toHaveLength(6);
  });

  test("sealed and plain snapshots are pruned as one series", async () => {
    const folder = new fs.Directory("file:///sdcard/Documents");
    for (const day of ["2026-09-20", "2026-09-21", "2026-09-22"]) {
      fs.__disk.set(`/sdcard/Documents/bati-export-v3-${day}.db`, day);
    }
    for (const day of ["2026-09-23", "2026-09-24"]) {
      fs.__disk.set(`/sdcard/Documents/bati-export-v3-${day}.batb`, day);
    }

    await saveBackupToFolder(folder);

    const kept = [...fs.__disk.keys()].filter((key) => key.startsWith("/sdcard/Documents/"));
    expect(kept).toHaveLength(5);
    expect(kept).not.toContain("/sdcard/Documents/bati-export-v3-2026-09-20.db");
  });

  test("plaintext a killed snapshot left behind does not block the next one", async () => {
    write("bati-export-plain.tmp.db", "half a vacuum");

    const sealed = await writeSyncSnapshot();

    expect(fs.__disk.get(sealed.uri.replace(/^file:\/\//, ""))).toBe("sealed:snapshot");
    expect(fs.__disk.has(at("bati-export-plain.tmp.db"))).toBe(false);
  });

  test("a snapshot that runs out of room leaves no half of the database in the clear", async () => {
    mockSnapshot.failHalfway = true;

    await expect(writeSyncSnapshot()).rejects.toThrow("disk is full");
    mockSnapshot.failHalfway = false;

    expect([...fs.__disk.keys()].map((key) => key.split("/").pop())).toEqual([]);
  });

  test("an opened import replaces the staged file with its plaintext", async () => {
    write(IMPORT_NAME, "sealed:the tablet's year");

    expect((await decryptStagedImport("password")).result).toBe("opened");
    expect(fs.__disk.get(at(IMPORT_NAME))).toBe("the tablet's year");
    expect(fs.__disk.size).toBe(1);
  });

  test("an import still waiting for its password is left exactly as it was", async () => {
    mockCipher.open = "needsSecret";
    write(IMPORT_NAME, "sealed:the tablet's year");

    expect((await decryptStagedImport()).result).toBe("needsSecret");
    expect(fs.__disk.get(at(IMPORT_NAME))).toBe("sealed:the tablet's year");

    discardStagedImport();
    expect(fs.__disk.size).toBe(0);
  });
});

test("a phone locked out of its key writes no backup at all, rather than a plain one", async () => {
  mockCipher.status = "locked";
  await expect(exportBackup()).rejects.toThrow("Encryption is locked");
  expect(fs.__disk.size).toBe(0);
  mockCipher.status = "off";
});

describe("writePreMigrationCopy: the net under an update", () => {
  test("leaves one readable copy next to the database, and no temp file", async () => {
    await writePreMigrationCopy();

    expect(fs.__disk.get(at("premigrate.db"))).toBe("snapshot");
    expect(fs.__disk.has(at("premigrate.tmp.db"))).toBe(false);
  });

  test("a second update replaces the first copy and keeps it as the previous one", async () => {
    write("premigrate.db", "the previous update's copy");
    await writePreMigrationCopy();

    expect(fs.__disk.get(at("premigrate.db"))).toBe("snapshot");
    expect(fs.__disk.get(at("premigrate.prev.db"))).toBe("the previous update's copy");
  });

  test("a third update drops the oldest, so it never grows past two", async () => {
    write("premigrate.db", "second");
    write("premigrate.prev.db", "first");
    await writePreMigrationCopy();

    expect(fs.__disk.get(at("premigrate.prev.db"))).toBe("second");
    expect(fs.__disk.has(at("premigrate.tmp.db"))).toBe(false);
  });

  test("a copy that dies halfway leaves no temp file that looks like a safety net", async () => {
    fs.__control.failMoveInto = "premigrate.db";

    await expect(writePreMigrationCopy()).rejects.toThrow("no space left on device");

    expect(fs.__disk.has(at("premigrate.tmp.db"))).toBe(false);
  });

  test("an export sweep never takes it", async () => {
    await writePreMigrationCopy();
    await exportBackup();

    expect(fs.__disk.has(at("premigrate.db"))).toBe(true);
  });
});

/**
 * Two devices that back up into the same folder, which is exactly what the sync sheet suggests.
 * Before the tag both wrote `bati-export-v3-<day>.db`: the second overwrote the first's copy of the
 * day, and the prune kept five files across both, so each device deleted the other's history.
 */
describe("copies tagged by device", () => {
  const DOCS = "/sdcard/Documents";
  const folder = () => new fs.Directory(`file://${DOCS}`);
  const seed = (name: string) => fs.__disk.set(`${DOCS}/${name}`, name);
  // The folder only: the snapshot is staged in the app's own directory first, and that copy is
  // not what these tests are about.
  const names = (prefix: string) =>
    [...fs.__disk.keys()]
      .filter((key) => key.startsWith(`${DOCS}/`))
      .map((key) => key.split("/").pop() ?? "")
      .filter((name) => name.startsWith(prefix))
      .sort();
  const days = ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"];

  test("the file name carries the device tag", async () => {
    mockTag.value = "a1b2c3d4";
    await saveBackupToFolder(folder());

    expect(names("bati-export-")).toEqual([
      expect.stringMatching(/^bati-export-a1b2c3d4-v3-\d{4}-\d{2}-\d{2}\.db$/),
    ]);
  });

  test("a copy's name can never pass for a device's sync file", async () => {
    mockTag.value = "a1b2c3d4";
    await saveBackupToFolder(folder());

    for (const name of names("bati-export-")) expect(PEER_FILE.test(name)).toBe(false);
  });

  test("each device keeps its own five, and never touches the other's", async () => {
    for (const day of days) {
      seed(`bati-export-aaaaaaaa-v3-${day}.db`);
      seed(`bati-export-bbbbbbbb-v3-${day}.db`);
    }

    mockTag.value = "aaaaaaaa";
    await saveBackupToFolder(folder());
    expect(names("bati-export-aaaaaaaa-")).toHaveLength(5);
    expect(names("bati-export-bbbbbbbb-")).toHaveLength(6);

    mockTag.value = "bbbbbbbb";
    await saveBackupToFolder(folder());
    expect(names("bati-export-aaaaaaaa-")).toHaveLength(5);
    expect(names("bati-export-bbbbbbbb-")).toHaveLength(5);
  });

  test("the oldest of its own go first, whatever the other device holds", async () => {
    for (const day of days) seed(`bati-export-aaaaaaaa-v3-${day}.db`);
    seed("bati-export-bbbbbbbb-v3-2000-01-01.db");

    mockTag.value = "aaaaaaaa";
    await saveBackupToFolder(folder());

    expect(names("bati-export-aaaaaaaa-")).not.toContain("bati-export-aaaaaaaa-v3-2026-01-01.db");
    expect(names("bati-export-aaaaaaaa-")).not.toContain("bati-export-aaaaaaaa-v3-2026-02-01.db");
    expect(names("bati-export-bbbbbbbb-")).toEqual(["bati-export-bbbbbbbb-v3-2000-01-01.db"]);
  });

  test("a copy from before the tag is left alone: whose it is cannot be told", async () => {
    for (const day of days) seed(`bati-export-v3-${day}.db`);

    mockTag.value = "a1b2c3d4";
    await saveBackupToFolder(folder());

    expect(names("bati-export-v3-")).toHaveLength(6);
  });

  test("with the keystore down it writes the old name and prunes only old names", async () => {
    for (const day of days.slice(0, 4)) seed(`bati-export-v3-${day}.db`);
    for (const day of days) seed(`bati-export-a1b2c3d4-v3-${day}.db`);

    mockTag.value = null;
    await saveBackupToFolder(folder());

    // Four old names plus today's make five: nothing pruned, and the tagged six are untouched.
    expect(names("bati-export-v3-")).toHaveLength(5);
    expect(names("bati-export-a1b2c3d4-")).toHaveLength(6);
  });

  test("saving twice on one day replaces this device's copy of the day", async () => {
    mockTag.value = "a1b2c3d4";
    await saveBackupToFolder(folder());
    await saveBackupToFolder(folder());

    expect(names("bati-export-a1b2c3d4-")).toHaveLength(1);
  });

  test("prunes a Storage Access Framework tree, tag and percent-encoding together", async () => {
    const tree = "content://com.android.externalstorage.documents/tree/primary%3ADocuments";
    const asDocument = (name: string) =>
      `${tree}/document/${encodeURIComponent(`primary:Documents/${name}`)}`;
    for (const day of days) {
      fs.__disk.set(asDocument(`bati-export-aaaaaaaa-v3-${day}.db`), day);
      fs.__disk.set(asDocument(`bati-export-bbbbbbbb-v3-${day}.db`), day);
    }

    mockTag.value = "aaaaaaaa";
    await saveBackupToFolder(new fs.Directory(tree));

    const left = [...fs.__disk.keys()]
      .filter((key) => key.startsWith(tree))
      .map((key) => decodeURIComponent(key));
    expect(left.filter((key) => key.includes("export-aaaaaaaa-"))).toHaveLength(5);
    expect(left.filter((key) => key.includes("export-bbbbbbbb-"))).toHaveLength(6);
  });

  test("a pre-restore copy still sits outside the prune, tag or not", async () => {
    mockTag.value = "a1b2c3d4";
    const before = preRestoreFileStem(new Date(2026, 8, 19, 9, 5, 2));
    await saveBackupToFolder(folder(), before);
    for (const day of days) seed(`bati-export-a1b2c3d4-v3-${day}.db`);
    await saveBackupToFolder(folder());

    expect(fs.__disk.has(`${DOCS}/${before}.db`)).toBe(true);
  });
});

describe("saveBackupAs: Android's Save as", () => {
  const diskNames = () => [...fs.__disk.keys()].map((key) => key.split("/").pop());

  test("asks where first, then makes the snapshot, then writes: in that order, and says what the provider called it", async () => {
    mockSave.name = "My hero.db";

    const saved = await saveBackupAs();

    expect(saved).toEqual({ name: "My hero.db" });
    expect(mockSave.calls).toEqual([
      expect.stringMatching(/^pick bati-export-v3-\d{4}-\d{2}-\d{2}\.db$/),
      "write content://docs/d1 exists=true",
    ]);
  });

  test("a hero who backs out of the picker costs no snapshot at all", async () => {
    mockSave.picked = null;

    expect(await saveBackupAs()).toBeNull();

    expect(fs.__ops.filter((op) => op.startsWith("snapshot"))).toEqual([]);
    expect(diskNames()).toEqual([]);
  });

  test("the snapshot does not stay in app storage once it is saved", async () => {
    await saveBackupAs();

    expect(diskNames().filter((name) => name?.startsWith("bati-export-"))).toEqual([]);
  });

  test("nor when the write failed, which is told and not swallowed", async () => {
    mockSave.writeThrows = new Error("The destination holds 3 bytes, 9 were written");

    await expect(saveBackupAs()).rejects.toThrow("holds 3 bytes");

    expect(diskNames().filter((name) => name?.startsWith("bati-export-"))).toEqual([]);
  });

  test("a sealed vault is named .batb before the hero picks, so the name says what the file is", async () => {
    mockCipher.status = "on";

    await saveBackupAs();

    expect(mockSave.calls[0]).toMatch(/\.batb$/);
  });

  test("a snapshot that cannot be made deletes the empty document the picker created", async () => {
    mockCipher.status = "on";
    mockCipher.sealFails = true;

    await expect(saveBackupAs()).rejects.toThrow("seal failed");

    expect(mockSave.calls.at(-1)).toBe("discard content://docs/d1");
    expect(mockSave.calls.some((call) => call.startsWith("write"))).toBe(false);
  });

  test("a locked vault is refused before the picker opens: there is nothing it could save", async () => {
    mockCipher.status = "locked";

    await expect(saveBackupAs()).rejects.toThrow("Encryption is locked");

    expect(mockSave.calls).toEqual([]);
  });

  test("on a device with nothing to save a file with, says so, and the share sheet is the way", async () => {
    // The shape Expo gives JS for a native CodedException: a code, and prose for a message.
    mockSave.pickThrows = Object.assign(
      new Error(
        "Call to function 'BatiSave.pickTarget' has been rejected.\n→ Caused by: No app on this device can save a file",
      ),
      { code: "NO_FILE_PICKER" },
    );

    expect(await saveBackupAs()).toBe("noPicker");
    expect(diskNames()).toEqual([]);
  });

  test("any other failure of the picker is a failure", async () => {
    mockSave.pickThrows = new Error("the activity was destroyed");

    await expect(saveBackupAs()).rejects.toThrow("destroyed");
  });

  test("the file name carries the device tag, like every other copy", async () => {
    mockTag.value = "a1b2c3d4";

    await saveBackupAs();

    expect(mockSave.calls[0]).toMatch(/^pick bati-export-a1b2c3d4-v3-/);
  });
});

describe("snapshots, one at a time", () => {
  test("'Sync now' and 'Save a file' at the same moment never seal together: they share a scratch file", async () => {
    mockCipher.status = "on";

    const [sync, saved] = await Promise.all([writeSyncSnapshot(), saveBackupAs()]);

    expect(mockSeals.most).toBe(1);
    expect(sync.exists).toBe(true);
    expect(saved).toEqual({ name: expect.any(String) });
  });

  test("a snapshot that fails does not hold up the next one", async () => {
    mockCipher.status = "on";
    mockCipher.sealFails = true;
    await expect(writeSyncSnapshot()).rejects.toThrow("seal failed");

    mockCipher.sealFails = false;
    await expect(writeSyncSnapshot()).resolves.toBeDefined();
  });
});

describe("error branches", () => {
  test("a provider that took the snapshot away when it wrote leaves nothing to delete, and no error", async () => {
    mockSave.consumes = true;

    await expect(saveBackupAs()).resolves.toEqual({ name: mockSave.name });

    expect(fs.__ops.filter((op) => op.startsWith("delete bati-export-"))).toEqual([]);
  });

  test.each(["off", "locked"] as const)(
    "a sync snapshot is refused with encryption %s, and nothing is written",
    async (status) => {
      mockCipher.status = status;

      await expect(writeSyncSnapshot()).rejects.toThrow("Sync needs encryption on");

      expect(fs.__ops.filter((op) => op.startsWith("snapshot"))).toEqual([]);
      expect(pendingSyncSnapshot()).toBeNull();
    },
  );

  test("the pending sync snapshot is the one written, and only once it exists", async () => {
    mockCipher.status = "on";
    expect(pendingSyncSnapshot()).toBeNull();

    const written = await writeSyncSnapshot();

    expect(pendingSyncSnapshot()?.uri).toBe(written.uri);
  });

  test("a peer's scratch file is named after its file, sealed or plain", () => {
    expect(peerScratch("abc.batb", "sealed").name).toBe("bati-peer-abc.tmp.batb");
    expect(peerScratch("abc.batb", "plain").name).toBe("bati-peer-abc.tmp.db");
  });

  test("clearing peer scratch deletes every peer file but the one kept, and nothing else", () => {
    const keep = peerScratch("b.batb", "plain");
    write("bati-peer-a.tmp.batb", "x");
    write(keep.name, "y");
    write(mockDbName, "the hero");
    write("bati-sync-out.batb", "sealed");

    clearPeerScratch(keep);

    expect([...fs.__disk.keys()].sort()).toEqual(
      [at(keep.name), at(mockDbName), at("bati-sync-out.batb")].sort(),
    );
    clearPeerScratch();
    expect(fs.__disk.has(at(keep.name))).toBe(false);
    expect(fs.__disk.has(at(mockDbName))).toBe(true);
  });

  test("a sub-folder in the chosen folder is skipped by the prune, never deleted", async () => {
    const folder = new fs.Directory("file:///sd/Bati");
    const sub = new fs.Directory("file:///sd/Bati/bati-export-v3-2020-01-01.db");
    folder.list = () => [sub];

    await expect(saveBackupToFolder(folder)).resolves.toBe(true);
  });

  test.each([
    ["no message", { code: "ERR_OTHER" }],
    ["nothing at all", null],
  ])("a picker that fails with %s is a failure, not a cancellation", async (_label, failure) => {
    fs.Directory.pickDirectoryAsync.mockRejectedValue(failure);

    await expect(pickBackupFolder()).rejects.toBe(failure);
  });

  test("a picker that only says cancelled in prose is a cancellation", async () => {
    fs.Directory.pickDirectoryAsync.mockRejectedValue(new Error("User cancelled the picker"));

    await expect(pickBackupFolder()).resolves.toBeNull();
  });

  test("a staged import over the size limit is refused before the cipher reads it", async () => {
    write(IMPORT_NAME, "huge");
    fs.__control.sizes[IMPORT_NAME] = 256 * 1024 * 1024 + 1;

    await expect(decryptStagedImport("password")).rejects.toThrow("Backup file is too large");

    expect(fs.__disk.get(at(IMPORT_NAME))).toBe("huge");
  });

  test("a swap that fails with no database to park leaves the staged file and puts nothing back", async () => {
    write(IMPORT_NAME, "the backup");
    fs.__control.failMoveInto = mockDbName;

    await expect(commitRestore()).rejects.toThrow("no space left on device");

    expect(fs.__ops.some((op) => op.endsWith(`-> ${mockDbName}`))).toBe(true);
    expect(fs.__ops.some((op) => op.startsWith(`move ${SAFETY_NAME}`))).toBe(false);
    expect(fs.__disk.has(at(mockDbName))).toBe(false);
  });
});
