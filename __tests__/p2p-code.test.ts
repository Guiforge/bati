import { encodeCode, groupCode, readCode } from "../src/p2p/code";
import vectors from "./fixtures/p2p/code-v1.json";

const fromHex = (hex: string) =>
  Uint8Array.from(hex.match(/../g) ?? [], (b) => Number.parseInt(b, 16));

describe("pairing code v1 (L3, L6), against the frozen vectors", () => {
  test.each(vectors.valid)("reads: $case", (v) => {
    const read = readCode(v.text, vectors.now);
    expect(read).toEqual({
      ok: true,
      code: {
        expiresAt: v.expiresAt,
        token: fromHex(v.token),
        installId: v.installId,
        deviceId: fromHex(v.deviceId),
        name: v.name,
        lan: v.lan,
      },
    });
  });

  test("writes exactly the frozen bytes", () => {
    const [v] = vectors.valid;
    const read = readCode(v?.text ?? "", vectors.now);
    if (!read.ok) throw new Error(read.reason);
    expect(encodeCode(read.code)).toBe(v?.text);
  });

  test.each(vectors.refused)("refuses: $case", (v) => {
    expect(readCode(v.text, ("now" in v ? v.now : undefined) ?? vectors.now)).toEqual({
      ok: false,
      reason: v.reason,
    });
  });

  test("the text fallback round-trips through spaces and line breaks, never through dashes", () => {
    expect(groupCode(vectors.grouped.text).replace(/\s/g, "")).toBe(vectors.grouped.text);
    expect(readCode(vectors.grouped.typed, vectors.now).ok).toBe(true);
    // '-' is a base64url character: stripping it would change the code, so it is kept and the code fails.
    const dashed = vectors.grouped.text.match(/.{1,4}/g)?.join("-") ?? "";
    expect(readCode(dashed, vectors.now).ok).toBe(false);
  });

  test("a code from more than a minute in the future is refused, a clock a little behind is not", () => {
    const [v] = vectors.valid;
    expect(readCode(v?.text ?? "", (v?.expiresAt ?? 0) - 600 - 61).ok).toBe(false);
    expect(readCode(v?.text ?? "", (v?.expiresAt ?? 0) - 600 + 30).ok).toBe(true);
  });
});
