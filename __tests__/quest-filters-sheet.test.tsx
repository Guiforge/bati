import { fireEvent, render } from "@testing-library/react-native";
import { PortalProvider, TamaguiProvider } from "tamagui";

import { QuestFiltersSheet } from "@/components/QuestFiltersSheet";
import config from "@/tamagui.config";

// Regression: @tamagui/lucide-icons pulled its own nested @tamagui/core@1.x while the
// rest of the app runs @tamagui/core@2.x, so mounting SlidersHorizontal/X (lazily
// mounted on first tap of the "Filters" chip) crashed with "Missing theme".

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ __esModule: true, default: { changeLanguage: jest.fn() } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

test("opening the filters sheet renders its icons without crashing", async () => {
  const { getByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <PortalProvider>
        <QuestFiltersSheet
          language="en"
          availableMuscles={[]}
          selectedMuscle={null}
          onSelectMuscle={() => {}}
          availableEquipment={[]}
          selectedEquipment={null}
          onSelectEquipment={() => {}}
          bottomInset={0}
          resultCount={0}
        />
      </PortalProvider>
    </TamaguiProvider>,
  );

  fireEvent.press(getByText("Filters"));

  expect(getByText("Filters")).toBeTruthy();
});
