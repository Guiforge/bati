import fs from "node:fs";
import path from "node:path";

/**
 * The edges of a quest file that never reach the database: the picker, the read of a file another
 * app handed over, the file name it is shared under, and the sentence each refusal is said in. A
 * reason renamed in `src/questFile.ts` without its sentence in a locale would show the hero
 * `quests.import_newer` as text; a provider that reports no size would read a file of any length
 * into memory.
 */
const mockPick = jest.fn();
/** What `new File(...)` returns: a plain function returning an object stands in for the class. */
const mockOpen = jest.fn();
const mockShare = jest.fn();
const mockQuest = jest.fn();

jest.mock("expo-file-system", () => ({
  File: Object.assign(
    function File(...parts: unknown[]) {
      return mockOpen(...parts);
    },
    { pickFileAsync: (...args: unknown[]) => mockPick(...args) },
  ),
  Paths: { cache: "file:///cache" },
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: (...args: unknown[]) => mockShare(...args),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, transactionOrFallback: jest.fn() }));
jest.mock("@/db/quests", () => ({
  ...jest.requireActual("@/db/quests"),
  getQuestTemplateById: (...args: unknown[]) => mockQuest(...args),
}));
jest.mock("@/db/exercises", () => ({
  ...jest.requireActual("@/db/exercises"),
  listExercises: () => Promise.resolve([]),
}));

import {
  pickQuestFile,
  QUEST_FILE_REFUSALS,
  QuestFileError,
  readQuestFile,
  shareQuest,
} from "@/src/questFile";

/** A file at a uri, as `new File(uri)` would open it. */
const opened = (size: number | null, body = "{}") => ({
  size,
  text: jest.fn(() => Promise.resolve(body)),
});

const refusal = async (pending: Promise<unknown>) => {
  try {
    await pending;
  } catch (error) {
    return error instanceof QuestFileError ? error.reason : error;
  }
  return null;
};

beforeEach(() => {
  mockPick.mockReset();
  mockOpen.mockReset();
  mockShare.mockReset();
  mockQuest.mockReset();
});

test("a hero who backs out of the picker gets nothing, and no error", async () => {
  mockPick.mockResolvedValue({ canceled: true, result: null });
  await expect(pickQuestFile()).resolves.toBeNull();
});

// The picker no longer reads: the file goes to the preview screen by uri, the same door a file
// opened from a chat comes in by, so both are read by one function.
test("the picker hands back the uri it chose, unread", async () => {
  const text = jest.fn();
  mockPick.mockResolvedValue({
    canceled: false,
    result: { uri: "content://downloads/1", size: 10, text },
  });
  await expect(pickQuestFile()).resolves.toBe("content://downloads/1");
  expect(text).not.toHaveBeenCalled();
});

test("a file of excessive size is refused before it is read", async () => {
  const file = opened(9_000_000);
  mockOpen.mockReturnValue(file);
  expect(await refusal(readQuestFile("content://chat/1"))).toBe("not_a_quest");
  expect(file.text).not.toHaveBeenCalled();
  expect(mockOpen).toHaveBeenCalledWith("content://chat/1");
});

// A chat app's provider often reports no size. Refusing those refused most files a hero is sent,
// so the text is read and measured instead.
test("a file of unknown size is read, and refused only if its text is too long", async () => {
  mockOpen.mockReturnValue(opened(null, "x".repeat(8_000_001)));
  expect(await refusal(readQuestFile("content://chat/2"))).toBe("not_a_quest");

  mockOpen.mockReturnValue(opened(null, "{oops"));
  // Read and parsed: refused for what it says, not for its size.
  expect(await refusal(readQuestFile("content://chat/3"))).toBe("unreadable");
});

test("a filesystem path is never read: it could be /dev/zero or Bati's own files", async () => {
  mockOpen.mockReturnValue(opened(0, "{}"));
  expect(await refusal(readQuestFile("file:///dev/zero"))).toBe("unreadable");
  expect(await refusal(readQuestFile("/data/user/0/com.guiforge.bati/files/x"))).toBe("unreadable");
  expect(mockOpen).not.toHaveBeenCalled();
});

test("a file within its size is parsed", async () => {
  mockOpen.mockReturnValue(opened(10, "{oops"));
  expect(await refusal(readQuestFile("content://downloads/q.json"))).toBe("unreadable");

  mockOpen.mockReturnValue(opened(8_000_000, JSON.stringify({ kind: "bati-quest" })));
  expect(await refusal(readQuestFile("content://downloads/q.json"))).toBe("not_a_quest");
});

describe("sharing a quest", () => {
  const quest = (enTitle: string) => ({
    id: 1,
    uuid: "0192a000-0000-7000-8000-000000000001",
    enTitle,
    frTitle: enTitle,
    deTitle: enTitle,
    esTitle: enTitle,
    enDescription: "",
    frDescription: "",
    deDescription: "",
    esDescription: "",
    rounds: 1,
    restSeconds: 30,
    roundRestSeconds: null,
    imagePath: "assets/placeholder.jpg",
    exercises: [],
  });
  /** The file name `shareQuest` wrote under, from the `new File(dir, name)` it made. */
  const sharedAs = async (enTitle: string) => {
    mockQuest.mockResolvedValue(quest(enTitle));
    mockOpen.mockImplementation((dir: string, name: string) => ({
      exists: false,
      create: jest.fn(),
      write: jest.fn(),
      delete: jest.fn(),
      uri: `${dir}/${name}`,
      name,
    }));
    await shareQuest(1);
    return mockOpen.mock.calls.at(-1)?.[1] as string;
  };

  test("the file is named after the quest, in letters and digits", async () => {
    expect(await sharedAs("Porch forge: day 2!")).toBe("Porch-forge-day-2.bati-quest.json");
    expect(await sharedAs("***")).toBe("quest.bati-quest.json");
  });

  // A file name is 255 bytes on Android. A long title in four-byte letters overflowed it, and the
  // share failed with nothing for the hero to fix.
  test("a long title is cut to 50 letters, never mid-letter", async () => {
    expect(await sharedAs("a".repeat(200))).toBe(`${"a".repeat(50)}.bati-quest.json`);
    const wide = "\u{1D4D0}".repeat(100);
    const stem = (await sharedAs(wide)).replace(".bati-quest.json", "");
    expect([...stem]).toHaveLength(50);
    expect(stem).toBe("\u{1D4D0}".repeat(50));
    // A cut that lands on a separator does not leave it dangling.
    expect(await sharedAs(`${"b".repeat(49)} tail`)).toBe(`${"b".repeat(49)}.bati-quest.json`);
  });

  // 60 four-byte letters and the 16-byte suffix made 256 bytes, one past Android's 255: the cut
  // once counted the stem alone.
  test("the whole file name fits in 255 bytes, suffix included", async () => {
    const name = await sharedAs("\u{1D4D0}".repeat(100));
    expect(Buffer.byteLength(name)).toBeLessThanOrEqual(255);
  });
});

test("every refusal, and every outcome of the buttons, has its sentence in the four languages", () => {
  const keys = [
    ...QUEST_FILE_REFUSALS.map((reason) => `import_${reason}`),
    "import_failed",
    "import_done",
    "import_updated",
    "import_quest",
    "import_hint",
    "share_quest",
    "share_quest_hint",
    "share_failed",
  ];
  for (const lang of ["fr", "en", "de", "es"]) {
    const quests = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "locales", `${lang}.json`), "utf8"),
    ).quests as Record<string, unknown>;
    for (const key of keys) {
      expect([lang, key, typeof quests[key]]).toEqual([lang, key, "string"]);
    }
  }
});
