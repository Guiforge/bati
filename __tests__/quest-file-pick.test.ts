import fs from "node:fs";
import path from "node:path";

/**
 * The edges of a quest file that never reach the database: the picker, and the sentence each
 * refusal is said in. A reason renamed in `src/questFile.ts` without its sentence in a locale
 * would show the hero `quests.import_newer` as text; a picker that reports no size would read a
 * file of any length into memory.
 */
const mockPick = jest.fn();

jest.mock("expo-file-system", () => ({
  File: { pickFileAsync: (...args: unknown[]) => mockPick(...args) },
  Paths: { cache: "file:///cache" },
}));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, transactionOrFallback: jest.fn() }));

import { pickQuestFile, QUEST_FILE_REFUSALS, QuestFileError } from "@/src/questFile";

const picked = (size: number | null, body = "{}") => ({
  canceled: false,
  result: { size, text: () => Promise.resolve(body) },
});

const refusal = async (pending: Promise<unknown>) => {
  try {
    await pending;
  } catch (error) {
    return error instanceof QuestFileError ? error.reason : error;
  }
  return null;
};

beforeEach(() => mockPick.mockReset());

test("a hero who backs out of the picker gets nothing, and no error", async () => {
  mockPick.mockResolvedValue({ canceled: true, result: null });
  await expect(pickQuestFile()).resolves.toBeNull();
});

test("a file of unknown or excessive size is refused before it is read", async () => {
  const text = jest.fn();
  mockPick.mockResolvedValue({ canceled: false, result: { size: null, text } });
  expect(await refusal(pickQuestFile())).toBe("not_a_quest");

  mockPick.mockResolvedValue({ canceled: false, result: { size: 9_000_000, text } });
  expect(await refusal(pickQuestFile())).toBe("not_a_quest");

  expect(text).not.toHaveBeenCalled();
});

test("a file that is not JSON says so", async () => {
  mockPick.mockResolvedValue(picked(10, "{oops"));
  expect(await refusal(pickQuestFile())).toBe("unreadable");
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
