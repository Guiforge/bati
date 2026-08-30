import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The player is a module-level singleton that must survive being replayed and must never throw.
 *
 * Both halves matter for the same reason: this is the only audio in the app, it fires three
 * times a rest, and the last time sound lived here it was a `SOUNDS` map of `null`s that nobody
 * noticed was silent for seven months. A beep that fails is allowed; a beep that takes a workout
 * down with it, or one that plays once and then never again, is not.
 *
 * The audio-mode assertions below are not style: both keys were wrong in the first cut, in ways
 * no test would have shown. Omitting `interruptionMode` leaves the Android module's own field
 * null, which misses its `== MIX_WITH_OTHERS` early return and requests transient focus, pausing
 * the hero's music on every beep. `playsInSilentMode: false` gates playback on
 * `ringerMode == RINGER_MODE_NORMAL`, so a phone on vibrate hears nothing while Settings says On.
 */

// `mock`-prefixed on purpose: jest hoists these factories above the declarations, and any other
// name reaches them as `undefined`.
const mockPlayers = new Map<unknown, { seekTo: jest.Mock; play: jest.Mock }>();
const mockCreateAudioPlayer = jest.fn((source: unknown, _options?: unknown) => {
  const existing = mockPlayers.get(source);
  if (existing) return existing;
  const made = { seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn() };
  mockPlayers.set(source, made);
  return made;
});
const mockSetAudioModeAsync = jest.fn<Promise<void>, [unknown]>();
const mockReportError = jest.fn();

jest.mock("expo-audio", () => ({
  createAudioPlayer: (source: unknown, options?: unknown) => mockCreateAudioPlayer(source, options),
  setAudioModeAsync: (mode: unknown) => mockSetAudioModeAsync(mode),
}));
jest.mock("@/src/reportError", () => ({
  reportError: (context: string, error: unknown) => mockReportError(context, error),
}));

function sounds() {
  return require("@/src/sounds") as typeof import("@/src/sounds");
}

/** The player built for a given cue, identified by which source it was created from. */
function playerFor(index: number) {
  const source = mockCreateAudioPlayer.mock.calls[index]?.[0];
  return mockPlayers.get(source);
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockPlayers.clear();
  mockCreateAudioPlayer.mockImplementation((source: unknown) => {
    const existing = mockPlayers.get(source);
    if (existing) return existing;
    const made = { seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn() };
    mockPlayers.set(source, made);
    return made;
  });
  mockSetAudioModeAsync.mockResolvedValue(undefined);
});

describe("warm", () => {
  test("builds one player per cue", () => {
    const { warm } = sounds();

    warm();

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
  });

  /**
   * The one thing this file cannot check by running the module: jest-expo's asset transformer
   * stubs every `require` of a binary asset to the same value, so `SOURCES.tick` and `SOURCES.go`
   * are indistinguishable here — a copy-paste making both cues point at tick.wav would pass every
   * assertion above, and the countdown would beep its zero in the same voice as its ticks.
   *
   * ponytail: regex over the source, same text-scan trade `android-permissions.test.ts` makes on
   * the trim plugin. If SOURCES ever stops being two literal requires, assert it another way
   * rather than deleting this.
   */
  test("the two cues really are two different files", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "src", "sounds.ts"), "utf8");
    const wavs = [...source.matchAll(/require\("[^"]*\/([a-z]+\.wav)"\)/g)].map(([, file]) => file);

    expect(wavs).toHaveLength(2);
    expect(new Set(wavs).size).toBe(2);
  });

  test("plays over the hero's music without pausing it, and is not muted by vibrate", () => {
    const { warm } = sounds();

    warm();

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      // Explicit, not defaulted: undefined reaches Android as null and requests transient focus.
      interruptionMode: "mixWithOthers",
      // true, not false: false suppresses playback on ringer vibrate as well as silent.
      playsInSilentMode: true,
    });
  });

  test("runs once, however many session views mount", () => {
    const { warm } = sounds();

    warm();
    warm();
    warm();

    // ActiveExerciseView remounts per exercise; the audio mode is process-global and each call
    // writes device audio routing on the UI thread.
    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
  });

  test("a device that refuses the audio mode does not take the session down", async () => {
    mockSetAudioModeAsync.mockRejectedValue(new Error("no audio session"));
    const { warm } = sounds();

    expect(() => warm()).not.toThrow();
    await Promise.resolve();
    expect(mockReportError).toHaveBeenCalledWith("sound.mode", expect.any(Error));
  });

  test("a device with no audio stack at all is reported, not thrown", () => {
    mockCreateAudioPlayer.mockImplementation(() => {
      throw new Error("ExpoAudio unavailable");
    });
    const { warm } = sounds();

    expect(() => warm()).not.toThrow();
    expect(mockReportError).toHaveBeenCalledWith("sound.warm", expect.any(Error));
  });
});

describe("playCue", () => {
  test("rewinds before playing, so the second beep is audible", () => {
    const { warm, playCue } = sounds();
    warm();

    playCue("tick");
    playCue("tick");

    const tick = playerFor(0);
    // A player parked at the end of a 70 ms clip does not restart on play() alone. Without the
    // seek the countdown beeps once and then counts down in silence.
    expect(tick?.seekTo).toHaveBeenCalledTimes(2);
    expect(tick?.seekTo).toHaveBeenCalledWith(0);
    expect(tick?.play).toHaveBeenCalledTimes(2);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2); // reused, not rebuilt per beep
  });

  test("says nothing when warm never ran, rather than building an unconfigured player", () => {
    const { playCue } = sounds();

    expect(() => playCue("tick")).not.toThrow();
    // warm() is the single writer of `players`. A player built here would be one the audio mode
    // above never covered — pausing the hero's music on a path nothing tests.
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });

  test("a seek that rejects is reported, not left unhandled", async () => {
    const { warm, playCue } = sounds();
    warm();
    playerFor(0)?.seekTo.mockRejectedValue(new Error("player released"));

    expect(() => playCue("tick")).not.toThrow();
    expect(playerFor(0)?.play).toHaveBeenCalled(); // the beep still fires
    await Promise.resolve();
    expect(mockReportError).toHaveBeenCalledWith("sound.seek", expect.any(Error));
  });

  test("a player that throws is reported, not propagated", () => {
    const { warm, playCue } = sounds();
    warm();
    playerFor(1)?.play.mockImplementation(() => {
      throw new Error("decoder gone");
    });

    expect(() => playCue("go")).not.toThrow();
    expect(mockReportError).toHaveBeenCalledWith("sound.play", expect.any(Error));
  });
});
