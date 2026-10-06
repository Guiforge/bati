import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { argonCalls, heap, nodeBatiCrypto } from "./helpers/nodeBatiCrypto";

/**
 * Reading format 3, and writing it only once this phone has joined a vault that is already v3.
 *
 * This is the release that can read a format it cannot yet create, and every line of it has one
 * job: a hero who updates must not lose a thing, and one who meets a newer file must be told to
 * update and not "wrong password". So the tests are about what must NOT happen as much as about
 * what does: no silent downgrade, no key quietly adopted, no Argon2 run for a hostile file.
 *
 * "Another device" is the Node double of the module writing a v3 file directly, which is the same
 * bytes the real thing writes (`backup-kotlin-golden.test.ts` holds that).
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

import {
  argon,
  changePassword,
  encryptionStatus,
  normaliseRecoveryKey,
  openBackup,
  rewrapPassword,
  rewrapWords,
  sealBackup,
  sealingHeader,
  vaultFormat,
} from "@/src/backupCipher";
import { entropyToWords } from "@/src/backupWords";
import { installId } from "@/src/installId";

const FIXTURES = path.join(__dirname, "fixtures", "backup");
const PLAIN = "SQLite format 3\u0000 pretend this is a whole hero";
const INSTALL = "aabbccddeeff00112233445566778899";
const b64 = (bytes: Uint8Array | Buffer) => Buffer.from(bytes).toString("base64");

let dir: string;
const at = (name: string) => path.join(dir, name);

beforeEach(() => {
  mockSecure.clear();
  mockPrefs.clear();
  argonCalls.length = 0;
  heap.freeKib = Number.POSITIVE_INFINITY;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-cipher3-"));
  fs.writeFileSync(at("plain.db"), PLAIN);
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/**
 * A v3 file written by "another device": its password, its twelve words, and a master key. The
 * Argon2 parameters are the floor a reader accepts, which keeps each test under a second.
 */
async function otherDevice(file = "theirs.batb", password = "correct horse battery staple") {
  const master = b64(Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 9 + 4) & 0xff)));
  const entropy = Uint8Array.from({ length: 16 }, (_, i) => (i * 13 + 5) & 0xff);
  const slots = [
    await nodeBatiCrypto.wrapSlot(
      master,
      b64(Buffer.from(password.normalize("NFC"))),
      3,
      1,
      19 * 1024,
      2,
      1,
    ),
    await nodeBatiCrypto.wrapSlot(master, b64(entropy), 4, 1, 0, 0, 0),
  ];
  await nodeBatiCrypto.sealFileV3(
    master,
    at("plain.db"),
    at(file),
    slots.map((s) => s.raw),
    INSTALL,
    "5",
  );
  return { master, password, words: entropyToWords(entropy, "en").join(" "), slots };
}

const open = (file: string, out: string, secret?: string) =>
  openBackup(at(file), at(out), secret).then((o) => o.result);

/** This phone joins the other device's vault, the way a second device does. */
async function joinTheirVault(
  theirs: Awaited<ReturnType<typeof otherDevice>>,
  file = "theirs.batb",
) {
  const outcome = await openBackup(at(file), at("joined.db"), theirs.password);
  await outcome.join?.({ asPrimary: true });
  fs.rmSync(at("joined.db"), { force: true });
}

