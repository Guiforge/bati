import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import LicensesScreen from "@/app/licenses";
import "@/i18n";
import notices from "@/src/licenses.json";
import config from "@/tamagui.config";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
// LegendList virtualizes against a real layout, which jest has none of: render the header and
// the first rows, which is all the screen's own code decides.
jest.mock("@legendapp/list/react-native", () => {
  const { View } = require("react-native");
  const { useState } = require("react");
  return {
    useRecyclingState: useState,
    LegendList: ({
      data,
      renderItem,
      ListHeaderComponent,
    }: {
      data: unknown[];
      renderItem: (arg: { item: unknown; index: number }) => React.ReactNode;
      ListHeaderComponent: React.ReactNode;
    }) => (
      <View>
        {ListHeaderComponent}
        {data.slice(0, 20).map((item, index) => (
          <View key={(item as { name: string }).name}>{renderItem({ item, index })}</View>
        ))}
      </View>
    ),
  };
});

const open = async () =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <LicensesScreen />
    </TamaguiProvider>,
  );

test("the licences screen lists packages with their licence", async () => {
  await open();
  const first = notices.packages[0];
  if (!first) throw new Error("no packages");
  expect(screen.getByText(first.name)).toBeTruthy();
  expect(screen.getAllByText(first.license).length).toBeGreaterThan(0);
});

test("a package opens on its copyright line and licence text", async () => {
  await open();
  const first = notices.packages[0];
  const notice = first?.notices[0];
  if (!first || !notice) throw new Error("no notice");
  await fireEvent.press(screen.getByText(first.name));
  expect(screen.getByText(notice.copyright[0] ?? "")).toBeTruthy();
  expect(screen.getByText(notices.texts[notice.text] ?? "")).toBeTruthy();
});

test("the icon authors of the game-icons actually used are credited (A10)", async () => {
  await open();
  expect(screen.getByTestId("licenses-icon-authors")).toBeTruthy();
  for (const g of notices.gameIcons) {
    expect(screen.getByText(new RegExp(`Icons made by ${g.author}`))).toBeTruthy();
  }
});
