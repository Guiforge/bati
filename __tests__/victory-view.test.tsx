import { act, fireEvent, render } from "@testing-library/react-native";
import { processColor, StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { VictoryView } from "@/components/session/VictoryView";
import { LEVEL_CARD_HEIGHT } from "@/constants/layout";
import { fade, rawColors } from "@/constants/rawColors";
import { getAdventureStepOutroNarrative } from "@/db/adventures-narrative";
import type { Quest } from "@/db/quests";
import { useChorusStore } from "@/stores/chorus";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * BUG-010. The session is saved on mount, and the "how did that feel" buttons render straight
 * away — so a hero who taps a feeling before the save resolves has no session id to write it
 * against. The old code wrote from the tap handler under `if (result)`, which silently dropped
 * exactly those taps: the button lit up, the row kept `feedback: null`, and nothing said so.
 */

const mockUpdateSessionFeedback = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockQuitSession = jest.fn();
const mockMarkBigFeastShown = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useIsFocused: () => true,
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/completed", () => ({
  updateSessionFeedback: (...args: unknown[]) => mockUpdateSessionFeedback(...args),
}));
jest.mock("@/db/adventures-narrative", () => ({
  getAdventureStepOutroNarrative: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/db/quests", () => ({ isDailyQuest: () => false }));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn().mockResolvedValue(null),
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
    getWarmupEnabled: jest.fn().mockResolvedValue(false),
    markBigFeastShown: (...args: unknown[]) => mockMarkBigFeastShown(...args),
  },
}));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ success: jest.fn(), selection: jest.fn() }),
}));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn() }),
}));
jest.mock("@/components/session/ProgressionChart", () => ({ ProgressionChart: () => null }));

const SESSION_ID = 42;

type StoreState = ReturnType<typeof useSessionStore.getState>;
type Campaign = Awaited<ReturnType<StoreState["saveSession"]>>["campaign"];

const saveResult = {
  sessionId: SESSION_ID,
  xpEarned: 100,
  levelUp: null,
  dailyBonusXp: 0,
  heroXp: { before: 50, after: 150 },
  villageGrowth: [],
  campaign: null as Campaign,
  fulfilledOath: null,
  tierUp: null,
  // What "Tonight" reads, all of it: `saveSession` always returns these, and a fixture that
  // omitted one would crash the ranking rather than say nothing.
  standing: null,
  newRungs: [],
  newAchievements: [],
  oathBonusXp: 0,
  crestEvents: { secondJoins: null, stageUp: [] },
  crestReveal: null as null | { animal: string; quarters: null; firstEight: []; late: boolean },
  bigFeastsShown: [] as string[],
  // `SaveResult` declares this required and `saveSession` always returns it; the fixture is cast
  // through `as unknown` and so was free to omit it until something read it. The villager cameo
  // does — it asks whether this session set a record before deciding who, if anyone, speaks.
  newRecords: [],
};

const BEAR = { animal: "bear", quarters: null, firstEight: [] as [], late: false };

const mockQuest = {
  id: 1,
  rounds: 1,
  restSeconds: 0,
  enTitle: "Quest",
  frTitle: "Quête",
  imagePath: "assets/placeholder.jpg",
  // A real slot, because the screen now shows the duration the journal will keep and that is
  // clamped by what the quest asks for. A quest with no exercises estimates at zero seconds, so
  // every session of it would be filed as zero and questioned as a false start.
  exercises: [
    {
      exercise: { id: 1, enName: "Plank", muscles: ["abs"], style: "strength", secondsPerRep: 3 },
      target: { type: "time", value: 600 },
    },
  ],
} as unknown as Quest;