describe("opening a format 3 file", () => {
  test("a phone that has never seen it needs a secret, and a wrong one is refused", async () => {
    await otherDevice();

    expect(await open("theirs.batb", "out.db")).toBe("needsSecret");
    expect(await open("theirs.batb", "out.db", "not the one")).toBe("wrongSecret");
    expect(fs.existsSync(at("out.db"))).toBe(false);
  });

  test("the password opens it, and opening it adopts nothing", async () => {
    const theirs = await otherDevice();

    const outcome = await openBackup(at("theirs.batb"), at("out.db"), theirs.password);

    expect(outcome.result).toBe("opened");
    expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);
    expect(await encryptionStatus()).toBe("off");
  });

  test("the twelve words open it, typed any way a person types them", async () => {
    const theirs = await otherDevice();
    const typed = theirs.words
      .toUpperCase()
      .split(" ")
      .map((word) => word.slice(0, 4))
      .join("  ");

    expect(await open("theirs.batb", "out.db", typed)).toBe("opened");
  });

  test("a password that happens to be twelve valid words still opens as a password", async () => {
    const twelve = entropyToWords(new Uint8Array(16).fill(9), "en").join(" ");
    await otherDevice("theirs.batb", twelve);

    expect(await open("theirs.batb", "out.db", twelve)).toBe("opened");
  });

  test("the words are tried first, because they cost one hash and a password costs Argon2", async () => {
    const theirs = await otherDevice();
    argonCalls.length = 0;

    await open("theirs.batb", "out.db", theirs.words);

    expect(argonCalls).toEqual([]);
  });

  test("a recovery key of the old kind is not one of these: sixty-four hex digits open nothing here", async () => {
    await otherDevice();
    expect(await open("theirs.batb", "out.db", "ab".repeat(32))).toBe("wrongSecret");
  });

  test("with the heap too small for Argon2 the password says so, and the words still open it", async () => {
    const theirs = await otherDevice();
    heap.freeKib = 1024;

    await expect(open("theirs.batb", "out.db", theirs.password)).rejects.toThrow("LOW_MEMORY");
    expect(await open("theirs.batb", "out.db", theirs.words)).toBe("opened");
  });

  test("a slot asking for two gibibytes is skipped without running Argon2 at all", async () => {
    const theirs = await otherDevice();
    // Memory 2 GiB in the first slot, written straight into the bytes the way a stranger would.
    const bytes = fs.readFileSync(at("theirs.batb"));
    const slotStart = 5 + 16 + 8 + 8 + 1; // after the slot count
    bytes.writeUInt32BE(2 * 1024 * 1024, slotStart + 1 + 2 + 4); // kind, length, gen, then memory
    fs.writeFileSync(at("hostile.batb"), bytes);
    argonCalls.length = 0;

    expect(await open("hostile.batb", "out.db", theirs.password)).toBe("wrongSecret");
    expect(argonCalls).toEqual([]);
  });

  test("a file from a version this build does not know says to update, whatever is typed", async () => {
    const theirs = await otherDevice();
    const bytes = fs.readFileSync(at("theirs.batb"));
    bytes[4] = 4;
    fs.writeFileSync(at("newer.batb"), bytes);

    expect(await open("newer.batb", "out.db")).toBe("newerVersion");
    expect(await open("newer.batb", "out.db", theirs.password)).toBe("newerVersion");
    expect(fs.existsSync(at("out.db"))).toBe(false);
  });

  test("a damaged header is not a backup, and a plain file is still plain", async () => {
    await otherDevice();
    const bytes = fs.readFileSync(at("theirs.batb"));
    fs.writeFileSync(at("cut.batb"), bytes.subarray(0, 40));

    expect(await open("cut.batb", "out.db", "x")).toBe("notEncrypted");
    expect(await open("plain.db", "out.db", "x")).toBe("notEncrypted");
  });

  test("a body altered anywhere is refused, with nothing left at the target", async () => {
    const theirs = await otherDevice();
    const bytes = fs.readFileSync(at("theirs.batb"));
    bytes[bytes.length - 3] = (bytes[bytes.length - 3] as number) ^ 1;
    fs.writeFileSync(at("altered.batb"), bytes);

    await expect(open("altered.batb", "out.db", theirs.password)).rejects.toThrow();
    expect(fs.existsSync(at("out.db"))).toBe(false);
  });
});

