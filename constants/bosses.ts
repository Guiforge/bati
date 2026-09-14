import { type BossAssetKey, getBossKey } from "@/constants/assetMap";
import type { AppLanguage, Localized } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";

/**
 * Who each monster is, and what it says.
 *
 * There is no name column: `BossFight.enName` is the *campaign's* title, so the arena used to
 * announce a fire dragon as "The Iron Lord's Conquest". The painting is the only place a boss's
 * identity is actually written down, so `getBossKey()` reads it out of `bossImagePath` and every
 * boss-specific string is keyed by that.
 *
 * This is a typed record rather than a `bosses.*` block in the locales on purpose: `Record<
 * BossAssetKey, …>` makes shipping a painting without its copy a compile error, which is stronger
 * than the locale-parity test, and it needs no `returnObjects` plumbing to hand back a pool.
 *
 * Taunts are grouped by what they answer, not by a timer. `BossTauntOverlay` picks the pool from
 * the hit that just landed — a crit gets `crit`, a resisted blow gets `resist`, phase 4 gets
 * `enrage` — so the boss talks about your set instead of over it.
 */
export type BossVoice = {
  name: Localized;
  /** What the monster is called at tier ≥ 1 — the rematch form. Same beast, a bigger title. */
  legendaryName: Localized;
  /** Nothing notable happened; the boss fills the silence. */
  idle: LocalizedPool;
  /** The hero exceeded the target and rolled a crit. */
  crit: LocalizedPool;
  /** The hit landed on the boss's resistance and dealt half. */
  resist: LocalizedPool;
  /** Below 25 % HP. */
  enrage: LocalizedPool;
};

/** Non-empty by type: a boss with nothing to say would return `undefined` from every pick. */
type LocalizedPool = Localized<[string, ...string[]]>;

/**
 * What to call the thing on screen.
 *
 * Tier ≥ 1 gets the legendary title — the rematch is the same monster with a bigger name — and a
 * shiny encounter gleams in front of whatever the name is. Falls back to the campaign title —
 * which is what `BossFight.enName`/`frName` hold — for content that ships without a painting.
 * That is the only reason those fields still exist.
 */
export function bossDisplayName(
  fight: {
    imagePath: string;
    enName: string;
    frName: string;
    deName: string;
    esName: string;
    tier?: number;
    shiny?: boolean;
  },
  language: AppLanguage,
): string {
  const key = getBossKey(fight.imagePath);
  const prefix = fight.shiny ? "✨ " : "";
  if (key) {
    const entry = (fight.tier ?? 0) >= 1 ? BOSSES[key].legendaryName : BOSSES[key].name;
    return prefix + entry[language];
  }
  return prefix + localizedName(fight, language);
}

/** The boss's own voice, or the golem's as a stand-in for unpainted content. */
export function bossVoice(imagePath: string): BossVoice {
  return BOSSES[getBossKey(imagePath) ?? "stone_golem"];
}

