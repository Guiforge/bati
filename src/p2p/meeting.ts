import { hkdf } from "@noble/hashes/hkdf.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";

import { batiCrypto } from "@/modules/bati-crypto";
import { fromBase64, toBase64 } from "@/src/multiplayer/envelope";
import { type NostrEvent, newSecretKey, signEvent, verifyEvent } from "@/src/nostrRelay";

import { addressBytes, ipv6Text } from "./code";

/**
 * Where two linked devices meet when they are not on the same Wi-Fi, or the Wi-Fi hides them from
 * each other (PLAN.md table C, SPEC.md §7). The device that listens publishes a note; the one that
 * dials subscribes to it. Frozen by __tests__/fixtures/p2p/meeting-v1.json.
 *
 * - kind 21059, ephemeral: relays forward it and keep nothing;
 * - a key made for each event, so two notes cannot be tied to one author;
 * - one `x` tag, the first 16 bytes of HMAC(link secret, "bati/p2p/rdv" ‖ hour), found only by
 *   whoever holds the link secret, and changing every hour;
 * - `created_at` rounded to the minute;
 * - content `nonce ‖ AES-GCM ‖ tag`, under an HKDF of the link secret (info bati/p2p/offer/v1), AAD the tag, the
 *   kind and created_at, over 256 bytes: version 1 ‖ expiresAt u32 ‖ port u16 ‖ count u8 ‖ count ×
 *   (family u8 ‖ 4 or 16 bytes), zero padded, so every note has the same length.
 *
 * What a relay still sees: the IP of each device that talks to it, and when. The internet question
 * says so before the switch is on.
 */
export const MEETING_KIND = 21059;
const VERSION = 1;
const PLAIN_BYTES = 256;
/** An offer is good for two minutes: long enough to dial, short enough that an old one is useless. */
export const OFFER_SECONDS = 120;

export type Offer = { expiresAt: number; port: number; addresses: string[] };

export const meetingTag = (secret: Uint8Array, hour: number) => {
  const input = new Uint8Array([...new TextEncoder().encode("bati/p2p/rdv"), ...u64(hour)]);
  return hexOf(hmac(sha256, secret, input).slice(0, 16));
};

export const offerKey = (secret: Uint8Array) =>
  hkdf(sha256, secret, new Uint8Array(0), new TextEncoder().encode("bati/p2p/offer/v1"), 32);

const aadOf = (tag: string, createdAt: number) =>
  new TextEncoder().encode(`${tag}|${MEETING_KIND}|${createdAt}`);

export function encodeOffer(offer: Offer): Uint8Array {
  const out = new Uint8Array(PLAIN_BYTES);
  const view = new DataView(out.buffer);
  out[0] = VERSION;
  view.setUint32(1, offer.expiresAt);
  view.setUint16(5, offer.port);
  let at = 8;
  let count = 0;
  for (const address of offer.addresses) {
    const bytes = addressBytes(address);
    if (at + bytes.length > PLAIN_BYTES) break;
    out.set(bytes, at);
    at += bytes.length;
    count++;
  }
  out[7] = count;
  return out;
}

export function decodeOffer(plain: Uint8Array): Offer | null {
  if (plain.length !== PLAIN_BYTES || plain[0] !== VERSION) return null;
  const view = new DataView(plain.buffer, plain.byteOffset);
  const addresses: string[] = [];
  let at = 8;
  for (let i = 0; i < (plain[7] ?? 0); i++) {
    const family = plain[at];
    const length = family === 4 ? 4 : family === 6 ? 16 : 0;
    if (length === 0 || at + 1 + length > PLAIN_BYTES) return null;
    const raw = plain.subarray(at + 1, at + 1 + length);
    addresses.push(length === 4 ? Array.from(raw).join(".") : ipv6Text(raw));
    at += 1 + length;
  }
  return { expiresAt: view.getUint32(1), port: view.getUint16(5), addresses };
}

/** The note the listening device publishes, sealed and signed by a key of its own. */
export async function sealOffer(
  secret: Uint8Array,
  offer: Offer,
  nowSeconds: number,
): Promise<NostrEvent> {
  const createdAt = Math.floor(nowSeconds / 60) * 60;
  const tag = meetingTag(secret, Math.floor(nowSeconds / 3600));
  const sealed = await batiCrypto().seal(
    toBase64(offerKey(secret)),
    toBase64(encodeOffer(offer)),
    toBase64(aadOf(tag, createdAt)),
  );
  return signEvent(newSecretKey(), {
    created_at: createdAt,
    kind: MEETING_KIND,
    tags: [["x", tag]],
    content: sealed,
  });
}

/**
 * The offer in a note, or `null` for anything else: another kind, a tag not of this link and of
 * this hour ±1, a bad signature, an old note, an expired or tampered offer.
 */
export async function openOffer(
  secret: Uint8Array,
  event: NostrEvent,
  nowSeconds: number,
): Promise<Offer | null> {
  if (event.kind !== MEETING_KIND || !verifyEvent(event)) return null;
  const tag = event.tags.find((t) => t[0] === "x")?.[1] ?? "";
  const hour = Math.floor(nowSeconds / 3600);
  if (![hour - 1, hour, hour + 1].some((h) => meetingTag(secret, h) === tag)) return null;
  if (Math.abs(nowSeconds - event.created_at) > OFFER_SECONDS + 60) return null;
  let plain: Uint8Array;
  try {
    plain = fromBase64(
      await batiCrypto().open(
        toBase64(offerKey(secret)),
        event.content,
        toBase64(aadOf(tag, event.created_at)),
      ),
    );
  } catch {
    // Not sealed under this link, or altered: someone else's note, ignored.
    return null;
  }
  const offer = decodeOffer(plain);
  return offer && offer.expiresAt >= nowSeconds ? offer : null;
}

function u64(n: number): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(n));
  return out;
}

const hexOf = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
