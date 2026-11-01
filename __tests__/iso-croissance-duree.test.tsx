// T38, constat 17 of the exit audit ("the demo growth is too short"): the scene's length, measured.
// Camera 0.5 s, site 1.5 s, cross-fade 1.5 s: over at 3 s, not before; and the demo's own pick
// (croissanceDemo) always has a site.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CROISSANCE_CAMERA_MS, CROISSANCE_MS } from "@/components/village/iso/carteDemo";
import { CHANTIER_MS } from "@/components/village/iso/chantier";
import { croissanceDemo } from "@/components/village/iso/croissanceDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });
jest.setTimeout(15_000);

const buildings = buildingCodes.map((code) => ({ code, level: 5 }));

describe("the growth scene's length", () => {
  it("the demo's pick has a site, so the scene lasts 2 s whole (T37)", async () => {
    const grown = croissanceDemo(buildings, 0);
    expect(grown).not.toBeNull();
    const [code, ancien] = (grown ?? "").split(":");
    const fin = jest.fn();
    jest.useFakeTimers();
    try {
      await render(
        <GestureHandlerRootView>
          <IsoVillage
            tier={12}
            buildings={buildings}
            width={390}
            height={390}
            croissance={{
              cle: grown ?? "",
              items: [{ code: code as (typeof buildingCodes)[number], oldLevel: Number(ancien) }],
            }}
            onCroissanceFinie={fin}
          />
        </GestureHandlerRootView>,
      );
      expect(CROISSANCE_MS + CHANTIER_MS - CROISSANCE_CAMERA_MS).toBe(2000);
      await act(() =>
        jest.advanceTimersByTime(CROISSANCE_MS + CHANTIER_MS - CROISSANCE_CAMERA_MS - 50),
      );
      expect(fin).not.toHaveBeenCalled();
      await act(() => jest.advanceTimersByTime(60));
      expect(fin).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
