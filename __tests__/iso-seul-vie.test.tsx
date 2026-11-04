// The lone-building view (bati://dev-iso?bld=...) has no walkers to plan a wave for, so nothing ever
// started one and the motion files, the windows and the effects never played there, day or night
// (device, 2026-11-04: 0 to 8 pixels changing between frames). The lone building now stands in a
// standing wave: its night windows are lit and animated.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { IsoVillage } from "@/components/village/iso/IsoVillage";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });

it("a lone building at night has its windows lit and animated, with no wave to plan", async () => {
  jest.useFakeTimers();
  try {
    await render(
      <GestureHandlerRootView>
        <IsoVillage
          tier={12}
          seul="armory"
          buildings={[{ code: "armory", level: 5 }]}
          width={390}
          height={600}
          lumiere="nuit"
        />
      </GestureHandlerRootView>,
    );
    await act(() => jest.advanceTimersByTime(1500));
    expect(screen.queryAllByTestId("iso-fenetres-armory").length).toBeGreaterThan(0);
  } finally {
    jest.useRealTimers();
  }
});