/** Mount with the save deliberately left in flight; call the returned fn to let it land. */
async function mountWithPendingSave(
  campaign: Campaign = null,
  sessionSeconds = 12 * 60,
  over: Record<string, unknown> = {},
) {
  let release!: () => void;
  let fail!: () => void;
  const pending = new Promise((resolve, reject) => {
    release = () => resolve({ ...saveResult, campaign, ...over });
    fail = () => reject(new Error("disk full"));
  });
  // Counted, because "nothing was saved" is a claim about the store, not about a spinner.
  const saveSession = jest.fn(() => pending);

  type SessionState = ReturnType<typeof useSessionStore.getState>;
  useSessionStore.setState({
    quest: mockQuest,
    status: "finished",
    // Twelve minutes by default, which is a session by the design window every seeded quest is
    // held to. It was a flat 60 s, an arbitrary stand-in for "a workout happened", and once
    // VictoryView learned to ask about anything under two minutes (TRIVIAL_SESSION_SECONDS) that
    // stand-in was a false start: every test here sat on the prompt instead of the save.
    startTime: Date.now() - sessionSeconds * 1000,
    totalPausedTime: 0,
    adventureRunStepId: null,
    bossFight: null,
    results: [],
    // The point of the test is a save that has not resolved yet, so the real one is replaced
    // by a promise this test opens and closes by hand.
    saveSession: saveSession as unknown as SessionState["saveSession"],
    quitSession: mockQuitSession as unknown as SessionState["quitSession"],
  } as unknown as Partial<SessionState>);

  const view = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <VictoryView />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

  return {
    view,
    saveSession,
    release: async () => await act(async () => release()),
    fail: async () => await act(async () => fail()),
  };
}

describe("VictoryView feedback", () => {
  beforeEach(() => {
    mockUpdateSessionFeedback.mockClear();
    mockPush.mockClear();
    mockQuitSession.mockClear();
  });

  it("asks how it went with glyphs, not emoji", async () => {
    const { view } = await mountWithPendingSave();
    for (const emoji of ["😊", "💪", "😤"]) expect(view.queryByText(emoji)).toBeNull();
    for (const v of ["easy", "good", "hard"]) {
      expect(view.getByTestId(`feedback-glyph-${v}`)).toBeTruthy();
      expect(view.getByLabelText(`session.feedback_${v}`)).toBeTruthy();
    }
  });

  it("leaves the feeling buttons inactive while the save is in flight", async () => {
    const { view, release } = await mountWithPendingSave();

    // Tonight arrives with the save and has no reserved height: a tap now could land on its content.
    const hard = view.getByLabelText("session.feedback_hard");
    expect(hard).toBeDisabled();
    await fireEvent.press(hard);
    await release();

    expect(mockUpdateSessionFeedback).not.toHaveBeenCalled();
    const after = view.getByLabelText("session.feedback_hard");
    expect(after).toBeEnabled();
  });

  // Inactive reads as inactive in this app: a quiet surface and an ash label (AppButton, dimmed).
  it("shows the feeling buttons inactive while saving, and lit once saved", async () => {
    const { view, release } = await mountWithPendingSave();
    const ink = (v: string) =>
      StyleSheet.flatten(view.getByText(`session.feedback_${v}`).props.style).color;
    const dark = config.themes.dark as unknown as Record<string, { val: string }>;

    expect(ink("hard")).toBe(dark.textSecondary?.val);
    await release();
    expect(ink("hard")).toBe(dark.text?.val);
  });

  it("greys the feeling buttons' fill and icon while saving, and lights both once saved", async () => {
    const { view, release } = await mountWithPendingSave();
    const dark = config.themes.dark as unknown as Record<string, { val: string }>;
    const fill = () =>
      StyleSheet.flatten(view.getByLabelText("session.feedback_hard").props.style).backgroundColor;
    // The glyph's wrapper carries the testID; the image inside carries the processed tint.
    const icon = () =>
      Number(
        JSON.stringify(view.toJSON())
          .split('"testID":"feedback-glyph-hard"')[1]
          ?.match(/"tintColor":(\d+)/)?.[1],
      );

    expect(fill()).toBe(dark.surface2?.val);
    expect(icon()).toBe(processColor(dark.textSecondary?.val));
    await release();
    expect(fill()).toBe(dark.surface?.val);
    expect(icon()).toBe(processColor(dark.text?.val));
  });

  it("persists a feeling tapped after the save landed", async () => {
    const { view, release } = await mountWithPendingSave();
    await release();

    await fireEvent.press(view.getByLabelText("session.feedback_easy"));

    expect(mockUpdateSessionFeedback).toHaveBeenCalledWith(SESSION_ID, "easy");
  });

  it("writes nothing when the hero never picks a feeling", async () => {
    const { release } = await mountWithPendingSave();
    await release();

    expect(mockUpdateSessionFeedback).not.toHaveBeenCalled();
  });

  it("clears the feeling when the same button is tapped twice", async () => {
    const { view, release } = await mountWithPendingSave();
    await release();

    await fireEvent.press(view.getByLabelText("session.feedback_good"));
    await fireEvent.press(view.getByLabelText("session.feedback_good"));

    expect(mockUpdateSessionFeedback).toHaveBeenLastCalledWith(SESSION_ID, null);
  });
});

