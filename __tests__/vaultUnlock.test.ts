/**
 * A phone whose key is lost (a database Android restored onto a new phone) gets it back from what the hero already
 * has: their password or twelve words, tried against another device or the server, the newest copies in the backup
 * folder, or a file they choose. Never a new key.
 */
const mockCopies: { uri: string }[] = [];
const mockAccount: { value: unknown } = { value: { kind: "webdav" } };
let mockServer: { kind: string; peer?: string } = { kind: "ready" };
const mockJoined: { peer: string; secret: string }[] = [];
let mockJoinOpens = true;
const mockStaged: string[] = [];
const mockDiscarded: number[] = [];
let mockPicked: string | null = "staged";
/** What opening a staged file says, per call; the last one repeats. */
let mockOutcomes: (() => Promise<{ result: string; join?: unknown }>)[] = [];
const mockPrimaryJoins: boolean[] = [];
const mockReported: string[] = [];

jest.mock("@/src/autoBackup", () => ({
  sealedCopiesInBackupFolder: () => Promise.resolve([...mockCopies]),
}));
jest.mock("@/src/backupFiles", () => ({
  stageBackupFrom: (file: { uri: string }) =>
    Promise.resolve().then(() => {
      mockStaged.push(file.uri);
      return "/db/import";
    }),
  stageBackupForImport: () => Promise.resolve(mockPicked),
  decryptStagedImport: () => {
    const next = mockOutcomes.length > 1 ? mockOutcomes.shift() : mockOutcomes[0];
    return next ? next() : Promise.resolve({ result: "notEncrypted" });
  },
  discardStagedImport: () => {
    mockDiscarded.push(1);
  },
}));
jest.mock("@/src/deviceSync", () => ({
  syncAccount: () =>
    mockAccount.value instanceof Error
      ? Promise.reject(mockAccount.value)
      : Promise.resolve(mockAccount.value),
  serverState: () => Promise.resolve(mockServer),
  joinPeer: (peer: string, secret: string) => {
    mockJoined.push({ peer, secret });
    return Promise.resolve(mockJoinOpens);
  },
}));
jest.mock("@/src/reportError", () => ({
  reportError: (context: string) => mockReported.push(context),
}));

import { unlockSources, unlockWith } from "@/src/vaultUnlock";

const opens = () =>
  Promise.resolve({
    result: "opened",
    join: ({ asPrimary }: { asPrimary: boolean }) => {
      mockPrimaryJoins.push(asPrimary);
      return Promise.resolve();
    },
  });
const says = (result: string) => () => Promise.resolve({ result });

beforeEach(() => {
  mockCopies.length = 0;
  mockAccount.value = { kind: "webdav" };
  mockServer = { kind: "ready" };
  mockJoined.length = 0;
  mockJoinOpens = true;
  mockStaged.length = 0;
  mockDiscarded.length = 0;
  mockPicked = "staged";
  mockOutcomes = [];
  mockPrimaryJoins.length = 0;
  mockReported.length = 0;
});

describe("what there is to try", () => {
  test("the server only with a connected account, the folder only with a sealed copy in it", async () => {
    expect(await unlockSources()).toEqual({ server: true, folder: false });

    mockAccount.value = null;
    mockCopies.push({ uri: "content://x/bati-export-v3-2026-10-01.batb" });
    expect(await unlockSources()).toEqual({ server: false, folder: true });
  });
});

describe("a source that cannot be read", () => {
  test("is reported and offered as nothing, the other source still counts", async () => {
    mockAccount.value = new Error("keystore gone");
    mockCopies.push({ uri: "content://x/bati-export-v3-2026-10-01.batb" });
    expect(await unlockSources()).toEqual({ server: false, folder: true });
    expect(mockReported).toEqual(["vault.unlock.account"]);
  });
});

