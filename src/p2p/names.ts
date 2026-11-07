import { hkdf } from "@noble/hashes/hkdf.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";

/**
 * The secret two linked devices share, and the names it gives them on the Wi-Fi. Spec:
 * docs/designs/p2p-sync/SPEC.md, L4 and D2. Frozen by __tests__/fixtures/p2p/names-v1.json.
 *
 * The secret comes from random bytes each side sends inside the TLS channel, never from the pairing
 * code: whoever photographed the code cannot name the service or follow the devices hour by hour.
 */
const LINK_INFO = new TextEncoder().encode("bati/p2p/link/v1");
const NSD_LABEL = new TextEncoder().encode("bati/p2p/nsd");

export const hourOf = (unixSeconds: number) => Math.floor(unixSeconds / 3600);

/** A is the device that showed the code, B the one that read it: the order is the same on both. */
export function linkSecret(
  rA: Uint8Array,
  rB: Uint8Array,
  idA: Uint8Array,
  idB: Uint8Array,
): Uint8Array {
  return hkdf(
    sha256,
    new Uint8Array([...rA, ...rB]),
    new Uint8Array([...idA, ...idB]),
    LINK_INFO,
    32,
  );
}

/** The NSD instance name for one hour: 16 bytes of HMAC, in hex. Nothing readable on the LAN. */
export function nsdName(secret: Uint8Array, hour: number): string {
  const message = new Uint8Array(NSD_LABEL.length + 8);
  message.set(NSD_LABEL);
  new DataView(message.buffer).setBigUint64(NSD_LABEL.length, BigInt(hour));
  return Array.from(hmac(sha256, secret, message).subarray(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
