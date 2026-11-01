// FIN-MAG tour 1: the reveal v2, instant by instant (squash, silhouette, hit-stop, overshoot,
// settle), the ring on the real footprint, the story line from the locales, reduced motion, rest.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render, screen } from "@testing-library/react-native";
import i18next from "i18next";
import { processColor } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import { CROISSANCE_CAMERA_MS, ecranXY, stadeReel } from "@/components/village/iso/carteDemo";
import { CHANTIER_MS } from "@/components/village/iso/chantier";
import { PARTICULES } from "@/components/village/iso/effets";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { emplacements } from "@/components/village/iso/isoLayout";
import {
  ANTICIPATION_MS,
  ARRET_MS,
  anneauChemin,
  anneauOnde,
  coinsEmprise,
  DEPASSEMENT,
  IMPACT_MS,
  LEGENDE_DEBUT_MS,
  LEGENDE_MS,
  LEVEE_PX,
  NOUVEAU_MS,
  PORTEE_DP,
  POSE_MS,
  poseAncien,
  poseNouveau,
  poussiereChemin,
  poussiereOnde,
  REVELATION_MS,
  SILHOUETTE_MS,
  TASSEMENT,
} from "@/components/village/iso/revelation";
import { buildingStage } from "@/constants/buildingLevels";
import { rawColors } from "@/constants/rawColors";
import { buildingCodes } from "@/db/schema";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
// "mock" prefix: jest lets the factory read it.
const mockReduit = { v: false };
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit.v }));

configure({ defaultIncludeHiddenElements: true });
jest.setTimeout(20_000);

const buildings = buildingCodes.map((code) => ({ code, level: 4 }));
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

describe("the sequence, instant by instant", () => {
  it("the timeline adds up: 120 squash, 120 silhouette, 80 hit-stop, then the 250 ms settle", () => {
    expect([ANTICIPATION_MS, SILHOUETTE_MS, ARRET_MS, POSE_MS]).toEqual([120, 120, 80, 250]);
    expect(IMPACT_MS).toBe(240);
    expect(NOUVEAU_MS).toBe(320);
    expect(REVELATION_MS).toBe(570);
    expect([TASSEMENT, LEVEE_PX, DEPASSEMENT]).toEqual([0.96, 6, 1.06]);
  });

  it("the old stage squashes 4 % and lifts 6 px, holds through the stop, and is gone when the new one lands", () => {
    expect(poseAncien(0).echelle).toBe(1);
    const mi = poseAncien(ANTICIPATION_MS / 2);
    expect(mi.echelle).toBeGreaterThan(TASSEMENT);
    expect(mi.echelle).toBeLessThan(1);
    expect(poseAncien(ANTICIPATION_MS)).toEqual({ echelle: TASSEMENT, y: -LEVEE_PX });
    // Silhouette and hit-stop: nothing moves.
    expect(poseAncien(IMPACT_MS)).toEqual(poseAncien(NOUVEAU_MS - 1));
    expect(poseAncien(NOUVEAU_MS).echelle).toBe(0);
  });

  it("the new stage is absent until the stop ends, lands 6 % too big, and settles in 250 ms", () => {
    expect(poseNouveau(0).echelle).toBe(0);
    expect(poseNouveau(NOUVEAU_MS - 1).echelle).toBe(0);
    expect(poseNouveau(NOUVEAU_MS)).toEqual({ echelle: DEPASSEMENT, y: -LEVEE_PX });
    let avant = DEPASSEMENT;
    for (let ms = 1; ms <= POSE_MS; ms += 25) {
      const e = poseNouveau(NOUVEAU_MS + ms).echelle;
      expect(e).toBeLessThanOrEqual(avant);
      avant = e;
    }
    expect(poseNouveau(NOUVEAU_MS + POSE_MS).echelle).toBe(1);
    expect(poseNouveau(NOUVEAU_MS + POSE_MS).y).toBeCloseTo(0);
    expect(poseNouveau(1000).echelle).toBe(1);
  });

  it("the ring and the dust leave at the impact and are gone at the end; the burst is 8 flecks at most", () => {
    expect(anneauOnde(IMPACT_MS - 1).opacite).toBe(0);
    expect(anneauOnde(IMPACT_MS).opacite).toBeGreaterThan(0.8);
    expect(poussiereOnde(IMPACT_MS - 1).opacite).toBe(0);
    expect(poussiereOnde(IMPACT_MS).opacite).toBeGreaterThan(0.8);
    expect(poussiereOnde(1000).opacite).toBe(0);
    expect(PARTICULES.length).toBeLessThanOrEqual(8);
  });
});

