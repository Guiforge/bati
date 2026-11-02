// Style helpers shared by the map's layers, apart from the components so none of them has to
// import IsoCarteDemo to reach a constant.
import { rawColors } from "@/constants/rawColors";
import type { Rect } from "./carteDemo";

export const couleur = (token: keyof typeof rawColors) => rawColors[token];

export const MASQUE = { opacity: 0 } as const;
// A screen mirror swaps gx and gy: a piece blender drew along gy runs along gx.
export const MIROIR = { transform: [{ scaleX: -1 }] } as const;
export const place = (r: Rect) =>
  ({ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h }) as const;
