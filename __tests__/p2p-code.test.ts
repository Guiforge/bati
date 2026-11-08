import { encodeCode, groupCode, readCode, readTypedCode } from "../src/p2p/code";
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

  test("the text fallback: groups of 4, each with its check character", () => {
    expect(groupCode(vectors.grouped.text)).toBe(vectors.grouped.shown);
    expect(readTypedCode(vectors.grouped.shown, vectors.now)).toEqual(
      readCode(vectors.grouped.text, vectors.now),
    );
    // Spaces and line breaks anywhere, or none at all, read the same.
    expect(readTypedCode(vectors.grouped.typed, vectors.now).ok).toBe(true);
    expect(readTypedCode(vectors.grouped.shown.replace(/\s/g, ""), vectors.now).ok).toBe(true);
  });

  test("a typo names its group, counted from 1 for the hero (P5)", () => {
    expect(readTypedCode(vectors.grouped.typo.typed, vectors.now)).toEqual({
      ok: false,
      reason: "typo",
      group: vectors.grouped.typo.group + 1,
    });
  });

  test("one typo in any group is caught in that group (P5)", () => {
    const groups = vectors.grouped.shown.split(" ");
    groups.forEach((g, n) => {
      const swapped = (g[0] === "A" ? "B" : "A") + g.slice(1);
      const typed = [...groups.slice(0, n), swapped, ...groups.slice(n + 1)].join(" ");
      expect(readTypedCode(typed, vectors.now)).toEqual({
        ok: false,
        reason: "typo",
        group: n + 1,
      });
    });
  });

  test("a dash is never stripped: '-' is a base64url character", () => {
    const dashed = vectors.grouped.shown.replace(/ /g, "-");
    expect(readTypedCode(dashed, vectors.now).ok).toBe(false);
  });

  test("a code from more than a minute in the future is refused, a clock a little behind is not", () => {
    const [v] = vectors.valid;
    expect(readCode(v?.text ?? "", (v?.expiresAt ?? 0) - 600 - 61).ok).toBe(false);
    expect(readCode(v?.text ?? "", (v?.expiresAt ?? 0) - 600 + 30).ok).toBe(true);
  });
});

test("a phone reporting more addresses than a route holds still gets a code (code review 08/11)", () => {
  const many = Array.from({ length: 20 }, (_, i) => `fd00::${i + 1}`);
  const text = encodeCode({
    expiresAt: 2_000_000_000,
    token: new Uint8Array(32),
    installId: "01234567-89ab-cdef-0123-456789abcdef",
    deviceId: new Uint8Array(32),
    name: "Pixel",
    lan: { port: 40_000, addresses: ["192.168.1.2", ...many] },
  });
  const read = readCode(text, 2_000_000_000 - 60);
  expect(read.ok && read.code.lan.addresses[0]).toBe("192.168.1.2");
  expect(read.ok && read.code.lan.addresses.length).toBeLessThan(21);
});
