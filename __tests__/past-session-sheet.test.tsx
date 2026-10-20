import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { PastSessionSheet } from "@/components/journal/PastSessionSheet";
import "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ usePathname: () => "/" }));

const mockToast = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
  showToast: jest.fn(),
};
jest.mock("@/components/common/Toast", () => ({ useToast: () => mockToast }));

const mockCreate = jest.fn();
const mockCorrect = jest.fn();
const mockSetDistance = jest.fn();
const mockRefusal = jest.fn();
jest.mock("@/db/handEntries", () => ({
  getHandDefaults: () => Promise.resolve({ kind: "workout", durationSeconds: null, label: null }),
  loadHandContext: () => Promise.resolve({ handDays: new Set<string>(), measured: [] }),
  refusalFor: (...a: unknown[]) => mockRefusal(...a),
  createHandEntry: (...a: unknown[]) => mockCreate(...a),
  correctHandEntry: (...a: unknown[]) => mockCorrect(...a),
  setHandDistance: (...a: unknown[]) => mockSetDistance(...a),
}));
jest.mock("@/db/quests", () => ({
  listQuestTemplates: () =>
    Promise.resolve([{ id: 3, enTitle: "The Stone Wall", frTitle: "Le Mur" }]),
}));

const onClose = jest.fn();
const onSaved = jest.fn();

function mount(props: Partial<React.ComponentProps<typeof PastSessionSheet>> = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <PastSessionSheet open onClose={onClose} onSaved={onSaved} {...props} />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  for (const m of [mockCreate, mockCorrect, mockSetDistance, mockRefusal, onClose, onSaved]) {
    m.mockReset();
  }
  mockToast.showSuccess.mockReset();
  mockRefusal.mockResolvedValue(null);
  mockCreate.mockResolvedValue({ ok: true, id: 9, xp: 75, flameActive: true, oathKept: false });
});

