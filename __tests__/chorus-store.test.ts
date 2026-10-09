import { i18n } from "@/i18n";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import { useChorusStore } from "@/stores/chorus";
import { useSettingsStore } from "@/stores/settings";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined) }));

// The real i18n, deliberately: the store reads its pools through it, so mocking it out would
// verify the chorus against a fake and leave the actual lookup keys — the thing most likely to be
// a typo — untested. Nothing here is native; it is i18next over two JSON files.

jest.mock("@/db", () => ({
  preferences: {
    getRecentCameoLines: jest.fn().mockResolvedValue([]),
    setRecentCameoLines: jest.fn().mockResolvedValue(undefined),
  },
}));

// Reached through the registry rather than closed over: `jest.mock` is hoisted above the imports,
// so the factory runs while a module-scope `const` is still uninitialised and the spy lands as
// `undefined` on the mock. Fetching it afterwards gets the object the factory actually built.
const { preferences: mockPreferences } = jest.requireMock("@/db") as {
  preferences: { setRecentCameoLines: jest.Mock; getRecentCameoLines: jest.Mock };
};

/**
 * The attention budget, which is the whole product argument of this layer.
 *
 * Repetition is not felt as "I have read this sentence before" — it is felt as "someone talks at
 * me every single rest". So these tests are about *refusals*: the cameos that correctly never
 * happen. A layer that always fires would pass a naive rendering test and be unbearable on device.
 */

const AMBIENT_WINDOW_MS = 1_800_000;

