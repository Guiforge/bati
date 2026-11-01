// T32: the village's players in src/sounds.ts: created once and only when wanted, faded, parked at
// silence, the audio mode set once and still mixing with the hero's music.
const mockMade: {
  volume: number;
  loop: boolean;
  playing: boolean;
  play: jest.Mock;
  pause: jest.Mock;
}[] = [];
const mockCreate = jest.fn((_source: unknown, _options?: unknown) => {
  const p = {
    volume: 1,
    loop: false,
    playing: false,
    play: jest.fn(() => {
      p.playing = true;
    }),
    pause: jest.fn(() => {
      p.playing = false;
    }),
    seekTo: jest.fn().mockResolvedValue(undefined),
  };
  mockMade.push(p);
  return p;
});
const mockMode = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
jest.mock("expo-audio", () => ({
  createAudioPlayer: (s: unknown, o?: unknown) => mockCreate(s, o),
  setAudioModeAsync: (m: unknown) => mockMode(m),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
// Jest cannot read an .ogg: each is replaced by a number, like Metro's asset id.
jest.mock("../assets/sounds/village/day.ogg", () => 1);
jest.mock("../assets/sounds/village/night.ogg", () => 2);
jest.mock("../assets/sounds/village/forge.ogg", () => 3);
jest.mock("../assets/sounds/village/mill.ogg", () => 4);
jest.mock("../assets/sounds/village/forge-hit.ogg", () => 5);

import { SILENCE } from "@/components/village/iso/sonVillage";
import { playHit, setVillage } from "@/src/sounds";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("fades the day bed in, creates nothing else, then parks at silence", () => {
  setVillage({ ...SILENCE, jour: 0.35 });
  expect(mockMade).toHaveLength(1);
  expect(mockMade[0]?.loop).toBe(true);
  jest.advanceTimersByTime(1500);
  expect(mockMade[0]?.volume).toBeCloseTo(0.35, 5);
  expect(mockMade[0]?.play).toHaveBeenCalledTimes(1);
  setVillage(SILENCE);
  jest.advanceTimersByTime(1500);
  expect(mockMade[0]?.volume).toBe(0);
  expect(mockMade[0]?.pause).toHaveBeenCalledTimes(1);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

test("sets the mixing audio mode once, for the village and the blow", () => {
  setVillage({ ...SILENCE, forge: 0.4 });
  playHit();
  expect(mockMode).toHaveBeenCalledTimes(1);
  expect(mockMode).toHaveBeenCalledWith({
    playsInSilentMode: true,
    interruptionMode: "mixWithOthers",
  });
});
