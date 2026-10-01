import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * A quest file arrives from someone else's phone, so every field of it is a trust boundary. What
 * is held here: what is refused and why, what a picture may be (never a URL the app would fetch),
 * and how a quest is recognised on the way in. By its uuid and nothing else: a second import
 * updates the first, a movement the receiver already has is reused even renamed, and an import
 * that fails halfway leaves nothing behind.
 */
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

type QuestFileModule = typeof import("../src/questFile");
type QuestFile = import("../src/questFile").QuestFile;

/** Bytes from numbers and ASCII strings, so a picture's header can be written out by hand. */
const bytes = (...parts: (number | string)[]) =>
  Uint8Array.from(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : [p])),
  );
const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const be32 = (n: number) => [...be16(Math.floor(n / 0x10000)), ...be16(n & 0xffff)];
const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const le24 = (n: number) => [...le16(n & 0xffff), (n >> 16) & 0xff];
const le32 = (n: number) => [...le16(n & 0xffff), ...le16(Math.floor(n / 0x10000))];

const png = (width: number, height: number) =>
  bytes(0x89, "PNG\r\n\x1a\n", ...be32(13), "IHDR", ...be32(width), ...be32(height), 8, 6, 0, 0, 0);

/** SOI, a JFIF APP0, optionally a Huffman table (DHT, `0xC4`, which is no frame), then SOF0. */
function jpeg(width: number, height: number, { dht = false } = {}): Uint8Array {
  const app0 = [0xff, 0xe0, ...be16(16), "JFIF\0", 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const table = dht ? [0xff, 0xc4, ...be16(6), 0, 1, 2, 3] : [];
  const sof0 = [0xff, 0xc0, ...be16(17), 8, ...be16(height), ...be16(width), 3];
  return bytes(0xff, 0xd8, ...app0, ...table, ...sof0, ...Array<number>(15).fill(0));
}

const riff = (chunk: string, body: number[]) =>
  bytes("RIFF", ...le32(4 + 8 + body.length), "WEBP", chunk, ...le32(body.length), ...body);
const webpX = (width: number, height: number) =>
  riff("VP8X", [0, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)]);
