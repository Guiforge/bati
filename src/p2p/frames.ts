import { sha256 } from "@noble/hashes/sha2.js";

/**
 * What two linked devices say to each other inside TLS (SPEC.md C5, T1, T2, section 2). Frozen by
 * __tests__/fixtures/p2p/frames-v1.json, written by scripts/p2p-vectors.py.
 *
 * len u32 | type u8 | body, where len counts the type byte and the body. A length over
 * MAX_FRAME_BYTES is refused from the first four bytes, before any body is read or allocated.
 */
export const MAX_FRAME_BYTES = 256 * 1024;
export const BLOCK_BYTES = 128 * 1024;

export type AnnouncedFile = {
  name: string;
  size: number;
  sha256: Uint8Array;
  blocks: Uint8Array[];
};

export type Frame =
  | { type: "hello"; instanceId: Uint8Array; name: string }
  /** `file: null` is an empty outbox: nothing written for the peer yet. */
  | { type: "announce"; file: AnnouncedFile | null }
  | { type: "want"; indexes: number[] }
  | { type: "block"; index: number; bytes: Uint8Array }
  | { type: "ack"; sha256: Uint8Array }
  | { type: "ping" }
  | { type: "bye"; reason: number }
  /** B to A on a first connection: the code's token, and B's half of the link secret (L4). */
  | { type: "pair"; token: Uint8Array; random: Uint8Array }
  /** A to B once the hero confirmed: A's half (L4). */
  | { type: "linked"; random: Uint8Array };

/** Why a side closes, in a `bye` (SPEC.md section 2). */
export const BYE = {
  cancel: 1,
  codeExpired: 2,
  notThisOne: 3,
  versionMismatch: 4,
  badBlocks: 5,
  noSpace: 6,
  busy: 7,
} as const;

export type ReadFrame =
  | { kind: "frame"; frame: Frame; used: number }
  | { kind: "more" }
  | { kind: "bad" };

const TYPES = [
  "hello",
  "announce",
  "want",
  "block",
  "ack",
  "ping",
  "bye",
  "pair",
  "linked",
] as const;

export function blockHashes(file: Uint8Array): Uint8Array[] {
  const hashes: Uint8Array[] = [];
  for (let at = 0; at < file.length; at += BLOCK_BYTES)
    hashes.push(sha256(file.subarray(at, at + BLOCK_BYTES)));
  return hashes;
}

export function encodeFrame(frame: Frame): Uint8Array {
  const body = bodyOf(frame);
  const out = new Uint8Array(5 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 1 + body.length);
  out[4] = TYPES.indexOf(frame.type) + 1;
  out.set(body, 5);
  return out;
}

function bodyOf(frame: Frame): Uint8Array {
  switch (frame.type) {
    case "hello": {
      const name = new TextEncoder().encode(frame.name);
      return Uint8Array.from([...frame.instanceId, name.length, ...name]);
    }
    case "announce": {
      if (frame.file === null) return Uint8Array.of(0);
      const { file } = frame;
      const name = new TextEncoder().encode(file.name);
      const out = new Uint8Array(1 + name.length + 8 + 32 + 4 + 32 * file.blocks.length);
      const view = new DataView(out.buffer);
      out[0] = name.length;
      out.set(name, 1);
      let at = 1 + name.length;
      view.setBigUint64(at, BigInt(file.size));
      out.set(file.sha256, at + 8);
      view.setUint32(at + 40, file.blocks.length);
      at += 44;
      for (const block of file.blocks) {
        out.set(block, at);
        at += 32;
      }
      return out;
    }
    case "want": {
      const out = new Uint8Array(4 + 4 * frame.indexes.length);
      const view = new DataView(out.buffer);
      view.setUint32(0, frame.indexes.length);
      frame.indexes.forEach((index, i) => {
        view.setUint32(4 + 4 * i, index);
      });
      return out;
    }
    case "block": {
      const out = new Uint8Array(4 + frame.bytes.length);
      new DataView(out.buffer).setUint32(0, frame.index);
      out.set(frame.bytes, 4);
      return out;
    }
    case "ack":
      return frame.sha256;
    case "ping":
      return new Uint8Array(0);
    case "bye":
      return Uint8Array.of(frame.reason);
    case "pair":
      return Uint8Array.from([...frame.token, ...frame.random]);
    case "linked":
      return frame.random;
  }
}

/** The first frame in `bytes`, "more" when it is not all there yet, "bad" when the link must close. */
export function readFrame(bytes: Uint8Array): ReadFrame {
  if (bytes.length < 4) return { kind: "more" };
  const length = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0);
  if (length === 0 || length > MAX_FRAME_BYTES) return { kind: "bad" };
  if (bytes.length < 4 + length) return { kind: "more" };
  const type = TYPES[(bytes[4] ?? 0) - 1];
  const frame = type === undefined ? null : parseBody(type, bytes.subarray(5, 4 + length));
  return frame === null ? { kind: "bad" } : { kind: "frame", frame, used: 4 + length };
}

function parseBody(type: (typeof TYPES)[number], body: Uint8Array): Frame | null {
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  switch (type) {
    case "hello":
      return parseHello(body);
    case "announce":
      return parseAnnounce(body, view);
    case "want": {
      if (body.length < 4) return null;
      const count = view.getUint32(0);
      if (body.length !== 4 + 4 * count) return null;
      return { type, indexes: Array.from({ length: count }, (_, i) => view.getUint32(4 + 4 * i)) };
    }
    case "block":
      if (body.length < 4 || body.length > 4 + BLOCK_BYTES) return null;
      return { type, index: view.getUint32(0), bytes: body.slice(4) };
    default:
      return parseFixed(type, body);
  }
}

/** The frames whose body has one exact length. */
const FIXED = { ack: 32, ping: 0, bye: 1, pair: 64, linked: 32 } as const;

function parseFixed(type: keyof typeof FIXED, body: Uint8Array): Frame | null {
  if (body.length !== FIXED[type]) return null;
  switch (type) {
    case "ack":
      return { type, sha256: body.slice() };
    case "ping":
      return { type };
    case "bye":
      return { type, reason: body[0] ?? 0 };
    case "pair":
      return { type, token: body.slice(0, 32), random: body.slice(32) };
    case "linked":
      return { type, random: body.slice() };
  }
}

function parseHello(body: Uint8Array): Frame | null {
  const nameLength = body[16] ?? 0;
  if (body.length < 17 || body.length !== 17 + nameLength || nameLength > 32) return null;
  const name = text(body.subarray(17));
  return name === null ? null : { type: "hello", instanceId: body.slice(0, 16), name };
}

function parseAnnounce(body: Uint8Array, view: DataView): Frame | null {
  const nameLength = body[0] ?? 0;
  if (body.length === 1 && nameLength === 0) return { type: "announce", file: null };
  const at = 1 + nameLength;
  if (body.length < at + 44) return null;
  const count = view.getUint32(at + 40);
  if (body.length !== at + 44 + 32 * count) return null;
  const name = text(body.subarray(1, at));
  const size = Number(view.getBigUint64(at));
  // The block list must describe exactly that many bytes, or blocks and size disagree.
  if (name === null || count !== Math.ceil(size / BLOCK_BYTES)) return null;
  const blocks = Array.from({ length: count }, (_, i) =>
    body.slice(at + 44 + 32 * i, at + 76 + 32 * i),
  );
  return { type: "announce", file: { name, size, sha256: body.slice(at + 8, at + 40), blocks } };
}

function text(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Not UTF-8: not from Bati, and the frame is refused, which closes the link.
    return null;
  }
}
