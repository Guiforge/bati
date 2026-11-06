import { ENVELOPE_VERSION, KIND_WEEK, MAX_ENVELOPE_BYTES } from "./envelope";
import { KIND_PAIRING_REPLY } from "./linkInvite";

/**
 * Kind 5, the bundle: one link carrying the envelopes of one "Envoyer mes coups", the week under
 * way, the one before, and on phone B its pairing answer until A has it. It seals nothing itself:
 * each envelope inside authenticates on its own, so a byte changed in one costs that one alone.
 *
 * version 1 | kind 5 | count 1 to 3 | count × (length 1 byte | envelope). Only kinds 1 and 4 inside.
 * Frozen by __tests__/fixtures/multiplayer/envelope-v1-bundle.json, built by hand from the frozen
 * kind 1 and kind 4 vectors. See docs/designs/multiplayer/envelope.md.
 */
export const KIND_BUNDLE = 5;
const MAX_INSIDE = 3;
const INSIDE = new Set([KIND_WEEK, KIND_PAIRING_REPLY]);

export function encodeBundle(envelopes: readonly Uint8Array[]): Uint8Array {
  if (envelopes.length < 1 || envelopes.length > MAX_INSIDE) {
    throw new Error("A bundle carries one to three envelopes");
  }
  const size = 3 + envelopes.reduce((sum, e) => sum + 1 + e.length, 0);
  if (
    size > MAX_ENVELOPE_BYTES ||
    envelopes.some((e) => !INSIDE.has(e[1] ?? 0) || e.length > 255)
  ) {
    throw new Error("A bundle carries weeks and pairing answers, within the reader's bound");
  }
  const out = new Uint8Array(size);
  out.set([ENVELOPE_VERSION, KIND_BUNDLE, envelopes.length]);
  let at = 3;
  for (const envelope of envelopes) {
    out[at] = envelope.length;
    out.set(envelope, at + 1);
    at += 1 + envelope.length;
  }
  return out;
}

/** The envelopes a bundle holds, or null for anything else: the bytes came from outside. */
export function decodeBundle(bytes: Uint8Array): Uint8Array[] | null {
  if (bytes.length > MAX_ENVELOPE_BYTES || bytes[0] !== ENVELOPE_VERSION) return null;
  if (bytes[1] !== KIND_BUNDLE) return null;
  const count = bytes[2] ?? 0;
  if (count < 1 || count > MAX_INSIDE) return null;
  const inside: Uint8Array[] = [];
  let at = 3;
  for (let i = 0; i < count; i++) {
    const length = bytes[at] ?? 0;
    const envelope = bytes.subarray(at + 1, at + 1 + length);
    if (length === 0 || envelope.length !== length || !INSIDE.has(envelope[1] ?? 0)) return null;
    inside.push(envelope);
    at += 1 + length;
  }
  return at === bytes.length ? inside : null;
}
