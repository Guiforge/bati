import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import { BossPanel } from "@/components/adventures/BossPanel";
import type { BossFight } from "@/db/bossFights";
import config from "@/tamagui.config";

/** The panel says the hero's opening line where it said the generic one; a painted boss keeps the generic one. */
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const fight = (intro: string[]): BossFight => ({
  id: 1,
  adventureId: 1,
  totalHp: 100,
  currentHp: 100,
  weaknessMuscle: null,
  resistanceMuscle: null,
  defeatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  imagePath: "assets/images/bosses/stone_golem.jpg",
  enName: "Nightcoil",
  frName: "Nightcoil",
  deName: "Nightcoil",
  esName: "Nightcoil",
  ruName: "Nightcoil",
  tier: 0,
  shiny: false,
  bossLines: { intro, idle: [], crit: [], enrage: [], defeat: [] },
});

const mount = (f: BossFight) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <BossPanel fight={f} language="en" />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

test("the hero's opening line replaces the generic one", async () => {
  await mount(fight(["Who dares?", "Second."]));
  expect(screen.getByText("Who dares?")).toBeTruthy();
  expect(screen.queryByText("A powerful foe blocks your path.")).toBeNull();
});

test("without one, the generic line stays", async () => {
  await mount(fight([]));
  expect(screen.getByText("A powerful foe blocks your path.")).toBeTruthy();
});
