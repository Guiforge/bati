/** A carried picture is a data URI; this is the one place that reads its header. */

/**
 * Width and height of a JPEG, PNG or WebP, read from its header. Null when the header is not one
 * this reads, which `safeImage` treats as a picture it cannot vouch for.
 */
export function imageSize(bytes: Uint8Array): Size | null {
  const r = reader(bytes);
  if (r.ascii(0, 8) === "\x89PNG\r\n\x1a\n") return { width: r.u32be(16), height: r.u32be(20) };
  if (r.ascii(0, 4) === "RIFF" && r.ascii(8, 4) === "WEBP") return webpSize(r);
  if (r.at(0) === 0xff && r.at(1) === 0xd8) return jpegSize(r);
  return null;
}

export type Size = { width: number; height: number };
type Reader = ReturnType<typeof reader>;

function reader(bytes: Uint8Array) {
  const at = (i: number) => bytes[i] ?? 0;
  const u16be = (i: number) => (at(i) << 8) | at(i + 1);
  const u16le = (i: number) => at(i) | (at(i + 1) << 8);
  return {
    length: bytes.length,
    at,
    u16be,
    u16le,
    u24le: (i: number) => u16le(i) | (at(i + 2) << 16),
    u32be: (i: number) => u16be(i) * 0x10000 + u16be(i + 2),
    ascii: (i: number, n: number) => String.fromCharCode(...bytes.subarray(i, i + n)),
  };
}

function webpSize(r: Reader): Size | null {
  const chunk = r.ascii(12, 4);
  if (chunk === "VP8 ") return { width: r.u16le(26) & 0x3fff, height: r.u16le(28) & 0x3fff };
  if (chunk === "VP8X") return { width: 1 + r.u24le(24), height: 1 + r.u24le(27) };
  if (chunk !== "VP8L") return null;
  const b = (i: number) => r.at(21 + i);
  return {
    width: 1 + (((b(1) & 0x3f) << 8) | b(0)),
    height: 1 + (((b(3) & 0xf) << 10) | (b(2) << 2) | ((b(1) & 0xc0) >> 6)),
  };
}

/** Segment by segment to the first frame header: SOF0 to SOF15, minus DHT, JPG and DAC. */
function jpegSize(r: Reader): Size | null {
  let i = 2;
  while (i + 9 < r.length && r.at(i) === 0xff) {
    const marker = r.at(i + 1);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: r.u16be(i + 7), height: r.u16be(i + 5) };
    }
    i += 2 + r.u16be(i + 2);
  }
  return null;
}

/** Beyond this a header is not one this app wrote: older crops were not enforced, 16000 px is an attack. */
export const MAX_RENDER_SIDE = 2_048;

const CARRIED_PREFIX = /^data:image\/(?:jpeg|png|webp);base64,/;
/** Base64 characters read after the comma: an embedded ICC profile (Display P3) can put the SOF several KB in. */
const HEADER_CHARS = 16_384;

/**
 * The size a data URI of a JPEG, PNG or WebP claims, from its first 16 384 base64 characters only
 * (no regex scans the whole string on render). Null for anything else, a header past those
 * characters included, which fails closed. EXIF is not looked at: that is `safeImage`, on import.
 */
export function carriedImageSize(dataUri: string): Size | null {
  const prefix = CARRIED_PREFIX.exec(dataUri.slice(0, 40));
  if (!prefix) return null;
  try {
    const head = dataUri.slice(prefix[0].length, prefix[0].length + HEADER_CHARS);
    return imageSize(Uint8Array.from(atob(head), (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}
