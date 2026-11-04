import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { batiCrypto } from "@/modules/bati-crypto";
import {
  ENVELOPE_VERSION,
  fromBase64,
  fromHex,
  HEADER_BYTES,
  readHeader,
  toBase64,
} from "./envelope";
import { INVITE_DAYS } from "./invite";

/**
 * Pairing through a chat, with no secret in the chat. A sends a public key; B answers with its own
 * and a sealed proof; each derives the pair's key from what the other sent, and someone reading the
 * whole conversation derives nothing. Byte layout: docs/designs/multiplayer/envelope.md. Frozen by
 * __tests__/fixtures/multiplayer/envelope-v1-link.json, written by Node's own crypto.
 *
 * @noble/curves because the platform has X25519 only from API 31 and minSdk is below that. Its own
 * random source is not used: `crypto.getRandomValues` is not a given on Hermes, `bati-crypto` is.
 *
 * Reading a chat is passive: replacing what is in it is not. A key exchange with nothing to compare
 * cannot tell A's key from an attacker's, so whoever can rewrite the messages can sit between the
 * two. The face-to-face QR does not have that hole.
 */
export const KIND_LINK_INVITE = 3;
export const KIND_PAIRING_REPLY = 4;

const KEY_BYTES = 32;
const LINK_INVITE_BYTES = HEADER_BYTES + 4 + KEY_BYTES;
const REPLY_CLEAR_BYTES = HEADER_BYTES + KEY_BYTES;
/** The moment of the reply, sealed: nonce 12, stamp 4, tag 16. What it says matters less than that it opens. */
const REPLY_BYTES = REPLY_CLEAR_BYTES + 12 + 4 + 16;
const KEY_INFO = new TextEncoder().encode("bati pair v1");

export type LinkInvite = {
  pairId: string;
  senderId: string;
  madeAt: number;
  /** A's X25519 public key, base64. */
  publicKey: string;
};

export type PairingReply = {
  pairId: string;
  senderId: string;
  /** B's X25519 public key, base64. */
  publicKey: string;
};

/** Year and week of the shared header say nothing on these two kinds: zero, as on an invite. */
function clearHeader(kind: number, pairId: string, senderId: string): Uint8Array {
  const out = new Uint8Array(HEADER_BYTES);
  out[0] = ENVELOPE_VERSION;
  out[1] = kind;
  out.set(fromHex(pairId, 16), 2);
  out.set(fromHex(senderId, 8), 18);
  return out;
}

export function encodeLinkInvite(invite: LinkInvite): Uint8Array {
  const out = new Uint8Array(LINK_INVITE_BYTES);
  out.set(clearHeader(KIND_LINK_INVITE, invite.pairId, invite.senderId));
  new DataView(out.buffer).setUint32(HEADER_BYTES, invite.madeAt);
  out.set(fromBase64(invite.publicKey), HEADER_BYTES + 4);
  return out;
}

/** Whether an invite made at `madeAt` is still good. A day of grace ahead: two phones' clocks differ. */
export const inviteIsLive = (madeAt: number, nowSeconds: number) =>
  madeAt <= nowSeconds + 86_400 && nowSeconds - madeAt <= INVITE_DAYS * 86_400;

/** The invite these bytes hold, or null for anything else, an expired one included. */
export function decodeLinkInvite(bytes: Uint8Array, nowSeconds: number): LinkInvite | null {
  if (
    bytes.length !== LINK_INVITE_BYTES ||
    bytes[0] !== ENVELOPE_VERSION ||
    bytes[1] !== KIND_LINK_INVITE
  ) {
    return null;
  }
  const madeAt = new DataView(bytes.buffer, bytes.byteOffset).getUint32(HEADER_BYTES);
  if (!inviteIsLive(madeAt, nowSeconds)) return null;
  const { pairId, senderId } = readHeader(bytes);
  return { pairId, senderId, madeAt, publicKey: toBase64(bytes.subarray(HEADER_BYTES + 4)) };
}

/** A fresh key pair, both halves base64. */
export async function newKeyPair(): Promise<{ secret: string; publicKey: string }> {
  const secret = await batiCrypto().randomBytes(KEY_BYTES);
  return { secret, publicKey: toBase64(x25519.getPublicKey(fromBase64(secret))) };
}

export const publicKeyOf = (secret: string) => toBase64(x25519.getPublicKey(fromBase64(secret)));

/**
 * The pair's key, base64, the same on both phones: X25519, then HKDF-SHA256 over the pair's id and
 * both public keys, so a key changed on the way derives something else. Null on a public key that
 * yields no shared secret (a low-order point, which only a forged message holds).
 */
export function derivePairKey(
  mySecret: string,
  theirPublic: string,
  context: { pairId: string; inviterPublic: string; joinerPublic: string },
): string | null {
  let shared: Uint8Array;
  try {
    shared = x25519.getSharedSecret(fromBase64(mySecret), fromBase64(theirPublic));
  } catch {
    // Not reported: an untrusted key that fails is the answer here, not an incident.
    return null;
  }
  const info = new Uint8Array(KEY_INFO.length + 16 + KEY_BYTES * 2);
  info.set(KEY_INFO);
  info.set(fromHex(context.pairId, 16), KEY_INFO.length);
  info.set(fromBase64(context.inviterPublic), KEY_INFO.length + 16);
  info.set(fromBase64(context.joinerPublic), KEY_INFO.length + 16 + KEY_BYTES);
  return toBase64(hkdf(sha256, shared, undefined, info, KEY_BYTES));
}

/** B's answer: its public key in clear, and a seal only the holder of the pair's key could write. */
export async function sealReply(
  key: string,
  reply: PairingReply,
  nowSeconds: number,
): Promise<Uint8Array> {
  const clear = new Uint8Array(REPLY_CLEAR_BYTES);
  clear.set(clearHeader(KIND_PAIRING_REPLY, reply.pairId, reply.senderId));
  clear.set(fromBase64(reply.publicKey), HEADER_BYTES);
  const stamp = new Uint8Array(4);
  new DataView(stamp.buffer).setUint32(0, nowSeconds);
  const sealed = fromBase64(await batiCrypto().seal(key, toBase64(stamp), toBase64(clear)));
  const out = new Uint8Array(clear.length + sealed.length);
  out.set(clear);
  out.set(sealed, clear.length);
  return out;
}

/** The clear part of a reply, to find the invite it answers. Nothing here is trusted yet. */
export function readReply(bytes: Uint8Array): PairingReply | null {
  if (bytes.length !== REPLY_BYTES || bytes[0] !== ENVELOPE_VERSION) return null;
  if (bytes[1] !== KIND_PAIRING_REPLY) return null;
  const { pairId, senderId } = readHeader(bytes);
  return {
    pairId,
    senderId,
    publicKey: toBase64(bytes.subarray(HEADER_BYTES, REPLY_CLEAR_BYTES)),
  };
}

/** Whether the reply was sealed under `key`: the proof that B holds what A just derived. */
export async function replyOpens(key: string, bytes: Uint8Array): Promise<boolean> {
  try {
    await batiCrypto().open(
      key,
      toBase64(bytes.subarray(REPLY_CLEAR_BYTES)),
      toBase64(bytes.subarray(0, REPLY_CLEAR_BYTES)),
    );
    return true;
  } catch {
    // Not reported: a wrong key or an altered byte is the answer here, not an incident.
    return false;
  }
}
