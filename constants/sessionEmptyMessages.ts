/**
 * Shown when a finished session unlocked nothing notable (no record, no achievement, no level
 * up). Title and subtitle are paired by index, not drawn independently, so the tone never
 * mismatches (an upbeat title next to a flat subtitle).
 */
type EmptyVariant = { title: string; subtitle: string };

/** Non-empty by contract: `pickSessionEmptyVariant` promises a variant, never `undefined`. */
export const SESSION_EMPTY_VARIANTS = {
  en: [
    { title: "Nice work!", subtitle: "Session logged. Keep the streak alive." },
    { title: "Solid session.", subtitle: "Every rep still counts toward the next one." },
    {
      title: "In the books!",
      subtitle: "No fireworks today. The streak doesn't care, it just grows.",
    },
  ],
  fr: [
    { title: "Beau boulot !", subtitle: "Séance enregistrée. Garde ta série en vie." },
    { title: "Séance solide.", subtitle: "Chaque répétition compte pour la suivante." },
    {
      title: "C'est noté !",
      subtitle: "Pas de feu d'artifice aujourd'hui. La série s'en fiche, elle grandit quand même.",
    },
  ],
};

export function pickSessionEmptyVariant(language: "en" | "fr"): EmptyVariant {
  const pool = SESSION_EMPTY_VARIANTS[language];
  // The pools are non-empty by the tuple type below, and the index is modulo their own length,
  // so the assertion the return type makes is one the compiler could not derive on its own.
  return pool[Math.floor(Math.random() * pool.length)] as EmptyVariant;
}
