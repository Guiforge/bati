// T37: the reveal's length, what it sets off, and the delay from the tap to the new stage (point 1,
// measured here; the emulator measure is qa's).
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CROISSANCE_CAMERA_MS } from "@/components/village/iso/carteDemo";
import { CHANTIER_MS } from "@/components/village/iso/chantier";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import {
  ANTICIPATION_MS,
  ARRIVEE_MAX_MS,
  allumeOnde,
  anneauOnde,
  ECHELLE_BITMAP,
  eclatDe,
  flareOnde,
  IMPACT_MS,
  LEGENDE_DEBUT_MS,
  LEGENDE_MS,
  LUIT_MS,
  NB_POINTS,
  NOEUDS_ONDE,
  NOUVEAU_MS,
  ONDE_MS,
  planOnde,
  pointsChemin,
  REVELATION_MS,
  retardOnde,
  revelation,
} from "@/components/village/iso/revelation";
import { buildingCodes } from "@/db/schema";

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
jest.setTimeout(15_000);

const buildings = buildingCodes.map((code) => ({ code, level: 4 }));

describe("the reveal", () => {
  it("the layer lasts one second at most, the whole moment 2.4 s with its story line", () => {
    expect(ANTICIPATION_MS).toBeGreaterThan(0);
    expect(REVELATION_MS).toBeLessThanOrEqual(ONDE_MS);
    expect(LEGENDE_DEBUT_MS + LEGENDE_MS).toBe(2400);
    expect(LEGENDE_MS).toBe(1500);
  });

  it("vibrates and strikes only where the settings allow", () => {
    const vibrer = jest.fn();
    const marteau = jest.fn();
    revelation({ hapticsEnabled: false, soundEnabled: false }, { vibrer, marteau });
    expect(vibrer).not.toHaveBeenCalled();
    expect(marteau).not.toHaveBeenCalled();
    revelation({ hapticsEnabled: true, soundEnabled: false }, { vibrer, marteau });
    expect([vibrer.mock.calls.length, marteau.mock.calls.length]).toEqual([1, 0]);
    revelation({ hapticsEnabled: false, soundEnabled: true }, { vibrer, marteau });
    expect([vibrer.mock.calls.length, marteau.mock.calls.length]).toEqual([1, 1]);
    // No sound file yet (T32): sounds on and no hammer is fine.
    expect(() =>
      revelation({ hapticsEnabled: true, soundEnabled: true }, { vibrer }),
    ).not.toThrow();
  });
});

/** ms from the tap (the growth set) to the first frame the new stage shows, in 10 ms steps; null if never. */
async function delaiJusquAuNouveau(oldLevel: number, reduit: boolean, onRevelation: () => void) {
  mockReduit.v = reduit;
  jest.useFakeTimers();
  try {
    await render(
      <GestureHandlerRootView>
        <IsoVillage
          tier={12}
          buildings={buildings}
          width={390}
          height={390}
          croissance={{ cle: `m${oldLevel}${reduit}`, items: [{ code: "tent", oldLevel }] }}
          onRevelation={onRevelation}
        />
      </GestureHandlerRootView>,
    );
    for (let ms = 0; ms <= 3000; ms += 10) {
      // Reduced motion lays no growth layer: the new stage is the map's own sprite from the start.
      if (reduit || screen.queryAllByTestId(/^iso-croissance-nouveau-(?!image)/).length > 0) {
        return ms;
      }
      await act(() => jest.advanceTimersByTime(10));
    }
    return null;
  } finally {
    jest.useRealTimers();
    mockReduit.v = false;
  }
}

describe("the delay from the tap to the new stage (point 1)", () => {
  it("reduced motion: at once, and the reveal is announced once at the tap", async () => {
    const on = jest.fn();
    expect(await delaiJusquAuNouveau(2, true, on)).toBe(0);
    expect(on).toHaveBeenCalledTimes(1);
  });

  it("rank rising inside a stage: the camera's 0.5 s only", async () => {
    const on = jest.fn();
    expect(await delaiJusquAuNouveau(3, false, on)).toBe(CROISSANCE_CAMERA_MS);
  });

  it("new stage after a site: the site works while the camera moves, so 1 s (the device adds about 0.9 s)", async () => {
    const on = jest.fn();
    const ms = await delaiJusquAuNouveau(2, false, on);
    expect(ms).toBe(CHANTIER_MS);
    expect(on).toHaveBeenCalledTimes(1);
  });
});

