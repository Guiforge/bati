import { etatAvec } from "@/components/village/iso/carteDemo";
import {
  ENVELOPPE_MS,
  GESTE_DE,
  geste,
  POSE_REPOS,
  type Pose,
  poseA,
} from "@/components/village/iso/gestes";
import {
  type Carte,
  planifierVague,
  ROLES,
  type Segment,
} from "@/components/village/iso/marcheurs";
import { buildingCodes } from "@/db/schema";

const ampleur = (p: Pose) => Math.abs(p.leve) + Math.abs(p.penche) + 20 * Math.abs(p.ecrase);
const DUREE = 3000;

describe("work gestures (T03, criterion 8)", () => {
  test("at least three roles work with gestures of their own", () => {
    expect(new Set(ROLES.map((r) => GESTE_DE[r])).size).toBeGreaterThanOrEqual(3);
  });

  test("T27: the quick gestures are slowed (smith 700 ms a loop, minstrel 1000, champion 750)", () => {
    // Far from the envelope, a loop later the pose is the same: the period is what the role plays.
    for (const [role, periode] of [
      ["smith", 700],
      ["minstrel", 1000],
      ["champion", 750],
    ] as const) {
      expect(geste(role, 1000 + periode, DUREE)).toEqual(geste(role, 1000, DUREE));
      expect(geste(role, 1000 + periode / 4, DUREE)).not.toEqual(geste(role, 1000, DUREE));
    }
  });

  test.each(ROLES)(
    "%s: still at both ends of the stop, eased in and out, and moving in between",
    (role) => {
      expect(geste(role, 0, DUREE)).toEqual(POSE_REPOS);
      expect(geste(role, DUREE, DUREE)).toEqual(POSE_REPOS);
      // No jump into or out of the gesture: a few ms from either end it has barely started.
      expect(ampleur(geste(role, 5, DUREE))).toBeLessThan(1);
      expect(ampleur(geste(role, DUREE - 5, DUREE))).toBeLessThan(1);
      // Mid-stop it reads: several degrees or dp at its widest.
      let max = 0;
      for (let t = ENVELOPPE_MS; t < DUREE - ENVELOPPE_MS; t += 16)
        max = Math.max(max, ampleur(geste(role, t, DUREE)));
      expect(max).toBeGreaterThan(6);
    },
  );

  test("a gesture never lifts the feet off the ground by much nor folds the figure", () => {
    for (const role of ROLES)
      for (let t = 0; t <= DUREE; t += 7) {
        const p = geste(role, t, DUREE);
        expect(Math.abs(p.leve)).toBeLessThanOrEqual(8);
        expect(Math.abs(p.penche)).toBeLessThanOrEqual(30);
        expect(p.ecrase).toBeGreaterThanOrEqual(0);
        expect(p.ecrase).toBeLessThan(0.3);
      }
  });

  test("only a work stop gestures: not the head start, not a chat on the way, not a walk", () => {
    const segments: Segment[] = [
      { etat: "agir", de: [0, 0], vers: [0, 0], t0: 0, duree: 1000 },
      { etat: "marcher", de: [0, 0], vers: [1, 0], t0: 1000, duree: 600 },
      { etat: "agir", de: [1, 0], vers: [1, 0], t0: 1600, duree: 2500 },
      { etat: "marcher", de: [1, 0], vers: [2, 0], t0: 4100, duree: 600 },
      { etat: "agir", de: [2, 0], vers: [2, 0], t0: 4700, duree: 2000, travail: true },
    ];
    for (const t of [500, 1300, 2800, 4400])
      expect(poseA("smith", segments, t)).toEqual(POSE_REPOS);
    expect(poseA("smith", segments, 5500)).toEqual(geste("smith", 800, 2000));
    expect(ampleur(poseA("smith", segments, 5500))).toBeGreaterThan(0);
  });

  test("the wave marks every stop at a place it walked to, and only those", () => {
    const { visible, montres } = etatAvec(12, [...buildingCodes]);
    const carte: Carte = { visible, montres };
    let travaux = 0;
    for (let numero = 0; numero < 20; numero++)
      for (const m of planifierVague(carte, {}, 20000, numero).marcheurs)
        m.segments.forEach((s, i) => {
          if (!s.travail) return;
          travaux++;
          const avant = m.segments[i - 1];
          expect(s.etat).toBe("agir");
          expect(avant?.etat).toBe("marcher");
          expect(avant?.vers).toEqual(s.de);
          // The last walk of its route ends here: what follows is a new route or the end.
          expect(m.segments[0]?.travail).toBeUndefined();
        });
    expect(travaux).toBeGreaterThan(20);
  });
});
