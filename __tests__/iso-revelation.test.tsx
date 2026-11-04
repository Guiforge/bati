// What a growth sets off (haptic, hammer, story line), when its layer is there after the tap, and
// the pulse of light that crosses the village once the moment is over (revelation.ts).
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import {
  ARRIVEE_MAX_MS,
  flareOnde,
  IMPACT_MS,
  LEGENDE_DEBUT_MS,
  LEGENDE_MS,
  LUIT_MS,
  ONDE_MS,
  planOnde,
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
  it("the pulse lasts one second at most, the story line follows the moment", () => {
    expect(ONDE_MS).toBeLessThanOrEqual(1000);
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

/** ms from the tap (the growth set) to the first frame the growth layer is there, in 10 ms steps; null if never. */
async function delaiJusquALaCouche(oldLevel: number, reduit: boolean, onRevelation: () => void) {
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
      if (screen.queryAllByTestId(/^iso-croissance-lueur-(?!image)/).length > 0) {
        // The moment ends and the map announces the new stage once.
        await act(() => jest.advanceTimersByTime(1500));
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

describe("the growth layer after the tap", () => {
  it("reduced motion: no layer at all, the new stage is the map's own, announced once at the tap", async () => {
    const on = jest.fn();
    expect(await delaiJusquALaCouche(2, true, on)).toBeNull();
    expect(on).toHaveBeenCalledTimes(1);
  });

  it("a stage change and a rank both have their layer from the tap, announced once", async () => {
    for (const oldLevel of [2, 3]) {
      const on = jest.fn();
      expect(await delaiJusquALaCouche(oldLevel, false, on)).toBe(0);
      expect(on).toHaveBeenCalledTimes(1);
    }
  });
});

describe("the pulse of light (T41)", () => {
  it("it ends inside its second, and every fire is back to rest at the end", () => {
    expect(ONDE_MS).toBeLessThanOrEqual(1000);
    expect(ARRIVEE_MAX_MS + LUIT_MS).toBeLessThan(ONDE_MS);
    for (const retard of [0, 200, ARRIVEE_MAX_MS]) expect(flareOnde(ONDE_MS, retard)).toBe(0);
  });

  it("the pulse reaches the near ones first and skips the plain stage", () => {
    const b = (code: (typeof buildingCodes)[number], x: number, ameliore = true) => ({
      code,
      centre: [x, 0] as const,
      ameliore,
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
    expect(plan.retards.has("quarry")).toBe(false);
    expect(plan.retards.get("forge")).toBeLessThan(plan.retards.get("farm") ?? 0);
    expect(retardOnde(10_000)).toBe(ARRIVEE_MAX_MS);
    // The front leaves at the impact, and a diamond's distance is |dx| + 2|dy|.
    expect(retardOnde(0)).toBe(IMPACT_MS);
    const diag = planOnde([0, 0], [{ code: "tent", centre: [100, 100], ameliore: true }]);
    expect(diag.retards.get("tent")).toBe(retardOnde(300));
  });
});
