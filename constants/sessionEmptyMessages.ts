import type { AppLanguage, Localized } from "@/src/i18n/deviceLanguage";

/**
 * Shown when a finished session unlocked nothing notable (no record, no achievement, no level
 * up). Title and subtitle are paired by index, not drawn independently, so the tone never
 * mismatches (an upbeat title next to a flat subtitle).
 */
type EmptyVariant = { title: string; subtitle: string };

/** Non-empty by contract: `pickSessionEmptyVariant` promises a variant, never `undefined`. */
export const SESSION_EMPTY_VARIANTS: Localized<[EmptyVariant, ...EmptyVariant[]]> = {
  en: [
    { title: "Nice work!", subtitle: "Session logged. Keep the flame lit." },
    { title: "Solid session.", subtitle: "Every rep still counts toward the next one." },
    {
      title: "In the books!",
      subtitle: "No fireworks today. The flame doesn't care, it just grows.",
    },
  ],
  fr: [
    { title: "Beau boulot !", subtitle: "Séance enregistrée. Garde ta flamme allumée." },
    { title: "Séance solide.", subtitle: "Chaque répétition compte pour la suivante." },
    {
      title: "C'est noté !",
      subtitle: "Pas de feu d'artifice aujourd'hui. La flamme s'en fiche, elle grandit quand même.",
    },
  ],
  de: [
    { title: "Gute Arbeit!", subtitle: "Einheit gespeichert. Lass die Flamme weiterbrennen." },
    { title: "Solide Einheit.", subtitle: "Jede Wiederholung zählt für die nächste." },
    {
      title: "Abgehakt!",
      subtitle: "Heute kein Feuerwerk. Der Flamme ist das egal, sie wächst trotzdem.",
    },
  ],
  es: [
    { title: "¡Buen trabajo!", subtitle: "Sesión guardada. Mantén la llama encendida." },
    { title: "Sesión sólida.", subtitle: "Cada repetición cuenta para la siguiente." },
    {
      title: "¡Apuntado!",
      subtitle: "Hoy no hay fuegos artificiales. A la llama le da igual, crece igualmente.",
    },
  ],
};

export function pickSessionEmptyVariant(language: AppLanguage): EmptyVariant {
  const pool = SESSION_EMPTY_VARIANTS[language];
  // The pools are non-empty by the tuple type below, and the index is modulo their own length,
  // so the assertion the return type makes is one the compiler could not derive on its own.
  return pool[Math.floor(Math.random() * pool.length)] as EmptyVariant;
}
