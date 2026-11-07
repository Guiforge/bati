import { hourOf, linkSecret, nsdName } from "../src/p2p/names";
import vectors from "./fixtures/p2p/names-v1.json";

const fromHex = (hex: string) =>
  Uint8Array.from(hex.match(/../g) ?? [], (b) => Number.parseInt(b, 16));
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

describe("link secret and NSD name (L4, D2), against the frozen vectors", () => {
  const secret = linkSecret(
    fromHex(vectors.rA),
    fromHex(vectors.rB),
    fromHex(vectors.idA),
    fromHex(vectors.idB),
  );

  test("the link secret comes from both sides' random bytes and both IDs", () => {
    expect(toHex(secret)).toBe(vectors.derivedLink);
  });

  test.each(vectors.nsd)("NSD name at hour $hour", ({ hour, name }) => {
    expect(nsdName(secret, hour)).toBe(name);
  });

  test("the name changes every hour (P1)", () => {
    expect(new Set(vectors.nsd.map((v) => nsdName(secret, v.hour))).size).toBe(vectors.nsd.length);
  });

  test("nothing in the pairing code alone gives the secret (L4): the random bytes decide it", () => {
    const otherB = linkSecret(
      fromHex(vectors.rA),
      new Uint8Array(32),
      fromHex(vectors.idA),
      fromHex(vectors.idB),
    );
    expect(toHex(otherB)).not.toBe(vectors.derivedLink);
  });

  test("the hour is unix time over 3600, rounded down", () => {
    expect(hourOf(3599)).toBe(0);
    expect(hourOf(3600)).toBe(1);
  });
});
