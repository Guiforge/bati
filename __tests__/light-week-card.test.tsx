import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

/** Accepting the week must reach Home (R2-T1): the note and the tiles read it again after the write. */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), [cb]);
  },
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: jest.fn() }) }));
const mockAccept = jest.fn(() => Promise.resolve());
jest.mock("@/db/lightWeek", () => ({
  lightWeekReason: async () => "under",
  acceptLightWeek: () => mockAccept(),
  refuseLightWeek: () => Promise.resolve(),
}));

import { LightWeekCard } from "@/components/home/LightWeekCard";

test("accepting writes, then calls onAnswered", async () => {
  const onAnswered = jest.fn();
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <LightWeekCard onAnswered={onAnswered} />
    </TamaguiProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("home-light-week")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("home-light-week-accept"));
  expect(mockAccept).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId("home-light-week")).toBeNull();
});

test("the sentence is in the text colour and both buttons clear 44 dp", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <LightWeekCard />
    </TamaguiProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("home-light-week")).toBeTruthy());
  const sentence = StyleSheet.flatten(screen.getByText("home.light_week_under").props.style);
  // The bone of the text colour, not the ember that doubles as the alert amber.
  expect(sentence.color).toBe(rawColors.text);
  expect(sentence.color).not.toBe(rawColors.primaryText);
  for (const id of ["home-light-week-accept", "home-light-week-refuse"]) {
    const style = StyleSheet.flatten(screen.getByTestId(id).props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  }
});
