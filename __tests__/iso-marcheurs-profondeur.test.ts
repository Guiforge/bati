// T28: at every instant of a walk, the drawn rank (taken from the segment the walker is in) must
// suit the cell the walker really stands on, against the same `derriere` rule as the buildings.

import assert from "node:assert/strict";
import {
  ANIMAUX,
  EMPRISES_ORDRE,
  elementsMontes,
  etatCarte,
  FIGURINES,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import { type Case, sol } from "@/components/village/iso/isoLayout";
import {
  type Carte,
  empriseSegment,
  indiceSegment,
  planifierAnimaux,
  planifierVague,
  positionA,
  rangsMarcheurs,
  type Segment,
  type Vague,
} from "@/components/village/iso/marcheurs";
import { derriere, type Emprise } from "@/components/village/iso/profondeur";
import type { VillageTier } from "@/db/village";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const PAS_MS = 1000 / 30;
const { visible, montres } = etatCarte(12 as VillageTier, true);
const vues: Emprise[] = elementsMontes(visible, montres, (c) => stadeDemo(c, 12)).indices.flatMap(
  (i) => EMPRISES_ORDRE[i] ?? [],
);
const carte: Carte = {
  visible,
  montres,
  obstacles: ANIMAUX.map((a) => a.piece.case),
  occupees: FIGURINES.map((f) => f.case),
  vues,
};

/** The faults of one walker over `[0, fin]` ms: its rank (from the segment it is in) against the cell it is in. */
function fautes(qui: string, segments: readonly Segment[], fin: number, retard = 0): string[] {
  const out: string[] = [];
  for (let t = 0; t <= fin; t += PAS_MS) {
    // The rank reaches the screen `retard` ms after the UI thread reads the index (reaction, then scheduleOnRN).
    const k = indiceSegment(segments, t - retard);
    const s = segments[k];
    if (!s) continue;
    const { x, y } = positionA(segments, t);
    const ici: Emprise = { coin: [Math.floor(x), Math.floor(y)] as Case, emprise: [1, 1] };
    const rang = rangsMarcheurs(vues, [empriseSegment(s)])[0] ?? 0;
    vues.forEach((e, i) => {
      if (derriere(e, ici) && i >= rang)
        out.push(`${qui} t=${Math.round(t)} covers ${e.coin} from ${ici.coin}`);
      if (derriere(ici, e) && i < rang)
        out.push(`${qui} t=${Math.round(t)} hidden by ${e.coin} from ${ici.coin}`);
    });
  }
  return out;
}

// A walker on the bridge stands on its image: drawn before it, the deck hid its legs.
test("a walker on a bridge cell is drawn after the bridge", () => {
  const ponts = vues.flatMap((e, i) => (sol[e.coin[1]]?.[e.coin[0]] === "pont" ? [i] : []));
  expect(ponts.length).toBeGreaterThan(0);
  for (const i of ponts) {
    const e = vues[i];
    assert(e);
    expect(rangsMarcheurs(vues, [{ coin: e.coin, emprise: [1, 1] }])[0]).toBeGreaterThan(i);
  }
});

test("a walker is on the right side of every building at every instant, tier 12", () => {
  const toutes: string[] = [];
  let depart = {};
  const vagues: Vague[] = [];
  for (const jour of [24000, 24001, 24002]) {
    depart = {};
    for (let n = 0; n < 25; n++) {
      const v = planifierVague(carte, depart, jour, n);
      depart = v.fins;
      vagues.push(v);
      for (const m of v.marcheurs)
        toutes.push(...fautes(`${jour}/${n} ${m.role}`, m.segments, 14000));
      for (const b of planifierAnimaux(carte, v, jour, n))
        toutes.push(...fautes(`${jour}/${n} ${b.nom}`, b.segments, 14000));
    }
  }
  expect(vagues.length).toBeGreaterThan(0);
  expect(toutes.slice(0, 8)).toEqual([]);
});

/** A beast keeps its own slot (its resting cell's footprint in `vues`, never remounted). */
test("a beast's fixed slot suits every cell it walks over", () => {
  const fautes: string[] = [];
  for (const jour of [24000, 24001, 24002])
    for (let n = 0; n < 25; n++) {
      const v = planifierVague(carte, {}, jour, n);
      for (const b of planifierAnimaux(carte, v, jour, n)) {
        const de = b.segments[0]?.de;
        const rang = vues.findIndex(
          (e) =>
            e.coin[0] === de?.[0] &&
            e.coin[1] === de?.[1] &&
            e.emprise[0] === 1 &&
            e.emprise[1] === 1,
        );
        for (const s of b.segments) {
          const w = empriseSegment(s);
          vues.forEach((e, i) => {
            if (i === rang) return;
            if ((derriere(e, w) && i > rang) || (derriere(w, e) && i < rang))
              fautes.push(`${jour}/${n} ${b.nom} ${e.coin}`);
          });
        }
      }
    }
  expect(fautes.slice(0, 5)).toEqual([]);
});

test("with a 50 ms delay on the rank, a wrong order lasts 2 frames at most", () => {
  const plusLong: number[] = [];
  for (const jour of [24000, 24001, 24002])
    for (let n = 0; n < 25; n++) {
      const v = planifierVague(carte, {}, jour, n);
      for (const m of v.marcheurs) {
        const mauvais = new Set(
          fautes("", m.segments, 14000, 50).map((f) => /t=(\d+)/.exec(f)?.[1]),
        );
        let suite = 0;
        let max = 0;
        for (let t = 0; t <= 14000; t += PAS_MS) {
          suite = mauvais.has(String(Math.round(t))) ? suite + 1 : 0;
          max = Math.max(max, suite);
        }
        plusLong.push(max);
      }
    }
  expect(Math.max(...plusLong)).toBeLessThanOrEqual(2);
});
