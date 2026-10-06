import crypto from "node:crypto";
import fs from "node:fs";

import type { HeaderInfo, ReadHeaderResult, SlotInfo } from "../../modules/bati-crypto";

/**
 * Format 3 in Node's `crypto`, written from the format's description in BatiCryptoV3.kt and not
 * from its code. Two implementations that agree byte for byte on a frozen file, one on the JVM
 * with Bouncy Castle and this one on `crypto.argon2Sync`, are two readings of the same format, and
 * a bug in one has to be in the other as well to go unseen.
 *
 * It is a double of the device for the TypeScript tests, never of the code under test.
 */
const MAGIC = Buffer.from("BATB");
const VERSION = 3;
const KIND_PASSWORD = 3;
const KIND_RECOVERY = 4;
const SALT = 16;
const NONCE = 12;
const TAG = 16;
const WRAPPED = NONCE + 32 + TAG;
const FILE_SALT = 32;
const PREFIX = 7;
const CHECK = 32;
const MAX_SLOTS = 4;
const MAX_SLOT_BYTES = 128;
const MAX_HEADER =
  5 + 16 + 8 + 8 + 1 + MAX_SLOTS * (1 + 2 + MAX_SLOT_BYTES) + FILE_SALT + PREFIX + CHECK;
const SEGMENT = 1024 * 1024;

/** What a header may ask of Argon2 on reading, and so what a write must stay inside. */
const BOUNDS = { memoryKib: [19 * 1024, 128 * 1024], passes: [2, 4], lanes: [1, 4] } as const;

/** Argon2 calls, so a test can see what was asked of it, and a switch for "the heap is full". */
export const argonCalls: { memoryKib: number; passes: number; lanes: number }[] = [];
export const heap = { freeKib: Number.POSITIVE_INFINITY };

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const bytes = (value: string) => Buffer.from(value, "base64");
const path = (value: string) => value.replace(/^file:\/\//, "");
const later = <T>(work: () => T): Promise<T> => Promise.resolve().then(work);

const u16 = (n: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
};
const u32 = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
};
const u64 = (n: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(n);
  return b;
};

function hkdf(ikm: Uint8Array, salt: Uint8Array, info: string, length: number): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", ikm, salt, info, length));
}

function slotAad(
  kind: number,
  gen: number,
  memoryKib: number,
  passes: number,
  lanes: number,
  salt: Buffer,
) {
  return Buffer.concat([
    MAGIC,
    Buffer.of(VERSION, kind),
    u32(gen),
    kind === KIND_PASSWORD
      ? Buffer.concat([u32(memoryKib), Buffer.of(passes, lanes)])
      : Buffer.alloc(0),
    salt,
  ]);
}

function encodeSlot(slot: Omit<SlotInfo, "raw">, salt: Buffer, wrapped: Buffer): Buffer {
  const body = Buffer.concat([
    u32(slot.gen),
    slot.kind === KIND_PASSWORD
      ? Buffer.concat([u32(slot.memoryKib), Buffer.of(slot.passes, slot.lanes)])
      : Buffer.alloc(0),
    salt,
    wrapped,
  ]);
  return Buffer.concat([Buffer.of(slot.kind), u16(body.length), body]);
}

type ParsedSlot = SlotInfo & { salt: Buffer; wrapped: Buffer };

function parseSlot(kind: number, body: Buffer): ParsedSlot | null {
  const gen = body.readUInt32BE(0);
  if (kind === KIND_PASSWORD) {
    if (body.length !== 4 + 4 + 1 + 1 + SALT + WRAPPED) throw new Error("slot");
    const memoryKib = body.readUInt32BE(4);
    const [passes, lanes] = [body[8] as number, body[9] as number];
    const salt = body.subarray(10, 10 + SALT);
    const wrapped = body.subarray(10 + SALT);
    const raw = encodeSlot({ kind, gen, memoryKib, passes, lanes }, salt, wrapped);
    return { kind, gen, memoryKib, passes, lanes, raw: b64(raw), salt, wrapped };
  }
  if (kind === KIND_RECOVERY) {
    if (body.length !== 4 + SALT + WRAPPED) throw new Error("slot");
    const salt = body.subarray(4, 4 + SALT);
    const wrapped = body.subarray(4 + SALT);
    const raw = encodeSlot({ kind, gen, memoryKib: 0, passes: 0, lanes: 0 }, salt, wrapped);
    return { kind, gen, memoryKib: 0, passes: 0, lanes: 0, raw: b64(raw), salt, wrapped };
  }
  return null;
}

