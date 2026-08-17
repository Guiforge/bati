import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { VillageNameRow } from "@/components/settings/VillageNameRow";
import { preferences } from "@/db";
import "@/i18n";
import { useUserStore } from "@/stores/user";
import config from "@/tamagui.config";

// The row is the second writer of the village name after onboarding. What matters is what
// reaches the store, not what the row looks like: trimmed when valid, dropped when too short.

jest.mock("@/db", () => ({
  preferences: { setVillageName: jest.fn().mockResolvedValue(undefined) },
}));
const setVillageNamePref = jest.mocked(preferences.setVillageName);
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showInfo: jest.fn() }),
}));

const renderRow = () =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <VillageNameRow />
    </TamaguiProvider>,
  );

async function edit(text: string) {
  await renderRow();
  await act(async () => fireEvent.press(screen.getByTestId("settings-village-name")));
  const input = screen.getByTestId("settings-village-name-input");
  await act(async () => fireEvent.changeText(input, text));
  await act(async () => fireEvent(input, "submitEditing"));
}

beforeEach(() => {
  jest.clearAllMocks();
  useUserStore.setState({ villageName: "Rivendell" });
});

test("a valid name is trimmed and written through the store", async () => {
  await edit("  Gondor ");
  expect(useUserStore.getState().villageName).toBe("Gondor");
  expect(setVillageNamePref).toHaveBeenCalledWith("Gondor");
});

test("a too-short name is dropped and the old one stays", async () => {
  await edit("Go");
  expect(useUserStore.getState().villageName).toBe("Rivendell");
  expect(setVillageNamePref).not.toHaveBeenCalled();
});
