// The guard against a function called from the UI thread without "worklet" (L5-AUD): it compiles
// and passes every other test, then crashes on the phone. It spies the three hooks that run a
// worklet, renders the village and the dev screen, and walks every closure.
// RNGH mocks its native module and host detector; it must load before the screen does.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import DevIsoRoute from "@/app/dev-iso";
import { HAUTEUR, LARGEUR, stadeReel } from "@/components/village/iso/carteDemo";
import { perchoirDe } from "@/components/village/iso/corbeaux";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { buildingStage } from "@/constants/buildingLevels";
import { buildingCodes } from "@/db/schema";
import config from "@/tamagui.config";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
jest.mock("expo-router", () => ({
  useIsFocused: () => true,
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/dev-iso",
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

// Every function handed to one of the three hooks, in render order.
const mockVus: unknown[] = [];
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  const espion =
    <A extends unknown[], R>(f: (...a: A) => R) =>
    (...args: A) => {
      for (const a of args) if (typeof a === "function") mockVus.push(a);
      return f(...args);
    };
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    useAnimatedStyle: espion(actual.useAnimatedStyle),
    useAnimatedReaction: espion(actual.useAnimatedReaction),
    useDerivedValue: espion(actual.useDerivedValue),
  };
});

/** `scheduleOnRN` itself, and the plain functions it runs on the JS thread, captured by a reaction. */
const SCHEDULEES = new Set([
  "scheduleOnRN",
  "lancer",
  "poser",
  "poserDetail",
  "relire",
  "effaroucher",
  "revenir",
]);

type Worklet = ((...a: never[]) => unknown) & {
  __workletHash?: number;
  __closure?: Record<string, unknown>;
};

/** Every captured function, however deep, that is neither a worklet nor an allowed scheduleOnRN target. */
function fautifs(racine: Worklet): string[] {
  const vus = new Set<unknown>();
  const mauvais: string[] = [];
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one recursive walk, kept in one place
  const marche = (v: unknown, chemin: string, prof: number) => {
    if (v === null || (typeof v !== "object" && typeof v !== "function") || prof > 8) return;
    if (vus.has(v)) return;
    vus.add(v);
    if (typeof v === "function") {
      const f = v as Worklet;
      // Istanbul's counter (`cov_…`), captured by the closure under `--coverage`: not app code.
      if (f.name.startsWith("cov_")) return;
      if (f.__workletHash === undefined) {
        if (!SCHEDULEES.has(f.name)) mauvais.push(`${chemin} (${f.name || "anonymous"})`);
        return;
      }
      for (const [k, c] of Object.entries(f.__closure ?? {})) marche(c, `${chemin}.${k}`, prof + 1);
      return;
    }
    // A shared value: reading it in render would warn, and it holds no function to check.
    if ("_isReanimatedSharedValue" in v) return;
    for (const [k, c] of Object.entries(v)) marche(c, `${chemin}.${k}`, prof + 1);
  };
  for (const [k, c] of Object.entries(racine.__closure ?? {})) marche(c, k, 0);
  return mauvais;
}

const defauts = (): string[] => {
  expect(mockVus.length).toBeGreaterThan(10);
  const racines = mockVus as Worklet[];
  // Each hook argument is itself a worklet.
  const sans = racines
    .filter((f) => f.__workletHash === undefined)
    .map((f) => f.name || "anonymous");
  const mauvais = racines.flatMap((f, i) => fautifs(f).map((m) => `#${i} ${m}`));
  return [...sans, ...mauvais];
};

configure({ defaultIncludeHiddenElements: true });

describe('worklets: nothing called from the UI thread lacks "worklet"', () => {
  beforeEach(() => {
    mockVus.length = 0;
  });

  test("IsoVillage, tier 12, everything standing, with a wave", async () => {
    jest.useFakeTimers();
    try {
      await render(
        <GestureHandlerRootView>
          <IsoVillage
            tier={12}
            buildings={buildingCodes.map((code) => ({ code, level: 5 }))}
            width={390}
            height={390}
            lumiere="jour"
          />
        </GestureHandlerRootView>,
      );
      await act(() => jest.advanceTimersByTime(200));
      // A finger on the farm roof: the pan callbacks of the camera and the crow's flight (`Envol`) run through the guard too.
      const t = (
        Reanimated.getAnimatedStyle as unknown as (c: never) => {
          transform?: Record<string, number>[];
        }
      )(screen.getByTestId("iso-camera") as never);
      const v = Object.assign({}, ...(t.transform ?? [])) as Record<string, number>;
      const p = perchoirDe("farm", stadeReel("farm", buildingStage(5)));
      if (!p) throw new Error("no perch on the farm");
      await act(() => {
        createGestureController(getByGestureTestId("iso-geste-pan")).begin({
          x: (p.x - LARGEUR / 2) * (v.scale ?? 1) + 195 + (v.translateX ?? 0) + 4,
          y: (p.y - HAUTEUR / 2) * (v.scale ?? 1) + 195 + (v.translateY ?? 0),
        });
        jest.advanceTimersByTime(50);
      });
      expect(screen.queryAllByTestId("iso-corbeau-envol-farm")).toHaveLength(1);
      expect(defauts()).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  test("the dev screen", async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <GestureHandlerRootView>
          <TamaguiProvider config={config} defaultTheme="dark">
            <DevIsoRoute />
          </TamaguiProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>,
    );
    expect(defauts()).toEqual([]);
  });
});
