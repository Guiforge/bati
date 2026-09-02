import type { RestSuggestion } from "@/db/restSuggestions";

type MessagePool = { en: string[]; fr: string[] };

/**
 * Typed on `Exclude<..., "none">` so a fifth rest-suggestion reason added to
 * `getRestSuggestion()` without a matching pool here is a compile error, not a silent blank line.
 */
export const REST_SUGGESTION_MESSAGES: Record<
  Exclude<RestSuggestion["reason"], "none">,
  MessagePool
> = {
  overtraining: {
    en: [
      "You've been training hard with {{count}} sessions this week. Consider a recovery day.",
      "That's {{count}} sessions this week. Your body earns its rest the same as its gains.",
      "{{count}} sessions down this week. A recovery day sharpens the next one.",
    ],
    fr: [
      "Tu t'es beaucoup entraîné avec {{count}} séances cette semaine. Pense à une journée de récupération.",
      "Déjà {{count}} séances cette semaine. Le repos se gagne autant que les gains.",
      "{{count}} séances au compteur cette semaine. Une journée de récup, et la prochaine sera meilleure.",
    ],
  },
  consecutive_days: {
    en: [
      "You've trained {{count}} days in a row! Take a rest day to prevent overtraining.",
      "{{count}} days in a row without a break. Even heroes need one.",
      "That's {{count}} straight days of training. Rest is part of the plan, not a pause from it.",
    ],
    fr: [
      "Tu t'es entraîné {{count}} jours d'affilée ! Prends un jour de repos pour éviter le surentraînement.",
      "{{count}} jours d'affilée sans pause. Même les héros en ont besoin.",
      "{{count}} jours de suite à t'entraîner. Le repos fait partie du plan, ce n'est pas une pause dedans.",
    ],
  },
  high_volume: {
    en: [
      "You've completed {{count}} workouts this week! Your body needs time to recover and grow stronger.",
      "{{count}} workouts this week, which is serious volume. Recovery is where the strength actually builds.",
      "{{count}} sessions in seven days. Give your body a day to catch up to your ambition.",
    ],
    fr: [
      "Tu as fait {{count}} entraînements cette semaine ! Ton corps a besoin de temps pour récupérer et devenir plus fort.",
      "{{count}} entraînements cette semaine, un sacré volume. C'est pendant la récup que la force se construit.",
      "{{count}} séances en sept jours. Laisse ton corps rattraper ton ambition, une journée.",
    ],
  },
  deload: {
    en: [
      "Four hard weeks in a row. Take an easier one: less volume, the same habit. Your next month starts here.",
      "A month of heavy weeks behind you. Ease off for a few days, the gains catch up while you rest.",
      "Four straight heavy weeks. This is the week to go lighter, not the week to stop.",
    ],
    fr: [
      "Quatre semaines chargées d'affilée. Prends-en une plus légère : moins de volume, la même régularité. Ton prochain mois commence là.",
      "Un mois de semaines chargées derrière toi. Lève le pied quelques jours, les gains rattrapent pendant que tu récupères.",
      "Quatre semaines chargées d'affilée. Cette semaine, on allège, on ne s'arrête pas.",
    ],
  },
};

/**
 * Deterministic pick so the same seed (a day + a reason) always lands on the same variant —
 * revisiting Home later the same day must not change the sentence underneath it.
 */
export function pickDailyVariant(pool: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  // Modulo the pool's own length, so always in range; the type does not know that.
  return pool[Math.abs(hash) % pool.length] ?? "";
}