function decodeSlot(raw: string): ParsedSlot {
  const all = bytes(raw);
  if (all.length < 3 || all.readUInt16BE(1) !== all.length - 3) throw new Error("slot");
  const parsed = parseSlot(all[0] as number, all.subarray(3));
  if (!parsed) throw new Error("slot kind");
  return parsed;
}

type Parsed = {
  header: HeaderInfo;
  fileSalt: Buffer;
  prefix: Buffer;
  check: Buffer;
  bytes: Buffer;
};

function parse(prefix: Buffer): Parsed | "newerVersion" | null {
  if (prefix.length < 5 || !prefix.subarray(0, 4).equals(MAGIC)) return null;
  const version = prefix[4] as number;
  if (version > VERSION) return "newerVersion";
  if (version !== VERSION) return null;
  try {
    let at = 5;
    const take = (n: number) => {
      if (at + n > prefix.length) throw new Error("short");
      const out = prefix.subarray(at, at + n);
      at += n;
      return out;
    };
    const installId = take(16).toString("hex");
    const counter = take(8).readBigUInt64BE().toString();
    const sealedAt = Number(take(8).readBigUInt64BE());
    const count = take(1)[0] as number;
    if (count < 1 || count > MAX_SLOTS) return null;
    const slots: SlotInfo[] = [];
    for (let i = 0; i < count; i++) {
      const kind = take(1)[0] as number;
      const length = take(2).readUInt16BE();
      if (length > MAX_SLOT_BYTES || length < 4) return null;
      const slot = parseSlot(kind, take(length));
      if (slot)
        slots.push({
          kind: slot.kind,
          gen: slot.gen,
          memoryKib: slot.memoryKib,
          passes: slot.passes,
          lanes: slot.lanes,
          raw: slot.raw,
        });
    }
    const fileSalt = take(FILE_SALT);
    const noncePrefix = take(PREFIX);
    const check = take(CHECK);
    const headerBytes = prefix.subarray(0, at);
    return {
      header: { headerLength: at, installId, counter, sealedAt, slots },
      fileSalt,
      prefix: noncePrefix,
      check,
      bytes: headerBytes,
    };
  } catch {
    return null;
  }
}

function readParsed(file: string): Parsed | "newerVersion" | null {
  return parse(fs.readFileSync(path(file)).subarray(0, MAX_HEADER));
}

function checkValue(master: Buffer, fileSalt: Buffer, withoutCheck: Buffer): Buffer {
  return crypto
    .createHmac("sha256", hkdf(master, fileSalt, "bati/v3/check", 32))
    .update(withoutCheck)
    .digest();
}

function wrappingKey(
  slot: { kind: number; memoryKib: number; passes: number; lanes: number; salt: Buffer },
  secret: Buffer,
): Buffer {
  if (slot.kind === KIND_PASSWORD) {
    // Coded, as the bridge delivers it (BatiCryptoModule.lowMemoryAsCode).
    if (heap.freeKib < slot.memoryKib * 1.1)
      throw Object.assign(new Error("LOW_MEMORY"), { code: "LOW_MEMORY" });
    argonCalls.push({ memoryKib: slot.memoryKib, passes: slot.passes, lanes: slot.lanes });
    return crypto.argon2Sync("argon2id", {
      message: secret,
      nonce: slot.salt,
      parallelism: slot.lanes,
      tagLength: 32,
      memory: slot.memoryKib,
      passes: slot.passes,
    });
  }
  return hkdf(secret, slot.salt, "bati/v3/recovery", 32);
}

