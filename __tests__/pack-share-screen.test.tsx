import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import PackShareScreen from "@/app/pack-share";
import config from "@/tamagui.config";

/**
 * The list the hero sends from (`app/pack-share.tsx`): what it offers, what it hands
 * `packToShare`, and what the dialog says before anything leaves the phone. The file itself is
 * held in `test/node/quests/pack-import.test.ts`.
 */
const mockToShare = jest.fn();
const mockShare = jest.fn();
const mockShowError = jest.fn();
const mockMade = {
  quests: [] as unknown[],
  adventures: [] as unknown[],
  exercises: [] as unknown[],
  bosses: [] as unknown[],
};

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@/stores/settings", () => {
  const settings = { language: "en", distanceUnit: "metric" };
  const useSettingsStore = (pick: (s: typeof settings) => unknown) => pick(settings);
  useSettingsStore.getState = () => settings;
  return { useSettingsStore };
});
jest.mock("@/db/quests", () => ({
  ...jest.requireActual("@/db/quests"),
  listQuestTemplates: () => Promise.resolve(mockMade.quests),
}));
jest.mock("@/db/adventures", () => ({
  ...jest.requireActual("@/db/adventures"),
  listAdventures: () => Promise.resolve(mockMade.adventures),
}));
jest.mock("@/db/exercises", () => ({
  ...jest.requireActual("@/db/exercises"),
  listExercises: () => Promise.resolve(mockMade.exercises),
}));
jest.mock("@/db/heroBosses", () => ({
  ...jest.requireActual("@/db/heroBosses"),
  listHeroBosses: () => Promise.resolve(mockMade.bosses),
}));
jest.mock("@/src/packFile", () => ({
  packToShare: (...a: unknown[]) => mockToShare(...a),
  sharePack: (...a: unknown[]) => mockShare(...a),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: jest.fn() }),
}));

const titled = (title: string) => ({
  enTitle: title,
  frTitle: title,
  deTitle: title,
  esTitle: title,
  ruTitle: title,
  zhTitle: title,
});
const named = (name: string) => ({
  enName: name,
  frName: name,
  deName: name,
  esName: name,
  ruName: name,
  zhName: name,
});

/** One of each the hero made, beside what is not theirs to send or no longer in use. */
function forge() {
  mockMade.quests = [
    {
      id: 2,
      author: "hero",
      rounds: 3,
      exercises: [{}, {}],
      imagePath: null,
      ...titled("Iron morning"),
    },
    { id: 20, author: "Admin", rounds: 3, exercises: [], imagePath: null, ...titled("Iron Dawn") },
  ];
  mockMade.adventures = [
    { id: 1, author: "hero", isActive: 1, imagePath: "the_golem", ...titled("The long road") },
    { id: 10, author: "hero", isActive: 0, imagePath: "the_golem", ...titled("Retired road") },
  ];
  mockMade.exercises = [
    { id: 4, creator: "hero", retiredAt: null, imagePath: "", ...named("Porch push") },
    { id: 40, creator: "hero", retiredAt: new Date(0), imagePath: "", ...named("Old hang") },
    { id: 41, creator: "Admin", retiredAt: null, imagePath: "", ...named("Push-up") },
  ];
  mockMade.bosses = [{ id: 3, name: "The landlord", monster: "", art: {} }];
}

async function mount() {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <PackShareScreen />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  forge();
  mockToShare.mockResolvedValue({
    json: '{"kind":"bati-pack"}',
    counts: { adventures: 1, quests: 2, bosses: 1, movements: 1 },
    photos: 3,
    leftOut: 1,
  });
  mockShare.mockResolvedValue(undefined);
});

test("everything the hero made and still uses is listed and ticked, and nothing else", async () => {
  await mount();
  await screen.findByTestId("pack-share-confirm");

  expect(screen.getByText("Iron morning")).toBeTruthy();
  expect(screen.getByText("3 rounds · 2 exercises")).toBeTruthy();
  expect(screen.queryByText("Iron Dawn")).toBeNull();
  expect(screen.queryByText("Retired road")).toBeNull();
  expect(screen.queryByText("Old hang")).toBeNull();
  expect(screen.queryByText("Push-up")).toBeNull();

  await fireEvent.press(screen.getByTestId("pack-share-confirm"));
  expect(mockToShare).toHaveBeenCalledWith({
    adventures: [1],
    quests: [2],
    bosses: [3],
    movements: [4],
  });
});

test("the dialog says what the file holds and how many photos leave, and Share sends that file", async () => {
  await mount();
  await fireEvent.press(await screen.findByTestId("pack-share-confirm"));

  // What `packToShare` counted, which is more than the four rows: something came along.
  expect(
    await screen.findByText(
      "5 creations go into the file. 3 photos go with it. 1 photo cannot travel in the file and stays on your phone.",
    ),
  ).toBeTruthy();
  expect(mockShare).not.toHaveBeenCalled();

  // The dialog's button, after the screen's own.
  const share = screen.getAllByText("Share").at(-1);
  if (!share) throw new Error("no Share button");
  await fireEvent.press(share);
  expect(mockShare).toHaveBeenCalledWith('{"kind":"bati-pack"}');
});

test("an unticked row stays here, and a section can be emptied at once", async () => {
  await mount();
  await fireEvent.press(await screen.findByTestId("pack-share-movements-4"));
  await fireEvent.press(screen.getByTestId("pack-share-bosses-none"));
  await fireEvent.press(screen.getByTestId("pack-share-confirm"));

  expect(mockToShare).toHaveBeenCalledWith({
    adventures: [1],
    quests: [2],
    bosses: [],
    movements: [],
  });
});

test("a file that cannot be prepared is said, and no dialog opens", async () => {
  mockToShare.mockRejectedValue(new Error("pack file fails its own reader"));
  await mount();
  await fireEvent.press(await screen.findByTestId("pack-share-confirm"));

  await waitFor(() =>
    expect(mockShowError).toHaveBeenCalledWith("The file could not be prepared. Try again."),
  );
  expect(mockShare).not.toHaveBeenCalled();
});

test("a hero who has made nothing is told so, with no list and no button", async () => {
  mockMade.quests = [];
  mockMade.adventures = [];
  mockMade.exercises = [];
  mockMade.bosses = [];
  await mount();

  expect(
    await screen.findByText("You have not made anything yet. Come back after your first quest."),
  ).toBeTruthy();
  expect(screen.queryByTestId("pack-share-confirm")).toBeNull();
});
