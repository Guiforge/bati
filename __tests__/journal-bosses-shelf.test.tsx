import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import BossesScreen from "@/app/(tabs)/journal/bosses";
import config from "@/tamagui.config";

/**
 * A hero who has felled nothing used to open this shelf onto a black page with one grey line and
 * nowhere to go. The bosses still standing are on it now, as silhouettes, each opening its campaign.
 */

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useNavigation: () => ({ canGoBack: () => true }),
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

const mockKills = jest.fn();
const mockStanding = jest.fn();
jest.mock("@/db/journal", () => ({
  getBossKills: () => mockKills(),
  getStandingBosses: () => mockStanding(),
}));

const standing = [
  { adventureId: 11, title: { en: "Fire Dragon" }, imagePath: "fire_dragon.webp" },
  { adventureId: 12, title: { en: "Stone Golem" }, imagePath: "stone_golem.webp" },
];

async function mount() {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <BossesScreen />
    </TamaguiProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
  mockKills.mockResolvedValue([]);
  mockStanding.mockResolvedValue(standing);
});

test("an empty shelf shows the bosses still standing, and a press opens that campaign", async () => {
  await mount();
  const rows = await screen.findAllByTestId("journal-boss-standing");
  expect(rows).toHaveLength(2);
  // Silhouettes: the name is not given away.
  expect(screen.queryByText("Fire Dragon")).toBeNull();

  await fireEvent.press(rows[1] as (typeof rows)[number]);
  expect(mockPush).toHaveBeenCalledWith("/adventures/12");
});

test("a screen reader is not told the name the silhouette hides, only what the press does", async () => {
  await mount();
  const rows = await screen.findAllByTestId("journal-boss-standing");
  for (const row of rows) {
    expect(row.props.accessibilityLabel).toBe("journal.boss_standing_label");
    expect(row.props.accessibilityRole).toBe("button");
  }
  expect(screen.queryByLabelText("Fire Dragon")).toBeNull();
});

test("with every boss felled there is nothing standing to show", async () => {
  mockStanding.mockResolvedValue([]);
  mockKills.mockResolvedValue([
    {
      adventureId: 11,
      title: { en: "Fire Dragon" },
      imagePath: "fire_dragon.webp",
      felledAt: new Date(2026, 0, 5),
      sessionId: 3,
    },
  ]);
  await mount();
  expect(await screen.findByText("Fire Dragon")).toBeTruthy();
  expect(screen.queryByTestId("journal-boss-standing")).toBeNull();
});
