import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import LicensesScreen from "@/app/licenses";
import "@/i18n";
import licenses from "@/src/licenses.json";
import config from "@/tamagui.config";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

test("the licences screen lists every dependency with its licence", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <LicensesScreen />
    </TamaguiProvider>,
  );
  for (const d of licenses) expect(screen.getByText(d.name)).toBeTruthy();
  expect(screen.getAllByText("MIT").length).toBeGreaterThan(0);
});
