import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { HomeHeader } from "@/components/home/HomeHeader";
import config from "@/tamagui.config";

/**
 * The 2026-10-03 audit: the avatar is the only door to Settings and said nothing about it, and the
 * castle carried a bare "12". The badge and the word are what a stranger reads.
 */

const mockPush = jest.fn();

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => true,
}));
jest.mock("@/hooks/useStreakInfo", () => ({ useStreakInfo: () => ({ current: 3 }) }));
jest.mock("@/db/userLevel", () => ({
  getUserLevelInfo: () =>
    Promise.resolve({
      level: 45,
      title: { en: "Hero", fr: "Heros", de: "Held", es: "Heroe" },
      xpProgress: 0.5,
      currentLevelXp: 10,
      xpToNextLevel: 90,
    }),
}));
jest.mock("@/hooks/useReloadOnChange", () => ({
  useReloadOnChange: (_key: string, load: (c: () => boolean) => unknown) => {
    require("react").useEffect(() => {
      load(() => false);
    }, []);
  },
}));

function mount() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <HomeHeader />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

describe("HomeHeader", () => {
  beforeEach(() => mockPush.mockClear());

  it("draws a gear on the avatar, and the avatar still opens Settings", async () => {
    const view = await mount();
    expect(view.getByTestId("home-settings-gear")).toBeTruthy();
    await fireEvent.press(view.getByTestId("home-settings"));
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it("names the village tier next to the castle, on one line", async () => {
    const view = await mount();
    const tier = await view.findByTestId("home-village-tier");
    expect(tier).toHaveTextContent(/Tier \d+/);
    expect(tier.props.numberOfLines).toBe(1);
    expect(tier.props.adjustsFontSizeToFit).toBe(true);
  });
});
