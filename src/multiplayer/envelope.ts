import { batiCrypto } from "@/modules/bati-crypto";

/**
 * The sealed envelope, v1: one format for every transport (QR, link, file, later a relay). Byte
 * layout and the reasons behind it: docs/designs/multiplayer/envelope.md. Frozen by
 * __tests__/fixtures/multiplayer/envelope-v1.json: an edit here that moves a byte fails that test,
 * and a change of format is a new version, never a new meaning for this one.
 *
 * Fixed-width numbers and nothing else, which is the privacy rule made structural: there is no
 * field a sentence, a weight or a heart rate could travel in.
 */
export const ENVELOPE_VERSION = 1;
export const KIND_WEEK = 1;

/** A bound on what the parser will look at. A QR holds no more, and neither should a link. */
export const MAX_ENVELOPE_BYTES = 600;

const PAIR_ID_BYTES = 16;
const SENDER_ID_BYTES = 8;
export const HEADER_BYTES = 2 + PAIR_ID_BYTES + SENDER_ID_BYTES + 3;
const WEEK_PAYLOAD_BYTES = 13;
/** AES-GCM as `seal` writes it: nonce and tag. */
const SEAL_OVERHEAD = 12 + 16;
const PAUSED = 1;

/** The full state of the sender's week, so that a lost or repeated message breaks nothing. */
export type WeekState = {
  /** Seconds since the epoch at which the sender wrote this state: the merge's clock. */
  stamp: number;
  /** The weekly goal frozen when the challenge started, in sessions (`weeklyGoal`). */
  goal: number;
  paused: boolean;
  /** Counted sessions per ISO weekday, Monday first: seven entries. */
  days: readonly number[];
};

export type EnvelopeHeader = {
  pairId: string;
  senderId: string;
  isoYear: number;
  isoWeek: number;
};

export type OpenResult =
  | { kind: "ok"; header: EnvelopeHeader; state: WeekState }
  /** Made by a build older than any this one reads. */
  | { kind: "oldVersion" }
  /** Made by a newer build: updating Bati will read it. */
  | { kind: "newerVersion" }
  /** Not an envelope, cut short, or a kind this version does not have. */
  | { kind: "notThis" }
  /** Wrong key, or any byte altered. AES-GCM does not say which. */
  | { kind: "refused" }
  /** The hero's own message coming back: the shared key would let it through as the other's. */
  | { kind: "own" };

export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export function fromHex(value: string, length: number): Uint8Array {
  if (value.length !== length * 2 || !/^[0-9a-f]+$/.test(value)) {
    throw new Error(`Expected ${length} bytes of lower-case hex`);
  }
  return Uint8Array.from({ length }, (_, i) => Number.parseInt(value.slice(i * 2, i * 2 + 2), 16));
}

export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

/** What a link fragment and a QR carry: base64url with no padding, nothing a URL has to escape. */
export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Null on anything but canonical base64url: the input came from outside. */
export function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return null;
  const bytes = fromBase64(value.replace(/-/g, "+").replace(/_/g, "/"));
  return toBase64Url(bytes) === value ? bytes : null;
}

function encodeHeader(header: EnvelopeHeader, kind: number): Uint8Array {
  const out = new Uint8Array(HEADER_BYTES);
  out[0] = ENVELOPE_VERSION;
  out[1] = kind;
  out.set(fromHex(header.pairId, PAIR_ID_BYTES), 2);
  out.set(fromHex(header.senderId, SENDER_ID_BYTES), 2 + PAIR_ID_BYTES);
  new DataView(out.buffer).setUint16(2 + PAIR_ID_BYTES + SENDER_ID_BYTES, header.isoYear);
  out[HEADER_BYTES - 1] = header.isoWeek;
  return out;
}

/** The clear part of an envelope: enough to find the pair whose key opens it, and nothing to trust. */
export function readHeader(envelope: Uint8Array): EnvelopeHeader {
  const view = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength);
  return {
    pairId: hex(envelope.subarray(2, 2 + PAIR_ID_BYTES)),
    senderId: hex(envelope.subarray(2 + PAIR_ID_BYTES, 2 + PAIR_ID_BYTES + SENDER_ID_BYTES)),
    isoYear: view.getUint16(2 + PAIR_ID_BYTES + SENDER_ID_BYTES),
    isoWeek: envelope[HEADER_BYTES - 1] ?? 0,
  };
}

