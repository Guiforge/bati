/** A stable number per string (0 to 9999), the seed of a pick. */
export function graine(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 10007;
  return h % 10000;
}
