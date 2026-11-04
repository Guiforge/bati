// A ready wall's bubble: the Evolve button comes before the stones, whatever their number. QA's
// 24 stones put it below a scroll no swipe reached, and "Ready to evolve" promised an action
// nobody could take.

import { render, screen } from "@testing-library/react-native";
import { createRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { ContenuBatiment } from "@/components/village/iso/Bulle";
import type { VillageBuilding } from "@/db/village";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const fontaine = {
  code: "fountain",
  emoji: "",
  tier: 3,
  level: 3,
  enName: "Fountain",
  frName: "Fontaine",
  deName: "Brunnen",
  esName: "Fuente",
  ruName: "Fountain",
  zhName: "Fountain",
  unlockCondition: "",
  relatedMuscle: null,
  driver: "prereq",
  metricValue: 9,
  nextTarget: null,
} as unknown as VillageBuilding;

// QA on a device: the fountain's bubble said "Ready to evolve" and its button sat past the bubble's
// fold (45 % of the screen), under the silhouette and the driver line. The button now stands right
// under the words, above the figures.
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

it("a ready fountain (an upgrade that rises with the Well) has its Evolve button above the figures", async () => {
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
          building={fontaine}
          pret
          nom={createRef()}
          language="en"
          feeds={null}
          years={null}
          onClose={jest.fn()}
          onClaim={jest.fn()}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  const ids = ordre(screen.toJSON());
  expect(ids.filter((id) => id === "village-claim")).toHaveLength(1);
  expect(ids.indexOf("village-claim")).toBeGreaterThan(-1);
  expect(ids.indexOf("village-claim")).toBeLessThan(ids.indexOf("iso-bulle-chiffres"));
});
