import { render, screen, waitFor } from "@testing-library/react-native";
import { View } from "react-native";
import { TamaguiProvider } from "tamagui";
import config from "@/tamagui.config";

/**
 * Five notices at once, one on screen: the roadmap's "Fini quand". The modules the predicates read
 * are mocked, never `pickNotice`: a test that stubs the rule cannot see the rule drift.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), [cb]);
  },
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

const mockRecovery = {
  recoverableSession: null as null | { questTitle: string },
  isChecking: false,
  recoverSession: jest.fn(),
  finishSession: jest.fn(),
  discardSession: jest.fn(),
};
jest.mock("@/hooks/useSessionRecovery", () => ({ useSessionRecovery: () => mockRecovery }));

const mockReads = {
  lost: "cloud.example" as string | null,
  notes: true,
  update: "9.9.9" as string | null,
  protect: false,
  reminder: "offer" as string | null,
  password: false,
  lightWeek: "under" as string | null,
  rhythm: false,
};
jest.mock("@/src/deviceSync", () => ({
  lostSync: async () => mockReads.lost,
  syncHealth: async () => ({ lastSuccessAt: null, failure: null, failingSince: null }),
  lastMerge: async () => null,
}));
jest.mock("@/src/whatsNew", () => ({
  hasUnseenNotes: async () => mockReads.notes,
  releaseNotes: () => ["a line"],
}));
jest.mock("@/src/updateCheck", () => ({ checkForUpdate: async () => mockReads.update }));
jest.mock("@/src/protectHero", () => ({ protectCardVisible: async () => mockReads.protect }));
jest.mock("@/src/reminders", () => ({ reminderCardKind: async () => mockReads.reminder }));
jest.mock("@/db/lightWeek", () => ({
  lightWeekReason: async () => mockReads.lightWeek,
  lightWeekUntil: async () => (mockReads.rhythm ? new Date() : null),
}));
jest.mock("@/db/pause", () => ({ getActivePause: async () => null }));
jest.mock("@/src/passwordReminders", () => ({ passwordCheckDue: async () => mockReads.password }));

// The cards are stubs: what is asked is who gets the slot, each card has its own test.
const stub = (testID: string) => () => <View testID={testID} />;
jest.mock("@/components/session/SessionRecoveryCard", () => ({
  SessionRecoveryCard: ({ session }: { session: { questTitle: string } }) => {
    const { Text } = require("react-native");
    return <Text testID="home-recovery">{session.questTitle}</Text>;
  },
}));
jest.mock("@/components/home/LightWeekCard", () => ({ LightWeekCard: stub("home-light-week") }));
jest.mock("@/components/home/RhythmLine", () => ({ RhythmLine: stub("home-rhythm") }));
jest.mock("@/components/home/SyncCard", () => ({ SyncCard: stub("home-sync-lost") }));
jest.mock("@/components/home/WhatsNewCard", () => ({ WhatsNewCard: stub("home-whats-new-open") }));
jest.mock("@/components/home/UpdateCard", () => ({ UpdateCard: stub("home-update-dismiss") }));
jest.mock("@/components/home/ProtectCard", () => ({ ProtectCard: stub("home-protect") }));
jest.mock("@/components/home/ReminderCard", () => ({ ReminderCard: stub("home-reminder-offer") }));
jest.mock("@/components/home/PasswordCheckCard", () => ({
  PasswordCheckCard: stub("home-password-check"),
}));

import { NoticeSlot } from "@/components/home/NoticeSlot";
import { useChorusStore } from "@/stores/chorus";
import { useSettingsStore } from "@/stores/settings";

const ALL = [
  "home-recovery",
  "home-sync-lost",
  "home-light-week",
  "home-rhythm",
  "home-whats-new-open",
  "home-update-dismiss",
  "home-protect",
  "home-reminder-offer",
  "home-password-check",
];

async function mount() {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <NoticeSlot />
    </TamaguiProvider>,
  );
}
const shown = () => ALL.filter((id) => screen.queryByTestId(id) !== null);

beforeEach(() => {
  mockRecovery.recoverableSession = { questTitle: "Squats" };
  Object.assign(mockReads, {
    lost: "cloud.example",
    notes: true,
    update: "9.9.9",
    protect: true,
    reminder: "offer",
    password: true,
    lightWeek: "under",
    rhythm: false,
  });
  useSettingsStore.setState({ updateCheckEnabled: true });
});

describe("NoticeSlot", () => {
  test("with every notice due, only the interrupted session shows", async () => {
    await mount();
    await waitFor(() => expect(shown()).toEqual(["home-recovery"]));
  });

  test("without a session to resume, only the sync notice shows", async () => {
    mockRecovery.recoverableSession = null;
    await mount();
    await waitFor(() => expect(shown()).toEqual(["home-sync-lost"]));
  });

  test("each notice in turn once the one above it is gone", async () => {
    mockRecovery.recoverableSession = null;
    const order: [Partial<typeof mockReads>, string][] = [
      [{ lost: null }, "home-light-week"],
      [{ lightWeek: null }, "home-whats-new-open"],
      [{ notes: false }, "home-update-dismiss"],
      [{ update: null }, "home-protect"],
      [{ protect: false }, "home-reminder-offer"],
      [{ reminder: null }, "home-password-check"],
    ];
    for (const [change, expected] of order) {
      Object.assign(mockReads, change);
      await mount();
      await waitFor(() => expect(shown()).toEqual([expected]));
      await screen.unmount();
    }
  });

  test("while the Sage welcomes the hero back, no card shares the screen with him", async () => {
    mockRecovery.recoverableSession = null;
    useChorusStore.setState({
      current: { id: 1, owner: "home", moment: "comeback", villager: "sage", pose: "talk", line: "x" },
    });
    await mount();
    await waitFor(() => expect(screen.queryByTestId("home-sync-lost")).toBeNull());
    expect(shown()).toEqual([]);
    useChorusStore.setState({ current: null });
    await waitFor(() => expect(shown()).toEqual(["home-sync-lost"]));
  });

  test("a running week takes the slot ahead of the backup card, never beside it", async () => {
    mockRecovery.recoverableSession = null;
    Object.assign(mockReads, {
      lost: null,
      lightWeek: null,
      rhythm: true,
      notes: false,
      update: null,
    });
    await mount();
    await waitFor(() => expect(shown()).toEqual(["home-rhythm"]));
  });

  test("an update the hero did not ask to hear about is not a notice", async () => {
    mockRecovery.recoverableSession = null;
    Object.assign(mockReads, { lost: null, lightWeek: null, notes: false });
    useSettingsStore.setState({ updateCheckEnabled: false });
    await mount();
    await waitFor(() => expect(shown()).toEqual(["home-protect"]));
  });
});
