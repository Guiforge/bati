import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { VillageReward } from "@/components/village/VillageReward";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import type { VillageBuilding } from "@/db/village";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const code: BuildingCode = "forge";
const def = buildingDefinitions[code];
const forge: VillageBuilding = {
  code,
  emoji: "",
  tier: def.tier,
  level: 3,
  enName: "The Forge",
  frName: "La Forge",
  deName: "Die Schmiede",
  esName: "La Forja",
  unlockCondition: "",
  relatedMuscle: def.relatedMuscle,
  driver: "muscle",
  metricValue: 700,
  nextTarget: 1000,
};

const show = (language: "en" | "fr" | "de" | "es") =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <VillageReward
        growth={[{ code, oldLevel: 2, newLevel: 3 }]}
        buildings={[forge]}
        language={language}
        top={0}
        onDismiss={jest.fn()}
      />
    </TamaguiProvider>,
  );

afterEach(() => i18n.changeLanguage("en"));

it.each([
  ["en", "rank 2", "rank 3"],
  ["fr", "rang 2", "rang 3"],
  ["de", "Rang 2", "Rang 3"],
  ["es", "grado 2", "grado 3"],
] as const)(
  "names the rank it came from and the one it reached in %s",
  async (lang, before, after) => {
    await i18n.changeLanguage(lang);
    await show(lang);
    expect(screen.getByText(before)).toBeTruthy();
    expect(screen.getByText(after)).toBeTruthy();
  },
);
