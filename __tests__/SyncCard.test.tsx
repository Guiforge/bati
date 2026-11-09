import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

/**
 * The Home card is where a sync that stopped, waits on the hero or keeps failing becomes visible.
 * The audit found a sync gone "Off" that nobody would have noticed in Settings; asserted here is
 * which state wins, and what each button leaves behind.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (href: string) => mockPush(href) } }));

const mockState = {
  lost: null as string | null,
  health: { lastSuccessAt: null, failure: null, failingSince: null } as {
    lastSuccessAt: number | null;
    failure: unknown;
    failingSince: number | null;
  },
  merge: null as null | { sessions: number; kept: string | null; seen: boolean },
  apart: null as null | { name: string; days: number },
};
const mockApartClosed = jest.fn(() => Promise.resolve());
const mockForgot = jest.fn(() => Promise.resolve());
jest.mock("@/src/deviceSync", () => ({
  lostSync: () => Promise.resolve(mockState.lost),
  syncHealth: () => Promise.resolve(mockState.health),
  lastMerge: () => Promise.resolve(mockState.merge),
  forgetLostSync: () => mockForgot(),
  dismissMergeCard: () => Promise.resolve(),
  p2pApart: () => Promise.resolve(mockState.apart),
  dismissP2pApart: () => mockApartClosed(),
}));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));

import { SyncCard } from "@/components/home/SyncCard";
import { useSyncStore } from "@/stores/sync";
import config from "@/tamagui.config";

const card = () =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <SyncCard />
    </TamaguiProvider>,
  );

beforeEach(() => {
  mockState.lost = null;
  mockState.health = { lastSuccessAt: null, failure: null, failingSince: null };
  mockState.merge = null;
  mockPush.mockClear();
  mockForgot.mockClear();
  useSyncStore.setState({ result: null, failure: null, lastSyncAt: null, offered: [] });
});

test("a sync that stopped by itself outranks everything, and forgetting it says so for good", async () => {
  mockState.lost = "cloud.test";
  mockState.merge = { sessions: 2, kept: null, seen: false };
  await card();
  await waitFor(() => expect(screen.getByTestId("home-sync-lost")).toBeTruthy());
  expect(screen.queryByTestId("home-sync-merged")).toBeNull();

  await fireEvent.press(screen.getByTestId("home-sync-lost-close"));
  expect(mockForgot).toHaveBeenCalled();
});

test("a device waiting for its password: the button asks the question again", async () => {
  useSyncStore.setState({
    result: {
      uploaded: false,
      peers: [{ name: "bati-t.batb", etag: "e", state: "locked", format: 2 }],
    },
    offered: ["bati-t.batb@locked", "other@f1"],
  });
  await card();
  await waitFor(() => expect(screen.getByTestId("home-sync-waiting")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("home-sync-waiting-action"));
  expect(useSyncStore.getState().offered).toEqual(["other@f1"]);
});

test("a failure is news on Home only after days, not after one bad launch", async () => {
  useSyncStore.setState({ failure: { kind: "credentials" } });
  mockState.health = { lastSuccessAt: null, failure: null, failingSince: Date.now() - 60_000 };
  await card();
  await act(async () => {});
  expect(screen.queryByTestId("home-sync-failing")).toBeNull();

  mockState.health = { ...mockState.health, failingSince: Date.now() - 4 * 86_400_000 };
  useSyncStore.setState({ lastSyncAt: 1 });
  await waitFor(() => expect(screen.getByTestId("home-sync-failing")).toBeTruthy());
});

test("sessions that arrived by merge are shown until the card is closed", async () => {
  mockState.merge = { sessions: 3, kept: "bati-x-kept.batb", seen: false };
  await card();
  await waitFor(() => expect(screen.getByTestId("home-sync-merged")).toBeTruthy());
  expect(screen.getByText("sync.card.mergedKept")).toBeTruthy();
});

test("two weeks apart from the linked device: said once, with no alarm, and closed for good (E1)", async () => {
  mockState.apart = { name: "Pixel 7", days: 15 };
  await card();
  await waitFor(() => expect(screen.getByTestId("home-sync-apart")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("home-sync-apart-close"));
  expect(mockApartClosed).toHaveBeenCalled();
  expect(screen.queryByTestId("home-sync-apart")).toBeNull();
  mockState.apart = null;
});

test("nothing at all while sync is fine", async () => {
  await card();
  await act(async () => {});
  expect(screen.toJSON()).toBeNull();
});
