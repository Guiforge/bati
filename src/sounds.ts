import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { type Niveaux, SILENCE, suivre } from "@/components/village/iso/sonVillage";
import { reportError } from "@/src/reportError";

/**
 * The session countdown beeps, and the only place in the app that touches audio.
 *
 * Audio was here before, in a shape worth remembering: a `SOUNDS` map whose every entry was
 * `null`, a setting that toggled nothing, and `expo-audio` installed with its plugin defaults —
 * which is how a fitness app came to hold a microphone, a foreground media service and
 * androidx.media3 for the sake of silence. It went out in 1.8.1 with MR fdroid/fdroiddata!45076.
 * Two rules keep this from happening twice: every cue below points at a file that exists, and
 * the plugin is configured in `app.json` rather than named as a bare string.
 */
const SOURCES = {
  tick: require("../assets/sounds/tick.wav"),
  go: require("../assets/sounds/go.wav"),
  switch: require("../assets/sounds/switch.wav"),
} as const;

export type Cue = keyof typeof SOURCES;

// `createAudioPlayer` does not release on its own, unlike the `useAudioPlayer` hook — which is
// exactly what this wants. One player per cue, made once, replayed for the life of the process: a
// player created per beep would be three allocations and three file loads per rest.
//
// `warm()` is their only writer. Nothing releases them, so nothing here may allocate a second
// time either — see the update interval below for what a retained player actually costs.
const players: Partial<Record<Cue, AudioPlayer>> = {};

// A player runs a coroutine on Android's main thread emitting playback status every
// `updateInterval`, defaulting to 500 ms, for as long as it exists — and these exist for the
// life of the process. Nothing here reads a status: the cue is fire-and-forget. A minute
// between wake-ups is as close to "never" as the API allows; 0 is not the answer, it spins.
const STATUS_INTERVAL_MS = 60_000;

// setAudioModeAsync is process-global and the mode never changes, so it must run once. It used
// to run inside warm() unguarded, and warm() is a mount effect in two views — ActiveExerciseView
// remounts per exercise — so a five-exercise, three-round quest issued about thirty of them, and
// each one writes device-global audio routing on the UI thread (AudioModule.updatePlaySoundThroughEarpiece).
let warmed = false;

// The audio mode, shared by the beeps and the village: written once, whoever needs it first.
// The village follows the app's sound setting and the media volume, and does not honour the
// ringer's silent mode (known limit: on vibrate it is still heard, because `playsInSilentMode`
// must stay true for the beeps, see below).
let modeSet = false;
function setMode(): void {
  if (modeSet) return;
  modeSet = true;
  // `interruptionMode` has to be passed. It reads as a safe default — the docs say
  // `mixWithOthers` — but that default is a JS one, and omitting the key sends `undefined`:
  // the Android module leaves its own `interruptionMode` null, and null does not match the
  // `== MIX_WITH_OTHERS` early return in requestAudioFocus, so every beep falls through to
  // AUDIOFOCUS_GAIN_TRANSIENT and *pauses* the hero's music for 70 ms, four times a rest.
  // Naming it explicitly takes the early return: no focus request, the music plays under it.
  //
  // `playsInSilentMode` is not the iOS-only switch its name suggests either. On Android it
  // gates playback on `ringerMode == RINGER_MODE_NORMAL`, and **vibrate is not normal** — so
  // `false` means a phone on vibrate, which is most phones in a gym, hears nothing at all
  // while Settings still says the beeps are on.
  setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" }).catch(
    (error) => {
      reportError("sound.mode", error);
    },
  );
}

/**
 * Build the players and set the audio mode, before anything needs to be heard.
 *
 * Doing this on the first beep instead would lose that beep: a player created at the tick for
 * "3" has not finished reading the file when `play()` is called, so the first count of the first
 * rest goes missing. Called from `useCountdownCues` on mount, so nothing native is touched by
 * importing this module — expo-router loads the session screen at startup, and a hero who has
 * switched the beeps off never reaches the audio stack at all.
 */
export function warm(): void {
  if (warmed) return;
  warmed = true;

  try {
    for (const cue of Object.keys(SOURCES) as Cue[]) {
      players[cue] = createAudioPlayer(SOURCES[cue], { updateInterval: STATUS_INTERVAL_MS });
    }

    setMode();
  } catch (error) {
    reportError("sound.warm", error);
  }
}

