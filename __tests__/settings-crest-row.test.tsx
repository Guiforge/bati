import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import Settings from "@/app/settings";
import { ToastProvider } from "@/components/common/Toast";
import * as crestDb from "@/db/crest";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/settings",
  Stack: { Screen: () => null },
}));

const tally = { strength: 0, calisthenics: 0, yoga: 0, run: 0, ride: 0 };
const crest: crestDb.Crest = {
  animal: "stag",
  stage: "young",
  manual: true,
  second: null,
  quarters: null,
  revealedIndex: 7,
  optionStages: { sessions: "young", chosen: "young" },
  evidence: {
    firstEight: tally,
    totals: tally,
    first: "bear",
    secondFromSessions: null,
    boarQuarters: null,
  },
  longestFlame: 0,
  rings: 0,
  revealedAt: new Date("2020-01-01"),
};

const mount = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <ToastProvider>
          <Settings />
        </ToastProvider>
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

beforeAll(() => i18n.changeLanguage("fr"));
afterAll(() => i18n.changeLanguage("en"));
afterEach(() => jest.restoreAllMocks());

describe("the Settings screen", () => {
  it("M14: shows 'Ton animal' in the village section once the shield is revealed", async () => {
    jest.spyOn(crestDb, "getCrest").mockResolvedValue(crest);
    await mount();
    expect(await screen.findByTestId("settings-crest-animal")).toBeTruthy();
    expect(screen.getByText("Ton animal")).toBeTruthy();
    expect(screen.getByText("le cerf")).toBeTruthy();
  });

  it("has no such row before the 8th session", async () => {
    jest.spyOn(crestDb, "getCrest").mockResolvedValue(null);
    await mount();
    await screen.findByText("Langue");
    expect(screen.queryByTestId("settings-crest-animal")).toBeNull();
  });
});