describe("joining a format 3 vault", () => {
  test("makes it this phone's, which then seals format 3 and opens its own files without asking", async () => {
    const theirs = await otherDevice();
    expect(await vaultFormat()).toBeNull();

    await joinTheirVault(theirs);

    expect(await encryptionStatus()).toBe("on");
    expect(await vaultFormat()).toBe(3);
    await sealBackup(at("plain.db"), at("mine.batb"));
    const read = await nodeBatiCrypto.readHeader(at("mine.batb"));
    expect(read.kind).toBe("ok");
    expect(await open("mine.batb", "out.db")).toBe("opened");
    expect(fs.readFileSync(at("out.db"), "utf8")).toBe(PLAIN);
  });

  test("what this phone seals opens on the other device with the same password and the same words", async () => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);
    await sealBackup(at("plain.db"), at("mine.batb"));
    mockSecure.clear();
    mockPrefs.clear();

    expect(await open("mine.batb", "a.db", theirs.password)).toBe("opened");
    expect(await open("mine.batb", "b.db", theirs.words)).toBe("opened");
  });

  test("the file says which install wrote it, and a counter that never repeats", async () => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);
    const mine = (await installId()).replaceAll("-", "");

    await sealBackup(at("plain.db"), at("one.batb"));
    await sealBackup(at("plain.db"), at("two.batb"));
    await sealBackup(at("plain.db"), at("three.batb"));

    const read = async (file: string) => {
      const h = await nodeBatiCrypto.readHeader(at(file));
      return h.kind === "ok" ? h.header : null;
    };
    expect((await read("one.batb"))?.installId).toBe(mine);
    expect([
      (await read("one.batb"))?.counter,
      (await read("two.batb"))?.counter,
      (await read("three.batb"))?.counter,
    ]).toEqual(["1", "2", "3"]);
  });

  test("sealings that start together never share a counter", async () => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);

    await Promise.all(
      ["a", "b", "c", "d"].map((name) => sealBackup(at("plain.db"), at(`${name}.batb`))),
    );

    const counters = await Promise.all(
      ["a", "b", "c", "d"].map(async (name) => {
        const h = await nodeBatiCrypto.readHeader(at(`${name}.batb`));
        return h.kind === "ok" ? h.header.counter : "";
      }),
    );
    expect(new Set(counters).size).toBe(4);
  });

  test("a sealing that fails still spends its number, so one is never used twice", async () => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);
    await sealBackup(at("plain.db"), at("one.batb"));

    await expect(sealBackup(at("does-not-exist.db"), at("failed.batb"))).rejects.toThrow();
    await sealBackup(at("plain.db"), at("three.batb"));

    const h = await nodeBatiCrypto.readHeader(at("three.batb"));
    expect(h.kind === "ok" && h.header.counter).toBe("3");
  });

  test("two sealings of the same database share neither salt nor nonce prefix", async () => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);

    await sealBackup(at("plain.db"), at("one.batb"));
    await sealBackup(at("plain.db"), at("two.batb"));

    const a = fs.readFileSync(at("one.batb"));
    const b = fs.readFileSync(at("two.batb"));
    // After the slots: file salt (32), then the nonce prefix (7). The slots are the same in both.
    const slotsEnd =
      5 +
      16 +
      8 +
      8 +
      1 +
      theirs.slots.reduce((n, s) => n + Buffer.from(s.raw, "base64").length, 0);
    expect(a.subarray(slotsEnd, slotsEnd + 39).equals(b.subarray(slotsEnd, slotsEnd + 39))).toBe(
      false,
    );
    expect(a.subarray(slotsEnd, slotsEnd + 32).equals(b.subarray(slotsEnd, slotsEnd + 32))).toBe(
      false,
    );
    expect(
      a.subarray(slotsEnd + 32, slotsEnd + 39).equals(b.subarray(slotsEnd + 32, slotsEnd + 39)),
    ).toBe(false);
  });

  /** A phone as v2.9 left it (frozen): a format 2 vault, the password, and a backup it sealed. */
  function loadV2Phone() {
    const state = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, "v2-phone-state.json"), "utf8"),
    ) as { secure: Record<string, string>; preferences: Record<string, string>; password: string };
    mockSecure.clear();
    mockPrefs.clear();
    for (const [k, v] of Object.entries(state.secure)) mockSecure.set(k, v);
    for (const [k, v] of Object.entries(state.preferences)) mockPrefs.set(k, v);
    return { password: state.password, file: path.join(FIXTURES, "v2-phone.batb") };
  }

  test("a vault never goes back to an older format: a v2 file opened with its password cannot take over", async () => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);
    const v3Vault = mockSecure.get("bati.backup.vault");
    const old = loadV2Phone(); // a format 2 file, and the password it was sealed with
    // This phone is the one on format 3: put its vault back, with the v2 file next to it.
    mockSecure.set("bati.backup.vault", v3Vault ?? "");
    mockSecure.delete("bati.backup.keyring");

    const outcome = await openBackup(old.file, at("out.db"), old.password);
    expect(outcome.result).toBe("opened");
    await outcome.join?.({ asPrimary: true });

    // Remembered, so it opens from now on; but the vault, and so every file written next, is still v3.
    expect(mockSecure.get("bati.backup.vault")).toBe(v3Vault);
    expect(await vaultFormat()).toBe(3);
    fs.rmSync(at("out.db"));
    expect((await openBackup(old.file, at("out.db"))).result).toBe("opened");
  });

  test("a format 2 vault that joins a format 3 one becomes it, and its own old files still open", async () => {
    const old = loadV2Phone();
    expect(await vaultFormat()).toBe(2);
    const theirs = await otherDevice();

    const outcome = await openBackup(at("theirs.batb"), at("joined.db"), theirs.password);
    await outcome.join?.({ asPrimary: true });

    expect(await vaultFormat()).toBe(3);
    // The v2 key went to the keyring: nothing this phone ever wrote stops opening.
    const again = await openBackup(old.file, at("again.db"));
    expect(again.result).toBe("opened");
    expect(fs.readFileSync(at("again.db"), "utf8")).toContain("the hero as 2.9 sealed it");
  });

  test("a key kept for reading only opens its files and writes none", async () => {
    const theirs = await otherDevice();
    const outcome = await openBackup(at("theirs.batb"), at("out.db"), theirs.password);
    await outcome.join?.({ asPrimary: false });
    fs.rmSync(at("out.db"));

    expect(await encryptionStatus()).toBe("off");
    expect(await open("theirs.batb", "out.db")).toBe("opened");
  });

  test("the sealing identity is stable and differs between two vaults", async () => {
    const a = await otherDevice("a.batb");
    await joinTheirVault(a, "a.batb");
    const first = await sealingHeader();
    expect(first).toMatch(/^v3:/);
    expect(await sealingHeader()).toBe(first);

    mockSecure.clear();
    mockPrefs.clear();
    const entropy2 = Uint8Array.from({ length: 16 }, (_, i) => (i * 3 + 1) & 0xff);
    const master2 = b64(Buffer.alloc(32, 7));
    const slot = await nodeBatiCrypto.wrapSlot(
      master2,
      b64(Buffer.from("other password, long enough")),
      3,
      1,
      19 * 1024,
      2,
      1,
    );
    const words = await nodeBatiCrypto.wrapSlot(master2, b64(entropy2), 4, 1, 0, 0, 0);
    await nodeBatiCrypto.sealFileV3(
      master2,
      at("plain.db"),
      at("b.batb"),
      [slot.raw, words.raw],
      INSTALL,
      "1",
    );
    const outcome = await openBackup(at("b.batb"), at("out.db"), "other password, long enough");
    await outcome.join?.({ asPrimary: true });

    expect(await sealingHeader()).not.toBe(first);
  });
});

