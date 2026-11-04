// The growth moment rendered (IsoCroissance, moment.ts): the light under the bodies, the old stage
// until the swap, the new one popping, the dust at the footprint's corners, the story line from the
// locales, reduced motion, rest, and a skip.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, fireEvent, render, screen } from "@testing-library/react-native";
import i18next from "i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import { CROISSANCE_CAMERA_MS, ecranXY, stadeReel } from "@/components/village/iso/carteDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { emplacements } from "@/components/village/iso/isoLayout";
import { ECHANGE_MS, STADE_MS } from "@/components/village/iso/moment";
import { coinsEmprise, LEGENDE_DEBUT_MS, LEGENDE_MS } from "@/components/village/iso/revelation";
import { buildingStage } from "@/constants/buildingLevels";
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

describe("the footprint the dust stands on", () => {
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
  it("the light stands under the bodies in the depth order, the dust over them", async () => {
    await jouer(false);
    await avance(20);
    const ordre: string[] = [];
    const marche = (n: { props?: { testID?: string }; children?: unknown } | string | null) => {
      if (!n || typeof n === "string") return;
      if (n.props?.testID) ordre.push(n.props.testID);
      for (const e of (n.children as never[] | null) ?? []) marche(e);
    };
    const json = screen.toJSON() as never;
    for (const n of Array.isArray(json) ? json : [json]) marche(n);
    const rang = (motif: string) => ordre.findIndex((id) => id.startsWith(motif));
    expect(rang("iso-croissance-lueur-tent")).toBeGreaterThanOrEqual(0);
    expect(rang("iso-croissance-lueur-tent")).toBeLessThan(rang("iso-croissance-ancien-tent"));
    expect(rang("iso-croissance-ancien-tent")).toBeLessThan(rang("iso-croissance-nouveau-tent"));
    expect(rang("iso-croissance-nouveau-tent")).toBeLessThan(rang("iso-croissance-bouffee-tent"));
  });

  it("plays the moment from the tap: the old stage stands, swaps at 200 ms to the new one with its overshoot, then settles", async () => {
    await jouer(false);
    await avance(20);
    expect(style("iso-croissance-nouveau-tent").scale).toBe(0);
    expect(style("iso-croissance-ancien-tent").scale).toBe(1);
    expect(screen.queryAllByTestId("iso-croissance-lisere-nouveau-tent")).toHaveLength(1);
    // The camera is still gliding: the site waits as it is, the clock has not started.
    expect(screen.queryAllByTestId("iso-croissance-echafaudage-tent")).toHaveLength(1);
    await avance(CROISSANCE_CAMERA_MS - 20);
    expect(style("iso-croissance-ancien-tent").scale).toBe(1);
    // The new image has decoded (expo-image's load event): only then may the old stage give way.
    await act(() => {
      fireEvent(screen.getByTestId("iso-croissance-nouveau-image-tent"), "load", {
        nativeEvent: { source: { width: 1, height: 1, url: "" } },
      });
    });
    await avance(ECHANGE_MS + 20);
    expect(style("iso-croissance-ancien-tent").scale).toBe(0);
    expect(style("iso-croissance-nouveau-tent").scale).toBeGreaterThan(0.88);
    await avance(STADE_MS);
    expect(style("iso-croissance-nouveau-tent").scale).toBeCloseTo(1, 2);
  });

  it("never a frame without the building: the old stage stays while the new image has not decoded", async () => {
    await jouer(false);
    await avance(CROISSANCE_CAMERA_MS + ECHANGE_MS + 300);
    expect(style("iso-croissance-ancien-tent").scale).toBe(1);
  });

  it("dust at three corners of the footprint", async () => {
    await jouer(false);
    await avance(20);
    expect(screen.queryAllByTestId(/^iso-croissance-bouffee-image-tent-/)).toHaveLength(3);
  });

  it("the story line shows at its time for 1.5 s, from the stage the building reached", async () => {
    await jouer(false);
    await avance(CROISSANCE_CAMERA_MS + STADE_MS + 20);
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

  it("reduced motion keeps no moment at all: the new stage is the map's own, no layer, no line", async () => {
    await jouer(true);
    await avance(CROISSANCE_CAMERA_MS + STADE_MS + LEGENDE_DEBUT_MS + 100);
    expect(screen.queryAllByTestId(/^iso-(croissance|legende)-/)).toHaveLength(0);
  });

  it("nothing at rest: before a growth and after it, no layer or line", async () => {
    mockReduit.v = false;
    jest.useFakeTimers();
    await render(
      <GestureHandlerRootView>
        <IsoVillage tier={12} buildings={buildings} width={390} height={390} />
      </GestureHandlerRootView>,
    );
    await avance(3000);
    expect(screen.queryAllByTestId(/^iso-(croissance|legende)-/)).toHaveLength(0);
  });

  it("after the whole moment (2.4 s) the line is gone", async () => {
    await jouer(false);
    await avance(CROISSANCE_CAMERA_MS + STADE_MS + LEGENDE_DEBUT_MS + LEGENDE_MS + 100);
    expect(screen.queryAllByTestId(/^iso-legende-/)).toHaveLength(0);
  });
});

describe("passing the animation", () => {
  it("a touch during the moment skips it: the story line never shows", async () => {
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
    await avance(CROISSANCE_CAMERA_MS + STADE_MS + LEGENDE_DEBUT_MS + 50);
    const l = screen.getByTestId("iso-legende-revelation");
    expect(l.props.accessibilityLiveRegion).toBe("polite");
    expect(l.props.role).toBe("status");
  });
});
