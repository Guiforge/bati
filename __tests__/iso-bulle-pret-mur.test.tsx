// A ready wall's bubble: the Evolve button comes before the stones, whatever their number. QA's
// 24 stones put it below a scroll no swipe reached, and "Ready to evolve" promised an action
// nobody could take.

import { render, screen } from "@testing-library/react-native";
import { createRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { ContenuBatiment } from "@/components/village/iso/Bulle";
import type { VillageBuilding } from "@/db/village";
import type { VillageYearsView } from "@/db/villageYears";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mur = {
  code: "castle_wall",
  emoji: "",
  tier: 4,
  level: 8,
  enName: "Ramparts",
  frName: "Remparts",
  deName: "Wall",
  esName: "Muralla",
  ruName: "Wall",
  zhName: "Wall",
  unlockCondition: "",
  relatedMuscle: null,
  driver: "tier",
  metricValue: 0,
  nextTarget: null,
} as unknown as VillageBuilding;

const annees = {
  years: {
    stones: Array.from({ length: 24 }, (_, i) => ({
      level: 21 + i,
      decade: 2,
      sessions: 3,
      fact: { kind: "sessions", count: 3 },
    })),
    banners: [],
    ages: [],
  },
  names: new Map(),
} as unknown as VillageYearsView;

/** The testIDs of a rendered tree, in drawing order. */
function ordre(noeud: unknown, ids: string[] = []): string[] {
  if (Array.isArray(noeud)) for (const n of noeud) ordre(n, ids);
  else if (noeud && typeof noeud === "object") {
    const n = noeud as { props?: { testID?: string }; children?: unknown };
    if (n.props?.testID) ids.push(n.props.testID);
    ordre(n.children, ids);
  }
  return ids;
}

it("puts Evolve before the stones on a ready wall", async () => {
  await i18n.changeLanguage("en");
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <ContenuBatiment
          building={mur}
          pret
          nom={createRef()}
          language="en"
          feeds={null}
          years={annees}
          onClose={jest.fn()}
          onClaim={jest.fn()}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  const ids = ordre(screen.toJSON());
  const bouton = ids.indexOf("village-claim");
  const pierres = ids.indexOf("village-stones");
  expect(bouton).toBeGreaterThan(-1);
  expect(pierres).toBeGreaterThan(-1);
  expect(bouton).toBeLessThan(pierres);
});
