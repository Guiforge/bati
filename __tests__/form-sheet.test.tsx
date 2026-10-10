import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { FormSheet } from "@/components/common/FormSheet";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ usePathname: () => "/" }));

describe("FormSheet", () => {
  it("sets its title in the heading face, like every other title", async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <FormSheet open title="Ton animal" onClose={jest.fn()}>
            {null}
          </FormSheet>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    const title = await screen.findByText("Ton animal");
    expect(JSON.stringify(title.props.style)).toMatch(/Alegreya/i);
  });
});