/**
 * `handleViewVillage` used to call `quitSession()` before pushing the village, so the store
 * emptied and `/session` redirected home the moment the hero came back — rewards, records,
 * achievements and "continue the campaign" below the fold became unreachable for good. Only the
 * village button may leave the store populated; `handleContinue` still tears it down (untested
 * here — it is the existing, correct behaviour).
 */
describe("VictoryView village navigation", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockQuitSession.mockClear();
  });

  const grew = {
    villageGrowth: [
      {
        code: "forge",
        enName: "Forge",
        frName: "Forge",
        deName: "Schmiede",
        esName: "Forja",
        relatedMuscle: null,
        oldLevel: 1,
        newLevel: 2,
      },
    ],
  };

  it("viewing the village does not tear down the session — the hero can come back to the rewards", async () => {
    const { view, release } = await mountWithPendingSave(null, 12 * 60, grew);
    await release();

    await fireEvent.press(view.getByTestId("tonight-view-village"));

    expect(mockQuitSession).not.toHaveBeenCalled();
    // The levels travel with the codes: the village plays the rise from one rung to the next.
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/village?grown=forge:1:2");
  });

  it("offers the village on a night it grew, and only then", async () => {
    const quiet = await mountWithPendingSave();
    await quiet.release();
    expect(quiet.view.queryByTestId("tonight-view-village")).toBeNull();
    await quiet.view.unmount();

    const tier = await mountWithPendingSave(null, 12 * 60, { tierUp: { oldTier: 2, newTier: 3 } });
    await tier.release();
    expect(tier.view.getByTestId("tonight-view-village")).toBeTruthy();
  });
});

/**
 * `handleContinue`'s two campaign branches. `campaign.adventureId` used to be threaded into the
 * `isFinished` branch but dropped from the mid-campaign one, so finishing step 1 of a multi-step
 * campaign landed the hero on step 2's quest sheet with no `adventureId` — the chevron there sent
 * them to the quests gallery instead of back to the adventure. Both branches must also keep
 * `{ withAnchor: true }`, the hardware-back guarantee from commit 0b41d31.
 */
describe("VictoryView continue navigation", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockQuitSession.mockClear();
  });

  it("mid-campaign continue carries both runStepId and adventureId", async () => {
    const { view, release } = await mountWithPendingSave({
      adventureId: 7,
      runId: 1,
      isFinished: false,
      nextRunStepId: 3,
      nextQuestId: 9,
    });
    await release();

    await fireEvent.press(view.getByTestId("session-victory-continue"));

    expect(mockQuitSession).toHaveBeenCalled();
    const [url, options] = mockReplace.mock.calls[0] ?? [];
    expect(url).toEqual(expect.stringContaining("/quests/9"));
    expect(url).toEqual(expect.stringContaining("runStepId=3"));
    expect(url).toEqual(expect.stringContaining("adventureId=7"));
    expect(options).toEqual({ withAnchor: true });
  });

  it("campaign finished returns to the adventure", async () => {
    const { view, release } = await mountWithPendingSave({
      adventureId: 7,
      runId: 1,
      isFinished: true,
      nextRunStepId: null,
      nextQuestId: null,
    });
    await release();

    await fireEvent.press(view.getByTestId("session-victory-continue"));

    expect(mockReplace).toHaveBeenCalledWith("/adventures/7", { withAnchor: true });
  });
});

