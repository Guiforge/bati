// The paving of the square, drawn in vectors over its blurry texture (AUDIT-DA 8): each cell holds
// ten small stones laid in a running bond (three rows along gy, the middle one shifted; 31/10: five read as a carpet), each
// outlined by a thin ink joint and some tinted lighter or darker. Pure: every tint is a hash of the
// stone, so the same square is drawn on every visit. Static, no bitmap, no animated node.

import { ecranXY } from "./carteDemo";
import { emplacements } from "./isoLayout";
import { hasard } from "./solVarie";

/** Chebyshev distance, in cells, to the campfire's cell within which a cell may hold paving (rues.ts PAVE 3, plus one for the square's blob). */
export const RAYON_PAVE = 4;
const feu = emplacements.campfire.coin;

/** Stone edges along u in a cell: two rows, the second shifted. */
const RANGEES: readonly (readonly number[])[] = [
  [0, 1 / 3, 2 / 3, 1],
  [0, 1 / 6, 0.5, 5 / 6, 1],
  [0, 1 / 3, 2 / 3, 1],
];

const r1 = (n: number) => Math.round(n * 10) / 10;

export type Pavage = { joints: string; clairs: string; sombres: string };

/** The stones of cell (gx, gy), as three path `d`: every joint, then the lighter and the darker stones. */
export function pavageCase(gx: number, gy: number): Pavage {
  const sortie = { joints: "", clairs: "", sombres: "" };
  RANGEES.forEach((bords, row) => {
    for (let i = 0; i + 1 < bords.length; i++) {
      const [u0, u1] = [bords[i] ?? 0, bords[i + 1] ?? 1];
      const [v0, v1] = [row / RANGEES.length, (row + 1) / RANGEES.length];
      const d = `M${(
        [
          [u0, v0],
          [u1, v0],
          [u1, v1],
          [u0, v1],
        ] as const
      )
        .map(([u, v]) =>
          ecranXY([gx + u, gy + v])
            .map(r1)
            .join(","),
        )
        .join("L")}Z`;
      sortie.joints += d;
      const h = hasard(gx, gy, 120 + row * 5 + i, 5);
      if (h < 0.3) sortie.clairs += d;
      else if (h > 0.7) sortie.sombres += d;
    }
  });
  return sortie;
}

/** Whether cell (gx, gy) is near enough the campfire to hold paving. */
export const estPave = (gx: number, gy: number) =>
  Math.max(Math.abs(gx - feu[0]), Math.abs(gy - feu[1])) <= RAYON_PAVE;
