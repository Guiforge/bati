import {
  blockHashes,
  encodeFrame,
  type Frame,
  MAX_FRAME_BYTES,
  readFrame,
} from "../src/p2p/frames";
import vectors from "./fixtures/p2p/frames-v1.json";

const fromHex = (hex: string) =>
  Uint8Array.from(hex.match(/../g) ?? [], (b) => Number.parseInt(b, 16));
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const file = Uint8Array.from({ length: vectors.file.size }, (_, i) => (i * 31 + 7) % 251);

const expected: Record<string, Frame> = Object.fromEntries(
  vectors.frames.map((v) => {
    switch (v.type) {
      case "hello":
        return [
          v.type,
          { type: "hello", instanceId: fromHex(v.instanceId ?? ""), name: v.name ?? "" },
        ];
      case "announce":
        return [
          v.type,
          {
            type: "announce",
            file: {
              name: v.name ?? "",
              size: v.size ?? 0,
              sha256: fromHex(v.sha256 ?? ""),
              blocks: (v.blocks ?? []).map(fromHex),
            },
          },
        ];
      case "announceEmpty":
        return [v.type, { type: "announce", file: null }];
      case "want":
        return [v.type, { type: "want", indexes: v.indexes ?? [] }];
      case "block":
        return [v.type, { type: "block", index: v.index ?? 0, bytes: fromHex(v.bytes ?? "") }];
      case "ack":
        return [v.type, { type: "ack", sha256: fromHex(v.sha256 ?? "") }];
      case "ping":
        return [v.type, { type: "ping" }];
      case "pair":
        return [
          v.type,
          { type: "pair", token: fromHex(v.token ?? ""), random: fromHex(v.random ?? "") },
        ];
      case "linked":
        return [v.type, { type: "linked", random: fromHex(v.random ?? "") }];
      default:
        return [v.type, { type: "bye", reason: v.reason ?? 0 }];
    }
  }),
);

describe("frames v1 (C5, T1, T2), against the frozen vectors", () => {
  test("128 KiB blocks, each hashed, the last one short", () => {
    expect(blockHashes(file).map(toHex)).toEqual(vectors.file.blocks);
  });

  test.each(vectors.frames)("$type reads and writes the frozen bytes", (v) => {
    const bytes = fromHex(v.hex);
    expect(readFrame(bytes)).toEqual({
      kind: "frame",
      frame: expected[v.type],
      used: bytes.length,
    });
    expect(toHex(encodeFrame(expected[v.type] as Frame))).toBe(v.hex);
  });

  test("a frame cut short asks for more, at any length", () => {
    const [hello] = vectors.frames;
    const bytes = fromHex(hello?.hex ?? "");
    for (let n = 0; n < bytes.length; n++)
      expect(readFrame(bytes.subarray(0, n))).toEqual({ kind: "more" });
  });

  test("two frames in one buffer are read one at a time", () => {
    const ping = fromHex(vectors.frames.find((f) => f.type === "ping")?.hex ?? "");
    const both = new Uint8Array([...ping, ...ping]);
    expect(readFrame(both)).toEqual({ kind: "frame", frame: { type: "ping" }, used: ping.length });
  });

  test.each(vectors.refused)("refuses: $case", (v) => {
    expect(readFrame(fromHex(v.hex))).toEqual({ kind: "bad" });
  });

  test("the 256 KiB cap is decided from the length alone, before any body arrives (C1, C5)", () => {
    expect(MAX_FRAME_BYTES).toBe(256 * 1024);
    const header = new Uint8Array(4);
    new DataView(header.buffer).setUint32(0, 0xffff_ffff);
    expect(readFrame(header)).toEqual({ kind: "bad" });
  });
});