describe("VictoryView, a session too short to be one", () => {
  beforeEach(() => {
    mockQuitSession.mockClear();
    mockReplace.mockClear();
  });

  // A time set records whatever the clock said when the hero tapped done, so five seconds
  // outside writes a row that counts toward the streak and toward the eight-week oath. The
  // save is held back and the hero is asked, because they are the only one who knows whether
  // that was the outing or a false start.
  it("asks instead of saving, and saves nothing until the hero says to", async () => {
    const { view, saveSession } = await mountWithPendingSave(null, 5);

    expect(view.getByText("session.summary_too_short_title")).toBeTruthy();
    expect(saveSession).not.toHaveBeenCalled();
  });

  it("offers Discard as an outline AppButton: the family's label face, bone ink", async () => {
    const { view } = await mountWithPendingSave(null, 5);

    const label = StyleSheet.flatten(
      view.getByText("session.summary_too_short_discard").props.style,
    );
    expect(label.fontFamily).toBe(config.fonts.heading.face[700].normal);
    expect(label.color).toBe(rawColors.text);
  });

  it("discarding takes the quit path, which writes nothing at all", async () => {
    const { view, saveSession } = await mountWithPendingSave(null, 5);

    await fireEvent.press(view.getByText("session.summary_too_short_discard"));

    expect(mockQuitSession).toHaveBeenCalled();
    expect(saveSession).not.toHaveBeenCalled();
    // Home, not back: back from here is the session that just ended.
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("keeping it lets the save through", async () => {
    const { view, saveSession } = await mountWithPendingSave(null, 5);

    await fireEvent.press(view.getByText("session.summary_too_short_keep"));

    // The keep gave way to Continue, held until the save lands.
    expect(view.queryByText("session.summary_too_short_keep")).toBeNull();
    expect(view.getByText("session.continue")).toBeTruthy();
    expect(saveSession).toHaveBeenCalledTimes(1);
  });

  // The bar's big button used to stay a disabled "Saving…" while nothing was being saved, and a
  // phone trace showed twenty taps on it before the hero found Keep higher up the screen.
  it("puts the keep in the bar, where the thumb already is, instead of a dead Continue", async () => {
    const { view, saveSession } = await mountWithPendingSave(null, 5);

    expect(view.queryByTestId("session-victory-continue")).toBeNull();
    await fireEvent.press(view.getByTestId("session-victory-keep-short"));

    expect(saveSession).toHaveBeenCalledTimes(1);
    // Kept: the question is gone and the bar is Continue again, waiting on the save.
    expect(view.queryByTestId("session-victory-keep-short")).toBeNull();
    expect(view.getByTestId("session-victory-continue")).toBeTruthy();
  });

  // Decision U: a held screen says what it is. No reward is drawn for a session that may be
  // discarded, and the question sits above the feedback card, in the level card's slot.
  it("holds no XP card and puts the question above the feedback card", async () => {
    const { view } = await mountWithPendingSave(null, 5);

    expect(view.queryByTestId("victory-stat-row")).toBeNull();
    expect(view.queryByTestId("victory-level-spacer")).toBeNull();
    const tree = JSON.stringify(view.toJSON());
    const question = tree.indexOf("session.summary_too_short_title");
    const feedback = tree.indexOf("session.feedback_title");
    expect(question).toBeGreaterThan(-1);
    expect(question).toBeLessThan(feedback);
  });

  it("brings the stat row and the level slot back once it is kept, and keeps them when the save lands", async () => {
    const { view, release } = await mountWithPendingSave(null, 5);

    await fireEvent.press(view.getByTestId("session-victory-keep-short"));
    expect(view.getByTestId("victory-stat-row")).toBeTruthy();
    expect(view.getByTestId("victory-level-spacer", { includeHiddenElements: true })).toBeTruthy();
    expect(view.queryByText("session.summary_too_short_title")).toBeNull();

    await release();
    expect(view.getByTestId("victory-stat-row")).toBeTruthy();
    expect(view.getByTestId("session-victory-xp")).toBeTruthy();
  });

  it("a real session is never questioned", async () => {
    const { view } = await mountWithPendingSave();

    expect(view.queryByText("session.summary_too_short_title")).toBeNull();
  });
});

/**
 * The line sits in the hero banner, and the cue fires after the save, so the line cannot be known
 * at the first frame. A slot that appeared with it would push the feel buttons from under the
 * finger that was about to press one.
 */
describe("VictoryView villager slot", () => {
  beforeEach(() => {
    useChorusStore.setState({ current: null });
  });

  it("exists from the first render with no villager, and keeps its height when one arrives", async () => {
    // An event types; reduced motion shows it whole, which is what is being asked here.
    useSettingsStore.setState({ reducedMotion: true });
    const { view, release } = await mountWithPendingSave();

    const before = view.getByTestId("villager-line-slot");
    const heightBefore = JSON.stringify(before.props.style);
    expect(heightBefore).toMatch(/"height":\d+/);
    expect(view.queryByTestId("villager-line-block")).toBeNull();

    await release();
    await act(() => {
      useChorusStore.setState({
        current: {
          id: 9,
          owner: "victory",
          moment: "boss_defeated",
          villager: "champion",
          pose: "cheer",
          line: "A line that arrives after the save.",
        },
      });
    });

    expect(view.getByTestId("villager-line-block")).toBeTruthy();
    // Shown, not transparent or empty: the line itself is in the slot.
    expect(view.getByTestId("villager-line").props.children).toBe(
      "A line that arrives after the save.",
    );
    expect(JSON.stringify(view.getByTestId("villager-line-slot").props.style)).toBe(heightBefore);
  });
});

describe("VictoryView kicker", () => {
  it("announces the reward in gold, letter-spaced, over the title cartouche", async () => {
    const { view } = await mountWithPendingSave();

    const style = StyleSheet.flatten(view.getByTestId("victory-kicker").props.style);
    expect(style.letterSpacing).toBe(2);
    expect(style.color).toBe(rawColors.resourceGold);
    expect(style.fontFamily).toBe(config.fonts.body.face[700].normal);
  });
});

/**
 * The level bar mounted with the save and pushed the feel buttons about 80 dp down from under the
 * finger that was about to press one. The card now mounts only with data, so a spacer of its
 * height holds its place until then.
 */
const toWidth = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as object) as { width?: string }).width;