function checkBounds(slot: { kind: number; memoryKib: number; passes: number; lanes: number }) {
  if (slot.kind !== KIND_PASSWORD) return;
  const within = (n: number, [lo, hi]: readonly [number, number]) => n >= lo && n <= hi;
  if (!within(slot.memoryKib, BOUNDS.memoryKib)) throw new Error("Argon2 memory out of bounds");
  if (!within(slot.passes, BOUNDS.passes)) throw new Error("Argon2 passes out of bounds");
  if (!within(slot.lanes, BOUNDS.lanes)) throw new Error("Argon2 lanes out of bounds");
}

function segmentNonce(p: Parsed, index: number, last: boolean) {
  return Buffer.concat([p.prefix, u32(index), Buffer.of(last ? 1 : 0)]);
}

function sealSegment(bodyKey: Buffer, p: Parsed, index: number, last: boolean, chunk: Buffer) {
  const cipher = crypto.createCipheriv("aes-256-gcm", bodyKey, segmentNonce(p, index, last));
  cipher.setAAD(p.bytes);
  return Buffer.concat([cipher.update(chunk), cipher.final(), cipher.getAuthTag()]);
}

function openSegment(bodyKey: Buffer, p: Parsed, index: number, last: boolean, sealed: Buffer) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", bodyKey, segmentNonce(p, index, last));
  decipher.setAAD(p.bytes);
  decipher.setAuthTag(sealed.subarray(sealed.length - TAG));
  return Buffer.concat([
    decipher.update(sealed.subarray(0, sealed.length - TAG)),
    decipher.final(),
  ]);
}

