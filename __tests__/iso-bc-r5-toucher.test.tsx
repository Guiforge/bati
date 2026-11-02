// Loupe BC, criterion 13 (untouchable): the corner's painted ground (its plots and cottages are baked into
// the ground chunks, so they have no node of their own), the forest, the undergrowth, the fields, the props
// and the shadows and veil laid over them are never a tap target. The building tap reads the buildings'
// sprite masks (tapBatiment.ts), so a node that takes no touch cannot steal one.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AlentoursContext, alentoursDe } from "@/components/village/iso/alentours";
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

// Weight, not a hang: each test mounts the whole map (every building, tier 12); alone it takes seconds, under a parallel full run tens of seconds.
jest.setTimeout(120_000);

const FAMILLES =
  /^iso-(terrain-peint|terrain-tuile|foret-peinte|sousbois|champ-|accessoire-|ombres-foret|voile-alentours)/;
const TOUCHES = [
  "onPress",
  "onPressIn",
  "onLongPress",
  "onTouchStart",
  "onStartShouldSetResponder",
  "onResponderGrant",
] as const;

it.each(["jour", "nuit"] as const)(
  "the corner's painted layers take no touch (%s)",
  async (lumiere) => {
    const buildings = buildingCodes.map((code) => ({ code, level: 30 }));
    await render(
      <AlentoursContext.Provider value={alentoursDe("tout")}>
        <GestureHandlerRootView>
          <IsoVillage tier={12} buildings={buildings} width={411} height={520} lumiere={lumiere} />
        </GestureHandlerRootView>
      </AlentoursContext.Provider>,
    );
    const peints = screen.queryAllByTestId(FAMILLES);
    for (const id of ["iso-terrain-tuile", "iso-foret-peinte", "iso-sousbois", "iso-accessoire-"])
      expect(peints.filter((n) => String(n.props.testID).startsWith(id)).length).toBeGreaterThan(0);
    const touchables = peints.filter(
      (n) => n.props.pointerEvents !== "none" || TOUCHES.some((h) => n.props[h] !== undefined),
    );
    expect(touchables.map((n) => n.props.testID)).toEqual([]);
  },
);
