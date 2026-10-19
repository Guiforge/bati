import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import config from "@/tamagui.config";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { seconds?: number }) => (o?.seconds ? `${o.seconds} s` : k),
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: jest.fn() }) }));
const mockGet = jest.fn();
jest.mock("@/db", () => ({ preferences: { getRestDefault: () => mockGet() } }));
const mockSet = jest.fn();
jest.mock("@/db/quests", () => ({ setRestDefault: (v: number | null) => mockSet(v) }));

import { RestDefaultRow } from "@/components/settings/RestDefaultRow";

const mount = () =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <RestDefaultRow />
    </TamaguiProvider>,
  );

beforeEach(() => {
  mockGet.mockResolvedValue(45);
  mockSet.mockClear();
  mockSet.mockResolvedValue(undefined);
});

test("every choice is on screen, the saved one marked", async () => {
  await mount();
  await waitFor(() =>
    expect(screen.getByTestId("settings-rest-default-45").props.accessibilityState).toEqual({
      selected: true,
    }),
  );
  for (const id of ["own", "15", "20", "30", "60", "90", "120"])
    expect(screen.getByTestId(`settings-rest-default-${id}`)).toBeTruthy();
});

test("one tap picks a value, and 'per quest' is one tap away from any of them", async () => {
  await mount();
  await fireEvent.press(screen.getByTestId("settings-rest-default-90"));
  expect(mockSet).toHaveBeenLastCalledWith(90);
  await fireEvent.press(screen.getByTestId("settings-rest-default-own"));
  expect(mockSet).toHaveBeenLastCalledWith(null);
});

test("says that the hero's own quests keep their rest (PR2-3)", async () => {
  await mount();
  expect(screen.getByText("settings.rest_default_note")).toBeTruthy();
});
