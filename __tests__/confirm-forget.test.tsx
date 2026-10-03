import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, Pressable } from "react-native";
import { TamaguiProvider } from "tamagui";

import { useConfirmForget } from "@/components/journal/useConfirmForget";
import config from "@/tamagui.config";

/**
 * Forgetting a session takes its XP with it, so a stray tap must not be enough, and the three
 * things it can say (are you sure, a campaign has moved past it, it failed) used to be grey native
 * alerts. Asserted on `forgetSession` and the callback, not on the dialog appearing.
 */

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const mockForget = jest.fn();
jest.mock("@/stores/session", () => ({
  forgetSession: (...args: unknown[]) => mockForget(...args),
}));
const mockReport = jest.fn();
jest.mock("@/src/reportError", () => ({
  reportError: (...args: unknown[]) => mockReport(...args),
}));

const onForgotten = jest.fn();

// biome-ignore lint/style/useComponentExportOnlyModules: a test file exports nothing
function Probe() {
  const { confirmForget, dialog } = useConfirmForget();
  return (
    <>
      <Pressable testID="forget" onPress={() => confirmForget(7, onForgotten)} />
      {dialog}
    </>
  );
}

async function mount() {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <Probe />
    </TamaguiProvider>,
  );
  await fireEvent.press(screen.getByTestId("forget"));
}

beforeEach(() => {
  mockForget.mockReset();
  mockReport.mockClear();
  onForgotten.mockClear();
});

test("nothing is forgotten until the hero confirms, and no native alert is raised", async () => {
  const alert = jest.spyOn(Alert, "alert");
  await mount();
  expect(mockForget).not.toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();

  mockForget.mockResolvedValue("forgotten");
  await act(async () => fireEvent.press(screen.getByTestId("confirm-dialog-confirm")));
  expect(mockForget).toHaveBeenCalledWith(7);
  expect(onForgotten).toHaveBeenCalledTimes(1);
});

test("cancelling forgets nothing", async () => {
  await mount();
  await fireEvent.press(screen.getByTestId("confirm-dialog-cancel"));
  expect(mockForget).not.toHaveBeenCalled();
  expect(onForgotten).not.toHaveBeenCalled();
});

test("a campaign that has moved past the session says why and keeps it", async () => {
  mockForget.mockResolvedValue("locked");
  await mount();
  await act(async () => fireEvent.press(screen.getByTestId("confirm-dialog-confirm")));
  expect(onForgotten).not.toHaveBeenCalled();
  expect(screen.getByText("journal.forget_locked_title")).toBeTruthy();
  // A message: one button, and it closes.
  expect(screen.queryByTestId("confirm-dialog-cancel")).toBeNull();
  await fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
  expect(screen.queryByText("journal.forget_locked_title")).toBeNull();
});

test("a failure is reported and said", async () => {
  mockForget.mockRejectedValue(new Error("db"));
  await mount();
  await act(async () => fireEvent.press(screen.getByTestId("confirm-dialog-confirm")));
  expect(mockReport).toHaveBeenCalledWith("journal.forget", expect.any(Error));
  expect(onForgotten).not.toHaveBeenCalled();
  expect(screen.getByText("common.error")).toBeTruthy();
});
