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
  const control: { failMoveInto: string | null } = { failMoveInto: null };

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

    delete() {
      ops.push(`delete ${this.name}`);
      disk.delete(this.path);
    }

    // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
    async copy(destination: File | Directory) {
      // Copying into a *directory* keeps this file's name, which is the whole reason
      // `saveBackupToFolder` can hand the picked folder straight to `copy`.
      const target =
        destination instanceof Directory
          ? `${strip(destination.uri)}/${this.name}`
          : destination.path;
      ops.push(`copy ${this.name} -> ${target}`);
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
      return [...disk.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => new File(`file://${key}`));
    }
  }

  return { File, Directory, __disk: disk, __ops: ops, __control: control };
});

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
  closeDatabase: () => {
    (require("expo-file-system") as FakeFs).__ops.push("close");
    return Promise.resolve();
  },
}));

jest.mock("@/db/backup", () => ({
  snapshotDatabaseTo: (destination: string) => {
    const fs = require("expo-file-system") as FakeFs;
    fs.__ops.push(`snapshot ${destination.split("/").pop()}`);
    fs.__disk.set(destination, "snapshot");
    return Promise.resolve();
  },
}));

jest.mock("@/db/schemaVersion", () => ({ SCHEMA_VERSION: 3 }));

import {
  commitRestore,
  discardStagedImport,
  exportBackup,
  saveBackupToFolder,
  stageBackupForImport,
} from "@/src/backupFiles";

type FakeFs = {
  File: { new (uri: string): object; pickFileAsync: jest.Mock };
  Directory: { new (uri: string): object; pickDirectoryAsync: jest.Mock };
  __disk: Map<string, string>;
  __ops: string[];
  __control: { failMoveInto: string | null };
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
  fs.__disk.clear();
  fs.__ops.length = 0;
  fs.__control.failMoveInto = null;
  mockSharingAvailable.mockImplementation(async () => true);
  fs.File.pickFileAsync.mockReset();
  fs.Directory.pickDirectoryAsync.mockReset();
});

describe("commitRestore — the swap", () => {
  beforeEach(() => {
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
