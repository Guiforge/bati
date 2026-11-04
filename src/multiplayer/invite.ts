import {
  ENVELOPE_VERSION,
  fromBase64,
  fromHex,
  HEADER_BYTES,
  readHeader,
  toBase64,
} from "./envelope";

/**
 * What phone A shows phone B to pair face to face: the pair's id, A's id in it, when it was made and
 * the secret.
 *
 * Not sealed, and it cannot be: it is what creates the key. Whoever reads an invite can read that
 * pair's messages, so it is only accepted from a camera (`readCode`), and it stops being accepted
 * after `INVITE_DAYS`. The link's invitation carries no secret: `linkInvite.ts`.
 *
 * version 1 | kind 2 | pair id 16 | sender id 8 | year 2 | week 1 are the envelope's header, so one
 * reader finds both; then made-at u32 | secret 32. See docs/designs/multiplayer/envelope.md.
 */
export const KIND_INVITE = 2;
export const SECRET_BYTES = 32;
const INVITE_BYTES = HEADER_BYTES + 4 + SECRET_BYTES;
export const INVITE_DAYS = 7;

export type Invite = {
  pairId: string;
  senderId: string;
  madeAt: number;
  /** Base64, as bati-crypto takes a key. */
  secret: string;
};

export function encodeInvite(invite: Invite): Uint8Array {
  const out = new Uint8Array(INVITE_BYTES);
  out[0] = ENVELOPE_VERSION;
  out[1] = KIND_INVITE;
  out.set(fromHex(invite.pairId, 16), 2);
  out.set(fromHex(invite.senderId, 8), 18);
  // The year and week of the shared header say nothing here; zero, and the reader ignores them.
  new DataView(out.buffer).setUint32(HEADER_BYTES, invite.madeAt);
  out.set(fromBase64(invite.secret), HEADER_BYTES + 4);
  return out;
}

/** The invite these bytes hold, or null for anything else, an expired one included. */
export function decodeInvite(bytes: Uint8Array, nowSeconds: number): Invite | null {
  if (bytes.length !== INVITE_BYTES || bytes[0] !== ENVELOPE_VERSION || bytes[1] !== KIND_INVITE) {
    return null;
  }
  const madeAt = new DataView(bytes.buffer, bytes.byteOffset).getUint32(HEADER_BYTES);
  // A day of grace ahead: two phones' clocks disagree, and this is not a security boundary.
  if (madeAt > nowSeconds + 86_400 || nowSeconds - madeAt > INVITE_DAYS * 86_400) return null;
  const { pairId, senderId } = readHeader(bytes);
  return { pairId, senderId, madeAt, secret: toBase64(bytes.subarray(HEADER_BYTES + 4)) };
}
