/** The closed list of mottos a hero can put under their shield. No free text: the copy is ours. */
export const CREST_MOTTOS = [
  "hearth",
  "stone",
  "nightfall",
  "slow",
  "ember",
  "built",
  "rise",
  "seasons",
] as const;

export type CrestMottoId = (typeof CREST_MOTTOS)[number];

/** What is stored: a motto of the list, or `none` (the default, nothing is written until a choice). */
export type CrestMotto = CrestMottoId | "none";

export const isCrestMotto = (value: string | null): value is CrestMotto =>
  value === "none" || (CREST_MOTTOS as readonly (string | null)[]).includes(value);
