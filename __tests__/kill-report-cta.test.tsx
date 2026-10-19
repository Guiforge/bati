import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { KillReport } from "@/components/journal/KillReport";
import config from "@/tamagui.config";

/** The report's CTA opens the campaign with the gallery anchored beneath it, so back has a page to pop to. */

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));

test("the boss CTA pushes the campaign with withAnchor", async () => {
  const report = {
    adventureId: 7,
    title: { en: "Dragon" },
    bossImagePath: null,
    felledAt: new Date(0),
    steps: 3,
    days: 2,
    pool: 100,
    lastBlow: null,
    hurt: [],
    xpSession: 1,
    xpRun: 2,
    victories: 1,
    nextBoss: null,
  };
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <KillReport report={report as never} session={{ id: 1 } as never} onOpenLog={jest.fn()} />
    </TamaguiProvider>,
  );
  await fireEvent.press(screen.getByTestId("journal-cta-boss"));
  expect(mockPush).toHaveBeenCalledWith("/adventures/7?from=%2Fjournal%2F1", { withAnchor: true });
});
