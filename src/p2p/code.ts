import { fromBase64Url, toBase64Url } from "@/src/multiplayer/envelope";

/**
 * What device A shows device B to link them, as a QR or as text (SPEC.md L3, L5, L6, section 2).
 * Frozen by __tests__/fixtures/p2p/code-v1.json, written by scripts/p2p-vectors.py.
 *
 * version 1 | expiresAt u32 | token 32 | installId 16 | deviceId 32 | name len u8 | name |
 * routes u8 | per route: type u8 | len u8 | data. A LAN route is port u16, then family u8 (4 or 6)
 * and the address, as many as fit.
 *
 * Not sealed, and it cannot be: it is what starts the link. It is only accepted from the camera or
 * the in-app field, works for 10 minutes and once, and A confirms the device that used it (L4).
 */
export const CODE_VERSION = 1;
export const CODE_MINUTES = 10;
const MAX_NAME_BYTES = 32;
const ROUTE_LAN = 1;
/** Two devices' clocks disagree; a code made further ahead than this did not come from a phone in the room. */
const CLOCK_SLACK_SECONDS = 60;

export type PairingCode = {
  expiresAt: number;
  token: Uint8Array;
  installId: string;
  deviceId: Uint8Array;
  name: string;
  lan: { port: number; addresses: string[] };
};

export type ReadCode =
  | { ok: true; code: PairingCode }
  | { ok: false; reason: "expired" | "version" | "malformed" };

export function encodeCode(code: PairingCode): string {
  const name = new TextEncoder().encode(code.name);
  if (name.length > MAX_NAME_BYTES) throw new Error("Device name is too long");
  const lan = [
    code.lan.port >> 8,
    code.lan.port & 0xff,
    ...code.lan.addresses.flatMap(addressBytes),
  ];
  if (lan.length > 255) throw new Error("Too many addresses for one route");
  const bytes = [
    CODE_VERSION,
    ...u32(code.expiresAt),
    ...code.token,
    ...hexBytes(code.installId.replace(/-/g, "")),
    ...code.deviceId,
    name.length,
    ...name,
    1,
    ROUTE_LAN,
    lan.length,
    ...lan,
  ];
  return toBase64Url(Uint8Array.from(bytes));
}

/** The text fallback: groups of 4 with spaces. Never dashes, which base64url uses. */
export const groupCode = (text: string) => text.match(/.{1,4}/g)?.join(" ") ?? "";

export function readCode(text: string, nowSeconds: number): ReadCode {
  const bytes = fromBase64Url(text.replace(/\s/g, ""));
  if (bytes === null || bytes.length < 1) return { ok: false, reason: "malformed" };
  if (bytes[0] !== CODE_VERSION) return { ok: false, reason: "version" };
  const read = new Reader(bytes.subarray(1));
  const expiresAt = read.u32();
  const token = read.take(32);
  const installId = read.take(16);
  const deviceId = read.take(32);
  const nameBytes = read.take(read.u8());
  const routes = read.u8();
  let lan: PairingCode["lan"] | null = null;
  for (let i = 0; i < routes && read.ok; i++) {
    const type = read.u8();
    const data = read.take(read.u8());
    if (type === ROUTE_LAN && lan === null) lan = readLan(data);
  }
  if (!read.ok || read.left() !== 0 || nameBytes.length > MAX_NAME_BYTES)
    return { ok: false, reason: "malformed" };
  const name = decodeName(nameBytes);
  if (name === null) return { ok: false, reason: "malformed" };
  // A code with no route this build speaks is a code from a newer build, not a broken one.
  if (lan === null) return { ok: false, reason: "version" };
  if (nowSeconds > expiresAt || expiresAt - nowSeconds > CODE_MINUTES * 60 + CLOCK_SLACK_SECONDS) {
    return { ok: false, reason: "expired" };
  }
  return {
    ok: true,
    code: { expiresAt, token, installId: uuidOf(installId), deviceId, name, lan },
  };
}

class Reader {
  private at = 0;
  private readonly bytes: Uint8Array;
  ok = true;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }
  left = () => this.bytes.length - this.at;
  take(n: number): Uint8Array {
    if (n > this.left()) {
      this.ok = false;
      this.at = this.bytes.length;
      return new Uint8Array(0);
    }
    this.at += n;
    return this.bytes.subarray(this.at - n, this.at);
  }
  u8 = () => this.take(1)[0] ?? 0;
  u32(): number {
    const b = this.take(4);
    return b.length === 4 ? new DataView(b.buffer, b.byteOffset).getUint32(0) : 0;
  }
}

function readLan(data: Uint8Array): PairingCode["lan"] | null {
  const read = new Reader(data);
  const port = read.take(2);
  const addresses: string[] = [];
  while (read.ok && read.left() > 0) {
    const family = read.u8();
    if (family === 4) addresses.push(Array.from(read.take(4)).join("."));
    else if (family === 6) addresses.push(ipv6Text(read.take(16)));
    else return null;
  }
  if (!read.ok || port.length !== 2) return null;
  return { port: ((port[0] ?? 0) << 8) | (port[1] ?? 0), addresses };
}

function decodeName(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // A name that is not UTF-8 did not come from Bati: the code is refused, which is the answer.
    return null;
  }
}

function addressBytes(address: string): number[] {
  if (address.includes(":")) return [6, ...ipv6Bytes(address)];
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    throw new Error(`Not an IPv4 address: ${address}`);
  }
  return [4, ...parts];
}

function ipv6Bytes(address: string): number[] {
  const [head = "", tail = ""] = address.split("::");
  const groups = (s: string) => (s === "" ? [] : s.split(":"));
  const left = groups(head);
  const right = groups(tail);
  const all = address.includes("::")
    ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    : left;
  if (all.length !== 8) throw new Error(`Not an IPv6 address: ${address}`);
  return all.flatMap((g) => {
    const n = Number.parseInt(g, 16);
    return [n >> 8, n & 0xff];
  });
}

/** RFC 5952 short form: lowercase, the longest run of zero groups as "::". */
function ipv6Text(bytes: Uint8Array): string {
  const groups = Array.from(
    { length: 8 },
    (_, i) => ((bytes[2 * i] ?? 0) << 8) | (bytes[2 * i + 1] ?? 0),
  );
  let best = { at: -1, length: 0 };
  for (let i = 0; i < 8; ) {
    let j = i;
    while (j < 8 && groups[j] === 0) j++;
    if (j - i > best.length && j - i > 1) best = { at: i, length: j - i };
    i = j === i ? i + 1 : j;
  }
  const text = groups.map((g) => g.toString(16));
  if (best.at < 0) return text.join(":");
  return `${text.slice(0, best.at).join(":")}::${text.slice(best.at + best.length).join(":")}`;
}

const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const hexBytes = (hex: string) => Array.from(hex.match(/../g) ?? [], (b) => Number.parseInt(b, 16));

function uuidOf(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