describe("PastSessionSheet, a session written down", () => {
  it("opens on an answer: workout, 45 minutes, nothing refused, the rule one tap away", async () => {
    await mount();
    expect(await screen.findByText("Add a past session")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Workout", selected: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "45 min", selected: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Today", selected: true })).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("past-session-save")).toBeTruthy());
    expect(screen.queryByTestId("past-session-refusal")).toBeNull();

    await fireEvent.press(screen.getByTestId("past-session-rule-link"));
    expect(screen.getByTestId("past-session-rule").props.children).toBe(
      "A session elsewhere keeps the flame and counts toward the oath, earns the XP of 15 minutes in Bati, and does not hit the boss.",
    );
  });

  it("the day chip names the day the entry is filed under, after a duration change too", async () => {
    // 00:20: a 45-minute entry ending now started yesterday evening, a 20-minute one today.
    jest.useFakeTimers({ now: new Date(2026, 9, 20, 0, 20), advanceTimers: true });
    try {
      await mount();
      await screen.findByText("Add a past session");
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Yesterday", selected: true })).toBeTruthy(),
      );
      await fireEvent.press(screen.getByRole("button", { name: "20 min" }));
      await fireEvent.press(screen.getByRole("button", { name: "Today" }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Today", selected: true })).toBeTruthy(),
      );

      await fireEvent.press(screen.getByRole("button", { name: "45 min" }));
      expect(screen.getByRole("button", { name: "Yesterday", selected: true })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Today", selected: true })).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("saves what the chips say and tells the flame in the Toast", async () => {
    await mount();
    await screen.findByText("Add a past session");
    await waitFor(() => expect(mockRefusal).toHaveBeenCalled());

    await fireEvent.press(screen.getByRole("button", { name: "Run" }));
    await fireEvent.press(screen.getByRole("button", { name: "60 min" }));
    await fireEvent.press(screen.getByTestId("past-session-save"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      kind: "run",
      durationSeconds: 3600,
      distanceM: null,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockToast.showSuccess).toHaveBeenCalledWith("Flame kept, +75 XP");
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 9, xp: 75 }), null);
  });

  it("'Other' with a field that reads as nothing switches Save off instead of keeping the last chip", async () => {
    await mount();
    await screen.findByText("Add a past session");
    await waitFor(() => expect(mockRefusal).toHaveBeenCalled());
    await fireEvent.press(screen.getByRole("button", { name: "Other" }));
    expect(screen.getByTestId("past-session-save").props["aria-disabled"]).toBe(true);
    await fireEvent.press(screen.getByTestId("past-session-save"));
    expect(mockCreate).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId("past-session-custom"), "abc");
    expect(screen.getByTestId("past-session-save").props["aria-disabled"]).toBe(true);
    await fireEvent.changeText(screen.getByTestId("past-session-custom"), "30");
    expect(screen.getByTestId("past-session-save").props["aria-disabled"]).toBe(false);
  });

  it("a cold start reformats the untouched end time when the language arrives", async () => {
    useSettingsStore.setState({ language: "en" });
    await mount();
    await screen.findByText("Add a past session");
    await waitFor(() =>
      expect(screen.getByTestId("past-session-end").props.value).toMatch(/[AP]M/),
    );
    await act(() => {
      useSettingsStore.setState({ language: "fr" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("past-session-end").props.value).toMatch(/^\d{2}:\d{2}$/),
    );
    useSettingsStore.setState({ language: "en" });
  });

  it("saves a typed time and a typed duration the fields never left", async () => {
    await mount();
    await screen.findByText("Add a past session");
    await waitFor(() => expect(mockRefusal).toHaveBeenCalled());

    await fireEvent.changeText(screen.getByTestId("past-session-end"), "18:00");
    await fireEvent.press(screen.getByRole("button", { name: "Other" }));
    await fireEvent.changeText(screen.getByTestId("past-session-custom"), "30");
    await fireEvent.press(screen.getByTestId("past-session-save"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const sent = mockCreate.mock.calls[0]?.[0] as { endedAt: Date; durationSeconds: number };
    expect(sent.durationSeconds).toBe(1800);
    expect([sent.endedAt.getHours(), sent.endedAt.getMinutes()]).toEqual([18, 0]);
  });

  it("says the oath was kept, with the bonus, when it was", async () => {
    mockCreate.mockResolvedValue({ ok: true, id: 9, xp: 325, flameActive: false, oathKept: true });
    await mount();
    await screen.findByText("Add a past session");
    await waitFor(() => expect(mockRefusal).toHaveBeenCalled());
    await fireEvent.press(screen.getByTestId("past-session-save"));
    await waitFor(() => expect(mockToast.showSuccess).toHaveBeenCalledWith("Oath kept, +325 XP"));
  });

  it("with the flame still out it only says the session is noted", async () => {
    mockCreate.mockResolvedValue({ ok: true, id: 9, xp: 75, flameActive: false, oathKept: false });
    await mount();
    await screen.findByText("Add a past session");
    await waitFor(() => expect(mockRefusal).toHaveBeenCalled());
    await fireEvent.press(screen.getByTestId("past-session-save"));
    await waitFor(() =>
      expect(mockToast.showSuccess).toHaveBeenCalledWith("Session noted, +75 XP"),
    );
  });

  it("a refusal takes the place of the rule link, switches the button off, and is not red", async () => {
    mockRefusal.mockResolvedValue({ key: "duration" });
    await mount();
    const line = await screen.findByTestId("past-session-refusal");
    expect(line.props.children).toBe("A session elsewhere counts between 10 minutes and 4 hours.");
    expect(screen.queryByTestId("past-session-rule-link")).toBeNull();
    expect(JSON.stringify(line.props.style ?? [])).not.toMatch(/error/i);
    await fireEvent.press(screen.getByTestId("past-session-save"));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("names the measured session the entry runs into", async () => {
    mockRefusal.mockResolvedValue({
      key: "overlap",
      with: {
        id: 1,
        questId: 3,
        startedAt: new Date(2000, 0, 1, 0, 0),
        endedAt: new Date(2100, 0, 1),
      },
    });
    await mount();
    const line = await screen.findByTestId("past-session-refusal");
    expect(String(line.props.children)).toMatch(/Bati saw you on "The Stone Wall"/);
  });

  it("when the writer refuses after all, the sheet stays open and says why", async () => {
    mockCreate.mockResolvedValue({ ok: false, refusal: { key: "one_per_day", day: "2000-01-01" } });
    await mount();
    await screen.findByText("Add a past session");
    await waitFor(() => expect(mockRefusal).toHaveBeenCalled());
    await fireEvent.press(screen.getByTestId("past-session-save"));
    const line = await screen.findByTestId("past-session-refusal");
    expect(String(line.props.children)).toMatch(/Your session elsewhere on .* is already noted/);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("an outing asks for a distance, an implausible one offers the fix and the way out", async () => {
    mockRefusal.mockResolvedValue({ key: "implausible", speedKmh: 24, fixM: 1200 });
    await mount();
    await screen.findByText("Add a past session");
    await fireEvent.press(screen.getByRole("button", { name: "Run" }));
    const field = await screen.findByTestId("past-session-distance");
    await fireEvent.changeText(field, "12");
    await fireEvent(field, "blur");
    await screen.findByTestId("past-session-fix");
    await fireEvent.press(screen.getByTestId("past-session-fix"));
    expect(screen.getByTestId("past-session-distance").props.value).toBe("1.2");
    await fireEvent.press(screen.getByTestId("past-session-drop"));
    expect(screen.getByTestId("past-session-distance").props.value).toBe("");
  });

  // The refusal went only on Enter or a blur, so a hero who had fixed the value kept reading it.
  it("a refusal goes as soon as the typed distance is plausible, without Enter", async () => {
    mockRefusal.mockResolvedValue({ key: "implausible", speedKmh: 24, fixM: 1200 });
    await mount();
    await screen.findByText("Add a past session");
    await fireEvent.press(screen.getByRole("button", { name: "Run" }));
    const field = await screen.findByTestId("past-session-distance");
    await fireEvent.changeText(field, "12");
    await fireEvent(field, "blur");
    await screen.findByTestId("past-session-refusal");

    mockRefusal.mockResolvedValue(null);
    await fireEvent.changeText(screen.getByTestId("past-session-distance"), "1.2");

    await waitFor(() => expect(screen.queryByTestId("past-session-refusal")).toBeNull());
  });

  it("a refusal goes as soon as a typed 'Other' duration is plausible, without Enter", async () => {
    mockRefusal.mockResolvedValue({ key: "implausible", speedKmh: 24, fixM: 1200 });
    await mount();
    await screen.findByText("Add a past session");
    await fireEvent.press(screen.getByRole("button", { name: "Run" }));
    const field = await screen.findByTestId("past-session-distance");
    await fireEvent.changeText(field, "12");
    await fireEvent(field, "blur");
    await screen.findByTestId("past-session-refusal");

    await fireEvent.press(screen.getByRole("button", { name: "Other" }));
    mockRefusal.mockResolvedValue(null);
    await fireEvent.changeText(screen.getByTestId("past-session-custom"), "90");

    await waitFor(() => expect(screen.queryByTestId("past-session-refusal")).toBeNull());
  });

  it("a workout asks for a name, an outing does not", async () => {
    await mount();
    await screen.findByText("Add a past session");
    expect(screen.getByTestId("past-session-name")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Walk" }));
    expect(screen.queryByTestId("past-session-name")).toBeNull();
    expect(screen.getByTestId("past-session-distance")).toBeTruthy();
  });

  it("another day unfolds the seven days, each read in full to a screen reader", async () => {
    await mount();
    await screen.findByText("Add a past session");
    await fireEvent.press(screen.getByRole("button", { name: "Another day" }));
    expect(screen.queryByRole("button", { name: "Another day" })).toBeNull();
    // Today, yesterday and six more: eight chips.
    expect(screen.getByRole("button", { name: "Yesterday" })).toBeTruthy();
    const longDates = screen
      .getAllByRole("button")
      .filter((b) => /\d{1,2}, 20|October|September/.test(String(b.props.accessibilityLabel)));
    expect(longDates.length).toBeGreaterThanOrEqual(5);
  });
});

describe("PastSessionSheet, correcting and adding a distance", () => {
  const target = {
    id: 12,
    kind: "walk" as const,
    endedAt: new Date(2026, 9, 16, 18, 0),
    durationSeconds: 50 * 60,
    label: null,
    distanceM: 3800,
  };

  it("a correction opens on the entry, titled so, with a 50 minute duration as 'Other'", async () => {
    mockCorrect.mockResolvedValue({ ok: true, id: 12, xp: 75, flameActive: true, oathKept: false });
    await mount({ target });
    expect(await screen.findByText("Correct the session")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Other", selected: true })).toBeTruthy();
    expect(screen.getByTestId("past-session-custom").props.value).toBe("50");
    expect(screen.getByTestId("past-session-distance").props.value).toBe("3.8");
    await fireEvent.press(screen.getByTestId("past-session-save"));
    await waitFor(() =>
      expect(mockCorrect).toHaveBeenCalledWith(
        12,
        expect.objectContaining({ kind: "walk", durationSeconds: 3000, distanceM: 3800 }),
      ),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("the distance mode is one field, its own rule, and no Toast", async () => {
    mockSetDistance.mockResolvedValue({
      ok: true,
      id: 12,
      xp: 90,
      flameActive: true,
      oathKept: false,
    });
    await mount({ mode: "distance", target: { ...target, distanceM: null } });
    expect(await screen.findByText("Add the distance")).toBeTruthy();
    expect(screen.queryByTestId("past-session-name")).toBeNull();
    expect(screen.queryByRole("button", { name: "Run" })).toBeNull();
    await fireEvent.press(screen.getByTestId("past-session-rule-link"));
    expect(screen.getByTestId("past-session-rule").props.children).toMatch(
      /Without GPS, your outing counts by time/,
    );

    await fireEvent.changeText(screen.getByTestId("past-session-distance"), "3,8");
    await fireEvent.press(screen.getByTestId("past-session-save"));
    await waitFor(() => expect(mockSetDistance).toHaveBeenCalledWith(12, 3800));
    expect(mockToast.showSuccess).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
