import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { nodeBatiCrypto, segment } from "./helpers/nodeBatiCrypto";

/**
 * The two implementations of the file format, held against each other.
 *
 * `BatiCryptoCoreTest.kt` seals with a counter for randomness and freezes the result in
 * `__tests__/fixtures/backup`; this opens that very file with the Node double the rest of the suite
 * runs on, and seals the same input with the same counter to see the same bytes. A format bug that
 * only one side has is a backup that opens in CI and not on a phone, or the reverse.
 */
const FIXTURES = path.join(__dirname, "fixtures", "backup");

// The test's own constants, written out the way BatiCryptoCoreTest.kt writes them.
const KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 7 + 1) & 0xff)).toString(
  "base64",
);
const HEADER = Buffer.from("BATB-test-header");
const plain = (size: number) =>
  Buffer.from(Array.from({ length: size }, (_, i) => (i * 31 + Math.floor(i / 251)) & 0xff));

let dir: string;
const at = (name: string) => path.join(dir, name);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-golden-"));
});

afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Randomness as a counter, like the Kotlin test's: 0, 1, 2… across every nonce drawn. */
function counterRandomness() {
  let counter = 0;
  jest
    .spyOn(crypto, "randomBytes")
    .mockImplementation(((size: number) =>
      Buffer.from(
        Array.from({ length: size }, () => counter++ & 0xff),
      )) as typeof crypto.randomBytes);
}

describe("the file Kotlin froze", () => {
  test("opens with the Node double, and holds what was sealed", async () => {
    await nodeBatiCrypto.openFile(
      KEY,
      path.join(FIXTURES, "kotlin-golden-v2.bin"),
      at("out"),
      HEADER.length,
    );
    expect(fs.readFileSync(at("out"))).toEqual(plain(100));
  });

  test("is exactly what the Node double writes from the same input and randomness", async () => {
    counterRandomness();
    fs.writeFileSync(at("in"), plain(100));
    await nodeBatiCrypto.sealFile(KEY, at("in"), at("sealed"), HEADER.toString("base64"));

    expect(fs.readFileSync(at("sealed"))).toEqual(
      fs.readFileSync(path.join(FIXTURES, "kotlin-golden-v2.bin")),
    );
  });

  test("a body crossing a segment boundary hashes to what Kotlin froze", async () => {
    counterRandomness();
    fs.writeFileSync(at("in"), plain(segment.bytes + 123));
    await nodeBatiCrypto.sealFile(KEY, at("in"), at("sealed"), HEADER.toString("base64"));

    const digest = crypto
      .createHash("sha256")
      .update(fs.readFileSync(at("sealed")))
      .digest();
    expect(digest).toEqual(fs.readFileSync(path.join(FIXTURES, "kotlin-golden-v2-multi.sha256")));
  });
});

describe("the layout at the segment boundary, as Kotlin writes it", () => {
  test("a file of two whole segments has two, and an empty one has one", async () => {
    fs.writeFileSync(at("whole"), plain(2 * segment.bytes));
    fs.writeFileSync(at("empty"), Buffer.alloc(0));
    await nodeBatiCrypto.sealFile(KEY, at("whole"), at("whole.sealed"), HEADER.toString("base64"));
    await nodeBatiCrypto.sealFile(KEY, at("empty"), at("empty.sealed"), HEADER.toString("base64"));

    expect(fs.statSync(at("whole.sealed")).size).toBe(
      HEADER.length + 2 * (12 + segment.bytes + 16),
    );
    expect(fs.statSync(at("empty.sealed")).size).toBe(HEADER.length + 12 + 16);
  });
});

/**
 * Format 3, the same way: the file Kotlin froze (Bouncy Castle's Argon2id, javax.crypto) read and
 * rebuilt by an implementation written from the format's description on Node's own `argon2Sync`.
 */
describe("the format 3 file Kotlin froze", () => {
  const V3 = path.join(FIXTURES, "kotlin-golden-v3.bin");
  const MASTER = Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 5 + 3) & 0xff)).toString(
    "base64",
  );
  const PASSWORD = Buffer.from("correct horse battery staple").toString("base64");
  const WORDS = Buffer.from(Array.from({ length: 16 }, (_, i) => (i * 11 + 2) & 0xff)).toString(
    "base64",
  );
  const INSTALL = "0102030405060708090a0b0c0d0e0f10";
  const plain3 = (size: number) =>
    Buffer.from(Array.from({ length: size }, (_, i) => (i * 17 + Math.floor(i / 199)) & 0xff));

  test("its header reads back what Kotlin put in it", async () => {
    const read = await nodeBatiCrypto.readHeader(V3);

    expect(read.kind).toBe("ok");
    if (read.kind !== "ok") return;
    expect(read.header.installId).toBe(INSTALL);
    expect(read.header.counter).toBe("41");
    expect(read.header.sealedAt).toBe(1_700_000_000_000);
    expect(read.header.slots.map((slot) => [slot.kind, slot.gen])).toEqual([
      [3, 1],
      [4, 1],
    ]);
  });

  test("both its slots open with the password and with the words, to the same master key", async () => {
    const read = await nodeBatiCrypto.readHeader(V3);
    if (read.kind !== "ok") throw new Error("not ok");
    const [password, words] = read.header.slots;

    expect(await nodeBatiCrypto.unwrapSlot(PASSWORD, password?.raw ?? "")).toBe(MASTER);
    expect(await nodeBatiCrypto.unwrapSlot(WORDS, words?.raw ?? "")).toBe(MASTER);
    expect(
      await nodeBatiCrypto.unwrapSlot(Buffer.from("wrong").toString("base64"), password?.raw ?? ""),
    ).toBeNull();
  });

  test("the key checks out against the file, a wrong one does not, and the body opens", async () => {
    expect(await nodeBatiCrypto.checkKey(MASTER, V3)).toBe(true);
    expect(await nodeBatiCrypto.checkKey(Buffer.alloc(32).toString("base64"), V3)).toBe(false);

    await nodeBatiCrypto.openFileV3(MASTER, V3, at("out"));
    expect(fs.readFileSync(at("out"))).toEqual(plain3(100));
  });

  test("is exactly what the Node implementation writes from the same input and randomness", async () => {
    counterRandomness();
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    fs.writeFileSync(at("in"), plain3(100));
    const password = await nodeBatiCrypto.wrapSlot(MASTER, PASSWORD, 3, 1, 19 * 1024, 2, 1);
    const words = await nodeBatiCrypto.wrapSlot(MASTER, WORDS, 4, 1, 0, 0, 0);
    await nodeBatiCrypto.sealFileV3(
      MASTER,
      at("in"),
      at("sealed"),
      [password.raw, words.raw],
      INSTALL,
      "41",
    );

    expect(fs.readFileSync(at("sealed"))).toEqual(fs.readFileSync(V3));
  });
});