describe("the ring follows the real footprint", () => {
  it("every building's corners are the footprint's four corners on the ground, a 2:1 diamond for a square one", () => {
    for (const code of buildingCodes) {
      const coins = coinsEmprise(code);
      const { coin, emprise } = emplacements[code];
      expect(coins).toHaveLength(4);
      // The back corner and the front corner are the footprint's own, from its centre.
      const [bx, by] = ecranXY(coin);
      const [fx, fy] = ecranXY([coin[0] + emprise[0], coin[1] + emprise[1]]);
      expect(coins[2]?.[0]).toBeCloseTo(fx - (bx + fx) / 2);
      expect(coins[2]?.[1]).toBeCloseTo(fy - (by + fy) / 2);
      const demi = Math.max(...coins.map((c) => Math.abs(c[0])));
      const haut = Math.max(...coins.map((c) => Math.abs(c[1])));
      expect(haut).toBeLessThanOrEqual(demi / 2 + 1e-6);
      expect(emprise[0] === emprise[1] ? Math.abs(haut - demi / 2) : 0).toBeLessThan(1e-6);
    }
  });

  it("starts as the footprint and grows to the reach, keeping its shape (a diamond, not an ellipse)", () => {
    const coins = coinsEmprise("forge");
    const nombres = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const debut = nombres(anneauChemin(coins, 0, PORTEE_DP));
    coins.forEach((c, i) => {
      expect(debut[2 * i]).toBeCloseTo(PORTEE_DP + c[0]);
      expect(debut[2 * i + 1]).toBeCloseTo(PORTEE_DP / 2 + c[1]);
    });
    const d = anneauChemin(coins, 0.5, PORTEE_DP);
    expect(d.match(/[ML]/g)).toHaveLength(4);
    expect(d.endsWith("Z")).toBe(true);
    const fin = nombres(anneauChemin(coins, 1, PORTEE_DP - 9));
    const xs = [0, 1, 2, 3].map((i) => fin[2 * i] ?? 0);
    expect(Math.max(...xs.map((x) => Math.abs(x - PORTEE_DP)))).toBeCloseTo(PORTEE_DP - 9);
    // Four puffs of dust, one at each corner.
    expect(poussiereChemin(coins, 0.5).match(/M/g)).toHaveLength(4);
  });
});

describe("the story line comes from the locales", () => {
  const lignes = (arbre: typeof en) =>
    arbre.village.iso.legende as Record<string, Record<string, string>>;

  it.each([
    ["en", en],
    ["fr", fr],
  ])("%s: one sentence per building and stage, no dash, no 'not X but Y'", (_, arbre) => {
    const legende = lignes(arbre);
    for (const code of buildingCodes) {
      for (const stade of ["rough", "solid", "grand"]) {
        const phrase = legende[code]?.[stade];
        expect(typeof phrase).toBe("string");
        expect(phrase).not.toMatch(/[–—]|--/);
        expect(phrase).not.toMatch(/\bvous\b|\bnon pas\b|\bnot just\b|\brather than\b/i);
        expect((phrase ?? "").length).toBeLessThanOrEqual(80);
      }
    }
    expect(Object.keys(legende).sort()).toEqual([...buildingCodes].sort());
  });

  it("the forge's last stage says it burns all night", () => {
    expect(lignes(en).forge?.grand).toBe("The forge hasn't gone out at night in months.");
  });
});

/** Renders a growth of the tent (a stage change after a site) and returns the ms since the new stage began. */
async function jouer(reduit: boolean) {
  mockReduit.v = reduit;
  jest.useFakeTimers();
  await render(
    <GestureHandlerRootView>
      <IsoVillage
        tier={12}
        buildings={buildings}
        width={390}
        height={390}
        croissance={{ cle: `s${reduit}`, items: [{ code: "tent", oldLevel: 2 }] }}
      />
    </GestureHandlerRootView>,
  );
}

// In steps: a timer set by a commit only exists once the commit is done.
const avance = async (ms: number) => {
  for (let fait = 0; fait < ms; fait += 10)
    await act(() => jest.advanceTimersByTime(Math.min(10, ms - fait)));
};
const style = (id: string) =>
  Object.assign({}, ...(getAnimatedStyle(screen.getByTestId(id) as never).transform ?? [])) as {
    scale: number;
    translateY: number;
  };

afterEach(() => {
  jest.useRealTimers();
  mockReduit.v = false;
});

