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

export type Cue = keyof typeof SOURCES;

// `createAudioPlayer` does not release on its own, unlike the `useAudioPlayer` hook — which is
// exactly what this wants. Two players, made once, replayed for the life of the process: a
// player created per beep would be three allocations and three file loads per rest.
const players: Partial<Record<Cue, AudioPlayer>> = {};

/**
 * Build the players and set the audio mode, before anything needs to be heard.
 *
 * Doing this on the first beep instead would lose that beep: a player created at the tick for
 * "3" has not finished reading the file when `play()` is called, so the first count of the first
 * rest goes missing. Called from `useCountdownCues` on mount, so nothing native is touched by
 * importing this module — expo-router loads the session screen at startup, and a hero who never
 * turns sound on should never reach the audio stack at all.
 */
export function warm(): void {
  try {
    for (const cue of Object.keys(SOURCES) as Cue[]) {
      players[cue] ??= createAudioPlayer(SOURCES[cue]);
    }
    // The only default worth changing. `interruptionMode` already defaults to `mixWithOthers`,
    // which requests no audio focus — the hero's music keeps playing underneath instead of
    // ducking for a 70 ms tick. `playsInSilentMode` defaults to true; a phone switched to silent
    // is a hero asking for quiet, and a workout is not an emergency. (iOS semantics: on Android
    // the beep simply rides the media volume, and there is nothing to configure.)
    setAudioModeAsync({ playsInSilentMode: false }).catch((error) => {
      reportError("sound.mode", error);
    });
  } catch (error) {
    reportError("sound.warm", error);
  }
}

/** Play one cue. Never throws: a beep that will not decode must not take a workout down. */
export function playCue(cue: Cue): void {
  try {
    const player = players[cue] ?? createAudioPlayer(SOURCES[cue]);
    players[cue] = player;
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
