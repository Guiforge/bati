// The lone-building view (bati://dev-iso?bld=...) moves at night as it does by day: the building
// joins the wave and its animated nodes mount. QA's night stills of the campfire were identical
// (the capture, not the code, was to blame: this pins the code path).
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BatimentSeul } from "@/components/village/iso/BatimentSeul";
import { etatBldDe } from "@/components/village/iso/etatBld";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });
jest.setTimeout(60_000);

async function monter(lumiere: "jour" | "nuit") {
  const etat = etatBldDe({ bld: "campfire", rang: "10", base: "10" });
  if (!etat) throw new Error("no state");
  jest.useFakeTimers();
  await render(
    <GestureHandlerRootView>
      <BatimentSeul etat={etat} lumiere={lumiere} />
    </GestureHandlerRootView>,
  );
  await fireEvent(screen.getByTestId("iso-bld-aire"), "layout", {
    nativeEvent: { layout: { width: 390, height: 600 } },
  });
  await act(() => jest.advanceTimersByTime(1500));
}

afterEach(() => jest.useRealTimers());

describe("the lone campfire's motion", () => {
  for (const lumiere of ["jour", "nuit"] as const) {
    it(`${lumiere}: animated lights or smoke mount in the wave`, async () => {
      await monter(lumiere);
      const noeuds = screen.queryAllByTestId(
        /^iso-(flamme|fumee|fenetres|braise|poussiere)-campfire/,
      );
      expect(noeuds.length).toBeGreaterThan(0);
      // The night's own lights breathe on the clock too: the fire's halo is an animated node.
      if (lumiere === "nuit")
        expect(screen.queryAllByTestId(/^iso-flamme-campfire/).length).toBeGreaterThan(0);
    });
  }
});