function resetChorus() {
  useChorusStore.setState({
    current: null,
    recentKeys: [],
    lastVillager: null,
    lastCameoAt: 0,
    ambientShown: 0,
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  // Far enough past the epoch that the first `now - lastCameoAt` comparison is not accidentally
  // inside a cooldown that starts at 0.
  jest.setSystemTime(new Date("2026-08-23T10:00:00Z"));
  resetChorus();
  useSettingsStore.setState({ villagersEnabled: true, language: "en" });
  await i18n.changeLanguage("en");
  // 0 makes every probability gate pass and every pick land on the first candidate.
  jest.spyOn(Math, "random").mockReturnValue(0);
  mockPreferences.setRecentCameoLines.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("what the chorus refuses", () => {
  test("an ambient line stays away while someone is already speaking", () => {
    useChorusStore.getState().cue("boss_defeated");
    const speaking = useChorusStore.getState().current;

    useChorusStore.getState().cue("rest");

    expect(useChorusStore.getState().current).toBe(speaking);
  });

  test("a second ambient line stays away for the rest of the window", () => {
    useChorusStore.getState().cue("rest");
    useChorusStore.getState().dismiss(useChorusStore.getState().current?.id ?? -1);

    jest.advanceTimersByTime(AMBIENT_WINDOW_MS - 1);
    useChorusStore.getState().cue("rest");

    // One per window is the whole rate control now. There is no separate cooldown, because with a
    // budget of one there is never a second cameo to space out.
    expect(useChorusStore.getState().current).toBeNull();
  });

  test("the window refills once the layer has been quiet long enough", () => {
    useChorusStore.getState().cue("rest");
    useChorusStore.getState().dismiss(useChorusStore.getState().current?.id ?? -1);

    jest.advanceTimersByTime(AMBIENT_WINDOW_MS + 1);
    useChorusStore.getState().cue("rest");

    expect(useChorusStore.getState().current).not.toBeNull();
  });

  /**
   * Found by simulating the real rule against real quest shapes, not by reading the code: with a
   * budget of three, a long quest hit the cap in 97% of sessions, so how many villagers you met
   * was set by how long your quest happened to be rather than by any decision anyone made.
   */
  test("a longer quest does not buy more villagers", () => {
    let fired = 0;
    for (let i = 0; i < 20; i++) {
      useChorusStore.getState().cue("rest");
      const id = useChorusStore.getState().current?.id;
      if (id != null) {
        fired++;
        useChorusStore.getState().dismiss(id);
      }
      jest.advanceTimersByTime(85_000); // a rest every 85s, the cadence measured on device
    }

    expect(fired).toBe(1);
  });

  test("an event ignores the budget and whoever is mid-sentence", () => {
    useChorusStore.getState().cue("rest");
    const ambient = useChorusStore.getState().current;
    expect(ambient).not.toBeNull();

    useChorusStore.getState().cue("boss_defeated");

    const current = useChorusStore.getState().current;
    expect(current?.moment).toBe("boss_defeated");
    expect(current?.id).not.toBe(ambient?.id);
  });

  test("the toggle silences events too, not just atmosphere", () => {
    useSettingsStore.setState({ villagersEnabled: false });

    useChorusStore.getState().cue("boss_defeated");

    expect(useChorusStore.getState().current).toBeNull();
  });

  test("a timer belonging to a replaced cameo cannot clear its successor", () => {
    useChorusStore.getState().cue("rest");
    const stale = useChorusStore.getState().current?.id ?? -1;
    useChorusStore.getState().cue("boss_defeated");

    useChorusStore.getState().dismiss(stale);

    expect(useChorusStore.getState().current?.moment).toBe("boss_defeated");
  });
});

describe("what the chorus reports back", () => {
  test("says whether a villager actually came", () => {
    expect(useChorusStore.getState().cue("boss_defeated")).toBe(true);
  });

  test("says no when it refused", () => {
    useSettingsStore.setState({ villagersEnabled: false });

    expect(useChorusStore.getState().cue("boss_defeated")).toBe(false);
  });

  test("a guide waits for an event, and takes over from village chatter", () => {
    // `event > guide > ambient`. A guide has exactly one chance to be read, so it does not throw
    // it away for a line of atmosphere — but it does not interrupt the moment the layer exists for
    // either.
    useChorusStore.getState().cue("rest");
    expect(useChorusStore.getState().cue("guide_village")).toBe(true);
    expect(useChorusStore.getState().current?.moment).toBe("guide_village");

    useChorusStore.setState({ current: null, lastCameoAt: 0, ambientShown: 0 });
    useChorusStore.getState().cue("boss_defeated");
    const event = useChorusStore.getState().current;

    expect(useChorusStore.getState().cue("guide_home")).toBe(false);
    expect(useChorusStore.getState().current).toBe(event);
  });
});

describe("what the chorus remembers", () => {
  test("hydrating does not throw away what was said while it was reading", async () => {
    useChorusStore.getState().cue("boss_defeated");
    const saidAtStartup = useChorusStore.getState().recentKeys;
    (mockPreferences.getRecentCameoLines as jest.Mock).mockResolvedValueOnce(["from:disk:0"]);

    await useChorusStore.getState().hydrate();

    // The disk read is async and a screen can cue before it lands. Replacing rather than merging
    // meant every cold start quietly dropped the lines said during startup.
    expect(useChorusStore.getState().recentKeys).toEqual(["from:disk:0", ...saidAtStartup]);
  });

  test("the ring is per villager, so one repeating does not silence the other", () => {
    const say = () => {
      useChorusStore.getState().cue("boss_defeated");
      const c = useChorusStore.getState().current;
      return [c?.villager, c?.line] as const;
    };

    // Two speakers carry this moment and nobody may go twice running, so the cast alternates —
    // and each villager's memory has to be its own. The watcher having used his first line must not
    // push the champion off hers.
    expect(say()).toEqual(["watcher", en.villagers.watcher.boss_defeated[0]]);
    expect(say()).toEqual(["champion", en.villagers.champion.boss_defeated[0]]);
    expect(say()).toEqual(["watcher", en.villagers.watcher.boss_defeated[1]]);
  });

  test("an event line is filled in with what actually happened", () => {
    // No shipped line quotes a number any more, so the one the store reads is swapped for a
    // template: the point is that the values reach the bubble, not that a template does.
    const shipped = i18n.getResourceBundle("en", "translation").villagers.watcher.boss_defeated;
    i18n.addResourceBundle(
      "en",
      "translation",
      {
        villagers: { watcher: { boss_defeated: ["{{exercise}}: {{delta}} more than last time."] } },
      },
      true,
      true,
    );
    try {
      useChorusStore.getState().cue("boss_defeated", { delta: "10 reps", exercise: "Squat" });
    } finally {
      i18n.addResourceBundle(
        "en",
        "translation",
        { villagers: { watcher: { boss_defeated: shipped } } },
        true,
        true,
      );
    }

    const line = useChorusStore.getState().current?.line ?? "";
    expect(line).toContain("10 reps");
    expect(line).toContain("Squat");
    expect(line).not.toContain("{{");
  });

  test("the ring is persisted, so a cold start does not replay the last line", () => {
    useChorusStore.getState().cue("boss_defeated");

    expect(mockPreferences.setRecentCameoLines).toHaveBeenCalledWith([
      "villagers.watcher.boss_defeated:0",
    ]);
  });

  test("the ring comes back from disk, so a cold start does not repeat the last line", async () => {
    (mockPreferences.getRecentCameoLines as jest.Mock).mockResolvedValueOnce([
      "villagers.watcher.boss_defeated:0",
    ]);

    await useChorusStore.getState().hydrate();
    useChorusStore.getState().cue("boss_defeated");

    expect(useChorusStore.getState().current?.line).toBe(en.villagers.watcher.boss_defeated[1]);
  });

  /**
   * The regression this catches shipped and was caught by two *other* suites going down with it.
   * `cue()` runs inside a render effect, so a synchronous throw from the write — which `.catch()`
   * never sees — propagates into React's commit phase and takes the whole session screen with it.
   * A cosmetic write must never be able to do that.
   */
  test("a write that throws outright still leaves the villager on screen", () => {
    (mockPreferences.setRecentCameoLines as jest.Mock).mockImplementationOnce(() => {
      throw new Error("no database here");
    });

    expect(() => useChorusStore.getState().cue("boss_defeated")).not.toThrow();
    expect(useChorusStore.getState().current?.moment).toBe("boss_defeated");
  });

  test("the ring keys on the index, so switching language keeps the memory", async () => {
    useChorusStore.getState().cue("boss_defeated");
    expect(useChorusStore.getState().current?.villager).toBe("watcher");

    await i18n.changeLanguage("fr");
    useChorusStore.setState({ lastVillager: "champion" }); // force the watcher back up
    useChorusStore.getState().cue("boss_defeated");

    // Her *second* line, in French — not his first again. The same line in the other language is
    // the same line, so the memory has to survive the switch.
    expect(useChorusStore.getState().current?.line).toBe(fr.villagers.watcher.boss_defeated[1]);
  });
});
