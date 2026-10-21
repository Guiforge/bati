import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { ShareQuestButton } from "@/components/quests/QuestFileButtons";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The dialog that comes before a quest leaves the phone: what the file holds, what stays behind,
 * Share sends the file `questToShare` wrote, Cancel sends nothing, a second tap is ignored. The
 * file itself is proven in `adventure-file.test.ts`; here only what the button says and calls.
 */
const mockShowError = jest.fn();
const mockToShare = jest.fn();
const mockShare = jest.fn();
const mockReport = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: jest.fn(), showInfo: jest.fn() }),
}));
jest.mock("@/src/adventureFile", () => ({
  questToShare: (...a: unknown[]) => mockToShare(...a),
}));
jest.mock("@/src/questFile", () => ({
  pickQuestFile: jest.fn(),
  shareQuest: (...a: unknown[]) => mockShare(...a),
}));
jest.mock("@/src/reportError", () => ({
  reportError: (...a: unknown[]) => mockReport(...a),
}));

const written = (over: { photos?: number; leftOut?: number } = {}) => ({
  json: '{"kind":"bati-quest"}',
  file: { quest: { title: { en: "Porch forge" } } },
  photos: 0,
  leftOut: 0,
  ...over,
});

const open = async () => {
  const screen = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ShareQuestButton questId={7} />
    </TamaguiProvider>,
  );
  await fireEvent.press(screen.getByTestId("quest-share"));
  return screen;
};

beforeEach(() => {
  mockToShare.mockReset();
  mockShare.mockReset().mockResolvedValue(undefined);
  mockShowError.mockClear();
  mockReport.mockClear();
});

test("the dialog says the photos in the file and those left on the phone, and Share sends the file", async () => {
  mockToShare.mockResolvedValue(written({ photos: 2, leftOut: 1 }));
  const screen = await open();

  // The button's label and the dialog's title are the same words.
  await waitFor(() => expect(screen.getAllByText("Share this quest")).toHaveLength(2));
  expect(
    screen.getByText(
      "The file holds 2 photos. 1 photo cannot travel in the file and stays on your phone.",
    ),
  ).toBeTruthy();
  expect(mockToShare).toHaveBeenCalledWith(7);
  expect(mockShare).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText("Share"));
  expect(mockShare).toHaveBeenCalledWith('{"kind":"bati-quest"}', "Porch forge");
});

test("one photo, none, and none left out each have their own sentence", async () => {
  mockToShare.mockResolvedValue(written({ photos: 1 }));
  expect(await (await open()).findByText("The file holds 1 photo.")).toBeTruthy();

  mockToShare.mockResolvedValue(written());
  expect(await (await open()).findByText("The file holds your quest, with no photo.")).toBeTruthy();
});

test("Cancel shares nothing", async () => {
  mockToShare.mockResolvedValue(written({ photos: 1 }));
  const screen = await open();
  await screen.findByText("The file holds 1 photo.");
  await fireEvent.press(screen.getByText("Cancel"));
  expect(mockShare).not.toHaveBeenCalled();
});

test("a quest that cannot be written is reported and said, and no dialog opens", async () => {
  const boom = new Error("refused by its own reader");
  mockToShare.mockRejectedValue(boom);
  const screen = await open();
  await waitFor(() =>
    expect(mockShowError).toHaveBeenCalledWith("The quest could not be prepared. Try again."),
  );
  expect(mockReport).toHaveBeenCalledWith("quests.share", boom);
  expect(screen.getAllByText("Share this quest")).toHaveLength(1);
  expect(mockShare).not.toHaveBeenCalled();
});

test("a second tap while the file is being prepared prepares it once", async () => {
  let release: (v: ReturnType<typeof written>) => void = () => undefined;
  mockToShare.mockReturnValue(new Promise((resolve) => (release = resolve)));
  const screen = await open();
  await fireEvent.press(screen.getByTestId("quest-share"));
  expect(mockToShare).toHaveBeenCalledTimes(1);
  release(written());
  await screen.findByText("The file holds your quest, with no photo.");
});