describe("VictoryView level card", () => {
  const motion = useSettingsStore.getState().reducedMotion;
  afterEach(() => useSettingsStore.setState({ reducedMotion: motion }));

  // A loading reward asserts nothing: no ellipsis glyph, and the card only mounts with its data,
  // into a spacer of its own height, so nothing moves when it arrives.
  it("is not mounted while the save is pending, and shows no ellipsis, then the real bar", async () => {
    const { view, release } = await mountWithPendingSave();

    const first = JSON.stringify(view.toJSON());
    expect(first).not.toContain("…");
    expect(first).not.toContain("journal.xp_progress");
    // The place is held: a hidden spacer sits above the feel buttons until the card replaces it.
    const spacer = view.getByTestId("victory-level-spacer", { includeHiddenElements: true });
    expect(spacer.props.accessibilityElementsHidden).toBe(true);
    expect(StyleSheet.flatten(spacer.props.style).height).toBe(LEVEL_CARD_HEIGHT);
    expect(first.indexOf("victory-level-spacer")).toBeLessThan(
      first.indexOf("session.feedback_hard"),
    );

    await release();

    expect(view.queryByTestId("victory-level-spacer", { includeHiddenElements: true })).toBeNull();

    // The earned gauge: the boss's inked gauge, in gold on a dark-gold track.
    const fill = view.getByTestId("victory-level-fill");
    expect(fill).toHaveStyle({ backgroundColor: fade(rawColors.resourceGold, 1) });
    expect(StyleSheet.flatten(fill.parent?.props.style).backgroundColor).toBe(rawColors.gold800);

    const after = JSON.stringify(view.toJSON());
    expect(after).toContain("journal.xp_progress");
    expect(after.indexOf("journal.xp_progress")).toBeLessThan(
      after.indexOf("session.feedback_hard"),
    );
  });

  // The sweep starts where the session found the hero (a crossed level starts from empty, so the
  // sweep is the level-up) and moves after a beat; the fill mounts at that start.
  it("mounts the fill at the start of the sweep: empty when a level was crossed", async () => {
    useSettingsStore.setState({ reducedMotion: false });
    // Fixture: 50 -> 150 crosses into level 2 (base 100), so the sweep starts at 0.
    const { view, release } = await mountWithPendingSave();
    await release();

    expect(toWidth(view.getByTestId("victory-level-fill"))).toBe("0%");
  });

  it("mounts the fill at the earlier progress when the level held", async () => {
    useSettingsStore.setState({ reducedMotion: false });
    // Level 2 spans 100..300: 140 is 20% in, 150 is 25%.
    const fixture = saveResult.heroXp;
    saveResult.heroXp = { before: 140, after: 150 };
    try {
      const { view, release } = await mountWithPendingSave();
      await release();

      expect(toWidth(view.getByTestId("victory-level-fill"))).toBe("20%");
    } finally {
      saveResult.heroXp = fixture;
    }
  });
});

/**
 * Nothing pressable under a villager. On a boss victory the whole banner card was an imagebutton
 * (it opens the felled boss), and the line sat inside it: a tap on the line opened the boss, and
 * TalkBack found a focusable element inside a focusable one.
 */
