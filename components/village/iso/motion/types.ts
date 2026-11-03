// The schema of motion/<building>.json (LIFE M1): what moves on a building and where, on a still
// painting. Anchors are canvas px (the sprite's own pixels, like constants/buildings/<code>.ts
// `lights` and `ancres`), turned into map dp by the engine's `px()`; sizes and climbs are dp.
// `fromRank` and `fromBase` read exactly as the data files' do (batiment.ts `atteint`).
//
// The JSON is read through motion/index.ts, which casts it to `MouvementBld`: TypeScript widens a
// JSON string to `string`, so a wrong kind compiles; __tests__/iso-mouvement.test.ts is what
// rejects one (it checks every file against KINDS and GENRES).

import type { DepuisBase, LightAnchor, Point } from "@/constants/buildingData";

/** The kinds of effect, one drawing and one clock rule each (MouvementBld.tsx). */
export const KINDS = ["lueur", "particules", "vent", "miroitement"] as const;

/** What a particle is: all of them wear the one placeholder sprite until the M6 paintings land. */
export const GENRES = ["fumee", "vapeur", "etincelle", "braise", "poussiere", "magie"] as const;
export type Genre = (typeof GENRES)[number];

type Pose = DepuisBase & { at: Point; fromRank: number };

/** A warm pool (the building's `lights` entry, moved): flickers by noise; a window lights up in its turn at dusk. */
export type Lueur = Pose & {
  kind: "lueur";
  lueur: LightAnchor["kind"];
  /** Also lit by day (as `lights`' parJour). Left out: the night's. */
  parJour?: boolean;
};

/** `nb` puffs rising and fading from `at`, in turn: one animated node each. */
export type Particules = Pose & {
  kind: "particules";
  genre: Genre;
  nb: 1 | 2 | 3;
  /** A puff's width, dp: how far it climbs and drifts follows (feux.ts `fumee`). */
  taille: number;
};

/**
 * A flag or banner that is part of the still painting: a copy of `zone` (canvas px, [x, y, w, h])
 * of the sprite, clipped to it, tilted about `pivot` (its pole, canvas px) on the shared sway.
 */
export type Vent = Pose & {
  kind: "vent";
  zone: readonly [x: number, y: number, w: number, h: number];
  pivot: Point;
};

/** `nb` pale glints sliding on the water round `at` (a basin's middle), `rayon` canvas px wide. */
export type Miroitement = Pose & { kind: "miroitement"; nb: 1 | 2 | 3; rayon: number };

export type Effet = Lueur | Particules | Vent | Miroitement;

export type MouvementBld = { effets: readonly Effet[] };
