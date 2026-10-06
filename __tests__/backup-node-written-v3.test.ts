import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { nodeBatiCrypto, segment } from "./helpers/nodeBatiCrypto";

/**
 * The other direction of `backup-kotlin-golden.test.ts`: format 3 files written by the Node double, which the
 * Kotlin that runs on a phone must open (`NodeWrittenV3Test.kt`), and a multi-segment seal whose digest the
 * Kotlin seal must reproduce from the same randomness. Together with the golden file Kotlin froze, each
 * implementation has opened what the other wrote and written what the other wrote.
 *
 * These files are not regenerated to make a build green: `UPDATE_NODE_V3=1` rewrites them, and a diff in the
 * repo is the change of the format.
 */
const DIR = path.join(__dirname, "fixtures", "backup", "node-written");
const MASTER = Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 5 + 3) & 0xff)).toString(
  "base64",
);
const PASSWORD = Buffer.from("correct horse battery staple").toString("base64");
const WORDS = Buffer.from(Array.from({ length: 16 }, (_, i) => (i * 11 + 2) & 0xff)).toString(
  "base64",
);
const INSTALL = "0102030405060708090a0b0c0d0e0f10";
const plain = (size: number) =>
  Buffer.from(Array.from({ length: size }, (_, i) => (i * 17 + Math.floor(i / 199)) & 0xff));

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-node-v3-"));
  jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
});
afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

/** A counter for randomness, from `start`: the same stream the Kotlin test draws, and nothing a real seal uses. */
function counterFrom(start: number) {
  let counter = start;
  jest
    .spyOn(crypto, "randomBytes")
    .mockImplementation(((size: number) =>
      Buffer.from(
        Array.from({ length: size }, () => counter++ & 0xff),
      )) as typeof crypto.randomBytes);
}

async function seal(size: number, counter: string, start: number): Promise<Buffer> {
  counterFrom(start);
  const input = path.join(dir, `in-${size}`);
  const output = path.join(dir, `out-${size}`);
  fs.writeFileSync(input, plain(size));
  const password = await nodeBatiCrypto.wrapSlot(MASTER, PASSWORD, 3, 1, 19 * 1024, 2, 1);
  const words = await nodeBatiCrypto.wrapSlot(MASTER, WORDS, 4, 1, 0, 0, 0);
  await nodeBatiCrypto.sealFileV3(
    MASTER,
    input,
    output,
    [password.raw, words.raw],
    INSTALL,
    counter,
  );
  return fs.readFileSync(output);
}

/** Written on request, otherwise held against what is in the repo. */
function frozen(name: string, bytes: Buffer): void {
  const file = path.join(DIR, name);
  if (process.env.UPDATE_NODE_V3 === "1") {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, bytes);
  }
  expect(fs.existsSync(file)).toBe(true);
  expect(fs.readFileSync(file).equals(bytes)).toBe(true);
}

describe("format 3 as the Node double writes it", () => {
  test.each([0, 1, 100_000])(
    "a file of %i bytes is the one the Kotlin tests open",
    async (size) => {
      frozen(`node-v3-${size}.batb`, await seal(size, "7", 1000));
    },
  );

  test("a body of two whole segments and seven bytes has three, and its digest is what Kotlin must reproduce", async () => {
    const sealed = await seal(2 * segment.bytes + 7, "41", 0);
    const digest = crypto.createHash("sha256").update(sealed).digest();
    frozen("node-v3-multi.sha256", digest);
  });
});
