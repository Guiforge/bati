import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import type { JournalEntry } from "@/components/journal/SessionCard";
import { SessionCard } from "@/components/journal/SessionCard";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: object) => unknown) =>
    selector({ language: "en", distanceUnit: "metric" }),
}));

const mockFirst = jest.fn();
jest.mock("@/db/sessionPhotos", () => ({
  firstSessionPhoto: (uuid: string) => mockFirst(uuid),
}));

const entry: JournalEntry = {
  id: 1,
  questTitle: "Quest",
  performedAt: new Date("2026-01-01T10:00:00.000Z"),
  durationSeconds: 300,
  xpEarned: 0,
  userLevel: "medium",
  leaguesM: null,
  movingSeconds: null,
  outing: null,
  tracePoints: [],
  uuid: "s1",
  photoCount: 2,
  firstPhotoUuid: "p1",
};

function tree(e: JournalEntry) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <SessionCard entry={e} />
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

describe("SessionCard photo", () => {
  test("a removed first photo changes the image shown, and a pending read shows the hold", async () => {
    mockFirst.mockResolvedValueOnce("data:image/jpeg;base64,AAAA");
    let view!: Awaited<ReturnType<typeof render>>;
    await act(async () => {
      view = await render(tree(entry));
    });
    expect(screen.getByTestId("journal-card-photo").props.source).toEqual([
      { uri: "data:image/jpeg;base64,AAAA" },
    ]);

    let resolve!: (v: string) => void;
    mockFirst.mockReturnValueOnce(new Promise<string>((r) => (resolve = r)));
    await act(async () => {
      await view.rerender(tree({ ...entry, photoCount: 1, firstPhotoUuid: "p2" }));
    });
    expect(screen.queryByTestId("journal-card-photo")).toBeNull();
    expect(screen.getByTestId("journal-card-photo-hold")).toBeTruthy();

    await act(async () => resolve("data:image/jpeg;base64,BBBB"));
    expect(screen.getByTestId("journal-card-photo").props.source).toEqual([
      { uri: "data:image/jpeg;base64,BBBB" },
    ]);
  });
});
