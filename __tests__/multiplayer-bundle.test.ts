import { decodeBundle, encodeBundle } from "../src/multiplayer/bundle";
import { bytesOfLink, linkFor } from "../src/multiplayer/link";
import week from "./fixtures/multiplayer/envelope-v1.json";
import vectors from "./fixtures/multiplayer/envelope-v1-bundle.json";

/**
 * Kind 5 against bytes built by hand from the frozen kind 1 and kind 4 vectors. A failure here is
 * a change of format: a new version, never a new meaning for this one (envelope.md).
 */
const fromHex = (hex: string) => Uint8Array.from(Buffer.from(hex, "hex"));
const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

test("the frozen bundles read back as the frozen envelopes they hold", () => {
  expect(decodeBundle(fromHex(vectors.oneWeekHex))?.map(toHex)).toEqual([vectors.weekHex]);
  expect(decodeBundle(fromHex(vectors.replyAndTwoWeeksHex))?.map(toHex)).toEqual([
    vectors.replyHex,
    vectors.weekHex,
    vectors.weekHex,
  ]);
});

test("encoding writes the frozen bytes and links", () => {
  const two = encodeBundle([
    fromHex(vectors.replyHex),
    fromHex(vectors.weekHex),
    fromHex(vectors.weekHex),
  ]);
  expect(toHex(two)).toBe(vectors.replyAndTwoWeeksHex);
  expect(linkFor(two)).toBe(vectors.replyAndTwoWeeksLink);
  expect(linkFor(encodeBundle([fromHex(vectors.weekHex)]))).toBe(vectors.oneWeekLink);
  expect(two.length).toBe(vectors.replyAndTwoWeeksBytes);
});

test("the old kinds are still read alone: a week is not a bundle", () => {
  expect(vectors.weekHex).toBe(week.week.envelopeHex);
  expect(decodeBundle(fromHex(vectors.weekHex))).toBeNull();
  expect(bytesOfLink(week.week.link)).not.toBeNull();
});

test("anything off is refused, never half read", () => {
  const good = fromHex(vectors.replyAndTwoWeeksHex);
  expect(decodeBundle(good.subarray(0, good.length - 1))).toBeNull();
  expect(decodeBundle(Uint8Array.from([...good, 0]))).toBeNull();
  const count = Uint8Array.from(good);
  count[2] = 4;
  expect(decodeBundle(count)).toBeNull();
  // A face-to-face invite (kind 2) inside: its secret must never ride a link.
  const invite = fromHex(week.invite.hex);
  expect(decodeBundle(Uint8Array.from([1, 5, 1, invite.length, ...invite]))).toBeNull();
  expect(() => encodeBundle([invite])).toThrow();
  expect(() => encodeBundle([])).toThrow();
});