export const nodeBatiCryptoV3 = {
  readHeader: (file: string): Promise<ReadHeaderResult> =>
    later(() => {
      const parsed = readParsed(file);
      if (parsed === "newerVersion") return { kind: "newerVersion" };
      return parsed === null ? { kind: "notThis" } : { kind: "ok", header: parsed.header };
    }),

  checkKey: (key: string, file: string): Promise<boolean> =>
    later(() => {
      const parsed = readParsed(file);
      if (parsed === null || parsed === "newerVersion") return false;
      const expected = checkValue(
        bytes(key),
        parsed.fileSalt,
        parsed.bytes.subarray(0, parsed.bytes.length - CHECK),
      );
      return crypto.timingSafeEqual(expected, parsed.check);
    }),

  unwrapSlot: (secret: string, slotRaw: string): Promise<string | null> =>
    later(() => {
      const slot = decodeSlot(slotRaw);
      checkBounds(slot);
      const wrapKey = wrappingKey(slot, bytes(secret));
      const sealed = slot.wrapped;
      const decipher = crypto.createDecipheriv("aes-256-gcm", wrapKey, sealed.subarray(0, NONCE));
      decipher.setAAD(
        slotAad(slot.kind, slot.gen, slot.memoryKib, slot.passes, slot.lanes, slot.salt),
      );
      decipher.setAuthTag(sealed.subarray(sealed.length - TAG));
      try {
        return b64(
          Buffer.concat([
            decipher.update(sealed.subarray(NONCE, sealed.length - TAG)),
            decipher.final(),
          ]),
        );
      } catch {
        return null;
      }
    }),

  wrapSlot: (
    key: string,
    secret: string,
    kind: number,
    gen: number,
    memoryKib: number,
    passes: number,
    lanes: number,
  ): Promise<SlotInfo> =>
    later(() => {
      const bare =
        kind === KIND_PASSWORD
          ? { kind, memoryKib, passes, lanes }
          : { kind, memoryKib: 0, passes: 0, lanes: 0 };
      checkBounds(bare);
      // The salt is drawn before the nonce: the frozen Kotlin file was made in this order.
      const salt = crypto.randomBytes(SALT);
      const wrapKey = wrappingKey({ ...bare, salt }, bytes(secret));
      const nonce = crypto.randomBytes(NONCE);
      const cipher = crypto.createCipheriv("aes-256-gcm", wrapKey, nonce);
      cipher.setAAD(slotAad(kind, gen, bare.memoryKib, bare.passes, bare.lanes, salt));
      const wrapped = Buffer.concat([
        nonce,
        cipher.update(bytes(key)),
        cipher.final(),
        cipher.getAuthTag(),
      ]);
      const info = { ...bare, gen };
      return { ...info, raw: b64(encodeSlot(info, salt, wrapped)) };
    }),

  sealFileV3: (
    key: string,
    inPath: string,
    outPath: string,
    slotsRaw: string[],
    installId: string,
    counter: string,
  ): Promise<void> =>
    later(() => {
      const master = bytes(key);
      // Strict, like the bridge: a lenient parse once hid a base64 decode of a hex string.
      if (!/^[0-9a-f]{32}$/.test(installId)) throw new Error("install id");
      const id = Buffer.from(installId, "hex");
      if (slotsRaw.length < 1 || slotsRaw.length > MAX_SLOTS) throw new Error("slot count");
      const n = BigInt(counter);
      if (n < 0n) throw new Error("counter");
      const fileSalt = crypto.randomBytes(FILE_SALT);
      const prefix = crypto.randomBytes(PREFIX);
      const withoutCheck = Buffer.concat([
        MAGIC,
        Buffer.of(VERSION),
        id,
        u64(n),
        u64(BigInt(Date.now())),
        Buffer.of(slotsRaw.length),
        ...slotsRaw.map(bytes),
        fileSalt,
        prefix,
      ]);
      const header = Buffer.concat([withoutCheck, checkValue(master, fileSalt, withoutCheck)]);
      const parsed = parse(header);
      if (parsed === null || parsed === "newerVersion")
        throw new Error("built a header this version cannot read");
      const bodyKey = hkdf(master, fileSalt, "bati/v3/body", 32);
      const plain = fs.readFileSync(path(inPath));
      const count = Math.max(1, Math.ceil(plain.length / segment.bytes));
      const parts = [header];
      for (let i = 0; i < count; i++) {
        const chunk = plain.subarray(i * segment.bytes, (i + 1) * segment.bytes);
        parts.push(sealSegment(bodyKey, parsed, i, i === count - 1, chunk));
      }
      fs.writeFileSync(path(outPath), Buffer.concat(parts));
    }),

  openFileV3: (key: string, inPath: string, outPath: string): Promise<void> =>
    later(() => {
      const master = bytes(key);
      const all = fs.readFileSync(path(inPath));
      const parsed = parse(all.subarray(0, MAX_HEADER));
      if (parsed === "newerVersion") throw new Error("newer version");
      if (parsed === null) throw new Error("Not a format 3 file");
      const withoutCheck = parsed.bytes.subarray(0, parsed.bytes.length - CHECK);
      if (
        !crypto.timingSafeEqual(checkValue(master, parsed.fileSalt, withoutCheck), parsed.check)
      ) {
        throw new Error("Wrong key");
      }
      const bodyKey = hkdf(master, parsed.fileSalt, "bati/v3/body", 32);
      const size = segment.bytes + TAG;
      const out: Buffer[] = [];
      let at = parsed.header.headerLength;
      for (let i = 0; ; i++) {
        const chunk = all.subarray(at, at + size);
        if (chunk.length < TAG) throw new Error("Truncated encrypted file");
        at += chunk.length;
        const last = at >= all.length;
        out.push(openSegment(bodyKey, parsed, i, last, chunk));
        if (last) break;
      }
      fs.writeFileSync(path(outPath), Buffer.concat(out));
    }),

  keyId: (key: string): Promise<string> =>
    later(() => b64(hkdf(bytes(key), Buffer.alloc(0), "bati/v3/key-id", 16))),
};

/** The Kotlin's SEGMENT_BYTES, for both formats; a test may lower it to cross segments with small files. */
export const segment = { bytes: SEGMENT };
