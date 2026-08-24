/**
 * The policy half of automatic backups: when a snapshot is written unattended, and what happens
 * to the remembered folder when it cannot be.
 *
 * Every assertion here is about *state* — the mockStored preference, the tree actually written into —
 * rather than about a function having been called. The failure this guards against is not "the
 * backup did not run"; it is "the backup silently stopped running months ago and the row still
 * said it was on".
 */

jest.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
  }
  return { Directory };
});

/** A key/value store standing in for `user_preferences`, reachable from the tests below. */
const mockStored = new Map<string, string>();
const mockControl: { readThrows: Error | null } = { readThrows: null };

jest.mock("@/db/preferences", () => ({
  preferences: {
    getBackupFolderUri: async () => {
      await Promise.resolve();
      if (mockControl.readThrows) throw mockControl.readThrows;
      return mockStored.get("backupFolderUri") ?? null;
    },
    setBackupFolderUri: async (uri: string) => {
      await Promise.resolve();
      mockStored.set("backupFolderUri", uri);
    },
    clearBackupFolderUri: async () => {
      await Promise.resolve();
      mockStored.delete("backupFolderUri");
    },
  },
}));

const mockSavedInto: (string | undefined)[] = [];
const mockPicked: { next: string | null; saveThrows: Error | null } = {
  next: null,
  saveThrows: null,
};

jest.mock("@/src/backupFiles", () => ({
  pickBackupFolder: async () => {
    await Promise.resolve();
    // A bare `{ uri }` rather than the mocked `Directory`: the only thing `autoBackup` does with
    // a picked folder is read `.uri` and hand the object on, and a test that needed the class
    // back would be testing expo-file-system.
    return mockPicked.next === null ? null : { uri: mockPicked.next };
  },
  saveBackupToFolder: async (folder?: { uri: string }) => {
    await Promise.resolve();
    if (mockPicked.saveThrows) throw mockPicked.saveThrows;
    mockSavedInto.push(folder?.uri);
    return true;
  },
}));

const mockReported: string[] = [];
jest.mock("@/src/reportError", () => ({
  reportError: (context: string) => mockReported.push(context),
}));

import {
  backupBeforeMigrations,
  backupFolderLabel,
  disableAutoBackup,
  enableAutoBackup,
} from "@/src/autoBackup";

/** What a real Android folder picker hands back for `Documents/Bati` on internal storage. */
const TREE = "content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FBati";

beforeEach(() => {
  mockStored.clear();
  mockSavedInto.length = 0;
  mockReported.length = 0;
  mockControl.readThrows = null;
  mockPicked.next = null;
  mockPicked.saveThrows = null;
});

describe("backupBeforeMigrations", () => {
  test("writes nothing when the hero never chose a folder", async () => {
    await backupBeforeMigrations();

    expect(mockSavedInto).toEqual([]);
    expect(mockReported).toEqual([]);
  });

  test("writes into the remembered tree, not a freshly picked one", async () => {
    mockStored.set("backupFolderUri", TREE);
    // The picker would hand back somewhere else entirely. Unattended means it is never opened.
    mockPicked.next = "content://elsewhere";

    await backupBeforeMigrations();

    expect(mockSavedInto).toEqual([TREE]);
  });

  test("a folder that cannot be written is forgotten, so Settings stops claiming it is on", async () => {
    mockStored.set("backupFolderUri", TREE);
    mockPicked.saveThrows = new Error("card removed");

    await backupBeforeMigrations();

    expect(mockStored.has("backupFolderUri")).toBe(false);
    expect(mockReported).toContain("backup.auto");
  });

  test("a failed write is never the reason the app does not start", async () => {
    mockStored.set("backupFolderUri", TREE);
    mockPicked.saveThrows = new Error("no space left on device");

    await expect(backupBeforeMigrations()).resolves.toBeUndefined();
  });

  test("a database too old to have a preferences table is not a failure to report", async () => {
    // This runs *before* the migration that creates the table. On a fresh install the read
    // throws, and there is no folder to write to either — reporting it would be noise on every
    // first launch, which is how a real failure gets ignored later.
    mockControl.readThrows = new Error("no such table: user_preferences");

    await backupBeforeMigrations();

    expect(mockSavedInto).toEqual([]);
    expect(mockReported).toEqual([]);
  });

  test("a read that fails for any other reason is reported, and still starts the app", async () => {
    mockControl.readThrows = new Error("database disk image is malformed");

    await expect(backupBeforeMigrations()).resolves.toBeUndefined();
    expect(mockReported).toContain("backup.auto.read");
  });
});

describe("enableAutoBackup", () => {
  test("writes a first snapshot before it remembers anything", async () => {
    mockPicked.next = TREE;

    await expect(enableAutoBackup()).resolves.toBe("Documents/Bati");

    expect(mockSavedInto).toEqual([TREE]);
    expect(mockStored.get("backupFolderUri")).toBe(TREE);
  });

  test("a folder whose first write fails is never remembered", async () => {
    // The whole point of writing immediately: "on" must not mean "on, probably, you will find
    // out at the next update" — and the next update is when finding out is too late.
    mockPicked.next = TREE;
    mockPicked.saveThrows = new Error("permission denied");

    await expect(enableAutoBackup()).rejects.toThrow("permission denied");

    expect(mockStored.has("backupFolderUri")).toBe(false);
  });

  test("backing out of the picker leaves the feature exactly as it was", async () => {
    mockPicked.next = null;

    await expect(enableAutoBackup()).resolves.toBeNull();

    expect(mockSavedInto).toEqual([]);
    expect(mockStored.has("backupFolderUri")).toBe(false);
  });
});

describe("disableAutoBackup", () => {
  test("forgets the folder", async () => {
    mockStored.set("backupFolderUri", TREE);

    await disableAutoBackup();

    expect(mockStored.has("backupFolderUri")).toBe(false);
  });
});

describe("backupFolderLabel", () => {
  test("names the folder the way the hero's file manager does", () => {
    expect(backupFolderLabel(TREE)).toBe("Documents/Bati");
  });

  test("falls back to the volume when the whole storage root was picked", () => {
    expect(
      backupFolderLabel("content://com.android.externalstorage.documents/tree/primary%3A"),
    ).toBe("primary");
  });

  test("names an SD card by its volume id rather than showing a provider authority", () => {
    expect(
      backupFolderLabel("content://com.android.externalstorage.documents/tree/1A2B-3C4D%3ABati"),
    ).toBe("Bati");
  });

  test("a URI it cannot decode is reported, not thrown", () => {
    expect(backupFolderLabel("content://x/tree/%E0%A4%A")).toBe("//x/tree/%E0%A4%A");
    expect(mockReported).toContain("backup.folderLabel");
  });
});