const webpLossy = (width: number, height: number) =>
  riff("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(width), ...le16(height)]);
/** VP8L packs width - 1 and height - 1 as two 14-bit fields after its 0x2f signature. */
const webpLossless = (width: number, height: number) =>
  riff("VP8L", [0x2f, ...le32(width - 1 + (height - 1) * 0x4000), 0]);

const dataUri = (type: "jpeg" | "png" | "webp", data: Uint8Array) =>
  `data:image/${type};base64,${Buffer.from(data).toString("base64")}`;

// A real header: `safeImage` sizes every carried picture, and a truncated one is refused now.
const PHOTO = dataUri("jpeg", jpeg(64, 48));
const QUEST_UUID = "0192a000-0000-7000-8000-000000000001";
const DIP_UUID = "0192a000-0000-7000-8000-000000000002";

const t = createTestDb();

beforeAll(() => {
  jest.resetModules();
  // What this suite checks is that the import makes every write inside the callback it hands
  // `transactionOrFallback`, none before and none after. Whether that callback is atomic on the
  // phone is `db/client.ts`'s job, held by `db-transaction.test.ts` against Drizzle's real
  // behaviour. Here a plain BEGIN and ROLLBACK around the body stand in for it, which
  // better-sqlite3 can do statement by statement, so a failure halfway is judged by its rows.
  jest.doMock("../db/client", () => ({
    ...clientMock(t),
    transactionOrFallback: async <T>(fn: (tx: never) => Promise<T>) => {
      t.sqlite.exec("BEGIN");
      try {
        const result = await fn(t.db as never);
        t.sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        t.sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  }));
});

afterAll(() => {
  t.close();
});

const load = () => ({
  file: require("../src/questFile") as QuestFileModule,
  exercises: require("../db/exercises") as typeof import("../db/exercises"),
  quests: require("../db/quests") as typeof import("../db/quests"),
  uuid: require("../db/uuid") as typeof import("../db/uuid"),
});

const rows = (table: "exercises" | "quests") =>
  (t.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

/** A file as another phone would write it: one seed movement, one of the sender's own. */
function received(over: Partial<QuestFile["quest"]> = {}): QuestFile {
  return {
    kind: "bati-quest",
    version: 1,
    quest: {
      uuid: QUEST_UUID,
      title: { en: "Porch forge", fr: "Porch forge", de: "Porch forge", es: "Porch forge" },
      description: {
        en: "Before coffee.",
        fr: "Before coffee.",
        de: "Before coffee.",
        es: "Before coffee.",
      },
      rounds: 3,
      restSeconds: 45,
      roundRestSeconds: 90,
      image: PHOTO,
      ...over,
    },
    slots: [
      { movement: { official: "Push-ups" }, target: { type: "reps", min: 8, max: 12 } },
      {
        movement: {
          own: {
            uuid: DIP_UUID,
            name: "Porch dip",
            description: "Hands on the step behind you.",
            image: PHOTO,
            muscles: ["arms"],
            style: "strength",
            difficulty: "easy",
            equipment: "none",
            pattern: null,
            measure: "reps",
            secondsPerRep: 3,
          },
        },
        target: { type: "reps", min: 5, max: 10 },
      },
    ],
  };
}

describe("reading a quest file", () => {
  const parse = (raw: string) => load().file.parseQuestFile(raw);
  const reason = (value: unknown) => {
    try {
      parse(JSON.stringify(value));
    } catch (error) {
      assert(error instanceof load().file.QuestFileError);
      return error.reason;
    }
    return null;
  };

  test("a file as written is read back as written", () => {
    expect(parse(JSON.stringify(received()))).toEqual(received());
  });

  test("a missing translation reads as English, as untranslated seed rows do", () => {
    const file = received();
    const raw = { ...file, quest: { ...file.quest, title: { en: "Porch forge" } } };
    expect(parse(JSON.stringify(raw)).quest.title.fr).toBe("Porch forge");
  });

  test("says why a file is refused", () => {
    try {
      parse("{not json");
      throw new Error("parsed");
    } catch (error) {
      assert(error instanceof load().file.QuestFileError);
      expect(error.reason).toBe("unreadable");
    }
    expect(reason({ ...received(), kind: "something-else" })).toBe("not_a_quest");
    expect(reason({ ...received(), version: 2 })).toBe("newer");
    expect(reason({ ...received(), slots: [] })).toBe("not_a_quest");
    const badTarget = received();
    assert(badTarget.slots[0]);
    (badTarget.slots[0].target as { type: string }).type = "laps";
    // A code this version does not know is one a newer version grew: update, not "not a quest".
    expect(reason(badTarget)).toBe("newer");
  });

  test("the quest and every own movement must carry a lowercase uuid v7", () => {
    expect(reason(received({ uuid: undefined as never }))).toBe("not_a_quest");
    expect(reason(received({ uuid: QUEST_UUID.toUpperCase() }))).toBe("not_a_quest");
    // A v4 is a well-formed uuid and still not one this app writes.
    expect(reason(received({ uuid: "0192a000-0000-4000-8000-000000000001" }))).toBe("not_a_quest");
    const noDipUuid = received();
    const own = noDipUuid.slots[1]?.movement;
    assert(own && "own" in own);
    (own.own as { uuid?: string }).uuid = undefined;
    expect(reason(noDipUuid)).toBe("not_a_quest");
  });

  // A muscle this version lacks used to refuse the whole quest; it only lights one more region on
  // the sender's body map, so the movement keeps the muscles it does know.
  test("an own movement's unknown muscle is left out, a repeated one counted once", () => {
    const file = received();
    const own = file.slots[1]?.movement;
    assert(own && "own" in own);
    (own.own.muscles as unknown[]).push("wings", 7, "arms", "legs");
    const read = parse(JSON.stringify(file)).slots[1]?.movement;
    assert(read && "own" in read);
    expect(read.own.muscles).toEqual(["arms", "legs"]);
  });

  test("an own movement whose muscles are not a list is not a quest", () => {
    const file = received();
    const own = file.slots[1]?.movement;
    assert(own && "own" in own);
    (own.own as { muscles: unknown }).muscles = "arms";
    expect(reason(file)).toBe("not_a_quest");
  });

  // A pattern only groups movements in the picker, so one from a newer version reads as none
  // rather than refusing the quest.
  test("an unknown movement pattern becomes none, a known one is kept", () => {
    const withPattern = (pattern: unknown) => {
      const file = received();
      const own = file.slots[1]?.movement;
      assert(own && "own" in own);
      (own.own as { pattern: unknown }).pattern = pattern;
      const read = parse(JSON.stringify(file)).slots[1]?.movement;
      assert(read && "own" in read);
      return read.own.pattern;
    };
    expect(withPattern("spiral")).toBeNull();
    expect(withPattern(42)).toBeNull();
    expect(withPattern("push_horizontal")).toBe("push_horizontal");
  });

  // Each list a newer version can grow says "update"; a value of the wrong kind is a broken file.
  test.each([
    ["style", "parkour"],
    ["difficulty", "legendary"],
    ["equipment", "kettlebell_cannon"],
    ["measure", "laps"],
  ])("an own movement's %s: a new code says newer, a non-string is not a quest", (field, code) => {
    const withValue = (value: unknown) => {
      const file = received();
      const own = file.slots[1]?.movement;
      assert(own && "own" in own);
      (own.own as Record<string, unknown>)[field] = value;
      return reason(file);
    };
    expect(withValue(code)).toBe("newer");
    expect(withValue(3)).toBe("not_a_quest");
    expect(withValue({ code })).toBe("not_a_quest");
  });

  test("a target type that is not a string is not a quest", () => {
    const file = received();
    assert(file.slots[0]);
    (file.slots[0].target as { type: unknown }).type = 1;
    expect(reason(file)).toBe("not_a_quest");
  });

  // `typeof version === "number"` let 1.5, 0 and -1 through as version 1, and a string version
  // was told to update the app.
  test("the version is a whole number from 1: anything else is not a quest, above 1 is newer", () => {
    // JSON drops an undefined key, so this file has no version at all.
    expect(reason({ ...received(), version: undefined })).toBe("not_a_quest");
    for (const version of ["1", 1.5, 0, -1, null]) {
      expect([version, reason({ ...received(), version })]).toEqual([version, "not_a_quest"]);
    }
    expect(reason({ ...received(), version: 2 })).toBe("newer");
  });

  test("a picture is carried in the file or shipped with the app, never fetched", () => {
    const { safeImage } = load().file;
    expect(safeImage(PHOTO)).toBe(PHOTO);
    expect(safeImage("assets/images/quests/forge.webp")).toBe("assets/images/quests/forge.webp");
    // Each of these would make the app reach a stranger's server or read this phone's files.
    expect(safeImage("https://tracker.example/pixel.png")).toBeNull();
    expect(safeImage("http://tracker.example/pixel.png")).toBeNull();
    expect(safeImage("file:///data/data/com.guiforge.bati/databases/bati.db")).toBeNull();
    expect(safeImage("content://media/external/images/1")).toBeNull();
    expect(safeImage("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(safeImage("../../secrets")).toBeNull();
  });

  // A few hundred KB of PNG can declare a 16000 px square: a gigabyte of memory on every screen
  // that draws it. The size is read from the header, so a carried picture is checked before any
  // decoder sees it.
  test("a carried picture is sized from its header, and refused past 1024 px or at zero", () => {
    const { safeImage } = load().file;
    for (const ok of [
      dataUri("png", png(1024, 1024)),
      dataUri("jpeg", jpeg(1, 1024)),
      dataUri("webp", webpX(1024, 10)),
    ]) {
      expect(safeImage(ok)).toBe(ok);
    }
    expect(safeImage(dataUri("png", png(1025, 10)))).toBeNull();
    expect(safeImage(dataUri("png", png(10, 16000)))).toBeNull();
    expect(safeImage(dataUri("jpeg", jpeg(4096, 10)))).toBeNull();
    expect(safeImage(dataUri("webp", webpLossless(10, 1025)))).toBeNull();
    expect(safeImage(dataUri("png", png(0, 10)))).toBeNull();
    expect(safeImage(dataUri("jpeg", jpeg(10, 0)))).toBeNull();
  });

  test("a carried picture whose header cannot be read, or whose base64 is broken, is refused", () => {
    const { safeImage } = load().file;
    expect(safeImage(dataUri("png", bytes("hello, this is not a picture")))).toBeNull();
    // The JPEG start with no frame header after it: what a truncated photo looks like.
    expect(safeImage(dataUri("jpeg", jpeg(10, 10).subarray(0, 22)))).toBeNull();
    // The pattern lets this through; `atob` refuses a length of 4n + 1.
    expect(safeImage("data:image/png;base64,A")).toBeNull();
    expect(safeImage("data:image/png;base64,AAAAA")).toBeNull();
  });

  // The bundled names are what every seed movement and every hero cover picked from the app's art
  // travels as; sizing must not touch them.
  test("a bundled picture's name still passes, sized or not", () => {
    const { safeImage } = load().file;
    expect(safeImage("assets/images/exercises/squat.png")).toBe(
      "assets/images/exercises/squat.png",
    );
    expect(safeImage("escape_collapsing_mine")).toBe("escape_collapsing_mine");
  });
});

describe("sizing a picture from its header", () => {
  // Lazily: the module is only loaded once `beforeAll` has mocked the client.
  const imageSize = (data: Uint8Array) => load().file.imageSize(data);

  test("reads a PNG's IHDR", () => {
    expect(imageSize(png(640, 480))).toEqual({ width: 640, height: 480 });
    expect(imageSize(png(70000, 3))).toEqual({ width: 70000, height: 3 });
  });

  test("reads a JPEG's frame header after the segments before it", () => {
    expect(imageSize(jpeg(300, 200))).toEqual({ width: 300, height: 200 });
  });

  // `0xC4` sits inside the SOF range and is a Huffman table: read as a frame, its table bytes
  // would be taken for a size and a 16000 px picture could hide behind it.
  test("skips a JPEG's Huffman table rather than reading it as the frame", () => {
    expect(imageSize(jpeg(1024, 768, { dht: true }))).toEqual({ width: 1024, height: 768 });
  });

  test("reads the three WebP flavours: extended, lossy and lossless", () => {
    expect(imageSize(webpX(2000, 1500))).toEqual({ width: 2000, height: 1500 });
    expect(imageSize(webpX(1, 1))).toEqual({ width: 1, height: 1 });
    expect(imageSize(webpLossy(800, 600))).toEqual({ width: 800, height: 600 });
    expect(imageSize(webpLossless(16384, 3))).toEqual({ width: 16384, height: 3 });
    expect(imageSize(webpLossless(5, 9))).toEqual({ width: 5, height: 9 });
  });

  test("says nothing for a header it does not know", () => {
    expect(imageSize(bytes("GIF89a", 1, 0, 1, 0))).toBeNull();
    expect(imageSize(riff("ALPH", [0, 0, 0, 0]))).toBeNull();
    expect(imageSize(new Uint8Array(0))).toBeNull();
    // A JPEG with no frame header, or one whose segment walk leaves the markers.
    expect(imageSize(bytes(0xff, 0xd8, 0xff, 0xd9))).toBeNull();
    expect(imageSize(bytes(0xff, 0xd8, 0x00, 0x00, ...Array<number>(20).fill(0)))).toBeNull();
  });
});

describe("cleaning the text of a quest file", () => {
  const parse = (raw: string) => load().file.parseQuestFile(raw);
  const withTitle = (title: Record<string, unknown>) =>
    parse(JSON.stringify(received({ title: title as never }))).quest.title;
  const reason = (value: unknown) => {
    try {
      parse(JSON.stringify(value));
    } catch (error) {
      assert(error instanceof load().file.QuestFileError);
      return error.reason;
    }
    return null;
  };
  const ownOf = (file: QuestFile) => {
    const own = file.slots[1]?.movement;
    assert(own && "own" in own);
    return own.own;
  };

  // A bidi override renders a title backwards and a zero-width space lets "Push​-ups" pass for
  // the seed movement on screen: neither is a character the sender's editor could have typed.
  test("invisible characters are taken out of every text", () => {
    const title = withTitle({
      en: "‮Porch​ forge﻿\u0007",
      fr: "⁦Forge⁩ du porche\u0000",
    });
    expect(title.en).toBe("Porch forge");
    expect(title.fr).toBe("Forge du porche");

    const file = received();
    ownOf(file).name = "Porch‍​dip‮";
    ownOf(file).description = "Hands​ on the step.\u0001";
    const read = ownOf(parse(JSON.stringify(file)));
    // ZWJ kept, as it is in an emoji sequence; here it simply survives.
    expect(read.name).toBe("Porch‍dip");
    expect(read.description).toBe("Hands on the step.");
  });

  // ZWJ glues emoji into one picture; stripping it with the other format marks would turn a
  // family into three strangers.
  test("an emoji sequence joined by ZWJ survives whole", () => {
    const family = "Family day \u{1F468}‍\u{1F469}‍\u{1F467}";
    const fire = "Heart ❤️‍\u{1F525}";
    expect(withTitle({ en: family }).en).toBe(family);
    expect(withTitle({ en: fire }).en).toBe(fire);
  });

  test("a title or a name is one line, a description keeps its line breaks", () => {
    expect(withTitle({ en: "Porch\nforge\tII" }).en).toBe("Porch forge II");

    const file = received();
    ownOf(file).name = "Porch\ndip";
    ownOf(file).description = "Hands on the step.\nLower slowly.";
    file.quest.description = {
      en: "Before coffee.\nAfter the dog.",
      fr: "",
      de: "",
      es: "",
    };
    const read = parse(JSON.stringify(file));
    expect(ownOf(read).name).toBe("Porch dip");
    expect(ownOf(read).description).toBe("Hands on the step.\nLower slowly.");
    expect(read.quest.description.en).toBe("Before coffee.\nAfter the dog.");
  });

  // An empty title is a quest the gallery shows as a blank card nobody can name; an empty name
  // is a movement nobody can pick.
  test("an empty English title, movement name or seed name is not a quest", () => {
    for (const en of ["", "   ", "​‮", "\n\t"]) {
      expect([en, reason(received({ title: { en } as never }))]).toEqual([en, "not_a_quest"]);
    }
    const noName = received();
    ownOf(noName).name = " ​ ";
    expect(reason(noName)).toBe("not_a_quest");

    const noOfficial = received();
    assert(noOfficial.slots[0]);
    noOfficial.slots[0].movement = { official: "  " };
    expect(reason(noOfficial)).toBe("not_a_quest");
  });

  test("a missing, empty or blank translation reads as English, title and description", () => {
    const title = withTitle({ en: "Porch forge", fr: "", de: "  ​" });
    expect(title).toEqual({
      en: "Porch forge",
      fr: "Porch forge",
      de: "Porch forge",
      es: "Porch forge",
    });
    const description = parse(
      JSON.stringify(received({ description: { en: "Before coffee.", es: "" } as never })),
    ).quest.description;
    expect(description.fr).toBe("Before coffee.");
    expect(description.es).toBe("Before coffee.");
  });

  // A description may be empty: a quest needs a name, not a blurb.
  test("an empty description is read as empty, not refused", () => {
    const read = parse(
      JSON.stringify(received({ description: { en: "", fr: "", de: "", es: "" } })),
    );
    expect(read.quest.description).toEqual({ en: "", fr: "", de: "", es: "" });
  });

  // Past the editor's own limit is cut; far past it is not a quest an editor wrote, and reading
  // it whole would only cost memory.
  test("a title past 120 is cut to 120, and one past four times that is refused", () => {
    expect(withTitle({ en: "a".repeat(121) }).en).toBe("a".repeat(120));
    expect(withTitle({ en: "b".repeat(480) }).en).toBe("b".repeat(120));
    // The cut comes after the trim: leading spaces do not eat into the 120.
    expect(withTitle({ en: `   ${"c".repeat(120)}` }).en).toBe("c".repeat(120));
    expect(reason(received({ title: { en: "d".repeat(481) } as never }))).toBe("not_a_quest");

    const longName = received();
    ownOf(longName).name = "e".repeat(481);
    expect(reason(longName)).toBe("not_a_quest");
  });

  test("a description past 2000 is cut, and one past 8000 is refused", () => {
    const cut = parse(JSON.stringify(received({ description: { en: "f".repeat(2001) } as never })))
      .quest.description.en;
    expect(cut).toHaveLength(2000);
    expect(reason(received({ description: { en: "g".repeat(8001) } as never }))).toBe(
      "not_a_quest",
    );
  });

  test("a text that is not a string is not a quest", () => {
    expect(reason(received({ title: { en: 42 } as never }))).toBe("not_a_quest");
    expect(reason(received({ title: { en: "Porch", fr: 42 } as never }))).toBe("not_a_quest");
    expect(reason(received({ title: "Porch forge" as never }))).toBe("not_a_quest");
  });
});

describe("editing a quest file before it is imported", () => {
  type Edits = import("../src/questFile").QuestFileEdits;
  const editQuestFile = (file: QuestFile, e: Edits) => load().file.editQuestFile(file, e);
  const edits = (over: Partial<Edits> = {}): Edits => ({
    title: "Porch forge",
    language: "en" as const,
    keep: [true, true],
    asCopy: false,
    ...over,
  });
  const translated = () =>
    received({ title: { en: "Porch forge", fr: "Forge du porche", de: "Veranda", es: "Porche" } });

  test("a slot left unchecked is left out, by its place in the file", () => {
    const file = received();
    const edited = editQuestFile(file, edits({ keep: [false, true] }));
    expect(edited.slots).toEqual([file.slots[1]]);
    // A slot past the end of `keep` was never offered, so it is not kept either.
    expect(editQuestFile(file, edits({ keep: [true] })).slots).toEqual([file.slots[0]]);
  });

  // A renamed quest is the hero's name for it, in every language they may switch to; leaving
  // the sender's French beside a new English title would show two different quests.
  test("a changed title is written in all four languages", () => {
    const edited = editQuestFile(translated(), edits({ title: "Morning bench", language: "fr" }));
    expect(edited.quest.title).toEqual({
      en: "Morning bench",
      fr: "Morning bench",
      de: "Morning bench",
      es: "Morning bench",
    });
  });

  test("a title left as shown keeps the sender's translations", () => {
    const file = translated();
    expect(
      editQuestFile(file, edits({ title: "Forge du porche", language: "fr" })).quest.title,
    ).toEqual(file.quest.title);
    // Its surrounding spaces are not an edit either.
    expect(editQuestFile(file, edits({ title: "  Porch forge  " })).quest.title).toEqual(
      file.quest.title,
    );
  });

  // A cleared field would otherwise import a quest with no name, which the parser itself refuses.
  test("a blank title keeps the original", () => {
    const file = translated();
    for (const title of ["", "   ", "​‮"]) {
      expect(editQuestFile(file, edits({ title })).quest.title).toEqual(file.quest.title);
    }
  });

  test("an edited title is cleaned like a parsed one", () => {
    const edited = editQuestFile(received(), edits({ title: "‮Morning​ bench﻿" }));
    expect(edited.quest.title.en).toBe("Morning bench");
    expect(editQuestFile(received(), edits({ title: "h".repeat(200) })).quest.title.en).toBe(
      "h".repeat(120),
    );
  });

  // A copy under the sender's uuid would update the hero's own quest instead of sitting beside it.
  test("as a copy, the quest gets a fresh uuid v7; otherwise it keeps the sender's", () => {
    const copy = editQuestFile(received(), edits({ asCopy: true }));
    expect(copy.quest.uuid).toMatch(load().uuid.UUID_V7_RE);
    expect(copy.quest.uuid).not.toBe(QUEST_UUID);
    expect(editQuestFile(received(), edits()).quest.uuid).toBe(QUEST_UUID);
  });

  test("the file it was edited from is left as it was", () => {
    const file = received();
    const before = structuredClone(file);
    editQuestFile(file, edits({ title: "Other", keep: [false, false], asCopy: true }));
    expect(file).toEqual(before);
  });
});

describe("writing a quest file", () => {
  test("a hero row is named when it is written, a seed row never is", async () => {
    const { exercises, quests, uuid } = load();
    const blank = {
      frTitle: "",
      deTitle: "",
      esTitle: "",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [],
    };
    const seed = await quests.createQuestTemplate({ ...blank, enTitle: "Seeded" });
    const mine = await quests.createQuestTemplate({
      ...blank,
      enTitle: "Mine",
      author: quests.USER_QUEST_AUTHOR,
    });
    const move = await exercises.createUserExercise({
      ...exercises.DEFAULT_USER_EXERCISE_DRAFT,
      name: "Named on write",
      description: "",
    });
    const uuidOf = (table: string, id: number) =>
      (
        t.sqlite.prepare(`SELECT uuid FROM ${table} WHERE id = ?`).get(id) as {
          uuid: string | null;
        }
      ).uuid;

    expect(uuidOf("quests", seed)).toBeNull();
    expect(uuidOf("quests", mine)).toMatch(uuid.UUID_V7_RE);
    expect(uuidOf("exercises", move)).toMatch(uuid.UUID_V7_RE);
  });

  test("carries the quest's uuid, and the photo and uuid of every own movement", async () => {
    const { file, exercises, quests, uuid } = load();
    const ownId = await exercises.createUserExercise({
      ...exercises.DEFAULT_USER_EXERCISE_DRAFT,
      name: "Wall sit",
      description: "Back flat.",
      imagePath: PHOTO,
      muscles: ["legs"],
    });
    const questId = await quests.createQuestTemplate({
      enTitle: "Hall drill",
      frTitle: "Hall drill",
      deTitle: "Hall drill",
      esTitle: "Hall drill",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      author: quests.USER_QUEST_AUTHOR,
      rounds: 2,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [
        { exerciseId: ownId, images: [], baseTarget: { type: "time", min: 30, max: 45 } },
      ],
    });
    const template = await quests.getQuestTemplateById(questId);
    assert(template);

    const written = file.questToFile(template, await exercises.listExercises());

    expect(written.quest.uuid).toMatch(uuid.UUID_V7_RE);
    expect(written.quest.uuid).toBe(template.uuid);
    const slot = written.slots[0]?.movement;
    assert(slot && "own" in slot);
    expect(slot.own.uuid).toMatch(uuid.UUID_V7_RE);
    expect(slot.own.image).toBe(PHOTO);
  });

  test("refuses a quest with no uuid rather than send one no import could recognise", async () => {
    const { file, exercises, quests } = load();
    const id = await quests.createQuestTemplate({
      enTitle: "Raw",
      frTitle: "Raw",
      deTitle: "Raw",
      esTitle: "Raw",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      author: quests.USER_QUEST_AUTHOR,
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [],
    });
    // What a dev seed in raw SQL leaves: a hero row 0066 never named.
    t.sqlite.prepare("UPDATE quests SET uuid = NULL WHERE id = ?").run(id);
    quests.invalidateQuestTemplates(id);
    const template = await quests.getQuestTemplateById(id);
    assert(template);
    expect(() => file.questToFile(template, [])).toThrow(/no uuid/);
  });

  // A coverless quest is read back with the placeholder's path. Sent as is, the receiver's quest
  // would carry a cover the hero never picked, and the editor would show it as chosen.
  test("a quest with the placeholder for a cover travels with no cover", async () => {
    const { file, quests } = load();
    const make = (title: string, imagePath?: string) =>
      quests.createQuestTemplate({
        enTitle: title,
        frTitle: title,
        deTitle: title,
        esTitle: title,
        enDescription: "",
        frDescription: "",
        deDescription: "",
        esDescription: "",
        author: quests.USER_QUEST_AUTHOR,
        rounds: 1,
        restSeconds: 30,
        roundRestSeconds: null,
        ...(imagePath === undefined ? {} : { imagePath }),
        exercises: [],
      });
    const written = async (id: number) => {
      const template = await quests.getQuestTemplateById(id);
      assert(template);
      return file.questToFile(template, []).quest.image;
    };

    expect(await written(await make("Bare", "assets/placeholder.jpg"))).toBeNull();
    expect(await written(await make("Never chose"))).toBeNull();
    expect(await written(await make("Covered", PHOTO))).toBe(PHOTO);
  });
});

describe("importing a quest file", () => {
  const exerciseByUuid = (uuid: string) =>
    t.sqlite.prepare("SELECT * FROM exercises WHERE uuid = ?").get(uuid) as
      | { id: number; enName: string; imagePath: string; creator: string; retiredAt: number | null }
      | undefined;

  test("the first import writes the quest and its own movement under the sender's uuids", async () => {
    const { file, quests } = load();
    const pushUps = t.sqlite
      .prepare("SELECT id FROM exercises WHERE enName = 'Push-ups' AND creator = 'Admin'")
      .get() as { id: number };

    const { id, updated } = await file.importQuest(received());

    expect(updated).toBe(false);
    const quest = await quests.getQuestTemplateById(id);
    assert(quest);
    expect(quest.uuid).toBe(QUEST_UUID);
    expect(quest.author).toBe(quests.USER_QUEST_AUTHOR);
    expect(quest.imagePath).toBe(PHOTO);
    expect(quest.roundRestSeconds).toBe(90);
    const dip = exerciseByUuid(DIP_UUID);
    assert(dip);
    expect(dip.creator).toBe("hero");
    expect(dip.imagePath).toBe(PHOTO);
    expect(quest.exercises.map((e) => [e.exerciseId, e.baseTarget])).toEqual([
      [pushUps.id, { type: "reps", min: 8, max: 12 }],
      [dip.id, { type: "reps", min: 5, max: 10 }],
    ]);
  });

  test("a second import of the same quest updates it in place and writes no new row", async () => {
    const { file, quests } = load();
    const before = { quests: rows("quests"), exercises: rows("exercises") };
    const first = (await quests.listQuestTemplates()).find((q) => q.uuid === QUEST_UUID);
    assert(first);

    const again = received({
      title: {
        en: "Porch forge II",
        fr: "Porch forge II",
        de: "Porch forge II",
        es: "Porch forge II",
      },
      rounds: 4,
    });
    const { id, updated } = await file.importQuest(again);

    expect(updated).toBe(true);
    expect(id).toBe(first.id);
    expect({ quests: rows("quests"), exercises: rows("exercises") }).toEqual(before);
    const quest = await quests.getQuestTemplateById(id);
    expect(quest?.enTitle).toBe("Porch forge II");
    expect(quest?.rounds).toBe(4);
  });

  test("a movement the receiver renamed is still the one the slot points at, and keeps its name", async () => {
    const { file, quests } = load();
    const dip = exerciseByUuid(DIP_UUID);
    assert(dip);
    t.sqlite.prepare("UPDATE exercises SET enName = 'My dip' WHERE id = ?").run(dip.id);
    (require("../db/exercises") as typeof import("../db/exercises")).invalidateExercisesCache();

    const { id } = await file.importQuest(received());

    const quest = await quests.getQuestTemplateById(id);
    expect(quest?.exercises[1]?.exerciseId).toBe(dip.id);
    expect(exerciseByUuid(DIP_UUID)?.enName).toBe("My dip");
  });

  test("a movement the receiver retired comes back, since they are choosing it again", async () => {
    const { file, exercises } = load();
    const dip = exerciseByUuid(DIP_UUID);
    assert(dip);
    await exercises.retireUserExercise(dip.id);
    expect(exerciseByUuid(DIP_UUID)?.retiredAt).not.toBeNull();

    await file.importQuest(received());

    expect(exerciseByUuid(DIP_UUID)?.retiredAt).toBeNull();
  });

  test("a movement named twice in one file is written once", async () => {
    const { file } = load();
    const twice = received({ uuid: "0192a000-0000-7000-8000-000000000003" });
    const own = twice.slots[1]?.movement;
    assert(own && "own" in own);
    own.own.uuid = "0192a000-0000-7000-8000-000000000004";
    const slot = twice.slots[1];
    assert(slot);
    twice.slots.push(structuredClone(slot));
    const before = rows("exercises");

    await file.importQuest(twice);

    expect(rows("exercises")).toBe(before + 1);
  });

  test("a seed movement this version lacks refuses the file before writing anything", async () => {
    const { file } = load();
    const ahead = received({ uuid: "0192a000-0000-7000-8000-000000000005" });
    ahead.slots.unshift({
      movement: { official: "A movement from next year" },
      target: { type: "reps", min: 5, max: 5 },
    });
    const before = { quests: rows("quests"), exercises: rows("exercises") };

    await expect(file.importQuest(ahead)).rejects.toMatchObject({ reason: "unknown_movement" });

    expect({ quests: rows("quests"), exercises: rows("exercises") }).toEqual(before);
  });

  test("a write that fails halfway takes the movements it already wrote back with it", async () => {
    const { file, quests } = load();
    const fresh = received({ uuid: "0192a000-0000-7000-8000-000000000006" });
    const own = fresh.slots[1]?.movement;
    assert(own && "own" in own);
    own.own.uuid = "0192a000-0000-7000-8000-000000000007";
    const before = { quests: rows("quests"), exercises: rows("exercises") };
    // The movement is written, then the quest fails: the last write of the transaction.
    const failing = jest
      .spyOn(quests, "createQuestTemplate")
      .mockRejectedValueOnce(new Error("disk full"));

    await expect(file.importQuest(fresh)).rejects.toThrow("disk full");

    failing.mockRestore();
    expect({ quests: rows("quests"), exercises: rows("exercises") }).toEqual(before);
    expect(exerciseByUuid("0192a000-0000-7000-8000-000000000007")).toBeUndefined();
  });

  // The preview can uncheck every movement; what is left is a quest no session could start.
  test("a file with no slot left is refused, and writes nothing", async () => {
    const { file } = load();
    const empty = { ...received({ uuid: "0192a000-0000-7000-8000-000000000008" }), slots: [] };
    const before = { quests: rows("quests"), exercises: rows("exercises") };

    await expect(file.importQuest(empty)).rejects.toMatchObject({ reason: "not_a_quest" });

    expect({ quests: rows("quests"), exercises: rows("exercises") }).toEqual(before);
  });

  // The parser only checks that a number is one; the writers hold the ranges. A file built by
  // hand with a million rounds would otherwise be a quest no hero finishes and a rest that never
  // ends, and nothing in the schema refuses either.
  test("every number in the file is clamped to its range on the way in", async () => {
    const { file } = load();
    const huge = received({
      uuid: "0192a000-0000-7000-8000-000000000009",
      rounds: 1e6,
      restSeconds: -40,
      roundRestSeconds: 1e9,
    });
    assert(huge.slots[0]);
    huge.slots[0].target = { type: "reps", min: -3, max: 1e308 };
    const own = huge.slots[1]?.movement;
    assert(own && "own" in own);
    own.own.uuid = "0192a000-0000-7000-8000-00000000000a";
    own.own.secondsPerRep = 1000;
    // Through the parser, as a file from disk would come.
    const { id } = await file.importQuest(file.parseQuestFile(JSON.stringify(huge)));

    expect(
      t.sqlite
        .prepare("SELECT rounds, restSeconds, roundRestSeconds FROM quests WHERE id = ?")
        .get(id),
    ).toEqual({ rounds: 10, restSeconds: 0, roundRestSeconds: 300 });
    expect(
      t.sqlite
        .prepare(
          "SELECT targetMin, targetMax FROM quest_exercises WHERE questId = ? ORDER BY sortOrder",
        )
        .all(id),
    ).toEqual([
      { targetMin: 1, targetMax: 999 },
      { targetMin: 5, targetMax: 10 },
    ]);
    expect(
      t.sqlite
        .prepare("SELECT secondsPerRep FROM exercises WHERE uuid = ?")
        .get("0192a000-0000-7000-8000-00000000000a"),
    ).toEqual({ secondsPerRep: 10 });
  });

  // The preview shows the parsed file before any writer runs. On the emulator a hand-made file read
  // "1000000 rounds" and a target of a hundred digits there, numbers the quest would never have.
  test("the parsed file already holds every number to its range, before any write", () => {
    const { file } = load();
    const huge = received({ rounds: 1e6, restSeconds: -40, roundRestSeconds: 1e9 });
    assert(huge.slots[0] && huge.slots[1]);
    huge.slots[0].target = { type: "time", min: -3, max: 1e308 };
    huge.slots[1].target = { type: "reps", min: 1e308, max: 3 };
    const own = huge.slots[1].movement;
    assert("own" in own);
    own.own.secondsPerRep = 1000;

    const parsed = file.parseQuestFile(JSON.stringify(huge));

    expect(parsed.quest).toMatchObject({ rounds: 10, restSeconds: 0, roundRestSeconds: 300 });
    // A seed movement's style is only known here, so its time target keeps the widest ceiling.
    expect(parsed.slots[0]?.target).toEqual({ type: "time", min: 1, max: 43_200 });
    expect(parsed.slots[1]?.target).toEqual({ type: "reps", min: 3, max: 999 });
    const parsedOwn = parsed.slots[1]?.movement;
    assert(parsedOwn && "own" in parsedOwn);
    expect(parsedOwn.own.secondsPerRep).toBe(10);
  });

  // "Import as a copy" on the preview: under the sender's uuid it would overwrite the hero's own
  // copy, which is the very thing the button is there to avoid.
  test("a file edited as a copy lands beside the quest it came from", async () => {
    const { file, quests } = load();
    const first = (await quests.listQuestTemplates()).find((q) => q.uuid === QUEST_UUID);
    assert(first);
    const before = { quests: rows("quests"), exercises: rows("exercises") };
    const copy = file.editQuestFile(received(), {
      title: "Porch forge, mine",
      language: "en",
      keep: [true, true],
      asCopy: true,
    });

    const { id, updated } = await file.importQuest(copy);

    expect(updated).toBe(false);
    expect(id).not.toBe(first.id);
    // A new quest, and the same movements: the dip is already here under its uuid.
    expect({ quests: rows("quests"), exercises: rows("exercises") }).toEqual({
      ...before,
      quests: before.quests + 1,
    });
    expect((await quests.getQuestTemplateById(first.id))?.uuid).toBe(QUEST_UUID);
    expect((await quests.getQuestTemplateById(id))?.enTitle).toBe("Porch forge, mine");
  });

  // Only a hero row is looked up by uuid. A seed row never carries one, but if a database ever
  // had one that matched (a backup restored across a migration, a hand edit), a file must still
  // not rewrite content the app ships.
  test("a file can never update a seed quest or a seed movement", async () => {
    const { file, exercises, quests } = load();
    const seedQuest = t.sqlite
      .prepare("SELECT id, enTitle, rounds FROM quests WHERE author = 'Admin' LIMIT 1")
      .get() as { id: number; enTitle: string; rounds: number };
    const seedMove = t.sqlite
      .prepare("SELECT id, enName, imagePath FROM exercises WHERE creator = 'Admin' LIMIT 1")
      .get() as { id: number; enName: string; imagePath: string };
    const questUuid = "0192a000-0000-7000-8000-00000000000b";
    const moveUuid = "0192a000-0000-7000-8000-00000000000c";
    t.sqlite.prepare("UPDATE quests SET uuid = ? WHERE id = ?").run(questUuid, seedQuest.id);
    t.sqlite.prepare("UPDATE exercises SET uuid = ? WHERE id = ?").run(moveUuid, seedMove.id);
    quests.invalidateQuestTemplates();
    exercises.invalidateExercisesCache();

    const hostile = received({ uuid: questUuid, title: { en: "Owned", fr: "", de: "", es: "" } });
    const own = hostile.slots[1]?.movement;
    assert(own && "own" in own);
    own.own.uuid = moveUuid;
    own.own.name = "Owned move";
    const before = { quests: rows("quests"), exercises: rows("exercises") };
    const outcome = await file.importQuest(hostile).catch((error: unknown) => error);
    const after = {
      quest: t.sqlite
        .prepare("SELECT id, enTitle, rounds FROM quests WHERE id = ?")
        .get(seedQuest.id),
      move: t.sqlite
        .prepare("SELECT id, enName, imagePath FROM exercises WHERE id = ?")
        .get(seedMove.id),
      counts: { quests: rows("quests"), exercises: rows("exercises") },
    };
    t.sqlite.prepare("UPDATE quests SET uuid = NULL WHERE id = ?").run(seedQuest.id);
    t.sqlite.prepare("UPDATE exercises SET uuid = NULL WHERE id = ?").run(seedMove.id);
    quests.invalidateQuestTemplates();
    exercises.invalidateExercisesCache();

    expect(after.quest).toEqual(seedQuest);
    expect(after.move).toEqual(seedMove);
    // The new hero movement cannot take a uuid the seed row holds, so the write fails and rolls
    // back whole: refused, never an update of the seed row.
    expect(outcome).toBeInstanceOf(Error);
    expect(String(outcome)).toMatch(/UNIQUE/);
    expect(after.counts).toEqual(before);
  });

  // The same file without the seed movement's uuid: the seed quest's uuid alone still does not
  // make the import an update of it.
  test("a seed quest sharing the file's uuid is not the quest the file updates", async () => {
    const { file, quests } = load();
    const seedQuest = t.sqlite
      .prepare("SELECT id, enTitle FROM quests WHERE author = 'Admin' LIMIT 1")
      .get() as { id: number; enTitle: string };
    const questUuid = "0192a000-0000-7000-8000-00000000000d";
    t.sqlite.prepare("UPDATE quests SET uuid = ? WHERE id = ?").run(questUuid, seedQuest.id);
    quests.invalidateQuestTemplates();

    const preview = await file.previewQuest(received({ uuid: questUuid }));
    const outcome = await file
      .importQuest(received({ uuid: questUuid, title: { en: "Owned", fr: "", de: "", es: "" } }))
      .catch((error: unknown) => error);
    const after = t.sqlite.prepare("SELECT id, enTitle FROM quests WHERE id = ?").get(seedQuest.id);
    t.sqlite.prepare("UPDATE quests SET uuid = NULL WHERE id = ?").run(seedQuest.id);
    quests.invalidateQuestTemplates();

    expect(preview.existing).toBeNull();
    expect(after).toEqual(seedQuest);
    expect(String(outcome)).toMatch(/UNIQUE/);
  });
});

// Runs after the imports above, so the dip and the quest under QUEST_UUID are already here.
describe("previewing a quest file", () => {
  const ownSlot = (uuid: string): QuestFile["slots"][number] => {
    const slot = received().slots[1];
    assert(slot && "own" in slot.movement);
    return { ...slot, movement: { own: { ...slot.movement.own, uuid } } };
  };

  // The preview is what lets a hero leave out a movement this version lacks instead of being
  // refused the whole quest, so it must say which one that is.
  test("a seed movement this version lacks cannot be imported, a known one is its row", async () => {
    const { file } = load();
    const pushUps = t.sqlite
      .prepare("SELECT id FROM exercises WHERE enName = 'Push-ups' AND creator = 'Admin'")
      .get() as { id: number };
    const ahead = received();
    ahead.slots.unshift({
      movement: { official: "A movement from next year" },
      target: { type: "reps", min: 5, max: 5 },
    });

    const { slots } = await file.previewQuest(ahead);

    expect(slots[0]).toMatchObject({ exercise: null, available: false });
    expect(slots[1]?.exercise?.id).toBe(pushUps.id);
    expect(slots[1]?.available).toBe(true);
  });

  // The parser keeps an outing's twelve hours for a seed slot, since it cannot know the style. The
  // preview can: a hold on Push-ups shows the hour the writer will keep, not twelve.
  test("the target shown is the one the writer will keep, in the landing movement's range", async () => {
    const { file } = load();
    const long = received();
    assert(long.slots[0]);
    long.slots[0].target = { type: "time", min: 30, max: 43_200 };

    const { slots } = await file.previewQuest(long);

    expect(slots[0]?.target).toEqual({ type: "time", value: 3600 });
  });

  // A hero movement named like a seed one is not it: the seed is matched by name among seed rows
  // only, as the import does.
  test("a seed name is never matched to a hero movement of the same name", async () => {
    const { file, exercises } = load();
    await exercises.createUserExercise({
      ...exercises.DEFAULT_USER_EXERCISE_DRAFT,
      name: "Porch forge squat",
      description: "",
    });
    const named = received();
    named.slots = [
      { movement: { official: "Porch forge squat" }, target: { type: "reps", min: 5, max: 5 } },
    ];
    expect((await file.previewQuest(named)).slots).toMatchObject([
      { exercise: null, available: false },
    ]);
  });

  test("an own movement already here is that row; a new one is brought by the file", async () => {
    const { file } = load();
    const dip = t.sqlite.prepare("SELECT id FROM exercises WHERE uuid = ?").get(DIP_UUID) as {
      id: number;
    };
    const fresh = received();
    fresh.slots = [ownSlot(DIP_UUID), ownSlot("0192a000-0000-7000-8000-0000000000ff")];

    const { slots } = await file.previewQuest(fresh);

    expect(slots[0]?.exercise?.id).toBe(dip.id);
    expect(slots[0]?.available).toBe(true);
    expect(slots[1]).toMatchObject({ exercise: null, available: true });
  });

  // A seed movement carrying the file's uuid is not "already here": the import would write a new
  // row, so the preview must not show the seed one in its place.
  test("an own movement whose uuid a seed row holds is not that seed row", async () => {
    const { file, exercises } = load();
    const seed = t.sqlite
      .prepare("SELECT id FROM exercises WHERE creator = 'Admin' LIMIT 1")
      .get() as { id: number };
    const uuid = "0192a000-0000-7000-8000-0000000000fe";
    t.sqlite.prepare("UPDATE exercises SET uuid = ? WHERE id = ?").run(uuid, seed.id);
    exercises.invalidateExercisesCache();
    const planted = received();
    planted.slots = [ownSlot(uuid)];

    const { slots } = await file.previewQuest(planted);
    t.sqlite.prepare("UPDATE exercises SET uuid = NULL WHERE id = ?").run(seed.id);
    exercises.invalidateExercisesCache();

    expect(slots).toMatchObject([{ exercise: null, available: true }]);
  });

  // The preview warns before a file overwrites one of the hero's quests; it has to find that
  // quest by the uuid the import will use, and only that one.
  test("names the hero's quest the file would update, and only that one", async () => {
    const { file, quests } = load();
    const mine = (await quests.listQuestTemplates()).find((q) => q.uuid === QUEST_UUID);
    assert(mine);

    expect((await file.previewQuest(received())).existing?.id).toBe(mine.id);
    const stranger = received({ uuid: "0192a000-0000-7000-8000-0000000000fd" });
    expect((await file.previewQuest(stranger)).existing).toBeNull();
    const copy = file.editQuestFile(received(), {
      title: "Porch forge",
      language: "en",
      keep: [true, true],
      asCopy: true,
    });
    expect((await file.previewQuest(copy)).existing).toBeNull();
  });
});
