import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { UpdateCard } from "@/components/home/UpdateCard";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined) }));

jest.mock("expo-linking", () => ({ openURL: jest.fn().mockResolvedValue(true) }));

jest.mock("@/src/updateCheck", () => ({
  RELEASES_URL: "https://github.com/Guiforge/bati/releases/latest",
  appVersion: "2.0.0",
  checkForUpdate: jest.fn(),
}));

jest.mock("@/db/preferences", () => ({
  preferences: { setUpdateDismissed: jest.fn().mockResolvedValue(undefined) },
}));

const { checkForUpdate } = jest.requireMock("@/src/updateCheck") as {
  checkForUpdate: jest.Mock;
};
const { preferences } = jest.requireMock("@/db/preferences") as {
  preferences: { setUpdateDismissed: jest.Mock };
};
const Linking = jest.requireMock("expo-linking") as { openURL: jest.Mock };

async function mount() {
  await act(async () => {
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <UpdateCard />
      </TamaguiProvider>,
    );
  });
}

describe("UpdateCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ updateCheckEnabled: true });
    checkForUpdate.mockResolvedValue("2.6.0");
  });

  test("the switch being off is the whole answer: nothing asked, nothing drawn", async () => {
    useSettingsStore.setState({ updateCheckEnabled: false });

    await mount();

    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(screen.queryByTestId("home-update-open")).toBeNull();
  });

  test("nothing newer draws nothing", async () => {
    checkForUpdate.mockResolvedValue(null);

    await mount();

    expect(screen.queryByTestId("home-update-open")).toBeNull();
  });

  test("closing it writes that version down, so it does not come back for it", async () => {
    await mount();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("home-update-dismiss"));
    });

    expect(preferences.setUpdateDismissed).toHaveBeenCalledWith("2.6.0");
    expect(screen.queryByTestId("home-update-open")).toBeNull();
  });

  test("looking at the release opens a page and answers for that version too", async () => {
    await mount();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("home-update-open"));
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://github.com/Guiforge/bati/releases/latest",
    );
    expect(preferences.setUpdateDismissed).toHaveBeenCalledWith("2.6.0");
  });
});
