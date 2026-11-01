// T32: what the village sounds like. Pure: which sounds play and how loud, from the camera and the
// map's light. The files and the players live in src/sounds.ts, the only place that touches audio.

import type { Vue } from "./carteDemo";
import type { Ambiance } from "./isoSpec";
import { ecranDepuisCarte } from "./navigation";

export type Niveaux = { jour: number; nuit: number; forge: number; moulin: number };
export const SILENCE: Niveaux = { jour: 0, nuit: 0, forge: 0, moulin: 0 };

/** The ground bed, always under everything (media volume does the rest). */
export const VOLUME_FOND = 0.35;
/** A building at the centre of the screen at the closest zoom. */
export const VOLUME_BATIMENT = 0.7;
/** A full fade, in ms: in on arrival, out on leaving. */
export const FONDU_MS = 1200;

/** Only the day map has the day's bed; the night, and any ambiance to come, has the crickets. */
export const fondDe = (ambiance: Ambiance): "jour" | "nuit" =>
  ambiance === "jour" ? "jour" : "nuit";

const borne = (x: number) => Math.min(1, Math.max(0, x));

/**
 * One rule for a building: zoom (0 at the widest, 1 at the closest) times closeness to the centre
 * of the screen (1 on it, 0 at a corner's distance). So it is silent on the whole-island view and
 * grows as the hero zooms in on it.
 */
export function volumeBatiment({
  vue,
  zmin,
  zmax,
  centre,
  aire,
  carte,
}: {
  vue: Vue;
  zmin: number;
  zmax: number;
  /** The building's centre, in the map's own dp. */
  centre: readonly [number, number];
  aire: { w: number; h: number };
  carte: { largeur: number; hauteur: number };
}): number {
  const zoom = borne((vue.zoom - zmin) / (zmax - zmin));
  const [x, y] = ecranDepuisCarte(centre, vue, aire, carte);
  const proche =
    1 - borne(Math.hypot(x - aire.w / 2, y - aire.h / 2) / Math.hypot(aire.w / 2, aire.h / 2));
  return VOLUME_BATIMENT * zoom * proche;
}

/** Silence unless the hero wants sound, the Village tab is on screen, the app is in front and the map is not frozen. */
export function niveauxVillage(e: {
  soundEnabled: boolean;
  focus: boolean;
  premierPlan: boolean;
  fige: boolean;
  ambiance: Ambiance;
  /** The two buildings, null when not built; their volume is already `volumeBatiment`. */
  forge: number | null;
  moulin: number | null;
}): Niveaux {
  if (!e.soundEnabled || !e.focus || !e.premierPlan || e.fige) return SILENCE;
  const fond = fondDe(e.ambiance);
  return {
    jour: fond === "jour" ? VOLUME_FOND : 0,
    nuit: fond === "nuit" ? VOLUME_FOND : 0,
    forge: e.forge ?? 0,
    moulin: e.moulin ?? 0,
  };
}

/**
 * A coarse key of the camera (zoom to 1/20, position to 40 dp): the sound is re-read only when it
 * changes, so nothing wakes JS at rest or on a fine drag (a worklet, like cleDetail).
 */
export function cleSon(zoom: number, x: number, y: number): number {
  "worklet";
  return (
    Math.round(zoom * 20) * 1e8 + (Math.round(x / 40) + 5000) * 1e4 + (Math.round(y / 40) + 5000)
  );
}

/** One fade step: `actuel` moves toward `cible` at a full scale per FONDU_MS. */
export function suivre(actuel: number, cible: number, dtMs: number): number {
  const pas = dtMs / FONDU_MS;
  return actuel < cible ? Math.min(cible, actuel + pas) : Math.max(cible, actuel - pas);
}