describe("a file nobody can open", () => {
  /** A well-formed header whose only slot is of a kind this reader has never heard of. */
  async function strayFile(file = "stray.batb") {
    const master = b64(Buffer.alloc(32, 3));
    const slot = await nodeBatiCrypto.wrapSlot(master, b64(Buffer.from("whatever")), 9, 1, 0, 0, 0);
    await nodeBatiCrypto.sealFileV3(master, at("plain.db"), at(file), [slot.raw], INSTALL, "1");
  }

  test("is not a vault to join: no password is asked, whatever the sync would do with a 'locked' one", async () => {
    await strayFile();

    expect(await open("stray.batb", "out.db")).toBe("notEncrypted");
    expect(await open("stray.batb", "out.db", "any secret at all")).toBe("notEncrypted");
    expect(fs.existsSync(at("out.db"))).toBe(false);
  });

  test("a vault whose key opens it is still opened, whatever its slots", async () => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);
    const extra = await nodeBatiCrypto.wrapSlot(
      theirs.master,
      b64(Buffer.from("x")),
      9,
      5,
      0,
      0,
      0,
    );
    await nodeBatiCrypto.sealFileV3(
      theirs.master,
      at("plain.db"),
      at("odd.batb"),
      [...theirs.slots.map((s) => s.raw), extra.raw],
      INSTALL,
      "9",
    );

    expect(await open("odd.batb", "out.db")).toBe("opened");
  });

  test("a slot of a kind this build does not read is not adopted from a file under its own key", async () => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);
    const before = await sealingHeader();
    const extra = await nodeBatiCrypto.wrapSlot(
      theirs.master,
      b64(Buffer.from("x")),
      9,
      5,
      0,
      0,
      0,
    );
    await nodeBatiCrypto.sealFileV3(
      theirs.master,
      at("plain.db"),
      at("odd.batb"),
      [...theirs.slots.map((s) => s.raw), extra.raw],
      INSTALL,
      "9",
    );

    await open("odd.batb", "out.db");

    expect(await sealingHeader()).toBe(before);
  });
});

