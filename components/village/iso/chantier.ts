// What the growth moment (moment.ts, IsoCroissance) needs about a building's site: how long the map
// keeps its own sprite under the layer's first images, and which scaffold fits a footprint.
// The villagers who struck the site and the dust of their blows are gone from the moment: they walk.

import type { BuildingCode } from "@/db/schema";
import { emplacements } from "./isoLayout";

/** The map's sprite stays this long under the layer, ms: longer than a decode of the layer's images (T03). */
export const ECHAFAUDAGE_APRES_MS = 120;

/** Index key of the scaffold that fits a footprint: 1 x 1 for a hut, else the 2 x 2 (moment.ts `echelleEchafaudage` enlarges it beyond 2). */
export const echafaudageDe = (code: BuildingCode): string => {
  const [w, h] = emplacements[code].emprise;
  return `echafaudage/${w === 1 && h === 1 ? "1x1" : "2x2"}.nuit.webp`;
};
