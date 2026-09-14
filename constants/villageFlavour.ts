import type { Localized } from "@/src/i18n/deviceLanguage";

/**
 * One line of weather under the village name, redrawn once a day.
 *
 * The village is a reward surface you visit between sessions, and between sessions nothing about
 * it changes — same art, same tiles, same numbers. A sentence that turns over at midnight is the
 * cheapest thing that makes coming back feel like arriving somewhere rather than reopening a
 * screen. It says nothing about your training on purpose: the tiles already do that, and a second
 * voice repeating them would just be noise dressed as atmosphere.
 *
 * Eighteen each rather than five: the seed is `day:tier`, so with five a hero who opened the app
 * daily saw the same sentence back within a week and the trick showed. Eighteen puts the repeat
 * far enough out that it reads as weather rather than as a rotation.
 *
 * Two rules for adding more. Nothing may name a number, a muscle or a streak — the moment one
 * does, it is a stat in disguise and it will contradict the tiles beside it. And nothing may
 * assume a size: the same line is drawn over a two-cabin clearing and an eternal capital, so
 * "the forges" and "the walls" work while "the harbour" does not.
 *
 * Same shape as REST_SUGGESTION_MESSAGES, and drawn with the same `pickDailyVariant()`.
 */
export const VILLAGE_FLAVOUR: Localized<string[]> = {
  en: [
    "Smoke curls from the chimneys. Someone kept the fires lit.",
    "A traveller passed through before dawn and left no name.",
    "The forges are quiet this morning. They will not stay that way.",
    "Frost on the rooftops. The watch changed without a word.",
    "Lanterns burn low along the road. The village waits.",
    "Rain came in the night. The paths remember it.",
    "A dog barked at nothing, twice, then thought better of it.",
    "The bell was rung early. Nobody has said why.",
    "Someone swept the steps before first light.",
    "Cold wind off the hills. The shutters held.",
    "Two crows on the ridgepole, watching the road east.",
    "The well came up clear today. That is worth something.",
    "Wood was stacked overnight, higher than it was.",
    "Mist to the knees at dawn, gone by the time anyone looked.",
    "A shutter banged loose and was fixed before noon.",
    "The old road is quiet. It usually is, this time of year.",
    "Lamps lit early. The dark came on faster than expected.",
    "Nothing happened here today, and that is its own kind of news.",
  ],
  fr: [
    "La fumée s'enroule au-dessus des cheminées. Quelqu'un a entretenu les feux.",
    "Un voyageur est passé avant l'aube sans laisser son nom.",
    "Les forges sont silencieuses ce matin. Elles ne le resteront pas.",
    "Du givre sur les toits. La garde a changé sans un mot.",
    "Les lanternes faiblissent le long de la route. Le village attend.",
    "La pluie est venue dans la nuit. Les chemins s'en souviennent.",
    "Un chien a aboyé dans le vide, deux fois, puis s'est ravisé.",
    "La cloche a sonné tôt. Personne n'a dit pourquoi.",
    "Quelqu'un a balayé les marches avant le jour.",
    "Vent froid descendu des collines. Les volets ont tenu.",
    "Deux corbeaux sur le faîtage, l'œil sur la route de l'est.",
    "Le puits a rendu une eau claire aujourd'hui. Ce n'est pas rien.",
    "Du bois a été empilé cette nuit, plus haut qu'il ne l'était.",
    "Brume jusqu'aux genoux à l'aube, dissipée avant qu'on la regarde.",
    "Un volet s'est décroché. Il était réparé avant midi.",
    "La vieille route est calme. Elle l'est souvent, en cette saison.",
    "Lampes allumées tôt. La nuit est tombée plus vite que prévu.",
    "Il ne s'est rien passé ici aujourd'hui, et c'est une nouvelle en soi.",
  ],
  de: [
    "Rauch kräuselt sich aus den Schornsteinen. Jemand hat die Feuer gehütet.",
    "Vor Tagesanbruch kam ein Reisender durch und nannte keinen Namen.",
    "Die Schmieden sind heute Morgen still. Das bleibt nicht so.",
    "Reif auf den Dächern. Die Wache wurde wortlos abgelöst.",
    "Die Laternen an der Straße werden schwächer. Das Dorf wartet.",
    "In der Nacht kam Regen. Die Wege erinnern sich daran.",
    "Ein Hund bellte ins Nichts, zweimal, und besann sich dann.",
    "Die Glocke läutete früh. Niemand hat gesagt, warum.",
    "Jemand hat vor dem ersten Licht die Treppe gefegt.",
    "Kalter Wind von den Hügeln. Die Fensterläden haben gehalten.",
    "Zwei Krähen auf dem Dachfirst, den Blick auf die Oststraße.",
    "Der Brunnen gab heute klares Wasser. Das ist nicht nichts.",
    "Über Nacht wurde Holz gestapelt, höher als zuvor.",
    "Nebel bis zu den Knien im Morgengrauen, verschwunden, bevor jemand hinsah.",
    "Ein Fensterladen hatte sich gelöst, vor Mittag war er repariert.",
    "Die alte Straße ist ruhig. Um diese Jahreszeit ist sie das meistens.",
    "Früh angezündete Lampen. Die Dunkelheit kam schneller als gedacht.",
    "Heute ist hier nichts passiert, und auch das ist eine Nachricht.",
  ],
  es: [
    "El humo se enrosca sobre las chimeneas. Alguien mantuvo los fuegos.",
    "Un viajero pasó antes del alba sin dejar su nombre.",
    "Las forjas están en silencio esta mañana. No seguirán así.",
    "Escarcha en los tejados. Hubo cambio de guardia sin una palabra.",
    "Las linternas del camino se apagan poco a poco. La aldea espera.",
    "Llovió por la noche. Los senderos lo recuerdan.",
    "Un perro ladró a la nada, dos veces, y luego se lo pensó mejor.",
    "La campana sonó temprano. Nadie ha dicho por qué.",
    "Alguien barrió los escalones antes del alba.",
    "Viento frío de las colinas. Las contraventanas aguantaron.",
    "Dos cuervos en el caballete, vigilando el camino del este.",
    "El pozo dio agua clara hoy. Eso vale algo.",
    "Anoche la pila de leña creció más que nunca.",
    "Niebla hasta las rodillas al alba, disipada antes de que nadie mirara.",
    "Una contraventana se soltó y estaba arreglada antes del mediodía.",
    "El viejo camino está tranquilo. Suele estarlo en esta época.",
    "Lámparas encendidas temprano. La oscuridad llegó antes de lo previsto.",
    "Hoy no ha pasado nada aquí, y eso ya es una noticia.",
  ],
};