describe("mutation survivors: what a peer's file may teach this phone", () => {
  /** A second file under the same master key, read as if its header carried `extra` too. */
  async function openWithExtraSlot(
    theirs: Awaited<ReturnType<typeof otherDevice>>,
    extra: { kind: number; gen: number; memoryKib: number; passes: number; lanes: number },
  ) {
    await otherDevice("second.batb");
    const real = nodeBatiCrypto.readHeader.bind(nodeBatiCrypto);
    const spy = jest.spyOn(nodeBatiCrypto, "readHeader").mockImplementation(async (file) => {
      const read = await real(file);
      if (read.kind !== "ok") return read;
      const raw = (theirs.slots[0] as { raw: string }).raw;
      return {
        kind: "ok",
        header: { ...read.header, slots: [...read.header.slots, { ...extra, raw }] },
      };
    });
    try {
      return await open("second.batb", "out.db");
    } finally {
      spy.mockRestore();
    }
  }

  test.each([
    [
      "the memory floor, 19 MiB, 2 passes, 1 lane",
      { kind: 3, memoryKib: 19 * 1024, passes: 2, lanes: 1 },
      "3.2.",
      true,
    ],
    [
      "the ceiling, 128 MiB, 4 passes, 4 lanes",
      { kind: 3, memoryKib: 128 * 1024, passes: 4, lanes: 4 },
      "3.2.",
      true,
    ],
    ["a words slot", { kind: 4, memoryKib: 0, passes: 0, lanes: 0 }, "4.2.", true],
    [
      "a kilobyte under the memory floor",
      { kind: 3, memoryKib: 19 * 1024 - 1, passes: 2, lanes: 1 },
      "3.2.",
      false,
    ],
    [
      "a kilobyte over the memory ceiling",
      { kind: 3, memoryKib: 128 * 1024 + 1, passes: 2, lanes: 1 },
      "3.2.",
      false,
    ],
    ["one pass", { kind: 3, memoryKib: 19 * 1024, passes: 1, lanes: 1 }, "3.2.", false],
    ["five passes", { kind: 3, memoryKib: 19 * 1024, passes: 5, lanes: 1 }, "3.2.", false],
    ["nine passes", { kind: 3, memoryKib: 19 * 1024, passes: 9, lanes: 1 }, "3.2.", false],
    ["no lane", { kind: 3, memoryKib: 19 * 1024, passes: 2, lanes: 0 }, "3.2.", false],
    ["five lanes", { kind: 3, memoryKib: 19 * 1024, passes: 2, lanes: 5 }, "3.2.", false],
    [
      "a kind nobody reads, with sane parameters",
      { kind: 5, memoryKib: 19 * 1024, passes: 2, lanes: 1 },
      "5.2.",
      false,
    ],
  ])("a slot with %s: adopted is %s", async (_label, params, mark, adopted) => {
    const theirs = await otherDevice();
    await joinTheirVault(theirs);

    expect(await openWithExtraSlot(theirs, { ...params, gen: 2 })).toBe("opened");

    expect(
      new RegExp(`[:,]${mark.replaceAll(".", "\\.")}`).test((await sealingHeader()) ?? ""),
    ).toBe(adopted);
  });

  test("a words slot arriving first is taken, a password slot already known is not replaced", async () => {
    const master = b64(Buffer.alloc(32, 11));
    const password = "correct horse battery staple";
    const argonSlot = await nodeBatiCrypto.wrapSlot(
      master,
      b64(Buffer.from(password)),
      3,
      1,
      19 * 1024,
      2,
      1,
    );
    const wordsSlot = await nodeBatiCrypto.wrapSlot(
      master,
      b64(Buffer.alloc(16, 5)),
      4,
      1,
      0,
      0,
      0,
    );
    await nodeBatiCrypto.sealFileV3(
      master,
      at("plain.db"),
      at("one.batb"),
      [argonSlot.raw],
      INSTALL,
      "1",
    );
    await nodeBatiCrypto.sealFileV3(
      master,
      at("plain.db"),
      at("two.batb"),
      [argonSlot.raw, wordsSlot.raw],
      INSTALL,
      "2",
    );
    const joined = await openBackup(at("one.batb"), at("j.db"), password);
    await joined.join?.({ asPrimary: true });
    expect(await sealingHeader()).not.toMatch(/,4\.1\./);

    expect(await open("two.batb", "out.db")).toBe("opened");

    expect(await sealingHeader()).toMatch(/,4\.1\./);
    expect(await sealingHeader()).toMatch(/:3\.1\./);
  });

  test("an opened file says who wrote it and its counter, and so does one that still needs a secret", async () => {
    const theirs = await otherDevice();
    expect((await openBackup(at("theirs.batb"), at("a.db"))).sealedBy).toBeUndefined();
    const claimed = await openBackup(at("theirs.batb"), at("a.db"));
    expect(claimed).toMatchObject({
      result: "needsSecret",
      claims: { installId: INSTALL, counter: "5" },
    });

    const withSecret = await openBackup(at("theirs.batb"), at("b.db"), theirs.password);
    expect(withSecret.sealedBy).toEqual({ installId: INSTALL, counter: "5" });
    await withSecret.join?.({ asPrimary: true });
    fs.rmSync(at("b.db"));
    const own = await openBackup(at("theirs.batb"), at("b.db"));
    expect(own.sealedBy).toEqual({ installId: INSTALL, counter: "5" });
  });

  test("a v3 file under this phone's key is own, and a key kept after a new password reads as the keyring", async () => {
    const saved = { ...argon };
    Object.assign(argon, { memoryKib: 19 * 1024, fallbackKib: 19 * 1024, passes: 2, lanes: 1 });
    try {
      const theirs = await otherDevice();
      await joinTheirVault(theirs);
      expect((await openBackup(at("theirs.batb"), at("a.db"))).viaKeyring).toBe(false);

      await changePassword("a brand new password of course", "en");

      fs.rmSync(at("a.db"));
      const kept = await openBackup(at("theirs.batb"), at("a.db"));
      expect(kept).toMatchObject({ result: "opened", viaKeyring: true });
    } finally {
      Object.assign(argon, saved);
    }
  });
});

