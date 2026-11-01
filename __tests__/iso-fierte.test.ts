import assert from "node:assert/strict";
import {
  etatAvec,
  etatCarte,
  pose,
  spriteDe,
  stadeDemo,
  stadeReel,
} from "@/components/village/iso/carteDemo";
import { croissanceDemo } from "@/components/village/iso/croissanceDemo";
import { accrochesDe } from "@/components/village/iso/feux";
import {
  avecBanniere,
  boiteBanniere,
  dernierStade,
  ECLATS_ANIMES,
  eclatsAnimes,
  hautDessine,
  legendaire,
  SANS_BANNIERE,
  sommet,
  sommetDp,
} from "@/components/village/iso/fierte";
import { batiments } from "@/components/village/iso/isoSpec";
import { batimentAuPoint, cibles, opaque } from "@/components/village/iso/tapBatiment";
import { buildingStage } from "@/constants/buildingLevels";
import { buildingCodes } from "@/db/schema";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const { montres } = etatAvec(12, [...buildingCodes]);
const dernier = (code: (typeof buildingCodes)[number]) => stadeDemo(code, 12);

describe("a last stage's pride (T03, L6-T12)", () => {
  test("the top of a mask: the middle of its highest opaque row, one cell down", () => {
    // 8 x 3 cells of 4 px: row 0 empty, row 1 has cells 2 to 5, row 2 full.
    const m = { pas: 4, w: 8, h: 3, bits: "00" + "3c" + "ff" };
    expect(sommet(m)).toEqual([16, 8]);
    expect(sommet({ pas: 4, w: 8, h: 2, bits: "0000" })).toBeNull();
  });

  test("every last stage is reached at tier 12 and the banner flies on all but an open fire and a road", () => {
    for (const code of montres) {
      expect(dernierStade(code, dernier(code))).toBe(true);
      expect(avecBanniere(code, dernier(code))).toBe(!SANS_BANNIERE.has(code));
      expect(avecBanniere(code, "rough")).toBe(false);
    }
  });

  test("every banner is planted on its own painting, at the top of it", () => {
    for (const code of montres.filter((c) => avecBanniere(c, dernier(c)))) {
      const s = spriteDe(code, dernier(code));
      assert(s?.masque, code);
      const corps = pose(code, s);
      const haut = sommetDp(s, corps);
      assert(haut, code);
      // The pole's foot is on the painting: the mask is set just under it.
      const k = corps.w / s.size[0];
      expect([code, opaque(s.masque, (haut[0] - corps.x) / k, (haut[1] - corps.y) / k)]).toEqual([
        code,
        true,
      ]);
      // Nothing of the painting stands above the foot's row, so the banner rises clear of it.
      const b = boiteBanniere(haut);
      expect(b.y + b.h).toBeGreaterThan(haut[1]);
      expect(b.y).toBeLessThan(haut[1]);
      expect(hautDessine(code, dernier(code), s, corps)?.[1]).toBe(b.y);
    }
  });

  test("every lit window lies on its painting, and forge_grand's right one only on its visible part (T03-qa, T38)", () => {
    for (const code of buildingCodes)
      for (const st of batiments[code].stades) {
        const a = accrochesDe(code, st);
        const s = spriteDe(code, st);
        if (!a || !s?.masque) continue;
        for (const f of a.fenetres)
          expect([`${code}_${st}`, f.px, opaque(s.masque, f.px[0], f.px[1])]).toEqual([
            `${code}_${st}`,
            f.px,
            true,
          ]);
      }
    // T38: the anvil hides the lower half of the right pane; the export keeps only its lit part,
    // where T03 had to switch the whole window off because its glow fell on the lean-to.
    const forge = accrochesDe("forge", "grand")?.fenetres ?? [];
    expect(forge.map((f) => f.face)).toEqual(["gauche", "gauche", "droite"]);
    expect([forge[2]?.largeur, forge[2]?.hauteur]).toEqual([40, 22]);
  });

  test("dev-iso's « Bannière » plays a growth into a last stage that flies one", () => {
    const b = etatCarte(1, false)
      .montres.map((code) => ({ code, level: 9 }))
      .filter((x) => !SANS_BANNIERE.has(x.code));
    const [code, ancien] = (croissanceDemo(b, 0) ?? "").split(":") as [
      (typeof buildingCodes)[number],
      string,
    ];
    const vers = stadeReel(code, buildingStage(9));
    expect(avecBanniere(code, vers)).toBe(true);
    expect(stadeReel(code, buildingStage(Number(ancien)))).not.toBe(vers);
  });

  test("the legendary rank is each building's own ceiling", () => {
    expect(legendaire("watchtower", 3)).toBe(true);
    expect(legendaire("watchtower", 2)).toBe(false);
    expect(legendaire("heroes_hall", 5)).toBe(true);
    expect(legendaire("high_road", 5)).toBe(false);
    expect(legendaire("forge", 9)).toBe(false);
    expect(legendaire("forge", 10)).toBe(true);
    expect(legendaire("forge", 0)).toBe(false);
  });

  test("at most ECLATS_ANIMES glints twinkle, on buildings that fly a banner", () => {
    const tous = eclatsAnimes(montres, dernier);
    expect(tous.size).toBe(ECLATS_ANIMES);
    for (const code of tous) expect(SANS_BANNIERE.has(code)).toBe(false);
    expect(eclatsAnimes(["campfire", "high_road"], dernier).size).toBe(0);
    expect(eclatsAnimes(["forge"], () => "solid").size).toBe(0);
  });

  test("the campfire's hammer stands over the campfire, not on the tent's roof (T02b-qa)", () => {
    for (const st of batiments.campfire.stades) {
      // The tent at the same stage, as in the qa scene (both at level 9 on tier 1).
      const stade = () => st;
      const s = spriteDe("campfire", st);
      assert(s);
      const corps = pose("campfire", s);
      const haut = hautDessine("campfire", st, s, corps);
      assert(haut);
      // The hammer is centred on the campfire's top (Reclame.tsx): no other painting is under it.
      expect([st, batimentAuPoint(haut, cibles(["tent"], stade))]).toEqual([st, null]);
      expect([
        st,
        batimentAuPoint(
          haut,
          cibles(["campfire"], () => st),
        ),
      ]).toEqual([st, "campfire"]);
      // And under the old spot, the canvas's top.
      expect(haut[1]).toBeGreaterThan(corps.y);
    }
  });
});
