// FIN-DIS: castle_wall's wall sections (rempart.ts, Rempart.tsx). They belong to the wall, show
// only with it and only on cells the island shows, are drawn by stretch in the depth order, cast a
// shadow, and a tap on one opens castle_wall.

import assert from "node:assert/strict";
import { render } from "@testing-library/react-native";
import { ecranXY, etatCarte, ORDRE_CARTE } from "@/components/village/iso/carteDemo";
import {
  type Case,
  emplacements,
  ileVisible,
  rempart,
  troncons,
} from "@/components/village/iso/isoLayout";
import { PanRempart } from "@/components/village/iso/Rempart";
import {
  dessinPans,
  masquePan,
  montresDuTroncon,
  ombresPan,
  pansMontres,
  piecePan,
  piecesPeintes,
} from "@/components/village/iso/rempart";
import {
  ancreBatiment,
  batimentAuPoint,
  type Cible,
  cibles,
  opaque,
} from "@/components/village/iso/tapBatiment";
import { rawColors } from "@/constants/rawColors";
import { buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";

const cle = (c: Case) => c.join(",");
const TIERS: readonly VillageTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** The first map point (dp) a target's mask covers, row by row. */
function premierPlein(p: Cible): [number, number] | null {
  for (let v = 0; v < p.taille[1]; v += 2)
    for (let u = 0; u < p.taille[0]; u += 2)
      if (opaque(p.masque, u, v))
        return [
          p.rect.x + ((u + 1) * p.rect.w) / p.taille[0],
          p.rect.y + ((v + 1) * p.rect.h) / p.taille[1],
        ];
  return null;
}

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

describe("castle_wall's wall sections (FIN-DIS)", () => {
  test("the stretches hold every section once, each a straight run, one element of the depth order", () => {
    expect(troncons.flat().map(cle).sort()).toEqual(rempart.map(cle).sort());
    for (const t of troncons) {
      const ligne = t.every(([, gy]) => gy === t[0]?.[1]) || t.every(([gx]) => gx === t[0]?.[0]);
      expect([t.map(cle), ligne]).toEqual([t.map(cle), true]);
    }
    // The south wall's two halves, the gate between, and the east wall's three runs.
    expect(troncons).toHaveLength(5);
    expect(ORDRE_CARTE.filter((e) => e.type === "pan")).toHaveLength(troncons.length);
    expect(emplacements.castle_wall.cases).toHaveLength(3);
  });

  test("they show with castle_wall only, on cells the island shows, and never go back", () => {
    const tard = ileVisible(12, buildingCodes);
    expect(pansMontres(tard, ["campfire", "tent"])).toEqual([]);
    expect(pansMontres(tard, buildingCodes)).toHaveLength(rempart.length);
    let avant = new Set<string>();
    for (const t of TIERS) {
      const visible = ileVisible(t, buildingCodes);
      const ici = troncons.flatMap((_, i) => montresDuTroncon(i, visible, buildingCodes));
      expect([t, ici.filter(([gx, gy]) => visible[gy]?.[gx] !== true)]).toEqual([t, []]);
      const vus = new Set(ici.map(cle));
      expect([t, [...avant].filter((c) => !vus.has(c))]).toEqual([t, []]);
      avant = vus;
    }
  });

  test("a palisade at rough, a stone wall from solid on, each section with a shadow", () => {
    for (const t of troncons) {
      const pieux = dessinPans(t, "rough");
      const pierre = dessinPans(t, "solid");
      assert(pieux && pierre);
      expect(pieux.couches.some((k) => k.clair !== "")).toBe(true);
      expect(pierre.couches.some((k) => k.joints !== "")).toBe(true);
      expect(pieux).not.toEqual(pierre);
      expect(dessinPans(t, "grand")).toBe(pierre);
    }
    expect(dessinPans([], "solid")).toBeNull();
    for (const c of rempart) expect(ombresPan(c, "solid").length).toBeGreaterThan(0);
  });

  test("each cell takes the painted piece its neighbours on the line ask for (F4)", () => {
    const pieces = Object.fromEntries(rempart.map((c) => [cle(c), piecePan(c)]));
    // The south wall: a free end by the river, runs, a free end each side of the gate, the corner.
    expect(pieces["3,16"]).toBe("end");
    expect(pieces["11,16"]).toBe("end_mgx");
    expect(pieces["13,16"]).toBe("end");
    expect(pieces["17,16"]).toBe("corner");
    // The east wall's north end, its arm toward +gy; runs against the watchtower and the gatehouse.
    expect(pieces["17,4"]).toBe("end_pgy");
    for (const c of ["17,5", "17,7", "17,8", "17,12", "17,15"]) expect(pieces[c]).toBe("run_gy");
    for (let gx = 4; gx <= 10; gx++) expect(pieces[`${gx},16`]).toBe("run_gx");
    // One image a cell, its anchor (the canvas' (32, 72) dp) on the cell's bottom corner, back to front.
    for (const t of troncons) {
      const p = piecesPeintes(t.toReversed(), "grand");
      expect(p.map((x) => cle(x.case))).toEqual(t.map(cle));
      for (const x of p) {
        expect(x.nom.startsWith("solid_")).toBe(true);
        expect([x.rect.x + 32, x.rect.y + 72]).toEqual(ecranXY([x.case[0] + 1, x.case[1] + 1]));
      }
    }
    expect(piecesPeintes(rempart, "rough").every((x) => x.nom.startsWith("rough_"))).toBe(true);
  });

  test("a tap on a section opens castle_wall; the bubble still aims at the gatehouse", () => {
    const { visible } = etatCarte(12, true);
    const liste = cibles(buildingCodes, () => "solid", visible);
    const pans = liste.filter((c) => c.pan);
    // One target a painted piece, each with its canvas' alpha.
    expect(pans).toHaveLength(pansMontres(visible, buildingCodes).length);
    for (const p of pans) {
      const touche = premierPlein(p);
      expect(p.taille).toEqual([512, 640]);
      assert(touche);
      expect(batimentAuPoint(touche, [p])).toBe("castle_wall");
    }
    const gatehouse = liste.find((c) => c.code === "castle_wall" && !c.pan);
    assert(gatehouse);
    const ancre = ancreBatiment("castle_wall", liste);
    assert(ancre);
    expect(ancre[0]).toBeGreaterThanOrEqual(gatehouse.rect.x);
    expect(ancre[0]).toBeLessThanOrEqual(gatehouse.rect.x + gatehouse.rect.w);
    // Without the island, no section is a target (the callers that do not pass it).
    expect(cibles(buildingCodes, () => "solid").filter((c) => c.pan)).toEqual([]);
    const d = dessinPans(troncons[0] ?? [], "solid");
    assert(d);
    expect(masquePan(d).bits).toMatch(/[1-9a-f]/);
  });

  test("a stretch draws as one static Svg", async () => {
    const t = troncons[0];
    assert(t);
    const r = await render(<PanRempart cases={t} stade="rough" />);
    expect(r.getByTestId(`iso-pan-${t[0]?.join("-")}`)).toBeTruthy();
  });

  test("by day the stone is warm, by night it keeps its blues; a growing wall mounts too (H3-03, H3-16)", async () => {
    const t = troncons[0];
    assert(t);
    const cle = `iso-pan-${t[0]?.join("-")}`;
    const r = await render(<PanRempart cases={t} stade="solid" lumiere="jour" />);
    expect(r.getByTestId(cle)).toBeTruthy();
    await r.rerender(<PanRempart cases={t} stade="solid" lumiere="nuit" />);
    expect(r.getByTestId(cle)).toBeTruthy();
    await r.rerender(<PanRempart cases={t} stade="solid" lumiere="jour" entree />);
    expect(r.getByTestId(cle)).toBeTruthy();
    expect(rawColors.isoPierreChaudeClair).toBe("#8C7A66");
  });

  test("H4-07: a growing wall keeps its old stage over the new one while it fades, then only the new", async () => {
    const t = troncons[0];
    assert(t);
    const cle = `iso-pan-${t[0]?.join("-")}`;
    const r = await render(<PanRempart cases={t} stade="rough" />);
    expect(r.getAllByTestId(cle)).toHaveLength(1);
    // The growth: the owner's key stays, the new stage comes with `entree`; the old one is kept.
    await r.rerender(<PanRempart cases={t} stade="solid" entree />);
    expect(r.getAllByTestId(cle)).toHaveLength(2);
    await r.rerender(<PanRempart cases={t} stade="solid" />);
    expect(r.getAllByTestId(cle)).toHaveLength(1);
  });
});