describe("the burst and the golden wave (T41)", () => {
  it("both end inside the reveal's second, and every light is out again at the end", () => {
    expect(ONDE_MS).toBeLessThanOrEqual(1000);
    expect(ARRIVEE_MAX_MS + LUIT_MS).toBeLessThan(ONDE_MS);
    for (const retard of [0, 200, ARRIVEE_MAX_MS]) {
      expect(allumeOnde(retard - 1, retard)).toBe(0);
      expect(allumeOnde(retard, retard)).toBe(1);
      expect(allumeOnde(ONDE_MS, retard)).toBe(0);
      expect(flareOnde(ONDE_MS, retard)).toBe(0);
    }
    expect(anneauOnde(0).opacite).toBe(0);
    expect(anneauOnde(IMPACT_MS).opacite).toBeGreaterThan(0.8);
    expect(anneauOnde(ONDE_MS).opacite).toBe(0);
    // The points: none before the new stage, none at the end, 2 to 4 dp wide while they live.
    expect(pointsChemin(NOUVEAU_MS - 1, 0) + pointsChemin(NOUVEAU_MS - 1, 1)).toBe("");
    expect(pointsChemin(ONDE_MS, 0) + pointsChemin(ONDE_MS, 1)).toBe("");
    const vivants = pointsChemin(NOUVEAU_MS + 200, 0) + pointsChemin(NOUVEAU_MS + 200, 1);
    expect(vivants.match(/M/g)?.length).toBeGreaterThanOrEqual(4);
    expect(NB_POINTS).toBeGreaterThanOrEqual(8);
    expect(NB_POINTS).toBeLessThanOrEqual(12);
  });

  it("the burst belongs to the trade: runes, embers, motes, gold by default, never violet", () => {
    expect(eclatDe("wizard_tower").genre).toBe("runes");
    expect(eclatDe("forge").genre).toBe("braise");
    expect(eclatDe("dragon_lair").genre).toBe("braise");
    expect(eclatDe("druid_grove").genre).toBe("lucioles");
    expect(eclatDe("tent")).toEqual({ genre: "etincelles", tons: ["resourceGold", "isoEclat"] });
    for (const code of buildingCodes) expect(eclatDe(code).tons).not.toContain("isoRune");
  });

  it("the wave reaches the near ones first, lights at most NOEUDS_ONDE windows, skips the plain stage", () => {
    const b = (code: (typeof buildingCodes)[number], x: number, ameliore = true) => ({
      code,
      centre: [x, 0] as const,
      ameliore,
      fenetres: true,
    });
    const plan = planOnde(
      [0, 0],
      [
        b("tent", 300),
        b("well", 100),
        b("farm", 500),
        b("forge", 50),
        b("windmill", 200),
        b("quarry", 20, false),
        b("barn", 650),
      ],
    );
    expect([...plan.allume]).toEqual(["forge", "well", "windmill", "tent"]);
    expect(plan.allume.size).toBe(NOEUDS_ONDE);
    expect(plan.retards.has("quarry")).toBe(false);
    expect(plan.retards.get("forge")).toBeLessThan(plan.retards.get("farm") ?? 0);
    expect(retardOnde(10_000)).toBe(ARRIVEE_MAX_MS);
    // The front leaves at the impact, and a diamond's distance is |dx| + 2|dy|.
    expect(retardOnde(0)).toBe(IMPACT_MS);
    const diag = planOnde(
      [0, 0],
      [{ code: "tent", centre: [100, 100], ameliore: true, fenetres: true }],
    );
    expect(diag.retards.get("tent")).toBe(retardOnde(300));
  });
});

describe("the ring's bitmap (qa-audit2)", () => {
  it("is drawn well under its size: Svg redraws a software bitmap every frame", () => {
    // 1400 x 700 dp at 2.625 px/dp was 27 MB per frame; under 0.5 it is a quarter or less.
    expect(ECHELLE_BITMAP).toBeLessThanOrEqual(0.5);
    expect(ECHELLE_BITMAP).toBeGreaterThan(0.2);
  });
});
