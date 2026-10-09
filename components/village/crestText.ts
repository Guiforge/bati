import type { Practice } from "@/db/crestRules";

export const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One word per practice: the three styles already have theirs, running and cycling do not. */
export const PRACTICE_KEY: Record<Practice, string> = {
  strength: "village.style_strength",
  calisthenics: "village.style_calisthenics",
  yoga: "village.style_yoga",
  run: "village.crest_practice_run",
  ride: "village.crest_practice_ride",
};