describe("mutation survivors: a hostile format 2 header", () => {
  const SLOT = 1 + 4 + 16 + 60;
  /** BATB, version 2, one slot of the given kind and iterations, then 28 zero bytes of "check". */
  function hostile(kind: number, iterations: number) {
    const bytes = Buffer.alloc(6 + SLOT + 28);
    bytes.write("BATB");
    bytes[4] = 2;
    bytes[5] = 1;
    bytes[6] = kind;
    bytes.writeUInt32BE(iterations, 7);
    fs.writeFileSync(at("hostile.batb"), bytes);
    return open("hostile.batb", "out.db");
  }

  test.each([
    ["a recovery slot that asks for iterations", 2, 1, "notEncrypted"],
    ["a recovery slot with none", 2, 0, "needsSecret"],
    ["a kind nobody wrote, at a fine cost", 9, 100_000, "notEncrypted"],
    ["a password slot at the floor", 1, 100_000, "needsSecret"],
    ["a password slot one under the floor", 1, 99_999, "notEncrypted"],
    ["a password slot at the ceiling", 1, 10_000_000, "needsSecret"],
    ["a password slot one over the ceiling", 1, 10_000_001, "notEncrypted"],
  ])("%s is read as %s", async (_label, kind, iterations, expected) => {
    expect(await hostile(kind, iterations)).toBe(expected);
  });
});

