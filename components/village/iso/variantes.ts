// Dev switches for the perf A/B of the audit-3 regression (reports/perf-regression-audit3.md): the
// lisiere's decode scale, the night's light pools and the street end stones. Only app/dev-iso.tsx
// sets them (query `?ech=0.5&flaques=0&bornes=0`); everywhere else the context holds the default,
// which is what ships. No choice is made here: the default stays the HEAD's until a measure says so.

import { createContext } from "react";
import { ECHELLE_DECODE } from "./lisiere";

export type Variantes = {
  /** The lisiere trees' decode scale (lisiere.ts `echelleLisiere`). */
  echelleDecode: number;
  /** The night's warm pools in the ground tiles (lueurs.ts). */
  flaques: boolean;
  /** The stones at the end of a street (rues.ts `bornesDeRue`). */
  bornes: boolean;
};

export const VARIANTES_DEFAUT: Variantes = {
  echelleDecode: ECHELLE_DECODE,
  flaques: true,
  bornes: true,
};

export const VariantesContext = createContext<Variantes>(VARIANTES_DEFAUT);

/** The variants a dev route asks for; anything unreadable keeps the default. */
export function variantesDe(p: { ech?: string; flaques?: string; bornes?: string }): Variantes {
  const ech = Number(p.ech);
  return {
    echelleDecode: ech >= 0.25 && ech <= 1 ? ech : VARIANTES_DEFAUT.echelleDecode,
    flaques: p.flaques !== "0",
    bornes: p.bornes !== "0",
  };
}

/** Whether `v` is the shipped one (the dev screen says so when it is not). */
export const estDefaut = (v: Variantes) =>
  v.echelleDecode === VARIANTES_DEFAUT.echelleDecode && v.flaques && v.bornes;
