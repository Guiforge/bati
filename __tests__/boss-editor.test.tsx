import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import BossEditor from "@/app/bosses/edit";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The boss editor's wiring: what it refuses, what it hands the writer, and what it asks first.
 * The writer itself is proven on a real database in db-hero-adventures.test.ts.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const mockBack = jest.fn();
const mockParams: { id?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
    showToast: jest.fn(),
  }),
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string; reducedMotion: boolean }) => unknown) => {
    const state = { language: "en", reducedMotion: false };
    return selector ? selector(state) : state;
  },
}));

const monster = (key: string) => ({
  key,
  bossImagePath: `assets/images/bosses/${key}.jpg`,
  weakness: null,
  resistance: null,
});
jest.mock("@/db/heroAdventures", () => ({
  listMonsters: jest
    .fn()
    .mockResolvedValue(["shadow_serpent", "iron_golem", "stone_golem"].map((k) => monster(k))),
  listOfferedMonsters: jest
    .fn()
    .mockResolvedValue(["shadow_serpent", "iron_golem"].map((k) => monster(k))),
}));
jest.mock("@/db/heroBosses", () => ({
  HeroBossInUseError: class extends Error {},
  adventuresUsingBoss: jest.fn().mockResolvedValue(0),
  createHeroBoss: jest.fn().mockResolvedValue(1),
  updateHeroBoss: jest.fn().mockResolvedValue(undefined),
  deleteHeroBoss: jest.fn().mockResolvedValue(undefined),
  getHeroBoss: jest.fn(),
  emptyHeroBossDraft: (m: string) => ({
    name: "",
    monster: m,
    weakness: null,
    resistance: null,
    lines: { intro: [], idle: [], crit: [], enrage: [], defeat: [] },
    art: {},
  }),
}));
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest
    .fn()
    .mockResolvedValue({ canceled: false, assets: [{ uri: "file:///album/boss.jpg" }] }),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("@/src/exercisePhoto", () => ({
  encodePhoto: jest.fn().mockResolvedValue("data:image/jpeg;base64,BOSS"),
}));

const bosses = () => require("@/db/heroBosses") as Record<string, jest.Mock>;
const photo = "data:image/jpeg;base64,BOSS";