describe("mutation survivors: input that is not what it claims", () => {
  const frame = (count: number, extra = 0) => {
    const bytes = Buffer.alloc(6 + extra);
    bytes.write("BATB");
    bytes[4] = 2;
    bytes[5] = count;
    return bytes;
  };

  test("a format 2 header with no slot, or cut short of the slots it announces, is not encrypted", async () => {
    fs.writeFileSync(at("none.batb"), frame(0, 28));
    fs.writeFileSync(at("cut.batb"), frame(5, 200));

    expect(await open("none.batb", "out.db")).toBe("notEncrypted");
    expect(await open("none.batb", "out.db", "any secret")).toBe("notEncrypted");
    expect(await open("cut.batb", "out.db", "any secret")).toBe("notEncrypted");
  });

  test("a module answer of 'newer version' is said as it is, and a corrupt one is not a vault", async () => {
    await otherDevice();
    const spy = jest.spyOn(nodeBatiCrypto, "readHeader");
    try {
      spy.mockResolvedValueOnce({ kind: "newerVersion" });
      expect(await openBackup(at("theirs.batb"), at("out.db"))).toEqual({ result: "newerVersion" });
      spy.mockResolvedValueOnce({ kind: "notThis" });
      expect(await openBackup(at("theirs.batb"), at("out.db"))).toEqual({ result: "notEncrypted" });
    } finally {
      spy.mockRestore();
    }
  });

  test("a recovery key is the whole input, however it is spaced", () => {
    const hex = "ab12".repeat(16);
    expect(normaliseRecoveryKey(`zz${hex}`)).toBeNull();
    expect(normaliseRecoveryKey(`${hex}zz`)).toBeNull();
    expect(normaliseRecoveryKey(`${hex}a`)).toBeNull();
    const grouped = hex.match(/.{4}/g)?.join(" ");
    expect(normaliseRecoveryKey(`  ${grouped} `)).toBe(hex);
  });

  test("no vault is no sealing header, and a stored header that is garbage is no vault", async () => {
    expect(await sealingHeader()).toBeNull();

    mockSecure.set("bati.backup.vault", JSON.stringify({ key: "AA==", header: "AAAA" }));
    expect(await encryptionStatus()).toBe("off");
    await expect(sealBackup(at("plain.db"), at("out.batb"))).rejects.toThrow("Encryption is off");
    mockPrefs.set("backupEncryption", "on");
    expect(await encryptionStatus()).toBe("locked");
  });

  test("a re-wrap with no vault at all says it needs format 3", async () => {
    await expect(rewrapPassword("x".repeat(15))).rejects.toThrow("format 3");
    await expect(rewrapWords("en")).rejects.toThrow("format 3");
  });
});
