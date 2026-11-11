import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import QuestImportScreen from "@/app/quest-import";
import type { Monster } from "@/db/heroAdventures";
import { holdIncomingFile } from "@/src/incomingFile";
import { PACK_FILE_REFUSALS, type PackChoices, type PackPreview } from "@/src/packFile";
import config from "@/tamagui.config";

/**
 * The list a pack opens on (`components/quests/PackImport.tsx`). The file is parsed by the real
 * reader (`parsePackData`); only the reads of the database and the write are stand-ins, so the
 * screen is judged on what it ticks by itself and on the choices the import receives. What those
 * choices write is held on a real database, in `test/node/quests/pack-import.test.ts`.
 */
const mockRead = jest.fn();
const mockPreview = jest.fn();
const mockImport = jest.fn();
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  dismissTo: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(),
};
const mockParams: { n?: string } = {};
const mockSettings = { language: "en", distanceUnit: "metric" };

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@/stores/settings", () => {
  const useSettingsStore = (pick: (s: typeof mockSettings) => unknown) => pick(mockSettings);
  useSettingsStore.getState = () => mockSettings;
  return { useSettingsStore };
});
jest.mock("@/src/questFile", () => ({
  ...jest.requireActual("@/src/questFile"),
  readBatiFile: (...a: unknown[]) => mockRead(...a),
}));
jest.mock("@/src/packFile", () => ({
  ...jest.requireActual("@/src/packFile"),
  previewPack: (...a: unknown[]) => mockPreview(...a),
  importPack: (...a: unknown[]) => mockImport(...a),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const id = (n: number) => `0192c000-0000-7000-8000-0000000000${String(n).padStart(2, "0")}`;
const PUSH = id(1);
const DIP = id(2);
const HANG = id(3);
const MORNING = id(11);
const EVENING = id(12);
const BOSS = id(21);
const ROAD = id(31);

const movement = (uuid: string, name: string) => ({
  uuid,
  name,
  description: "",
  image: "",
  muscles: [],
  style: "strength",
  difficulty: "medium",
  equipment: "none",
  pattern: null,
  measure: "reps",
  perSide: false,
  secondsPerRep: 3,
});
const quest = (uuid: string, title: string, refs: string[]) => ({
  quest: {
    uuid,
    title: { en: title },
    description: { en: "" },
    rounds: 3,
    restSeconds: 30,
    roundRestSeconds: null,
    image: null,
  },
  slots: refs.map((ref) => ({ movement: { ref }, target: { type: "reps", min: 8, max: 12 } })),
});

/** New: a movement, a quest, a boss, an adventure. A namesake movement. Already here: a movement and a quest. */
const raw = {
  kind: "bati-pack",
  version: 1,
  movements: [
    movement(PUSH, "Porch push"),
    movement(DIP, "Garden dip"),
    movement(HANG, "Fence hang"),
  ],
  quests: [quest(MORNING, "Iron morning", [PUSH, DIP]), quest(EVENING, "Iron evening", [HANG])],
  bosses: [{ kind: "boss", monster: "stone_golem", name: "The landlord", bossUuid: BOSS }],
  adventures: [
    {
      adventure: {
        uuid: ROAD,
        title: "The long road",
        description: "",
        cover: null,
        end: { kind: "boss", ref: BOSS },
      },
      steps: [
        { quest: { ref: MORNING }, narrative: "", outro: "" },
        { quest: { official: "Iron Dawn" }, narrative: "", outro: "" },
      ],
    },
  ],
};

const golem: Monster = {
  key: "stone_golem",
  bossImagePath: "assets/images/bosses/stone_golem.jpg",
  weakness: null,
  resistance: null,
};

const preview = (): PackPreview => ({
  movements: [
    { here: false, sameName: false },
    { here: false, sameName: true },
    { here: true, sameName: false },
  ],
  quests: [
    { here: false, id: null, slots: 2, importable: true },
    { here: true, id: 9, slots: 1, importable: true },
  ],
  bosses: [{ here: false, monster: golem, importable: true }],
  adventures: [{ here: false, running: false, monster: golem, importable: true }],
});

function wrap(children: ReactNode) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        {children}
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

async function mountReady() {
  await render(wrap(<QuestImportScreen />));
  await screen.findByTestId("pack-import-confirm");
}

const row = (name: string) => screen.getByTestId(`pack-import-${name}`);
const ticked = (name: string) => row(name).props.accessibilityState.checked as boolean;
/** The choices the import received, as arrays. */
async function imported() {
  await fireEvent.press(screen.getByTestId("pack-import-confirm"));
  const choices = mockImport.mock.calls.at(-1)?.[1] as PackChoices;
  return Object.fromEntries(Object.entries(choices).map(([k, v]) => [k, [...v].sort()]));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.n = holdIncomingFile("content://chat/everything.bati.json");
  mockSettings.language = "en";
  mockRead.mockResolvedValue(raw);
  mockPreview.mockResolvedValue(preview());
  mockImport.mockResolvedValue({ movements: 1, quests: 1, bosses: 1, adventures: 1 });
  mockRouter.canGoBack.mockReturnValue(false);
});

test("what is new arrives ticked, what is already here does not, and a namesake lands on the hero's own", async () => {
  await mountReady();

  expect(screen.getByText("Creations received")).toBeTruthy();
  expect(ticked("adventures-0")).toBe(true);
  expect(ticked("quests-0")).toBe(true);
  expect(ticked("quests-1")).toBe(false);
  expect(ticked("movements-0")).toBe(true);
  expect(ticked("movements-1")).toBe(false);
  expect(ticked("movements-2")).toBe(false);
  // The quest and the adventure it comes with count once; the namesake does not arrive.
  expect(screen.getByText("Import 4 creations")).toBeTruthy();

  expect(await imported()).toEqual({
    adventures: [ROAD],
    quests: [MORNING],
    bosses: [BOSS],
    movements: [PUSH],
    useMine: [DIP],
  });
  expect(mockShowSuccess).toHaveBeenCalledWith("4 creations added to your Forge");
  expect(mockRouter.dismissTo).toHaveBeenCalledWith("/forge");
});

test("keeping both sends the namesake in and merges nothing", async () => {
  await mountReady();

  await fireEvent.press(row("movements-1-both"));
  expect(ticked("movements-1")).toBe(true);
  expect(await imported()).toMatchObject({ movements: [PUSH, DIP], useMine: [] });
});

test("a quest already here is replaced only once the hero ticks it", async () => {
  await mountReady();

  expect(
    screen.getByText(/Already on your phone. Tick it to replace yours with this version./),
  ).toBeTruthy();
  await fireEvent.press(row("quests-1"));
  expect(await imported()).toMatchObject({ quests: [MORNING, EVENING] });
});

test("what a ticked adventure brings is locked in, and free again once it is unticked", async () => {
  await mountReady();

  expect(row("quests-0").props.accessibilityState.disabled).toBe(true);
  expect(row("bosses-0").props.accessibilityState.disabled).toBe(true);

  await fireEvent.press(row("adventures-none"));
  expect(row("quests-0").props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(row("quests-0"));
  await fireEvent.press(row("bosses-0"));
  // Nothing names the movements any more: the one ticked on its own is all that is left.
  expect(screen.getByText("Import 1 creation")).toBeTruthy();
  expect(await imported()).toEqual({
    adventures: [],
    quests: [],
    bosses: [],
    movements: [PUSH],
    useMine: [DIP],
  });
});

// The boss is the surprise of someone else's adventure. Its picture is also a stranger's picture,
// so it is hidden and not withheld: one tap shows it.
test("an adventure says a boss waits and shows nothing of it until asked", async () => {
  await mountReady();

  expect(screen.getByText(/A boss waits at the end./)).toBeTruthy();
  expect(screen.queryByTestId("pack-import-adventures-0-boss-art")).toBeNull();
  await fireEvent.press(row("adventures-0-boss"));
  expect(screen.getByTestId("pack-import-adventures-0-boss-art")).toBeTruthy();
});

test("nothing ticked is nothing to import", async () => {
  await mountReady();

  for (const kind of ["adventures", "quests", "bosses", "movements"]) {
    await fireEvent.press(row(`${kind}-none`));
  }
  expect(screen.getByText("Tick at least one row.")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("pack-import-confirm"));
  expect(mockImport).not.toHaveBeenCalled();
});

test("a pack from a newer Bati is refused in words, before any preview", async () => {
  mockRead.mockResolvedValue({ ...raw, version: 2 });
  await render(wrap(<QuestImportScreen />));

  expect(
    await screen.findByText("This file comes from a newer Bati. Update the app to open it."),
  ).toBeTruthy();
  expect(mockPreview).not.toHaveBeenCalled();
});

test("a pack that names a movement it does not list is refused", async () => {
  mockRead.mockResolvedValue({ ...raw, movements: raw.movements.slice(0, 1) });
  await render(wrap(<QuestImportScreen />));

  expect(await screen.findByText("This file does not come from Bati.")).toBeTruthy();
});

test("every refusal and every outcome has its sentence in the six languages", () => {
  const keys = [...PACK_FILE_REFUSALS.map((reason) => `import_${reason}`), "import_failed"];
  for (const lang of ["fr", "en", "de", "es", "ru", "zh"]) {
    const { packs } = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "locales", `${lang}.json`), "utf8"),
    ) as { packs: Record<string, string> };
    for (const key of keys) expect(packs[key]).toEqual(expect.any(String));
  }
});
