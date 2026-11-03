// The village tab with every painted flag off (the default under jest): the map is the one of
// today, no building goes through the engine, whatever rank the hero has claimed.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { configure, render, screen } from "@testing-library/react-native";
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

test("flag off: the sprite is drawn by the map, the engine's body is absent", async () => {
  await render(
    <GestureHandlerRootView>
      <IsoVillage
        tier={12}
        buildings={[{ code: "campfire", level: 5 }]}
        width={390}
        height={390}
        niveauxReclames={{ campfire: 2 }}
        basesReclamees={{}}
      />
    </GestureHandlerRootView>,
  );
  expect(screen.getByTestId("iso-maquette-campfire")).toBeTruthy();
  expect(screen.queryByTestId("batiment-corps")).toBeNull();
});
