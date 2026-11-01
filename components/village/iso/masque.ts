// The sprite's tap mask and its reader, apart from tapBatiment.ts so carteDemo.ts can read a
// silhouette without importing the module that imports it.

/** A bit grid over a sprite, one bit per `pas` x `pas` px, rows packed in hex (4 bits a char). */
export type Masque = { pas: number; w: number; h: number; bits: string };

/** Whether the mask is set at sprite pixel (u, v); outside the sprite, never. */
export function opaque(m: Masque, u: number, v: number): boolean {
  const c = Math.floor(u / m.pas);
  const r = Math.floor(v / m.pas);
  if (u < 0 || v < 0 || c >= m.w || r >= m.h) return false;
  const parLigne = Math.ceil(m.w / 4);
  const car = m.bits.charAt(r * parLigne + (c >> 2));
  return ((Number.parseInt(car, 16) >> (3 - (c & 3))) & 1) === 1;
}