describe("VictoryView villager slot, and what is under it", () => {
  type Node = { parent: Node | null; props: Record<string, unknown> };

  const boss = {
    imagePath: "assets/bosses/troll.jpg",
    enName: "Troll",
    frName: "Troll",
    deName: "Troll",
    esName: "Troll",
    tier: 1,
    currentHp: 0,
    maxHp: 100,
  };

  function pressableAncestors(node: Node) {
    const found: string[] = [];
    for (let n = node.parent; n; n = n.parent) {
      if (typeof n.props.onPress === "function" || typeof n.props.onPressIn === "function") {
        found.push("press");
      }
      if (/button/.test(String(n.props.accessibilityRole ?? n.props.role ?? ""))) {
        found.push("button");
      }
    }
    return found;
  }

  /** Where the slot really starts in the banner: its nearest absolutely positioned ancestor. */
  function slotBand(node: Node) {
    const flat = (style: unknown) => StyleSheet.flatten(style as ViewStyle) ?? {};
    const height = flat(node.props.style).height as number;
    for (let n = node.parent; n; n = n.parent) {
      const style = flat(n.props.style);
      if (style.position === "absolute") return { top: style.top as number, height };
    }
    throw new Error("the slot has no absolute ancestor");
  }

  it.each([
    ["a quest victory", false],
    ["a boss victory", true],
  ])("has no pressable and no button among the line's ancestors on %s", async (_, isBoss) => {
    const { view, release } = await mountWithPendingSave();
    if (isBoss) {
      await act(() => {
        useSessionStore.setState({
          bossFight: boss,
          bossStartHp: 10,
        } as unknown as Partial<ReturnType<typeof useSessionStore.getState>>);
      });
    }
    await release();

    const slot = view.getByTestId("villager-line-slot") as unknown as Node;
    expect(pressableAncestors(slot)).toEqual([]);

    if (isBoss) {
      // The boss still opens, from the part of the banner below the slot, never over it.
      const band = slotBand(slot);
      const open = view.getByTestId("victory-boss-open");
      expect(StyleSheet.flatten(open.props.style).top).toBeGreaterThanOrEqual(
        band.top + band.height,
      );
      expect(open.props.accessibilityRole).toBe("imagebutton");
      // The viewer is a Modal, empty until shown; open, it carries the boss's name too.
      const label = String(open.props.accessibilityLabel);
      expect(view.getAllByLabelText(label)).toHaveLength(1);
      await fireEvent.press(open);
      expect(view.getAllByLabelText(label)).toHaveLength(2);
    } else {
      expect(view.queryByTestId("victory-boss-open")).toBeNull();
    }
  });

  // "Tonight" carries the boss as a card, so the banner must not announce it a second time.
  it.each([
    ["a quest victory", false, 1],
    ["a boss victory", true, 0],
  ])("shows the gold kicker on %s (boss: %s): %i time(s)", async (_, isBoss, count) => {
    const { view, release } = await mountWithPendingSave();
    if (isBoss) {
      await act(() => {
        useSessionStore.setState({
          bossFight: boss,
          bossStartHp: 10,
        } as unknown as Partial<ReturnType<typeof useSessionStore.getState>>);
      });
    }
    await release();
    expect(view.queryAllByTestId("victory-kicker")).toHaveLength(count);
  });

  // The triumph sentence and its +XP belong to the "Tonight" card; the banner keeps the name only.
  it("says a boss victory's triumph once, in the card", async () => {
    const { view, release } = await mountWithPendingSave();
    await act(() => {
      useSessionStore.setState({
        bossFight: boss,
        bossStartHp: 10,
        felledByFinalBlow: false,
      } as unknown as Partial<ReturnType<typeof useSessionStore.getState>>);
    });
    await release();
    expect(view.queryAllByText(/boss\.triumph_subtitle/i)).toHaveLength(1);
  });

  // At 1.3 the 88 dp slot held two and a half lines and cut the third mid-glyph.
  it("sizes the slot for three lines at the device's font scale, fixed for the render", async () => {
    const rn = jest.requireActual("react-native") as typeof import("react-native");
    const real = rn.useWindowDimensions;
    const dims = jest
      .spyOn(require("react-native"), "useWindowDimensions")
      .mockImplementation(() => ({ ...real(), fontScale: 1.3 }));
    const { view, release } = await mountWithPendingSave();
    const height = () =>
      StyleSheet.flatten(view.getByTestId("villager-line-slot").props.style).height;

    expect(height()).toBe(Math.ceil(88 * 1.3));
    await release();
    expect(height()).toBe(Math.ceil(88 * 1.3));
    dims.mockRestore();
  });
});