/** Play one cue. Never throws: a beep that will not decode must not take a workout down. */
export function playCue(cue: Cue): void {
  try {
    // No fallback creation here: `warm()` owns `players`, and it always runs first — the hook
    // calls it from a mount effect, seconds before any second can tick over. A player built on
    // this path would also be a player the audio mode above never covered.
    const player = players[cue];
    if (!player) return;

    // A player parked at the end of its clip does not restart on `play()` alone. The seek is
    // fired, not awaited — awaiting it puts a frame between the beep and the second it marks,
    // and it resolves after the sound has already started anyway.
    player.seekTo(0).catch((error) => {
      reportError("sound.seek", error);
    });
    player.play();
  } catch (error) {
    reportError("sound.play", error);
  }
}

// ---- The village (T32): a bed of ground sound, and the forge and the mill when zoomed on them ----
// Same discipline as the beeps: one player each, created once, a long status interval, the mode
// set once by `setMode`. `setVillage` is the only entry: it gives the volumes the village should
// have, the players fade toward them, then park (pause) at silence so nothing keeps decoding.

// Required on first use, not at import: the village is read by the map before anyone has sound.
const villageSources = (): Record<keyof Niveaux, number> => ({
  jour: require("../assets/sounds/village/day.ogg"),
  nuit: require("../assets/sounds/village/night.ogg"),
  forge: require("../assets/sounds/village/forge.ogg"),
  moulin: require("../assets/sounds/village/mill.ogg"),
});
const hitSource = (): number => require("../assets/sounds/village/forge-hit.ogg");
const PLAYERS = ["jour", "nuit", "forge", "moulin"] as const;
const FADE_TICK_MS = 100;

const villagePlayers: Partial<Record<keyof Niveaux, AudioPlayer>> = {};
let hitPlayer: AudioPlayer | undefined;
const current: Niveaux = { ...SILENCE };
let target: Niveaux = SILENCE;
let fadeTimer: ReturnType<typeof setInterval> | undefined;

function setLevel(player: AudioPlayer, level: number): void {
  try {
    player.volume = level;
    if (level > 0 && !player.playing) player.play();
    if (level === 0 && player.playing) player.pause();
  } catch (error) {
    reportError("sound.village", error);
  }
}

function applyFade(): void {
  let done = true;
  for (const k of PLAYERS) {
    const player = villagePlayers[k];
    if (!player) continue;
    const next = suivre(current[k], target[k], FADE_TICK_MS);
    if (next !== current[k]) {
      current[k] = next;
      setLevel(player, next);
    }
    if (next !== target[k]) done = false;
  }
  if (done && fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = undefined;
  }
}

/** The volumes the village should have (`niveauxVillage`); fades there. Never throws. */
export function setVillage(niveaux: Niveaux): void {
  target = niveaux;
  try {
    // A player exists only once its sound has been wanted (the night's, on a day map, never is).
    for (const k of PLAYERS) {
      if (niveaux[k] <= 0 || villagePlayers[k]) continue;
      setMode();
      const player = createAudioPlayer(villageSources()[k], { updateInterval: STATUS_INTERVAL_MS });
      player.loop = true;
      player.volume = 0;
      villagePlayers[k] = player;
    }
    // Nothing to fade when no player exists yet and nothing is wanted.
    if (!fadeTimer && Object.keys(villagePlayers).length > 0)
      fadeTimer = setInterval(applyFade, FADE_TICK_MS);
  } catch (error) {
    reportError("sound.village", error);
  }
}

/** The anvil blow of a building's reveal (T37). Never throws. */
export function playHit(): void {
  try {
    if (!hitPlayer) {
      setMode();
      hitPlayer = createAudioPlayer(hitSource(), { updateInterval: STATUS_INTERVAL_MS });
    }
    hitPlayer.volume = 0.8;
    hitPlayer.seekTo(0).catch((error) => {
      reportError("sound.seek", error);
    });
    hitPlayer.play();
  } catch (error) {
    reportError("sound.hit", error);
  }
}