function encodeWeek(state: WeekState): Uint8Array {
  const counts = [state.goal, ...state.days];
  if (state.days.length !== 7 || counts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error("A week state holds seven daily counts and a goal, each one byte");
  }
  const out = new Uint8Array(WEEK_PAYLOAD_BYTES);
  new DataView(out.buffer).setUint32(0, state.stamp);
  out[4] = state.goal;
  out[5] = state.paused ? PAUSED : 0;
  out.set(state.days, 6);
  return out;
}

function decodeWeek(payload: Uint8Array): WeekState | null {
  if (payload.length !== WEEK_PAYLOAD_BYTES) return null;
  const goal = payload[4] ?? 0;
  const flags = payload[5] ?? 0;
  // Authenticated, so this is a build of ours that disagrees, not an attacker: still refuse it.
  if (goal < 1 || flags > PAUSED) return null;
  return {
    stamp: new DataView(payload.buffer, payload.byteOffset).getUint32(0),
    goal,
    paused: flags === PAUSED,
    days: Array.from(payload.subarray(6)),
  };
}

/** Seals `state` under the pair's key (base64). The header travels in clear, authenticated. */
export async function sealWeek(
  key: string,
  header: EnvelopeHeader,
  state: WeekState,
): Promise<Uint8Array> {
  const clear = encodeHeader(header, KIND_WEEK);
  const sealed = fromBase64(
    await batiCrypto().seal(key, toBase64(encodeWeek(state)), toBase64(clear)),
  );
  const out = new Uint8Array(clear.length + sealed.length);
  out.set(clear);
  out.set(sealed, clear.length);
  return out;
}

/**
 * Opens an envelope for the hero whose id in this pair is `selfId`. Never throws on what it was
 * handed: whatever comes through a QR or a link is untrusted, and each refusal has its own answer.
 */
export async function openEnvelope(
  key: string,
  envelope: Uint8Array,
  selfId: string,
): Promise<OpenResult> {
  const version = envelope[0];
  if (version === undefined || envelope.length > MAX_ENVELOPE_BYTES) return { kind: "notThis" };
  if (version < ENVELOPE_VERSION) return { kind: "oldVersion" };
  if (version > ENVELOPE_VERSION) return { kind: "newerVersion" };
  if (
    envelope[1] !== KIND_WEEK ||
    envelope.length !== HEADER_BYTES + SEAL_OVERHEAD + WEEK_PAYLOAD_BYTES
  ) {
    return { kind: "notThis" };
  }

  const clear = envelope.subarray(0, HEADER_BYTES);
  let plain: string;
  try {
    plain = await batiCrypto().open(
      key,
      toBase64(envelope.subarray(HEADER_BYTES)),
      toBase64(clear),
    );
  } catch {
    // Not reported: a wrong key or a damaged code is the answer here, not an incident.
    return { kind: "refused" };
  }

  const header = readHeader(envelope);
  if (header.senderId === selfId) return { kind: "own" };
  const state = decodeWeek(fromBase64(plain));
  return state === null ? { kind: "notThis" } : { kind: "ok", header, state };
}

/**
 * Last writer wins, per sender and week, like device sync: the later stamp, and on a tie the larger
 * bytes, so two phones that saw the same pair of messages in either order agree. A duplicate or a
 * replayed older message changes nothing, which is what lets the player resend freely.
 */
export function mergeWeek(known: WeekState | null, incoming: WeekState): WeekState {
  if (known === null || incoming.stamp > known.stamp) return incoming;
  if (incoming.stamp < known.stamp) return known;
  const [a, b] = [encodeWeek(known), encodeWeek(incoming)];
  const differs = a.findIndex((byte, i) => byte !== b[i]);
  return differs !== -1 && (b[differs] ?? 0) > (a[differs] ?? 0) ? incoming : known;
}
