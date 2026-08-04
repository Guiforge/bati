import { type BossAssetKey, getBossKey } from "@/constants/assetMap";

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

type Localized = { en: string; fr: string };
type LocalizedPool = { en: string[]; fr: string[] };

/**
 * What to call the thing on screen.
 *
 * Tier ≥ 1 gets the legendary title — the rematch is the same monster with a bigger name — and a
 * shiny encounter gleams in front of whatever the name is. Falls back to the campaign title —
 * which is what `BossFight.enName`/`frName` hold — for content that ships without a painting.
 * That is the only reason those fields still exist.
 */
export function bossDisplayName(
  fight: { imagePath: string; enName: string; frName: string; tier?: number; shiny?: boolean },
  language: string,
): string {
  const key = getBossKey(fight.imagePath);
  const prefix = fight.shiny ? "✨ " : "";
  if (key) {
    const entry = (fight.tier ?? 0) >= 1 ? BOSSES[key].legendaryName : BOSSES[key].name;
    return prefix + (language === "fr" ? entry.fr : entry.en);
  }
  return prefix + (language === "fr" ? fight.frName : fight.enName);
}

/** The boss's own voice, or the golem's as a stand-in for unpainted content. */
export function bossVoice(imagePath: string): BossVoice {
  return BOSSES[getBossKey(imagePath) ?? "stone_golem"];
}

export const BOSSES: Record<BossAssetKey, BossVoice> = {
  fire_dragon: {
    name: { en: "Cindermaw", fr: "Gueule-de-Cendre" },
    legendaryName: { en: "Cindermaw the Crowned", fr: "Gueule-de-Cendre Couronnée" },
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
        "Ton petit village ferait un beau petit bois.",
        "J'ai dévoré des chevaliers mieux entraînés.",
      ],
    },
    crit: {
      en: [
        "That one had heat in it.",
        "So the ember bites back.",
        "Careful, hero. You are starting to impress me.",
      ],
      fr: [
        "Celui-là avait de la chaleur.",
        "Ainsi la braise mord en retour.",
        "Prudence, héros. Tu commences à m'impressionner.",
      ],
    },
    resist: {
      en: ["Scale does not care how hard you swing.", "You are polishing my armour."],
      fr: ["L'écaille se moque de ta force.", "Tu astiques mon armure."],
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
    },
  },

  stone_golem: {
    name: { en: "The Quarry King", fr: "Le Roi des Carrières" },
    legendaryName: { en: "The Quarry God", fr: "Le Dieu des Carrières" },
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
        "Tes ancêtres m'écaillaient déjà.",
        "Compte tes séries. Moi, je compte les siècles.",
      ],
    },
    crit: {
      en: ["A crack. One crack.", "You found the seam.", "Again. Strike there again, if you dare."],
      fr: [
        "Une fissure. Une seule.",
        "Tu as trouvé la faille.",
        "Encore. Frappe là encore, si tu l'oses.",
      ],
    },
    resist: {
      en: ["Stone against stone.", "You strike where I am thickest."],
      fr: ["Pierre contre pierre.", "Tu frappes là où je suis le plus épais."],
    },
    enrage: {
      en: ["I will fall on you!", "Even ruins have weight!", "The quarry will be your grave!"],
      fr: [
        "Je m'écroulerai sur toi !",
        "Même les ruines ont du poids !",
        "La carrière sera ta tombe !",
      ],
    },
  },

  shadow_serpent: {
    name: { en: "Nightcoil", fr: "Ombre-Lovée" },
    legendaryName: { en: "Nightcoil Eternal", fr: "Ombre-Lovée l'Éternelle" },
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
    },
    resist: {
      en: ["You struck where I was not.", "Coils do not break, hero."],
      fr: ["Tu as frappé où je n'étais pas.", "Les anneaux ne se brisent pas, héros."],
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
    },
  },

  forest_titan: {
    name: { en: "Rootfather", fr: "Le Père des Racines" },
    legendaryName: { en: "The Elder Root", fr: "L'Aïeul des Racines" },
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
    },
    crit: {
      en: ["The heartwood felt that.", "You cut deep. Good.", "A storm took less from me once."],
      fr: [
        "Le duramen l'a senti.",
        "Tu coupes profond. Bien.",
        "Une tempête m'a pris moins que ça, jadis.",
      ],
    },
    resist: {
      en: ["Bark, hero. Only bark.", "The wood drinks your blows."],
      fr: ["De l'écorce, héros. Rien que de l'écorce.", "Le bois boit tes coups."],
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
    },
  },

  wind_wraith: {
    name: { en: "The Gale Wraith", fr: "Le Spectre des Bourrasques" },
    legendaryName: { en: "The Storm Sovereign", fr: "Le Souverain des Tempêtes" },
    idle: {
      en: [
        "You are swinging at weather.",
        "Catch me, then.",
        "I am the space you breathe.",
        "Your lungs are mine to empty.",
        "Blow harder, little bellows.",
      ],
      fr: [
        "Tu frappes le temps qu'il fait.",
        "Attrape-moi, alors.",
        "Je suis l'air que tu respires.",
        "Tes poumons sont à moi.",
        "Souffle plus fort, petit soufflet.",
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
    },
    resist: {
      en: ["Through me. Always through me.", "You cannot bruise a gust."],
      fr: ["À travers moi. Toujours à travers moi.", "On ne meurtrit pas une rafale."],
    },
    enrage: {
      en: [
        "Then let the storm land!",
        "I will scatter your village!",
        "Breathe while you still can!",
      ],
      fr: [
        "Alors que la tempête touche terre !",
        "Je disperserai ton village !",
        "Respire tant que tu le peux encore !",
      ],
    },
  },

  iron_golem: {
    name: { en: "The Rustlord", fr: "Le Seigneur de Rouille" },
    legendaryName: { en: "The Rustlord Reforged", fr: "Le Seigneur de Rouille Reforgé" },
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
    },
    resist: {
      en: ["Iron does not bruise.", "You are ringing my plates, nothing more."],
      fr: ["Le fer ne se meurtrit pas.", "Tu fais sonner mes plaques, rien de plus."],
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
    },
  },
};