/**
 * "Tonight" replaces the old reward cards. It arrives with the save, under the level gauge and
 * above the feeling, and a night where nothing rose has no such block at all. Each fact is said
 * once on this screen, so the villager no longer repeats a record.
 */
describe("VictoryView tonight", () => {
  const record = {
    isNewRecord: true,
    recordType: "exercise_max_reps",
    newValue: 14,
    previousValue: 12,
    exerciseName: { en: "Push-ups", fr: "Pompes", de: "Liegestütze", es: "Flexiones" },
    perSide: false,
  };
  const cue = jest.fn();
  beforeEach(() => {
    cue.mockClear();
    mockMarkBigFeastShown.mockClear();
    useChorusStore.setState({ cue: cue as never, current: null });
  });

  it("holds its place with reserved heights while saving: no spinner, nothing asserted", async () => {
    const { view } = await mountWithPendingSave();

    expect(view.queryByRole("progressbar")).toBeNull();
    expect(view.queryByText("SESSION.TONIGHT_TITLE")).toBeNull();
    // The bar's button is there and still, on the same label it will keep.
    expect(view.getByText("session.continue")).toBeTruthy();
    await fireEvent.press(view.getByTestId("session-victory-continue"));
    expect(mockReplace).not.toHaveBeenCalled();
    // The time and the XP are empty values, not a zero.
    expect(view.queryByText("quests.reward_xp")).toBeNull();
  });

  it("shows the session time only once the save has landed, a blank before", async () => {
    const { view, release } = await mountWithPendingSave(null, 12 * 60);
    expect(view.queryByText("12:00")).toBeNull();
    await release();
    expect(view.getByText("12:00")).toBeTruthy();
  });

  it("on a failed save offers a retry, claims nothing and keeps Continue shut", async () => {
    const { view, fail } = await mountWithPendingSave();
    await fail();

    expect(view.getByText("common.retry")).toBeTruthy();
    expect(view.queryByTestId("tonight-list")).toBeNull();
    expect(view.queryByText("quests.reward_xp")).toBeNull();
    expect(view.queryByTestId("session-victory-xp")).toBeNull();
    expect(view.queryByText("12:00")).toBeNull();
    await fireEvent.press(view.getByTestId("session-victory-continue"));
    expect(mockQuitSession).not.toHaveBeenCalled();
    expect(view.getByTestId("session-victory-continue")).toBeDisabled();
  });

  it("lists what the save changed, under the gauge and above the feeling", async () => {
    const { view, release, saveSession } = await mountWithPendingSave(null, 12 * 60, {
      newRecords: [record],
    });
    await release();

    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(view.getByText("SESSION.TONIGHT_TITLE")).toBeTruthy();
    expect(view.getByText("session.tonight_badge_record")).toBeTruthy();
    const tree = JSON.stringify(view.toJSON());
    expect(tree.indexOf("journal.xp_progress")).toBeLessThan(tree.indexOf("SESSION.TONIGHT_TITLE"));
    expect(tree.indexOf("SESSION.TONIGHT_TITLE")).toBeLessThan(
      tree.indexOf("session.feedback_hard"),
    );
  });

  it("offers no village on a night with a record but no growth", async () => {
    const { view, release } = await mountWithPendingSave(null, 12 * 60, { newRecords: [record] });
    await release();

    expect(view.getByTestId("tonight-list")).toBeTruthy();
    expect(view.queryByTestId("tonight-view-village")).toBeNull();
  });

  it("says nothing on a night where nothing rose", async () => {
    const { view, release } = await mountWithPendingSave();
    await release();

    expect(view.queryByText("SESSION.TONIGHT_TITLE")).toBeNull();
    expect(view.queryByTestId("tonight-list")).toBeNull();
  });

  it("does not have the villager repeat a record the list already says", async () => {
    const { release } = await mountWithPendingSave(null, 12 * 60, { newRecords: [record] });
    await release();

    expect(cue).not.toHaveBeenCalled();
  });

  it("marks the reveal as seen when it was shown as a card, on the night of an epilogue", async () => {
    const { release } = await mountWithPendingSave(
      { isFinished: true, adventureId: 3, nextQuestId: null, nextRunStepId: null } as never,
      12 * 60,
      { crestReveal: BEAR },
    );
    await release();

    expect(mockMarkBigFeastShown).toHaveBeenCalledWith("reveal");
  });

  it("leaves the reveal unmarked when it is the large feast, which the full screen marks", async () => {
    const { view, release } = await mountWithPendingSave(null, 12 * 60, {
      crestReveal: BEAR,
    });
    await release();

    // It is on screen as the line with its "after" badge, and not marked.
    expect(view.getByText("session.tonight_badge_after")).toBeTruthy();
    expect(mockMarkBigFeastShown).not.toHaveBeenCalled();
  });

  describe("the big feast", () => {
    beforeEach(() => {
      mockPush.mockClear();
      mockReplace.mockClear();
      mockQuitSession.mockClear();
    });

    const campaign = {
      isFinished: false,
      adventureId: 3,
      nextQuestId: 9,
      nextRunStepId: 4,
    } as never;

    it("opens by itself after Continue and keeps the session", async () => {
      const { view, release } = await mountWithPendingSave(campaign, 12 * 60, {
        crestReveal: BEAR,
      });
      await release();
      await fireEvent.press(view.getByTestId("session-victory-continue"));

      expect(mockQuitSession).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      // The link carries nothing: the route reads the feast from the finished session.
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/big-feast");
    });

    it("opens once a night: the second Continue goes on, and Tonight stops announcing it", async () => {
      const { view, release } = await mountWithPendingSave(null, 12 * 60, { crestReveal: BEAR });
      await release();
      expect(view.getByText("session.tonight_badge_after")).toBeTruthy();
      await fireEvent.press(view.getByTestId("session-victory-continue"));
      expect(view.queryByText("session.tonight_badge_after")).toBeNull();

      await fireEvent.press(view.getByTestId("session-victory-continue"));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockQuitSession).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/");
    });

    it("does not open when there is none, or when this phone has shown the tier", async () => {
      const plain = await mountWithPendingSave(null, 12 * 60, { newRecords: [record] });
      await plain.release();
      await fireEvent.press(plain.view.getByTestId("session-victory-continue"));
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/");
      await plain.view.unmount();

      mockReplace.mockClear();
      const seen = await mountWithPendingSave(null, 12 * 60, {
        tierUp: { oldTier: 2, newTier: 3 },
        bigFeastsShown: ["tier:3"],
      });
      await seen.release();
      await fireEvent.press(seen.view.getByTestId("session-victory-continue"));
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/");
    });

    it("leaves the full screen to the epilogue: nothing opens and Tonight does not list it", async () => {
      const { view, release } = await mountWithPendingSave(
        { isFinished: true, adventureId: 3, nextQuestId: null, nextRunStepId: null } as never,
        12 * 60,
        { crestReveal: BEAR, tierUp: { oldTier: 2, newTier: 3 } },
      );
      await release();
      expect(view.queryByText("session.tonight_badge_after")).toBeNull();
      await fireEvent.press(view.getByTestId("session-victory-continue"));
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/adventures/3", { withAnchor: true });
    });

    describe("the epilogue line in Tonight", () => {
      const finished = {
        isFinished: true,
        adventureId: 3,
        nextQuestId: null,
        nextRunStepId: null,
      } as never;
      const line = "session.tonight_epilogue";

      async function night(campaign: unknown, outro: string | null) {
        (getAdventureStepOutroNarrative as jest.Mock).mockResolvedValue(outro);
        const mounted = await mountWithPendingSave(campaign as never, 12 * 60, {
          newRecords: [record],
        });
        await act(async () => useSessionStore.setState({ adventureRunStepId: 5 }));
        await mounted.release();
        return mounted.view;
      }

      it("comes back in Tonight when no outro text opens", async () => {
        const view = await night(finished, null);
        expect(view.getByText(line)).toBeTruthy();
      });

      it("stays absent when the outro opens, so the fact is said once", async () => {
        const view = await night(finished, "The end.");
        expect(view.queryByText(line)).toBeNull();
      });

      it("is absent on a night that does not end a campaign", async () => {
        const view = await night(campaign, null);
        expect(view.queryByText(line)).toBeNull();
      });
    });
  });
});