describe("the reveal, rendered", () => {
  it("draws the ring and the dust on the ground layer, before (under) every object", async () => {
    await jouer(false);
    await avance(CHANTIER_MS + 20);
    const ordre: string[] = [];
    const marche = (n: { props?: { testID?: string }; children?: unknown } | string | null) => {
      if (!n || typeof n === "string") return;
      if (n.props?.testID) ordre.push(n.props.testID);
      for (const e of (n.children as never[] | null) ?? []) marche(e);
    };
    const json = screen.toJSON() as never;
    for (const n of Array.isArray(json) ? json : [json]) marche(n);
    const onde = ordre.indexOf("iso-revelation-onde");
    const batiment = ordre.findIndex((id) => id.startsWith("iso-croissance-nouveau-"));
    expect(onde).toBeGreaterThanOrEqual(0);
    expect(batiment).toBeGreaterThan(onde);
    expect(ordre.indexOf("iso-revelation-poussiere")).toBeLessThan(batiment);
  });

  it("plays the sequence: squash, warm silhouette of the coming stage, stop with the ring out, new stage 6 % big, then still", async () => {
    await jouer(false);
    await avance(CHANTIER_MS + 20);
    expect(screen.queryAllByTestId("iso-revelation-onde")).toHaveLength(1);
    // The layer is mounted at its start: the old stage still whole, the new one and its silhouette not there.
    expect(screen.queryAllByTestId("iso-croissance-nouveau-tent")).toHaveLength(1);
    expect(style("iso-croissance-nouveau-tent").scale).toBe(0);
    expect(style("iso-croissance-silhouette-tent").scale).toBe(0);
    expect(style("iso-croissance-ancien-tent").scale).toBeLessThanOrEqual(1);
    expect(style("iso-croissance-ancien-tent").scale).toBeGreaterThan(TASSEMENT - 0.01);
    // anim-31: once gathered, the old stage gives way to a flat ochre shape of the new one, squashed and lifted.
    await avance(ANTICIPATION_MS);
    expect(style("iso-croissance-ancien-tent").scale).toBe(0);
    const tasse = style("iso-croissance-silhouette-tent");
    expect(tasse.scale).toBeCloseTo(TASSEMENT, 1);
    expect(tasse.translateY).toBeCloseTo(-LEVEE_PX, 0);
    const image = screen.getByTestId("iso-croissance-silhouette-image-tent");
    expect(image.props.tintColor).toBe(processColor(rawColors.isoSilhouette));
    expect(rawColors.isoSilhouette).toBe("#C9A060");
    // anim-30: the stop, the silhouette holds and nothing of the new stage shows yet.
    await avance(SILHOUETTE_MS + ARRET_MS / 2 - 20);
    expect(style("iso-croissance-silhouette-tent").scale).toBeCloseTo(TASSEMENT, 1);
    expect(style("iso-croissance-nouveau-tent").scale).toBe(0);
    // The new stage lands too big, then settles; the silhouette is gone.
    await avance(ARRET_MS / 2 + 30);
    expect(style("iso-croissance-silhouette-tent").scale).toBe(0);
    expect(style("iso-croissance-nouveau-tent").scale).toBeGreaterThan(1.02);
    await avance(POSE_MS + 40);
    expect(style("iso-croissance-nouveau-tent").scale).toBeCloseTo(1, 2);
    expect(style("iso-croissance-nouveau-tent").translateY).toBeCloseTo(0, 1);
  });

  it("the story line shows at its time for 1.5 s, from the stage the building reached", async () => {
    await jouer(false);
    await avance(CHANTIER_MS + 20);
    expect(screen.queryAllByTestId("iso-legende-revelation")).toHaveLength(0);
    await avance(LEGENDE_DEBUT_MS);
    const attendu = i18next.t(`village.iso.legende.tent.${stadeReel("tent", buildingStage(4))}`);
    expect(attendu).not.toMatch(/^village\./);
    expect(screen.getByTestId("iso-legende-revelation")).toHaveTextContent(attendu);
    await avance(LEGENDE_MS - 100);
    expect(screen.queryAllByTestId("iso-legende-revelation")).toHaveLength(1);
    await avance(200);
    expect(screen.queryAllByTestId("iso-legende-revelation")).toHaveLength(0);
  });

  it("reduced motion keeps no sequence at all: the new stage is the map's own, no layer, no ring, no line", async () => {
    await jouer(true);
    await avance(CROISSANCE_CAMERA_MS + CHANTIER_MS + LEGENDE_DEBUT_MS + 100);
    expect(screen.queryAllByTestId(/^iso-(croissance|revelation)-/)).toHaveLength(0);
  });

  it("nothing at rest: before a growth and after it, no layer, ring, dust or line", async () => {
    mockReduit.v = false;
    jest.useFakeTimers();
    await render(
      <GestureHandlerRootView>
        <IsoVillage tier={12} buildings={buildings} width={390} height={390} />
      </GestureHandlerRootView>,
    );
    await avance(3000);
    expect(screen.queryAllByTestId(/^iso-(croissance|revelation)-/)).toHaveLength(0);
  });

  it("after the whole moment (2.4 s) the layer, the ring and the line are all gone", async () => {
    await jouer(false);
    await avance(CHANTIER_MS + LEGENDE_DEBUT_MS + LEGENDE_MS + 100);
    expect(screen.queryAllByTestId(/^iso-revelation-/)).toHaveLength(0);
  });
});

describe("passing the animation", () => {
  it("a touch during the site skips the scene: the story line never shows", async () => {
    await jouer(false);
    await avance(CROISSANCE_CAMERA_MS + 100);
    await act(() => {
      const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
      tap.begin({ x: 5, y: 5 });
      tap.activate({ x: 5, y: 5 });
      tap.end({ x: 5, y: 5 });
      jest.advanceTimersByTime(50);
    });
    await avance(LEGENDE_DEBUT_MS + 200);
    expect(screen.queryAllByTestId("iso-legende-revelation")).toHaveLength(0);
  });

  it("the line is a polite live region with a status role", async () => {
    await jouer(false);
    await avance(CHANTIER_MS + LEGENDE_DEBUT_MS + 50);
    const l = screen.getByTestId("iso-legende-revelation");
    expect(l.props.accessibilityLiveRegion).toBe("polite");
    expect(l.props.role).toBe("status");
  });
});