describe("from the server or another device", () => {
  test("the password goes to the vault the server asks one for", async () => {
    mockServer = { kind: "needsSecret", peer: "bati-a.batb" };
    expect(await unlockWith("server", "correct horse")).toBe("unlocked");
    expect(mockJoined).toEqual([{ peer: "bati-a.batb", secret: "correct horse" }]);
  });

  test("a password that opens nothing is wrong, and nothing is joined", async () => {
    mockServer = { kind: "needsSecret", peer: "bati-a.batb" };
    mockJoinOpens = false;
    expect(await unlockWith("server", "nope")).toBe("wrong");
  });

  test.each([["ready"], ["empty"]])(
    "a server that is %s has nothing to unlock from",
    async (kind) => {
      mockServer = { kind };
      expect(await unlockWith("server", "pw")).toBe("nothingToTry");
      expect(mockJoined).toEqual([]);
    },
  );

  test("a file of a newer Bati says to update", async () => {
    mockServer = { kind: "newerVersion" };
    expect(await unlockWith("server", "pw")).toBe("newerVersion");
  });
});

describe("from the backup folder", () => {
  const copy = (day: number) => ({ uri: `content://x/bati-export-v3-2026-10-0${day}.batb` });

  test("the key is read from the first copy that opens, as this phone's own, and nothing is left staged", async () => {
    mockCopies.push(copy(3), copy(2));
    mockOutcomes = [opens];

    expect(await unlockWith("folder", "the words")).toBe("unlocked");

    expect(mockStaged).toEqual([copy(3).uri]);
    expect(mockPrimaryJoins).toEqual([true]);
    expect(mockDiscarded).toHaveLength(1);
  });

  test("a copy that cannot be read does not hide the next one", async () => {
    mockCopies.push(copy(3), copy(2));
    mockOutcomes = [() => Promise.reject(new Error("cut short")), opens];

    expect(await unlockWith("folder", "pw")).toBe("unlocked");

    expect(mockStaged).toEqual([copy(3).uri, copy(2).uri]);
    expect(mockReported).toEqual(["vault.unlock.folder"]);
    expect(mockDiscarded).toHaveLength(2);
  });

  test("when none opens with that secret it is wrong, and every copy was tried", async () => {
    mockCopies.push(copy(3), copy(2));
    mockOutcomes = [says("wrongSecret")];

    expect(await unlockWith("folder", "nope")).toBe("wrong");
    expect(mockStaged).toHaveLength(2);
    expect(mockPrimaryJoins).toEqual([]);
  });

  test("a folder with no sealed copy has nothing to try", async () => {
    expect(await unlockWith("folder", "pw")).toBe("nothingToTry");
  });

  test("a newer Bati's copy stops at once", async () => {
    mockCopies.push(copy(3), copy(2));
    mockOutcomes = [says("newerVersion")];

    expect(await unlockWith("folder", "pw")).toBe("newerVersion");
    expect(mockStaged).toHaveLength(1);
  });
});

describe("from a file the hero chooses", () => {
  test("backing out of the picker changes nothing", async () => {
    mockPicked = null;
    expect(await unlockWith("file", "pw")).toBe("cancelled");
    expect(mockPrimaryJoins).toEqual([]);
  });

  test("a sealed backup that opens gives its key to this phone, and the copy is thrown away", async () => {
    mockOutcomes = [opens];
    expect(await unlockWith("file", "pw")).toBe("unlocked");
    expect(mockPrimaryJoins).toEqual([true]);
    expect(mockDiscarded).toHaveLength(1);
  });

  test.each([
    ["wrongSecret", "wrong"],
    ["needsSecret", "wrong"],
    ["notEncrypted", "nothingToTry"],
    ["newerVersion", "newerVersion"],
  ])("%s is said as %s", async (opened, said) => {
    mockOutcomes = [says(opened)];
    expect(await unlockWith("file", "pw")).toBe(said);
    expect(mockPrimaryJoins).toEqual([]);
    expect(mockDiscarded).toHaveLength(1);
  });

  test("a file that cannot be read is nothing to try, reported, and still thrown away", async () => {
    mockOutcomes = [() => Promise.reject(new Error("not a backup"))];
    expect(await unlockWith("file", "pw")).toBe("nothingToTry");
    expect(mockReported).toEqual(["vault.unlock.file"]);
    expect(mockDiscarded).toHaveLength(1);
  });
});