async function mount() {
  let result!: Awaited<ReturnType<typeof render>>;
  await act(async () => {
    result = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <BossEditor />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  await waitFor(() => expect(result.getByTestId("boss-name")).toBeTruthy());
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.id = undefined;
});

async function pickPhoto(editor: Awaited<ReturnType<typeof mount>>, form: string) {
  const field = editor.getByTestId(`editor-boss-art-${form}`);
  await fireEvent.press(within(field).getByTestId("image-choice-preview"));
  await fireEvent.press(within(field).getByTestId("image-choice-photo"));
  await waitFor(() => expect(within(field).getByTestId("image-choice-preview")).toBeTruthy());
}

describe("a new boss", () => {
  test("refuses an empty name and writes nothing", async () => {
    const editor = await mount();
    await fireEvent.press(editor.getByTestId("boss-save"));
    expect(await editor.findByTestId("boss-name-error")).toBeTruthy();
    expect(bosses().createHeroBoss).not.toHaveBeenCalled();
  });

  test("takes the hero to the name when it is missing", async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo");
    const editor = await mount();
    await fireEvent.press(editor.getByTestId("boss-save"));
    await editor.findByTestId("boss-name-error");
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: 0, animated: true }));
    scrollTo.mockRestore();
  });

  test("offers the monsters it is told to, and the consent line sits under the pictures", async () => {
    const editor = await mount();
    expect(editor.getByTestId("boss-monster-shadow_serpent")).toBeTruthy();
    expect(editor.getByTestId("boss-monster-iron_golem")).toBeTruthy();
    expect(editor.queryByTestId("boss-monster-stone_golem")).toBeNull();
    for (const form of ["fresh", "wounded", "defeated", "legendary"]) {
      expect(editor.getByTestId(`editor-boss-art-${form}`)).toBeTruthy();
    }
    expect(editor.getByTestId("editor-boss-art-consent")).toBeTruthy();
  });

  test("the painted tile of a form is read out by the monster's name, not its key", async () => {
    const editor = await mount();
    const field = editor.getByTestId("editor-boss-art-fresh");
    await fireEvent.press(within(field).getByTestId("image-choice-preview"));
    const tile = within(field).getByTestId("image-choice-shadow_serpent");
    const name = editor.getByTestId("boss-monster-shadow_serpent").props.accessibilityLabel;
    expect(name).not.toBe("shadow_serpent");
    expect(tile.props.accessibilityLabel).toBe(name);
  });

  test("hands the writer the name, the monster, the muscles, the lines and a photo per form", async () => {
    const editor = await mount();
    await fireEvent.changeText(editor.getByTestId("boss-name"), "Gorgo");
    await fireEvent.press(editor.getByTestId("boss-monster-iron_golem"));
    await fireEvent.press(editor.getByTestId("boss-weakness-chest"));
    await fireEvent.press(editor.getByTestId("boss-resistance-legs"));
    await fireEvent.changeText(editor.getByTestId("editor-boss-lines-intro"), "Who dares?");
    await fireEvent.changeText(editor.getByTestId("editor-boss-lines-idle"), "a\nb\nc\nd");
    await pickPhoto(editor, "fresh");
    await pickPhoto(editor, "defeated");
    await fireEvent.press(editor.getByTestId("boss-save"));

    await waitFor(() =>
      expect(bosses().createHeroBoss).toHaveBeenCalledWith({
        name: "Gorgo",
        monster: "iron_golem",
        weakness: "chest",
        resistance: "legs",
        lines: { intro: ["Who dares?"], idle: ["a", "b", "c"], crit: [], enrage: [], defeat: [] },
        art: { fresh: photo, defeated: photo },
      }),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  test("one muscle cannot be both: picking it on one side clears the other", async () => {
    const editor = await mount();
    await fireEvent.changeText(editor.getByTestId("boss-name"), "Gorgo");
    await fireEvent.press(editor.getByTestId("boss-weakness-chest"));
    await fireEvent.press(editor.getByTestId("boss-resistance-chest"));
    await fireEvent.press(editor.getByTestId("boss-save"));
    await waitFor(() =>
      expect(bosses().createHeroBoss).toHaveBeenCalledWith(
        expect.objectContaining({ weakness: null, resistance: "chest" }),
      ),
    );
  });

  test("choosing the painted monster again drops the photo of that form, and a muscle can be cleared", async () => {
    const editor = await mount();
    await fireEvent.changeText(editor.getByTestId("boss-name"), "Gorgo");
    await pickPhoto(editor, "wounded");
    const field = editor.getByTestId("editor-boss-art-wounded");
    await fireEvent.press(within(field).getByTestId("image-choice-preview"));
    await fireEvent.press(within(field).getByTestId("image-choice-shadow_serpent"));
    await fireEvent.press(editor.getByTestId("boss-weakness-abs"));
    await fireEvent.press(editor.getByTestId("boss-weakness-none"));
    await fireEvent.press(editor.getByTestId("boss-save"));
    await waitFor(() =>
      expect(bosses().createHeroBoss).toHaveBeenCalledWith(
        expect.objectContaining({ art: {}, weakness: null, monster: "shadow_serpent" }),
      ),
    );
  });
});

describe("an existing boss", () => {
  const stored = {
    id: 4,
    uuid: "0192b000-0000-7000-8000-000000000004",
    name: "Gorgo",
    monster: "assets/images/bosses/stone_golem.jpg",
    // A monster the picker does not offer: it is still the current choice.
    monsterKey: "stone_golem",
    weakness: "chest",
    resistance: null,
    lines: { intro: [], idle: ["Again."], crit: [], enrage: [], defeat: [] },
    art: { fresh: photo },
    updatedAt: null,
  };

  test("opens on what is stored, keeps showing its hidden monster, and saves an update", async () => {
    mockParams.id = "4";
    bosses().getHeroBoss?.mockResolvedValue(stored);
    const editor = await mount();
    expect(editor.getByDisplayValue("Gorgo")).toBeTruthy();
    expect(editor.getByTestId("boss-monster-stone_golem")).toBeTruthy();
    await fireEvent.changeText(editor.getByTestId("boss-name"), "Gorgo II");
    await fireEvent.press(editor.getByTestId("boss-save"));
    await waitFor(() =>
      expect(bosses().updateHeroBoss).toHaveBeenCalledWith(
        4,
        expect.objectContaining({
          name: "Gorgo II",
          monster: "stone_golem",
          weakness: "chest",
          art: { fresh: photo },
        }),
      ),
    );
  });

  test("one an adventure ends on says so before asking, and nothing is deleted", async () => {
    mockParams.id = "4";
    bosses().getHeroBoss?.mockResolvedValue(stored);
    bosses().adventuresUsingBoss?.mockResolvedValueOnce(1);
    const editor = await mount();
    await fireEvent.press(editor.getByTestId("boss-delete"));
    expect(await editor.findByText("This boss is still in use")).toBeTruthy();
    expect(editor.queryByText("Delete")).toBeNull();
    expect(bosses().adventuresUsingBoss).toHaveBeenCalledWith(stored.uuid);
    expect(bosses().deleteHeroBoss).not.toHaveBeenCalled();
  });

  test("delete asks first, then deletes; one still in use says so and stays", async () => {
    mockParams.id = "4";
    bosses().getHeroBoss?.mockResolvedValue(stored);
    const editor = await mount();
    await fireEvent.press(editor.getByTestId("boss-delete"));
    expect(bosses().deleteHeroBoss).not.toHaveBeenCalled();
    await fireEvent.press(await editor.findByText("Delete"));
    await waitFor(() => expect(bosses().deleteHeroBoss).toHaveBeenCalledWith(4));
    expect(mockBack).toHaveBeenCalled();

    mockBack.mockClear();
    const InUse = bosses().HeroBossInUseError as unknown as new () => Error;
    bosses().deleteHeroBoss?.mockRejectedValueOnce(new InUse());
    await fireEvent.press(editor.getByTestId("boss-delete"));
    await fireEvent.press(await editor.findByText("Delete"));
    expect(await editor.findByText("This boss is still in use")).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
