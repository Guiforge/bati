/**
 * Bytes from base64. A plain loop: `Uint8Array.from(atob(s), (c) => c.charCodeAt(0))` calls a
 * function per byte, 20 to 30 times slower on a 300 KB photo (12 s of one test file).
 */
export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
