// The atelier's one page: the dev-iso route itself, in a browser, so the atelier and the emulator
// read the same link (`?palier=&ambiance=&nu=1&fige=1...`) and draw with the same components.
import { Asset } from "expo-asset";
import { AccessibilityInfo, Image, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TamaguiProvider } from "tamagui";
import DevIsoRoute from "@/app/dev-iso";
import { TOILE_ACCESSOIRE } from "@/components/village/iso/alentours";
import { stadeVisuel } from "@/components/village/iso/carteDemo";
import type { SpriteIso } from "@/components/village/iso/isoSpec";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { PEINTS } from "@/components/village/iso/peints";
import { buildingCeiling } from "@/constants/buildingLevels";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import config from "@/tamagui.config";
import { scoperSvgIds } from "./scopeSvgIds";

// react-native-web's Image has no resolveAssetSource; the scene reads sprite sizes through it.
(Image as unknown as { resolveAssetSource: (m: number) => unknown }).resolveAssetSource = (m) => {
  const a = Asset.fromModule(m);
  return { uri: a.uri, width: a.width, height: a.height };
};

// react-native-web says a screen reader is always on, which keeps the village's animation clock off
// (horloge.ts). A phone without TalkBack says false: the atelier's `clip` and `check` need that clock.
AccessibilityInfo.isScreenReaderEnabled = () => Promise.resolve(false);

scoperSvgIds();

/** The first rank of each painted stage of a building, for the `sheet` command. */
(globalThis as unknown as Record<string, unknown>).__atelierStades = (code: BuildingCode) => {
  const plafond = buildingCeiling({ tier: buildingDefinitions[code].tier, code });
  const stades: { rang: number; stade: string }[] = [];
  for (let rang = 1; rang <= plafond; rang++) {
    const stade = stadeVisuel(code, rang);
    if (stades.at(-1)?.stade !== stade) stades.push({ rang, stade });
  }
  return stades;
};

/**
 * Anchor and canvas size of every building sprite, by the file name the browser loads: the mock-up
 * index and the painted stages. The `check` command matches a DOM image to its foot with it.
 */
const spritesBld: SpriteIso[] = [
  ...Object.values(MAQUETTES),
  ...Object.values(PEINTS).flatMap((p) =>
    Object.values(p?.stades ?? {}).flatMap((st) => Object.values(st ?? {})),
  ),
];
(globalThis as unknown as Record<string, unknown>).__atelierAncres = Object.fromEntries(
  spritesBld.map((s) => [
    Asset.fromModule(s.image).uri.split(/[?#]/)[0]?.split("/").pop(),
    { anchor: s.anchor, size: s.size },
  ]),
);
/** The foot of a prop, as a share of its canvas height (`iso-accessoire-*`). */
(globalThis as unknown as Record<string, unknown>).__atelierPiedProp = TOILE_ACCESSOIRE.pied;

export default function Atelier() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme="dark">
        {/* The calibration phone's size in dp (1080x2400 at 420 dpi): a window cannot be a fraction wide. */}
        <View style={{ width: 1080 / 2.625, height: 2400 / 2.625, overflow: "hidden" }}>
          <DevIsoRoute />
        </View>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
