import { etatCarte } from "@/components/village/iso/carteDemo";
import { placerHabitants } from "@/components/village/iso/habitants";
import { construire } from "@/components/village/iso/quartiers";
import {
  animalDeVocation,
  chosesDe,
  EMBLEMES,
  MATIERES,
  solDe,
  vocationDeBlason,
} from "@/components/village/iso/vocation";
import { PRACTICES } from "@/db/crestRules";
import type { VillageTier } from "@/db/village";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const cle = (c: { case: readonly number[] }) => c.case.join(",");

describe("vocation", () => {
  test("read from the crest's animal, the boar has none", () => {
    expect(vocationDeBlason("horse")).toBe("ride");
    expect(vocationDeBlason("ermine")).toBe("calisthenics");
    expect(vocationDeBlason("boar")).toBeNull();
    expect(vocationDeBlason(undefined)).toBeNull();
  });

  test("a dev link names a practice in either language", () => {
    expect(vocationDeBlason(animalDeVocation("course"))).toBe("run");
    expect(vocationDeBlason(animalDeVocation("callisthenie"))).toBe("calisthenics");
    expect(animalDeVocation("nope")).toBeUndefined();
  });

  test("two vocations give two districts, the same cells", () => {
    const a = construire({ palier: 12, graine: 0, vocation: "run" });
    const b = construire({ palier: 12, graine: 0, vocation: "yoga" });
    expect(a.map(cle)).toEqual(b.map(cle));
    expect(a.map((c) => c.taille)).toEqual(b.map((c) => c.taille));
    expect(a.map((c) => c.ancre)).not.toEqual(b.map((c) => c.ancre));
    expect(a.filter((c) => c.ancre === "watchtower").length).toBeGreaterThan(3);
  });

  test("a vocation never takes a built piece away, at any tier", () => {
    for (const t of [1, 4, 8, 12] as VillageTier[])
      for (const v of [null, ...PRACTICES])
        expect(construire({ palier: t, graine: 0, vocation: v }).map(cle)).toEqual(
          construire({ palier: t, graine: 0 }).map(cle),
        );
  });

  test("each vocation draws its own set: grounds, two things, an emblem", () => {
    const empreinte = (v: (typeof PRACTICES)[number]) =>
      JSON.stringify([solDe(v), chosesDe(v).map((c) => c.dessin), EMBLEMES[v]]);
    expect(new Set(PRACTICES.map(empreinte)).size).toBe(PRACTICES.length);
    expect(empreinte("run")).toBe(empreinte("run"));
  });

  test("a vocation that changes keeps a set of the same size in the same place", () => {
    const pieds = chosesDe("run").map((c) => c.pied);
    for (const v of PRACTICES) {
      expect(chosesDe(v).map((c) => c.pied)).toEqual(pieds);
      expect(solDe(v).formes.terre).toBeTruthy();
      expect(EMBLEMES[v]).toMatch(/^M/);
      for (const c of chosesDe(v))
        expect(MATIERES.map((m) => c.dessin[m] ?? "").join("").length).toBeGreaterThan(200);
    }
  });
});

describe("the vocation's trade on the square", () => {
  const carte = () => {
    const { visible, montres } = etatCarte(12, true);
    return { visible, montres };
  };
  test("same headcount, same cells, more of the trade, none without one", () => {
    const sans = placerHabitants(12, carte(), 20001);
    const avec = placerHabitants(12, carte(), 20001, "watcher");
    expect(avec.map((g) => g.cellule.join())).toEqual(sans.map((g) => g.cellule.join()));
    const n = (xs: readonly { role: string }[]) => xs.filter((g) => g.role === "watcher").length;
    expect(n(avec)).toBeGreaterThanOrEqual(n(sans));
    expect(placerHabitants(12, carte(), 20001)).toEqual(sans);
  });
});
