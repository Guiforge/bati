import assert from "node:assert/strict";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import AdventureDetailsScreen from "@/app/(tabs)/adventures/[id]";
import "@/i18n";
import config from "@/tamagui.config";

// Regression test for 6ed496a: a "boss" adventure is a multi-step campaign that
// culminates in a boss fight on its final step — the CTA must not claim
// "Fight Boss" while step 1 (a regular warm-up step) is what's actually next.

const mockPush = jest.fn();

// The hero's reminder days set the weeks chip's pace (adventure-weeks-label.test.ts); none here.
jest.mock("@/db/reminders", () => ({ getReminderDays: async () => ({}) }));
jest.mock("@/db/preferences", () => ({
  preferences: { getTrainingLevel: async () => "regular" },
}));
jest.mock("@/db/questConfig", () => ({ startingDifficulty: () => "medium" }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "1" }),
  // The screen loads on focus; in tests "focused" is simply "mounted".
  useFocusEffect: (effect: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string; reducedMotion: boolean }) => unknown) => {
    const state = { language: "en", reducedMotion: false };
    return selector ? selector(state) : state;
  },
}));

const mockShowError = jest.fn();
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: jest.fn(), showInfo: jest.fn() }),
}));
// The file itself is proven in adventure-file.test.ts; here only what the share button says.
jest.mock("@/src/adventureFile", () => ({
  adventureToFile: jest.fn(),
  shareAdventure: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

function mockStep(stepIndex: number, questId = 100 + stepIndex) {
  return {
    stepIndex,
    questId,
    imagePath: null,
    enNarrative: "",
    frNarrative: "",
    quest: {
      enTitle: `Step ${stepIndex}`,
      frTitle: `Étape ${stepIndex}`,
      exercises: [],
    },
  };
}

// The screen reads the fight to draw its boss panel. Mocked to null — this test is about which
// CTA a *fresh* campaign shows, and a campaign nobody has started has no fight row yet.
jest.mock("@/db/bossFights", () => ({
  getBossFightByAdventure: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/db", () => ({
  Difficulty: { Easy: "easy", Medium: "medium", Hard: "hard" },
  getAdventureDetails: jest.fn().mockResolvedValue({
    adventure: {
      kind: "boss",
      enTitle: "The Golem",
      frTitle: "Le Golem",
      enDescription: "",
      frDescription: "",
      imagePath: null,
    },
    steps: [mockStep(0), mockStep(1)],
  }),
  getActiveAdventureRun: jest.fn().mockResolvedValue(null),
  offeredFirstStep: jest.fn().mockResolvedValue(null),
  getFinishedRunCountsByAdventure: jest.fn().mockResolvedValue(new Map()),
  listExercises: jest.fn().mockResolvedValue([]),
  getRecentSessionHistory: jest.fn().mockResolvedValue([]),
  startAdventureRun: jest.fn(),
  leaveAdventureRun: jest.fn().mockResolvedValue(undefined),
  suggestDifficultyFromSessions: jest.fn().mockReturnValue({ level: "medium", adjusted: false }),
  previewQuest: jest.fn().mockReturnValue({ seconds: 300, xp: 60 }),
  missingStepQuests: jest.fn().mockResolvedValue([]),
  sparedExerciseIds: jest.fn().mockResolvedValue(new Set()),
  worksSparedZone: jest.fn().mockReturnValue(false),
}));

// The screen reads the hero's ladder and records once for every step, so the head card prices a
// step the way the quest screen behind the CTA will. Neither is what these tests are about.
jest.mock("@/db/quests", () => ({
  QUEST_AS_WRITTEN: { served: new Map(), history: new Map() },
  loadSlotJournal: jest.fn().mockResolvedValue({ served: new Map(), history: new Map() }),
}));

test("boss adventure CTA reads Start Adventure on step 1, not Fight Boss", async () => {
  const { findByText, queryByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  expect(await findByText("Start Adventure")).toBeVisible();
  expect(queryByText("Fight Boss")).toBeNull();
});

// With no active run, step 0 resolves to "active" (pressable) and step 1 to "locked" (inert) —
// see the fallback in the steps map: `stepStatusByIndex.get(...) ?? (stepIndex === 0 ? "active" : "locked")`.
// The report: "Couper du bois" finished on hard from this row, again and again, and step 2 stayed
// locked. The row pushed the quest without `runStepId`, so every session it started was a plain
// quest the campaign never heard about. It has to be the CTA's door, run step and all.
test("the active step's row starts the run and pushes its run step, like the CTA", async () => {
  mockPush.mockClear();
  const db = require("@/db") as { startAdventureRun: jest.Mock };
  const activeStep = { id: 42, stepIndex: 0, questId: 100, status: "active" };
  db.startAdventureRun.mockResolvedValue({
    run: { id: 7, adventureId: 1, status: "active", difficultyOverride: null },
    steps: [activeStep],
    activeStep,
  });

  const { getByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  const row = await waitFor(() => getByText("Step 1: Step 0"));
  await fireEvent.press(row);

  // adventureId rides along so the quest screen's chevron can return to this adventure;
  // withAnchor keeps the quests-tab gallery mounted under it so hardware back has somewhere
  // to pop, per 0b41d31 — losing either one silently breaks a screen this test never visits.
  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith("/quests/100?level=medium&runStepId=42&adventureId=1", {
      withAnchor: true,
    }),
  );
});

test("a locked step wears its tag, and no row repeats the sentence the road now says", async () => {
  const { getByText, queryByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  const activeTitle = await waitFor(() => getByText("Step 1: Step 0"));
  const lockedTitle = getByText("Step 2: Step 1");

  // The title and its row's tag are both children of the same XStack (see the JSX in
  // AdventureStepRow) — so scoping to a title's own `.parent` lands exactly on that row, not on
  // whichever row happens to render the tag. A bare `getByText` passed even when the production
  // condition was flipped (the mark on the wrong row, still exactly one match on screen) — this
  // scoping is what actually pins a status to its step.
  assert(lockedTitle.parent);
  assert(activeTitle.parent);
  expect(within(lockedTitle.parent).getByText("Locked")).toBeTruthy();
  expect(within(activeTitle.parent).queryByText("Locked")).toBeNull();

  // "Finish the previous step to unlock it" stood under every locked row, verbatim. Position on
  // the road says it once, for all of them (UX audit 2026-09-10).
  expect(queryByText("Finish the previous step to unlock it")).toBeNull();
});

test("a completed adventure offers a replay and wears its stars", async () => {
  const db = require("@/db") as { getFinishedRunCountsByAdventure: jest.Mock };
  db.getFinishedRunCountsByAdventure.mockResolvedValue(new Map([[1, 2]]));

  const { findByText, getByText, queryByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  expect(await findByText("Replay Adventure")).toBeVisible();

  // The stars live inside the details Card, which mounts with `enterStyle={{ opacity: 0, … }}`.
  // `findByText` resolves the moment the node joins the tree — sometimes mid-animation, while an
  // ancestor is still fully transparent — so asserting visibility straight off it failed about
  // one run in three. `waitFor` retries until the enter transition has settled, which keeps the
  // assertion (they must be *visible*, not merely rendered) instead of weakening it to a
  // truthiness check. The CTA above sits outside that Card and never raced.
  await waitFor(() => expect(getByText("★★")).toBeVisible());

  expect(queryByText("Start Adventure")).toBeNull();
});

// The difficulty tag is the suggestion made visible: `Difficulty` is now the same type as the
// stored code, so nothing converts between the two — the label has to come straight from it.
test.each([
  ["easy", "Easy"],
  ["hard", "Hard"],
])("the tag wears the suggested difficulty (%s)", async (suggested, label) => {
  const db = require("@/db") as { suggestDifficultyFromSessions: jest.Mock };
  db.suggestDifficultyFromSessions.mockReturnValue({ level: suggested, adjusted: false });

  const { findByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  expect(await findByText(label)).toBeTruthy();
});

// The screen carries no difficulty control, so a level that moves on its own has to say why —
// otherwise the hero sees their adventure harden with nothing to point at.
describe("the caption under the tag", () => {
  const suggestion = () =>
    (require("@/db") as { suggestDifficultyFromSessions: jest.Mock }).suggestDifficultyFromSessions;

  const renderScreen = () =>
    render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <AdventureDetailsScreen />
      </TamaguiProvider>,
    );

  test("appears when the feeling moved the level", async () => {
    suggestion().mockReturnValue({ level: "hard", adjusted: true });

    const { findByText } = await renderScreen();

    expect(await findByText("From your feedback")).toBeTruthy();
  });

  test("stays away when the level is the hero's own doing", async () => {
    suggestion().mockReturnValue({ level: "hard", adjusted: false });

    const { findByText, queryByText } = await renderScreen();

    await findByText("Hard");
    expect(queryByText("From your feedback")).toBeNull();
  });
});

// "Le progrès offert": with no run yet, the first session may already count as step 1. The screen
// asks the same read `startAdventureRun` does, so what it announces is what "Commencer" opens: the
// first row done, the second one active, and the preview that of the second.
test("with the first session offered, the list and the preview show step 2 as the one to play", async () => {
  const db = require("@/db") as {
    offeredFirstStep: jest.Mock;
    previewQuest: jest.Mock;
    startAdventureRun: jest.Mock;
  };
  db.offeredFirstStep.mockResolvedValueOnce({ performedAt: new Date(1_000) });
  db.previewQuest.mockClear();
  mockPush.mockClear();

  const { findByTestId, getByTestId } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  expect(await findByTestId("adventure-step-0-completed")).toBeTruthy();
  expect(await findByTestId("adventure-step-1-active")).toBeTruthy();
  await waitFor(() =>
    expect(db.previewQuest).toHaveBeenLastCalledWith(
      expect.objectContaining({ enTitle: "Step 1" }),
      expect.anything(),
      null,
      expect.anything(),
      expect.anything(),
    ),
  );

  // And "Start" opens the quest `startAdventureRun` made active, which is step 1's.
  const active = { id: 43, stepIndex: 1, questId: 101, status: "active" };
  db.startAdventureRun.mockResolvedValue({
    run: { id: 7, adventureId: 1, status: "active", difficultyOverride: null },
    steps: [{ id: 42, stepIndex: 0, questId: 100, status: "completed" }, active],
    activeStep: active,
  });
  await fireEvent.press(getByTestId("adventure-start"));
  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(/^\/quests\/101\?level=\w+&runStepId=43&adventureId=1$/),
      { withAnchor: true },
    ),
  );
});

// "Laisser la partie" (D-34): a secondary button under the CTA, only with a run under way, behind
// a confirmation. Judged on the db call and the reloaded page, not on a route.
describe("leaving the playthrough", () => {
  type Db = { getActiveAdventureRun: jest.Mock; leaveAdventureRun: jest.Mock };
  const db = () => require("@/db") as Db;
  const renderScreen = () =>
    render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <AdventureDetailsScreen />
      </TamaguiProvider>,
    );
  const activeStep = { id: 42, stepIndex: 0, questId: 100, status: "active" };
  const underWay = {
    run: { id: 7, adventureId: 1, status: "active", difficultyOverride: null },
    steps: [activeStep, { id: 43, stepIndex: 1, questId: 101, status: "locked" }],
    activeStep,
  };

  beforeEach(() => {
    db().leaveAdventureRun.mockClear();
    (
      require("@/db") as { getFinishedRunCountsByAdventure: jest.Mock }
    ).getFinishedRunCountsByAdventure.mockResolvedValue(new Map());
  });
  afterEach(() => {
    db().getActiveAdventureRun.mockReset().mockResolvedValue(null);
  });

  test("confirming leaves the run, reloads, and the CTA offers a fresh start", async () => {
    let left = false;
    db().getActiveAdventureRun.mockImplementation(() => Promise.resolve(left ? null : underWay));
    db().leaveAdventureRun.mockImplementation(() => {
      left = true;
      return Promise.resolve();
    });
    const { findByTestId, findByText, getByTestId, queryByTestId } = await renderScreen();
    expect(await findByText("Continue")).toBeTruthy();

    await fireEvent.press(await findByTestId("adventure-leave"));
    // Asking changes nothing by itself.
    expect(db().leaveAdventureRun).not.toHaveBeenCalled();
    await fireEvent.press(getByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(db().leaveAdventureRun).toHaveBeenCalledWith(1));
    expect(await findByText("Start Adventure")).toBeTruthy();
    await waitFor(() => expect(queryByTestId("adventure-leave")).toBeNull());
  });

  test("cancelling leaves nothing", async () => {
    db().getActiveAdventureRun.mockResolvedValue(underWay);
    const { findByTestId, getByTestId } = await renderScreen();

    await fireEvent.press(await findByTestId("adventure-leave"));
    await fireEvent.press(getByTestId("confirm-dialog-cancel"));

    expect(db().leaveAdventureRun).not.toHaveBeenCalled();
  });

  test("is absent without a run", async () => {
    const first = await renderScreen();
    await first.findByTestId("adventure-start");
    expect(first.queryByTestId("adventure-leave")).toBeNull();
  });
});

// The hero's own adventures (adventure-builder): the pencil, the step that lost its quest, and the
// line under a step that would work the zone they are sparing.
describe("an adventure the hero wrote", () => {
  const db = () =>
    require("@/db") as {
      getAdventureDetails: jest.Mock;
      missingStepQuests: jest.Mock;
      worksSparedZone: jest.Mock;
    };
  const details = (author: string) => ({
    adventure: {
      kind: "route",
      author,
      enTitle: "Tale",
      frTitle: "Tale",
      enDescription: "",
      frDescription: "",
      imagePath: null,
    },
    steps: [mockStep(0), mockStep(1)],
  });
  const renderScreen = () =>
    render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <AdventureDetailsScreen />
      </TamaguiProvider>,
    );

  afterEach(() => {
    db().missingStepQuests.mockResolvedValue([]);
    db().worksSparedZone.mockReturnValue(false);
  });

  test("the pencil leads to the editor, and the game's adventures have none", async () => {
    mockPush.mockClear();
    db().getAdventureDetails.mockResolvedValueOnce(details("hero"));
    const own = await renderScreen();
    await own.findByText("Tale");
    await fireEvent.press(own.getByTestId("adventure-edit"));
    expect(mockPush).toHaveBeenCalledWith("/adventures/edit?id=1");
    await own.unmount();

    db().getAdventureDetails.mockResolvedValueOnce(details("Admin"));
    const game = await renderScreen();
    await game.findByText("Tale");
    expect(game.queryByTestId("adventure-edit")).toBeNull();
  });

  test("a step without its quest hides Start and says why, for the hero's and the game's", async () => {
    db().missingStepQuests.mockResolvedValue([1]);
    db().getAdventureDetails.mockResolvedValueOnce(details("hero"));
    const own = await renderScreen();
    expect(
      await own.findByText("A step has lost its quest. Edit the adventure to play it again."),
    ).toBeTruthy();
    expect(own.queryByTestId("adventure-start")).toBeNull();
    await own.unmount();

    db().getAdventureDetails.mockResolvedValueOnce(details("Admin"));
    const game = await renderScreen();
    expect(await game.findByText("A step has lost its quest.")).toBeTruthy();
    expect(game.queryByTestId("adventure-start")).toBeNull();
  });

  test("a step that works the spared zone wears its line", async () => {
    db().worksSparedZone.mockImplementation(
      (quest: { enTitle: string }) => quest.enTitle === "Step 1",
    );
    db().getAdventureDetails.mockResolvedValueOnce(details("hero"));
    const { findByTestId, queryByTestId } = await renderScreen();
    expect(await findByTestId("adventure-step-1-zone")).toBeTruthy();
    expect(queryByTestId("adventure-step-0-zone")).toBeNull();
  });
});

// Sharing an adventure: a dialog always says what leaves before the share sheet opens.
describe("sharing an adventure the hero wrote", () => {
  const file = () =>
    require("@/src/adventureFile") as { adventureToFile: jest.Mock; shareAdventure: jest.Mock };
  const db = () => require("@/db") as { getAdventureDetails: jest.Mock };
  const written = (over: Record<string, number>) => ({
    json: '{"kind":"bati-adventure"}',
    file: { adventure: { title: "Tale" } },
    photos: 0,
    leftOut: 0,
    stepsLeft: 0,
    ...over,
  });
  const open = async () => {
    db().getAdventureDetails.mockResolvedValueOnce({
      adventure: {
        kind: "route",
        author: "hero",
        enTitle: "Tale",
        frTitle: "Tale",
        enDescription: "",
        frDescription: "",
        imagePath: null,
      },
      steps: [mockStep(0), mockStep(1)],
    });
    const screen = await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <AdventureDetailsScreen />
      </TamaguiProvider>,
    );
    await screen.findByText("Tale");
    return screen;
  };

  beforeEach(() => {
    file().adventureToFile.mockReset();
    file().shareAdventure.mockClear();
    mockShowError.mockClear();
  });

  test("the dialog holds the three sentences in order, and Share sends the written file", async () => {
    file().adventureToFile.mockResolvedValue(written({ photos: 2, leftOut: 1, stepsLeft: 1 }));
    const screen = await open();
    await fireEvent.press(screen.getByTestId("adventure-share"));

    expect(await screen.findByText("Share this adventure")).toBeTruthy();
    expect(
      screen.getByText(
        "The file holds 2 photos. 1 step stays out of the file: its quest is gone, or one of its texts is too long. 1 photo cannot travel in the file and stays on your phone.",
      ),
    ).toBeTruthy();
    expect(file().shareAdventure).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText("Share"));
    expect(file().shareAdventure).toHaveBeenCalledWith('{"kind":"bati-adventure"}', "Tale");
  });

  test("with nothing left out and no photo, only the no-photo sentence", async () => {
    file().adventureToFile.mockResolvedValue(written({}));
    const screen = await open();
    await fireEvent.press(screen.getByTestId("adventure-share"));
    expect(
      await screen.findByText("The file holds your adventure and its quests, with no photo."),
    ).toBeTruthy();
  });

  test("cancel does not share", async () => {
    file().adventureToFile.mockResolvedValue(written({ photos: 1 }));
    const screen = await open();
    await fireEvent.press(screen.getByTestId("adventure-share"));
    await screen.findByText("The file holds 1 photo.");
    await fireEvent.press(screen.getByText("Cancel"));
    expect(file().shareAdventure).not.toHaveBeenCalled();
  });

  test("under two steps that can travel it toasts and opens no dialog", async () => {
    file().adventureToFile.mockResolvedValue(null);
    const screen = await open();
    await fireEvent.press(screen.getByTestId("adventure-share"));
    await waitFor(() =>
      expect(mockShowError).toHaveBeenCalledWith(
        "Fewer than 2 steps can travel in a file. Check their quests first.",
      ),
    );
    expect(screen.queryByText("Share this adventure")).toBeNull();
  });

  test("a file that cannot be written is reported and said", async () => {
    const boom = new Error("fails its own reader");
    file().adventureToFile.mockRejectedValue(boom);
    const screen = await open();
    await fireEvent.press(screen.getByTestId("adventure-share"));
    await waitFor(() =>
      expect(mockShowError).toHaveBeenCalledWith("The file could not be written. Try again."),
    );
    const { reportError } = require("@/src/reportError") as { reportError: jest.Mock };
    expect(reportError).toHaveBeenCalledWith("adventures.share", boom);
  });

  test("the game's adventures have no share button", async () => {
    db().getAdventureDetails.mockResolvedValueOnce({
      adventure: {
        kind: "route",
        author: "Admin",
        enTitle: "Tale",
        frTitle: "Tale",
        enDescription: "",
        frDescription: "",
        imagePath: null,
      },
      steps: [mockStep(0), mockStep(1)],
    });
    const screen = await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <AdventureDetailsScreen />
      </TamaguiProvider>,
    );
    await screen.findByText("Tale");
    expect(screen.queryByTestId("adventure-share")).toBeNull();
  });
});
