import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";
import SessionDetailScreen from "@/app/(tabs)/journal/[id]";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: "1" }),
}));
jest.mock("@/components/journal/QuestLog", () => ({ QuestLog: () => null }));
jest.mock("@/components/journal/KillReport", () => ({ KillReport: () => null }));
jest.mock("@/components/journal/sessionLog", () => ({
  readSession: () => Promise.resolve({ log: { session: {} }, kill: null }),
}));
jest.mock("@/components/journal/useConfirmForget", () => ({
  useConfirmForget: () => ({ confirmForget: jest.fn(), dialog: null }),
}));

/** The last button of the family: "Remove from the journal" is an outline AppButton. */
test("Remove from the journal is an outline AppButton, in the family's face", async () => {
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <Theme name="journal">
            <SessionDetailScreen />
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  const label = StyleSheet.flatten(screen.getByText("Remove from the journal").props.style);
  expect(label.fontFamily).toBe(config.fonts.heading.face[700].normal);
  expect(label.color).toBe(rawColors.text);
  const button = StyleSheet.flatten(screen.getByTestId("journal-forget-session").props.style);
  expect(button.borderBottomWidth).not.toBe(3);
  // Under the Journal theme, which greys `$error`: the red edge is the raw colour.
  expect(button.borderTopColor).toBe(rawColors.error);
});
