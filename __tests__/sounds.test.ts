/**
 * The player is a module-level singleton that must survive being replayed and must never throw.
 *
 * Both halves matter for the same reason: this is the only audio in the app, it fires three
 * times a rest, and the last time sound lived here it was a `SOUNDS` map of `null`s that nobody
 * noticed was silent for seven months. A beep that fails is allowed; a beep that takes a workout
 * down with it, or one that plays once and then never again, is not.
 */

// `mock`-prefixed on purpose: jest hoists these factories above the declarations, and any other
// name reaches them as `undefined`.
const mockPlayer = {
  seekTo: jest.fn<Promise<void>, [number]>(),
  play: jest.fn(),
};
const mockCreateAudioPlayer = jest.fn((_source: unknown) => mockPlayer);
const mockSetAudioModeAsync = jest.fn<Promise<void>, [unknown]>();
const mockReportError = jest.fn();

jest.mock("expo-audio", () => ({
  createAudioPlayer: (source: unknown) => mockCreateAudioPlayer(source),
  setAudioModeAsync: (mode: unknown) => mockSetAudioModeAsync(mode),
}));
jest.mock("@/src/reportError", () => ({
  reportError: (context: string, error: unknown) => mockReportError(context, error),
}));

function sounds() {
  return require("@/src/sounds") as typeof import("@/src/sounds");
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockPlayer.seekTo.mockResolvedValue(undefined);
  mockSetAudioModeAsync.mockResolvedValue(undefined);
});

describe("warm", () => {
  test("builds both players once and leaves the hero's music alone", () => {
    const { warm } = sounds();

    warm();
    warm();

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2); // tick and go, not four
    // Not `duckOthers` and not `doNotMix`: the default mixWithOthers requests no audio focus, so
    // a 70 ms tick does not dip the album the hero is training to.
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false });
  });

  test("a device that refuses the audio mode does not take the session down", async () => {
    mockSetAudioModeAsync.mockRejectedValue(new Error("no audio session"));
    const { warm } = sounds();

    expect(() => warm()).not.toThrow();
    await Promise.resolve();
    expect(mockReportError).toHaveBeenCalledWith("sound.mode", expect.any(Error));
  });
});

describe("playCue", () => {
  test("rewinds before playing, so the second beep is audible", () => {
    const { playCue } = sounds();

    playCue("tick");
    playCue("tick");

    // A player parked at the end of a 70 ms clip does not restart on play() alone. Without the
    // seek the countdown beeps once and then counts down in silence.
    expect(mockPlayer.seekTo).toHaveBeenCalledTimes(2);
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayer.play).toHaveBeenCalledTimes(2);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1); // reused, not rebuilt per beep
  });

  test("a player that throws is reported, not propagated", () => {
    mockPlayer.play.mockImplementationOnce(() => {
      throw new Error("decoder gone");
    });
    const { playCue } = sounds();

    expect(() => playCue("go")).not.toThrow();
    expect(mockReportError).toHaveBeenCalledWith("sound.play", expect.any(Error));
  });
});
