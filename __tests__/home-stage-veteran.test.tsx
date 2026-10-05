import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { HomeStage } from "@/components/home/HomeStage";
import config from "@/tamagui.config";

/**
 * The 2026-10-03 audit: a level-44 hero with no weak muscle was titled "Start your journey". The
 * stage reads the real `useSmartAction`; only the database's verdict (`decideHomeOffer`) is fed.
 */

let mockOffer: unknown = null;

jest.mock("@/db/homeOffer", () => ({ decideHomeOffer: async () => mockOffer }));
jest.mock("@/db/reminders", () => ({
  getReminderDays: async () => ({}),
  WEEKDAYS: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
}));
jest.mock("@/db/estimate", () => ({ formatDurationEstimate: () => "20 min" }));
jest.mock("@/components/home/OathStrip", () => ({ OathStrip: () => null }));
jest.mock("@/components/home/RestNote", () => ({ RestNote: () => null }));
jest.mock("@/components/home/useStartQuest", () => ({ useStartQuest: () => jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/hooks/useReloadOnChange", () => ({
  useReloadOnChange: (_key: string, load: (c: () => boolean) => unknown) => {
    require("react").useEffect(() => {
      load(() => false);
    }, []);
  },
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));
jest.mock("react-i18next", () => {
  const en = require("@/locales/en.json");
  return {
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        const plural =
          typeof opts?.count === "number" ? (opts.count === 1 ? "_one" : "_other") : "";
        const node = (k: string) =>
          k
            .split(".")
            .reduce<unknown>((n, p) => (n as Record<string, unknown> | undefined)?.[p], en);
        const found = node(key + plural) ?? node(key);
        if (typeof found !== "string")
          return typeof opts?.defaultValue === "string" ? opts.defaultValue : key;
        return found.replace(/{{(\w+)(?:, *\w+)?}}/g, (_: string, n: string) =>
          String(opts?.[n] ?? ""),
        );
      },
    }),
  };
});

const quest = {
  id: 5,
  enTitle: "Chop Wood",
  frTitle: "Chop Wood",
  imagePath: null,
  archetype: "strength",
  exercises: [{ id: 1 }],
};

function stage() {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <HomeStage />
    </TamaguiProvider>,
  );
}

test("a stale quest is a concrete card: its title, its reason, Start", async () => {
  mockOffer = { kind: "stale_quest", days: 9, quest, startable: true, seconds: 1200 };
  await stage();
  expect(await screen.findByLabelText("Chop Wood")).toBeTruthy();
  expect(screen.getByText("Last done 9 days ago")).toBeTruthy();
  expect(screen.getByText("Start")).toBeTruthy();
});

test("the gallery of a trained hero is not a first step", async () => {
  mockOffer = { kind: "gallery", trained: true };
  await stage();
  expect(await screen.findByLabelText("Choose your next quest")).toBeTruthy();
  expect(screen.queryByLabelText("Start your journey")).toBeNull();
});

test("the gallery of a hero with no session keeps its first step", async () => {
  mockOffer = { kind: "gallery", trained: false };
  await stage();
  expect((await screen.findAllByLabelText("Start your journey")).length).toBeGreaterThan(0);
});
