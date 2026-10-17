import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { MapStyleRow } from "@/components/settings/MapStyleRow";
import "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn() }));
const mockSetMapStyle = jest.fn().mockResolvedValue(undefined);
jest.mock("@/db", () => ({ preferences: { setMapStyle: (id: string) => mockSetMapStyle(id) } }));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: jest.fn() }) }));

const mount = () =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <MapStyleRow />
    </TamaguiProvider>,
  );

beforeEach(() => {
  mockSetMapStyle.mockClear();
  useSettingsStore.setState({ language: "en", mapTilesEnabled: true, mapStyle: "ember" });
});

test("is absent while the tiles are off: a style for a map with no tiles is wired to nothing", async () => {
  useSettingsStore.setState({ mapTilesEnabled: false });
  await mount();
  expect(screen.queryByTestId("settings-map-style")).toBeNull();
});

test("a tap cycles Ember, Night, Fjord and back, and writes each", async () => {
  await mount();
  expect(screen.getByText("Ember")).toBeTruthy();
  for (const [shown, written] of [
    ["Night", "dark"],
    ["Fjord", "fiord"],
    ["Ember", "ember"],
  ] as const) {
    await act(async () => {
      await fireEvent.press(screen.getByTestId("settings-map-style"));
    });
    expect(screen.getByText(shown)).toBeTruthy();
    expect(mockSetMapStyle).toHaveBeenLastCalledWith(written);
  }
  expect(useSettingsStore.getState().mapStyle).toBe("ember");
});