export const BOSSES: Record<BossAssetKey, BossVoice> = {
  fire_dragon: {
    name: { en: "Cindermaw", fr: "Gueule-de-Cendre", de: "Aschenschlund", es: "Fauce de Ceniza" },
    legendaryName: {
      en: "Cindermaw the Crowned",
      fr: "Gueule-de-Cendre Couronnée",
      de: "Aschenschlund der Gekrönte",
      es: "Fauce de Ceniza la Coronada",
    },
    idle: {
      en: [
        "The forge took longer to break me.",
        "You burn slowly, hero.",
        "Ash. All of it, ash.",
        "Your little village would make fine kindling.",
        "I have eaten knights with better form.",
      ],
      fr: [
        "La forge a mis plus de temps à me briser.",
        "Tu brûles lentement, héros.",
        "Cendres. Tout n'est que cendres.",
        "Ton petit village ferait d'excellentes brindilles.",
        "J'ai dévoré des chevaliers mieux entraînés.",
      ],
      de: [
        "Die Schmiede hat länger gebraucht, um mich zu brechen.",
        "Du brennst langsam, Held.",
        "Asche. Alles nur Asche.",
        "Dein kleines Dorf gäbe gutes Anzündholz ab.",
        "Ich habe Ritter mit besserer Haltung gefressen.",
      ],
      es: [
        "La forja tardó más en quebrarme.",
        "Ardes despacio, héroe.",
        "Ceniza. Todo es ceniza.",
        "Tu aldea sería buena yesca.",
        "He devorado caballeros con mejor técnica.",
      ],
    },
    crit: {
      en: [
        "That one had heat in it.",
        "So the ember bites back.",
        "Careful, hero. You are starting to impress me.",
      ],
      fr: [
        "Celui-là chauffait.",
        "Ainsi la braise mord en retour.",
        "Prudence, héros. Tu commences à m'impressionner.",
      ],
      de: [
        "Der war heiß.",
        "Die Glut beißt also zurück.",
        "Vorsicht, Held. Du fängst an, mich zu beeindrucken.",
      ],
      es: ["Ese quemaba.", "Así que la brasa muerde.", "Cuidado, héroe. Empiezas a impresionarme."],
    },
    resist: {
      en: ["Scale does not care how hard you swing.", "You are polishing my armour."],
      fr: ["L'écaille se moque de ta force.", "Tu astiques mon armure."],
      de: ["Schuppen ist es egal, wie fest du zuschlägst.", "Du polierst meine Rüstung."],
      es: ["A las escamas no les importa tu fuerza.", "Me estás puliendo la armadura."],
    },
    enrage: {
      en: [
        "Then we both burn!",
        "I will take the sky with me!",
        "Come then! The fire remembers you!",
      ],
      fr: [
        "Alors nous brûlerons tous les deux !",
        "J'emporterai le ciel avec moi !",
        "Viens donc ! Le feu se souvient de toi !",
      ],
      de: [
        "Dann brennen wir beide!",
        "Ich reiße den Himmel mit in die Tiefe!",
        "Na komm! Das Feuer erinnert sich an dich!",
      ],
      es: [
        "¡Entonces ardemos los dos!",
        "¡Me llevaré el cielo conmigo!",
        "¡Ven, pues! ¡El fuego te recuerda!",
      ],
    },
  },

  stone_golem: {
    name: {
      en: "The Quarry King",
      fr: "Le Roi des Carrières",
      de: "Der Steinbruchkönig",
      es: "El Rey de la Cantera",
    },
    legendaryName: {
      en: "The Quarry God",
      fr: "Le Dieu des Carrières",
      de: "Der Steinbruchgott",
      es: "El Dios de la Cantera",
    },
    idle: {
      en: [
        "I was here before your village.",
        "Mountains do not hurry.",
        "Wear me down, then.",
        "Your ancestors chipped at me too.",
        "Count your sets. I count centuries.",
      ],
      fr: [
        "J'étais là avant ton village.",
        "Les montagnes ne se pressent pas.",
        "Use-moi, si tu peux.",
        "Tes ancêtres me taillaient déjà.",
        "Compte tes séries. Moi, je compte les siècles.",
      ],
      de: [
        "Ich war vor deinem Dorf da.",
        "Berge haben keine Eile.",
        "Dann schleif mich doch ab.",
        "Schon deine Ahnen haben an mir gemeißelt.",
        "Zähl deine Sätze. Ich zähle Jahrhunderte.",
      ],
      es: [
        "Yo estaba aquí antes que tu aldea.",
        "Las montañas no tienen prisa.",
        "Desgástame, pues.",
        "Tus antepasados ya me picaban.",
        "Cuenta tus series. Yo cuento siglos.",
      ],
    },
    crit: {
      en: ["A crack. One crack.", "You found the seam.", "Again. Strike there again, if you dare."],
      fr: [
        "Une fissure. Une seule.",
        "Tu as trouvé la faille.",
        "Encore. Frappe là encore, si tu l'oses.",
      ],
      de: [
        "Ein Riss. Ein einziger Riss.",
        "Du hast die Fuge gefunden.",
        "Noch mal. Schlag noch mal dorthin, wenn du dich traust.",
      ],
      es: [
        "Una grieta. Una sola.",
        "Has encontrado la veta.",
        "Otra vez. Golpea ahí otra vez, si te atreves.",
      ],
    },
    resist: {
      en: ["Stone against stone.", "You strike where I am thickest."],
      fr: ["Pierre contre pierre.", "Tu frappes là où je suis le plus épais."],
      de: ["Stein gegen Stein.", "Du schlägst dort zu, wo ich am dicksten bin."],
      es: ["Piedra contra piedra.", "Golpeas donde soy más grueso."],
    },
    enrage: {
      en: ["I will fall on you!", "Even ruins have weight!", "The quarry will be your grave!"],
      fr: [
        "Je m'écroulerai sur toi !",
        "Même les ruines ont du poids !",
        "La carrière sera ta tombe !",
      ],
      de: [
        "Ich stürze auf dich!",
        "Selbst Ruinen haben Gewicht!",
        "Der Steinbruch wird dein Grab!",
      ],
      es: ["¡Caeré sobre ti!", "¡Hasta las ruinas pesan!", "¡La cantera será tu tumba!"],
    },
  },

  shadow_serpent: {
    name: { en: "Nightcoil", fr: "Ombre-Lovée", de: "Nachtschlinge", es: "Sombra Enroscada" },
    legendaryName: {
      en: "Nightcoil Eternal",
      fr: "Ombre-Lovée l'Éternelle",
      de: "Nachtschlinge die Ewige",
      es: "Sombra Enroscada la Eterna",
    },
    idle: {
      en: [
        "I am already behind you.",
        "Breathe. I can wait.",
        "Your shadow is mine on loan.",
        "Rest. I do my best work while you rest.",
        "Every rep, I coil a little closer.",
      ],
      fr: [
        "Je suis déjà derrière toi.",
        "Respire. Je peux attendre.",
        "Ton ombre n'est qu'un prêt.",
        "Repose-toi. C'est là que je travaille le mieux.",
        "À chaque répétition, je me love un peu plus près.",
      ],
      de: [
        "Ich bin längst hinter dir.",
        "Atme. Ich kann warten.",
        "Dein Schatten ist nur geliehen.",
        "Ruh dich aus. Dann arbeite ich am besten.",
        "Mit jeder Wiederholung rolle ich mich näher heran.",
      ],
      es: [
        "Ya estoy detrás de ti.",
        "Respira. Puedo esperar.",
        "Tu sombra es prestada.",
        "Descansa. Es cuando mejor trabajo.",
        "Con cada repetición, me enrosco un poco más cerca.",
      ],
    },
    crit: {
      en: [
        "You saw me. Rare.",
        "Quick. Quicker than the last one.",
        "That one went through me. How?",
      ],
      fr: [
        "Tu m'as vu. C'est rare.",
        "Rapide. Plus que le précédent.",
        "Celui-là m'a transpercée. Comment ?",
      ],
      de: [
        "Du hast mich gesehen. Selten.",
        "Schnell. Schneller als der Letzte.",
        "Der ging durch mich hindurch. Wie?",
      ],
      es: ["Me has visto. Qué raro.", "Rápido. Más que el anterior.", "Ese me atravesó. ¿Cómo?"],
    },
    resist: {
      en: ["You struck where I was not.", "Coils do not break, hero."],
      fr: ["Tu as frappé là où je n'étais pas.", "Les anneaux ne se brisent pas, héros."],
      de: ["Du hast dort zugeschlagen, wo ich nicht war.", "Windungen brechen nicht, Held."],
      es: ["Has golpeado donde no estaba.", "Los anillos no se rompen, héroe."],
    },
    enrage: {
      en: [
        "Then the dark comes with teeth!",
        "No more waiting!",
        "I will wear your shadow like a crown!",
      ],
      fr: [
        "Alors les ténèbres viendront avec des crocs !",
        "Fini d'attendre !",
        "Je porterai ton ombre comme une couronne !",
      ],
      de: [
        "Dann kommt die Dunkelheit mit Zähnen!",
        "Schluss mit dem Warten!",
        "Ich trage deinen Schatten wie eine Krone!",
      ],
      es: [
        "¡Entonces la oscuridad vendrá con colmillos!",
        "¡Se acabó esperar!",
        "¡Llevaré tu sombra como una corona!",
      ],
    },
  },

  forest_titan: {
    name: { en: "Rootfather", fr: "Le Père des Racines", de: "Wurzelvater", es: "Padre Raíz" },
    legendaryName: {
      en: "The Elder Root",
      fr: "L'Aïeul des Racines",
      de: "Die Uralte Wurzel",
      es: "La Raíz Ancestral",
    },
    idle: {
      en: [
        "I have outlasted better.",
        "Seasons, hero. I count in seasons.",
        "Grow, or be soil.",
        "The forest keeps what quits.",
        "Your sweat waters my roots. Continue.",
      ],
      fr: [
        "J'ai survécu à de meilleurs que toi.",
        "Des saisons, héros. Je compte en saisons.",
        "Grandis, ou deviens terreau.",
        "La forêt garde ceux qui abandonnent.",
        "Ta sueur arrose mes racines. Continue.",
      ],
      de: [
        "Ich habe Bessere überdauert.",
        "Jahreszeiten, Held. Ich zähle in Jahreszeiten.",
        "Wachse, oder werde Erde.",
        "Der Wald behält, wer aufgibt.",
        "Dein Schweiß tränkt meine Wurzeln. Mach weiter.",
      ],
      es: [
        "He sobrevivido a mejores que tú.",
        "Estaciones, héroe. Yo cuento en estaciones.",
        "Crece, o sé tierra.",
        "El bosque se queda con quien abandona.",
        "Tu sudor riega mis raíces. Sigue.",
      ],
    },
    crit: {
      en: ["The heartwood felt that.", "You cut deep. Good.", "A storm took less from me once."],
      fr: [
        "Le duramen l'a senti.",
        "Tu coupes profond. Bien.",
        "Une tempête m'a pris moins que ça, jadis.",
      ],
      de: [
        "Das hat das Kernholz gespürt.",
        "Du schneidest tief. Gut.",
        "Ein Sturm hat mir einmal weniger genommen.",
      ],
      es: [
        "Eso lo ha notado el duramen.",
        "Cortas hondo. Bien.",
        "Una tormenta me quitó menos, una vez.",
      ],
    },
    resist: {
      en: ["Bark, hero. Only bark.", "The wood drinks your blows."],
      fr: ["De l'écorce, héros. Rien que de l'écorce.", "Le bois boit tes coups."],
      de: ["Rinde, Held. Nur Rinde.", "Das Holz trinkt deine Schläge."],
      es: ["Corteza, héroe. Solo corteza.", "La madera se bebe tus golpes."],
    },
    enrage: {
      en: [
        "The whole grove wakes!",
        "Roots to the bone!",
        "I have buried stronger heroes than you!",
      ],
      fr: [
        "Tout le bosquet s'éveille !",
        "Des racines jusqu'à l'os !",
        "J'ai enterré des héros plus forts que toi !",
      ],
      de: [
        "Der ganze Hain erwacht!",
        "Wurzeln bis auf die Knochen!",
        "Ich habe stärkere Helden als dich begraben!",
      ],
      es: [
        "¡Despierta toda la arboleda!",
        "¡Raíces hasta el hueso!",
        "¡He enterrado a héroes más fuertes que tú!",
      ],
    },
  },

  wind_wraith: {
    name: {
      en: "The Gale Wraith",
      fr: "Le Spectre des Bourrasques",
      de: "Der Böengeist",
      es: "El Espectro de las Ráfagas",
    },
    legendaryName: {
      en: "The Storm Sovereign",
      fr: "Le Souverain des Tempêtes",
      de: "Der Sturmherrscher",
      es: "El Soberano de las Tormentas",
    },
    idle: {
      en: [
        "You are swinging at weather.",
        "Catch me, then.",
        "I am the space you breathe.",
        "Your lungs are mine to empty.",
        "Blow harder, little bellows.",
      ],
      fr: [
        "Tu frappes dans le vide.",
        "Attrape-moi, alors.",
        "Je suis l'air que tu respires.",
        "Tes poumons sont à moi.",
        "Souffle plus fort, petit soufflet.",
      ],
      de: [
        "Du schlägst ins Leere.",
        "Dann fang mich doch.",
        "Ich bin die Luft, die du atmest.",
        "Deine Lungen leere ich, wann ich will.",
        "Blas fester, kleiner Blasebalg.",
      ],
      es: [
        "Golpeas al aire.",
        "Atrápame, pues.",
        "Soy el aire que respiras.",
        "Tus pulmones me pertenecen. Los vaciaré.",
        "Sopla más fuerte, pequeño fuelle.",
      ],
    },
    crit: {
      en: [
        "You struck the wind!",
        "Even I felt the draught.",
        "You are learning to hit what is not there.",
      ],
      fr: [
        "Tu as frappé le vent !",
        "Même moi j'ai senti le courant d'air.",
        "Tu apprends à frapper ce qui n'existe pas.",
      ],
      de: [
        "Du hast den Wind getroffen!",
        "Sogar ich habe den Luftzug gespürt.",
        "Du lernst, zu treffen, was nicht da ist.",
      ],
      es: [
        "¡Has golpeado al viento!",
        "Hasta yo he notado la corriente.",
        "Aprendes a golpear lo que no está.",
      ],
    },
    resist: {
      en: ["Through me. Always through me.", "You cannot bruise a gust."],
      fr: ["À travers moi. Toujours à travers moi.", "On ne meurtrit pas une rafale."],
      de: [
        "Durch mich hindurch. Immer durch mich hindurch.",
        "Eine Bö bekommt keine blauen Flecken.",
      ],
      es: ["A través de mí. Siempre a través de mí.", "A una ráfaga no se le hacen moratones."],
    },
    enrage: {
      en: [
        "Then let the storm land!",
        "I will scatter your village!",
        "Breathe while you still can!",
      ],
      fr: [
        "Alors, que la tempête s'abatte !",
        "Je disperserai ton village !",
        "Respire tant que tu le peux encore !",
      ],
      de: [
        "Dann soll der Sturm losbrechen!",
        "Ich werde dein Dorf verwehen!",
        "Atme, solange du noch kannst!",
      ],
      es: ["¡Que se desate la tormenta!", "¡Dispersaré tu aldea!", "¡Respira mientras puedas!"],
    },
  },

  iron_golem: {
    name: {
      en: "The Rustlord",
      fr: "Le Seigneur de Rouille",
      de: "Der Rostfürst",
      es: "El Señor del Óxido",
    },
    legendaryName: {
      en: "The Rustlord Reforged",
      fr: "Le Seigneur de Rouille Reforgé",
      de: "Der Rostfürst, neu geschmiedet",
      es: "El Señor del Óxido Reforjado",
    },
    idle: {
      en: [
        "The foundry never sleeps. Neither do I.",
        "They built me to outwork you.",
        "Rust is patient, hero.",
        "Quotas, hero. Mine is your defeat.",
        "I have pressed more than you will ever lift.",
      ],
      fr: [
        "La fonderie ne dort jamais. Moi non plus.",
        "On m'a construit pour travailler plus que toi.",
        "La rouille est patiente, héros.",
        "Des quotas, héros. Le mien, c'est ta défaite.",
        "J'ai pressé plus lourd que tout ce que tu soulèveras.",
      ],
      de: [
        "Die Gießerei schläft nie. Ich auch nicht.",
        "Man hat mich gebaut, um mehr zu schuften als du.",
        "Rost ist geduldig, Held.",
        "Mein Soll, Held: deine Niederlage.",
        "Ich habe mehr gestemmt, als du je heben wirst.",
      ],
      es: [
        "La fundición nunca duerme. Yo tampoco.",
        "Me construyeron para trabajar más que tú.",
        "El óxido es paciente, héroe.",
        "Cuotas, héroe. La mía es tu derrota.",
        "He prensado más de lo que tú levantarás jamás.",
      ],
    },
    crit: {
      en: [
        "A rivet gone. I felt it go.",
        "You strike like a hammer that means it.",
        "Warranty void. Well struck.",
      ],
      fr: [
        "Un rivet arraché. Je l'ai senti partir.",
        "Tu frappes comme un marteau décidé.",
        "Garantie annulée. Bien frappé.",
      ],
      de: [
        "Eine Niete weg. Ich hab gespürt, wie sie ging.",
        "Du schlägst wie ein Hammer, der es ernst meint.",
        "Garantie erloschen. Guter Schlag.",
      ],
      es: [
        "Un remache menos. Lo he notado saltar.",
        "Golpeas como un martillo que va en serio.",
        "Garantía anulada. Buen golpe.",
      ],
    },
    resist: {
      en: ["Iron does not bruise.", "You are ringing my plates, nothing more."],
      fr: ["Le fer ne se meurtrit pas.", "Tu fais sonner mes plaques, rien de plus."],
      de: ["Eisen bekommt keine Beulen.", "Du lässt meine Platten klingen, mehr nicht."],
      es: ["El hierro no se amorata.", "Solo haces sonar mis placas."],
    },
    enrage: {
      en: [
        "The furnace takes over!",
        "I will melt before I kneel!",
        "The whole foundry dies with me!",
      ],
      fr: [
        "La fournaise prend le dessus !",
        "Je fondrai avant de plier !",
        "Toute la fonderie meurt avec moi !",
      ],
      de: [
        "Der Schmelzofen übernimmt!",
        "Ich schmelze, bevor ich knie!",
        "Die ganze Gießerei stirbt mit mir!",
      ],
      es: [
        "¡El horno toma el mando!",
        "¡Me fundiré antes de arrodillarme!",
        "¡Toda la fundición muere conmigo!",
      ],
    },
  },
};
