import type { RestSuggestion } from "@/db/restSuggestions";
import type { Localized } from "@/src/i18n/deviceLanguage";

type MessagePool = Localized<string[]>;

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
      "You've been training hard with {{count}} workouts this week. Consider a recovery day.",
      "That's {{count}} workouts this week. Your body earns its rest the same as its gains.",
      "{{count}} workouts down this week. A recovery day sharpens the next one.",
    ],
    fr: [
      "Tu t'es beaucoup entraîné cette semaine : {{count}} entraînements. Pense à une journée de récupération.",
      "Déjà {{count}} entraînements cette semaine. Le repos se gagne autant que les gains.",
      "{{count}} entraînements au compteur cette semaine. Une journée de récup, et la prochaine sera meilleure.",
    ],
    de: [
      "Du hast diese Woche hart trainiert: {{count}} Trainings. Denk an einen Erholungstag.",
      "Schon {{count}} Trainings diese Woche. Ruhe verdient man sich genauso wie Fortschritt.",
      "{{count}} Trainings diese Woche geschafft. Ein Erholungstag schärft das nächste.",
    ],
    es: [
      "Has entrenado duro esta semana: {{count}} entrenamientos. Piensa en un día de recuperación.",
      "Ya van {{count}} entrenamientos esta semana. El descanso se gana igual que el progreso.",
      "{{count}} entrenamientos esta semana. Un día de recuperación afina el siguiente.",
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
      "{{count}} jours de suite à t'entraîner. Le repos fait partie du plan, il ne l'interrompt pas.",
    ],
    de: [
      "Du hast {{count}} Tage am Stück trainiert! Gönn dir einen Ruhetag, bevor du dich übertrainierst.",
      "{{count}} Tage am Stück ohne Pause. Auch Helden brauchen eine.",
      "{{count}} Tage Training in Folge. Ruhe gehört zum Plan, sie unterbricht ihn nicht.",
    ],
    es: [
      "¡Has entrenado {{count}} días seguidos! Tómate un día de descanso para no sobreentrenarte.",
      "{{count}} días seguidos sin parar. Hasta los héroes necesitan un respiro.",
      "{{count}} días seguidos entrenando. El descanso forma parte del plan, no lo interrumpe.",
    ],
  },
  high_volume: {
    en: [
      "You've completed {{count}} workouts this week! Your body needs time to recover and grow stronger.",
      "{{count}} workouts this week, which is serious volume. Recovery is where the strength actually builds.",
      "{{count}} workouts in seven days. Give your body a day to catch up to your ambition.",
    ],
    fr: [
      "Tu as fait {{count}} entraînements cette semaine ! Ton corps a besoin de temps pour récupérer et devenir plus fort.",
      "{{count}} entraînements cette semaine, un sacré volume. C'est pendant la récup que la force se construit.",
      "{{count}} entraînements en sept jours. Accorde une journée à ton corps pour qu'il rattrape ton ambition.",
    ],
    de: [
      "{{count}} Trainings diese Woche! Dein Körper braucht Zeit, um sich zu erholen und stärker zu werden.",
      "{{count}} Trainings diese Woche, das ist ordentlich Volumen. Kraft entsteht in der Erholung.",
      "{{count}} Trainings in sieben Tagen. Gib deinem Körper einen Tag, um deinen Ehrgeiz einzuholen.",
    ],
    es: [
      "¡{{count}} entrenamientos esta semana! Tu cuerpo necesita tiempo para recuperarse y hacerse más fuerte.",
      "{{count}} entrenamientos esta semana, es mucho volumen. La fuerza se construye durante la recuperación.",
      "{{count}} entrenamientos en siete días. Dale un día a tu cuerpo para que alcance a tu ambición.",
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
      "Un mois de semaines chargées derrière toi. Lève le pied quelques jours : les progrès se font pendant que tu récupères.",
      "Quatre semaines chargées d'affilée. Cette semaine, on allège, on ne s'arrête pas.",
    ],
    de: [
      "Vier harte Wochen am Stück. Nimm dir eine leichtere: weniger Volumen, dieselbe Gewohnheit. Dein nächster Monat beginnt hier.",
      "Ein Monat voller harter Wochen liegt hinter dir. Schalt ein paar Tage zurück, der Fortschritt kommt, während du dich erholst.",
      "Vier harte Wochen in Folge. Diese Woche wird leichter trainiert, nicht aufgehört.",
    ],
    es: [
      "Cuatro semanas duras seguidas. Toma una más ligera: menos volumen, el mismo hábito. Tu próximo mes empieza aquí.",
      "Un mes de semanas intensas a tus espaldas. Afloja unos días: el progreso llega mientras descansas.",
      "Cuatro semanas intensas seguidas. Esta semana toca aligerar, no parar.",
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
