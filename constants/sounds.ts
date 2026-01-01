// Placeholder for sound files
// In the future, add files to assets/sounds/ and require them here.
// e.g. victory: require("@/assets/sounds/victory.mp3"),

export const SOUNDS = {
  victory: null,
  levelUp: null,
  countdown: null,
  complete: null,
  rest: null,
};

export type SoundName = keyof typeof SOUNDS;
