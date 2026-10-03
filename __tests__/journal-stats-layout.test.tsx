import { render } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { TamaguiProvider } from "tamagui";

import { HeaderRow, WallRow } from "@/components/journal/stats/StatsView";
import type { WallEntry } from "@/db/journal";
import "@/i18n";
import config from "@/tamagui.config";

// Audit 2026-10-03: at a large font, and in French at the normal size ("sur les memes 3 jours"),
// a card's title and its right-hand caption shared one unwrapped row and clipped. And the wall's
// sub-line lost the record's year ("Mar 30, 2...") to a one-line cap.

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const wrap = async (ui: React.ReactElement) =>
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      {ui}
    </TamaguiProvider>,
  );

test("a card header wraps, so the caption drops under the title instead of clipping", async () => {
  const view = await wrap(
    <HeaderRow>
      <Text>Title</Text>
    </HeaderRow>,
  );
  const row = StyleSheet.flatten(view.getByTestId("journal-card-header").props.style);
  expect(row.flexWrap).toBe("wrap");
});

test("the wall's sub-line may take two lines, so a record keeps its year", async () => {
  const entry: WallEntry = {
    exerciseId: 1,
    name: { en: "Push-ups", fr: "Pompes", de: "Liegestuetze", es: "Flexiones" },
    imagePath: "",
    type: "reps",
    best: 24,
    last: 11,
    recordAt: new Date(2025, 2, 30, 12),
    recordSessionId: 7,
    seasonBest: 24,
  };
  const view = await wrap(<WallRow entry={entry} now={new Date(2026, 8, 15, 12)} />);
  expect(view.getByTestId("journal-wall-sub").props.numberOfLines).toBe(2);
});
