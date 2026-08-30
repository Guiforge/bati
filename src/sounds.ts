import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
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
} as const;

type Cue = keyof typeof SOURCES;

// `createAudioPlayer` does not release on its own, unlike the `useAudioPlayer` hook — which is
// exactly what this wants. Two players, made once, replayed for the life of the process: a
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
