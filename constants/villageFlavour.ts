/**
 * One line of weather under the village name, redrawn once a day.
 *
 * The village is a reward surface you visit between sessions, and between sessions nothing about
 * it changes — same art, same tiles, same numbers. A sentence that turns over at midnight is the
 * cheapest thing that makes coming back feel like arriving somewhere rather than reopening a
 * screen. It says nothing about your training on purpose: the tiles already do that, and a second
 * voice repeating them would just be noise dressed as atmosphere.
 *
 * Same shape as REST_SUGGESTION_MESSAGES, and drawn with the same `pickDailyVariant()`.
 */
export const VILLAGE_FLAVOUR: { en: string[]; fr: string[] } = {
  en: [
    "Smoke curls from the chimneys. Someone kept the fires lit.",
    "A traveller passed through before dawn and left no name.",
    "The forges are quiet this morning. They will not stay that way.",
    "Frost on the rooftops. The watch changed without a word.",
    "Lanterns burn low along the road. The village waits.",
  ],
  fr: [
    "La fumée s'enroule au-dessus des cheminées. Quelqu'un a entretenu les feux.",
    "Un voyageur est passé avant l'aube sans laisser son nom.",
    "Les forges sont silencieuses ce matin. Elles ne le resteront pas.",
    "Du givre sur les toits. La garde a changé sans un mot.",
    "Les lanternes brûlent bas le long de la route. Le village attend.",
  ],
};
