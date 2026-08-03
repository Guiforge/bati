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
      en: ["The forge took longer to break me.", "You burn slowly, hero.", "Ash. All of it, ash."],
      fr: [
        "La forge a mis plus de temps à me briser.",
        "Tu brûles lentement, héros.",
        "Cendres. Tout n'est que cendres.",
      ],
    },
    crit: {
      en: ["That one had heat in it.", "So the ember bites back."],
      fr: ["Celui-là avait de la chaleur.", "Ainsi la braise mord en retour."],
    },
    resist: {
      en: ["Scale does not care how hard you swing.", "You are polishing my armour."],
      fr: ["L'écaille se moque de ta force.", "Tu astiques mon armure."],
    },
    enrage: {
      en: ["Then we both burn!", "I will take the sky with me!"],
      fr: ["Alors nous brûlerons tous les deux !", "J'emporterai le ciel avec moi !"],
    },
  },

  stone_golem: {
    name: { en: "The Quarry King", fr: "Le Roi des Carrières" },
    legendaryName: { en: "The Quarry God", fr: "Le Dieu des Carrières" },
    idle: {
      en: ["I was here before your village.", "Mountains do not hurry.", "Wear me down, then."],
      fr: [
        "J'étais là avant ton village.",
        "Les montagnes ne se pressent pas.",
        "Use-moi, si tu peux.",
      ],
    },
    crit: {
      en: ["A crack. One crack.", "You found the seam."],
      fr: ["Une fissure. Une seule.", "Tu as trouvé la faille."],
    },
    resist: {
      en: ["Stone against stone.", "You strike where I am thickest."],
      fr: ["Pierre contre pierre.", "Tu frappes là où je suis le plus épais."],
    },
    enrage: {
      en: ["I will fall on you!", "Even ruins have weight!"],
      fr: ["Je m'écroulerai sur toi !", "Même les ruines ont du poids !"],
    },
  },

  shadow_serpent: {
    name: { en: "Nightcoil", fr: "Ombre-Lovée" },
    legendaryName: { en: "Nightcoil Eternal", fr: "Ombre-Lovée l'Éternelle" },
    idle: {
      en: ["I am already behind you.", "Breathe. I can wait.", "Your shadow is mine on loan."],
      fr: [
        "Je suis déjà derrière toi.",
        "Respire. Je peux attendre.",
        "Ton ombre n'est qu'un prêt.",
      ],
    },
    crit: {
      en: ["You saw me. Rare.", "Quick. Quicker than the last one."],
      fr: ["Tu m'as vu. C'est rare.", "Rapide. Plus que le précédent."],
    },
    resist: {
      en: ["You struck where I was not.", "Coils do not break, hero."],
      fr: ["Tu as frappé où je n'étais pas.", "Les anneaux ne se brisent pas, héros."],
    },
    enrage: {
      en: ["Then the dark comes with teeth!", "No more waiting!"],
      fr: ["Alors les ténèbres viendront avec des crocs !", "Fini d'attendre !"],
    },
  },

  forest_titan: {
    name: { en: "Rootfather", fr: "Le Père des Racines" },
    legendaryName: { en: "The Elder Root", fr: "L'Aïeul des Racines" },
    idle: {
      en: ["I have outlasted better.", "Seasons, hero. I count in seasons.", "Grow, or be soil."],
      fr: [
        "J'ai survécu à de meilleurs que toi.",
        "Des saisons, héros. Je compte en saisons.",
        "Grandis, ou deviens terreau.",
      ],
    },
    crit: {
      en: ["The heartwood felt that.", "You cut deep. Good."],
      fr: ["Le duramen l'a senti.", "Tu coupes profond. Bien."],
    },
    resist: {
      en: ["Bark, hero. Only bark.", "The wood drinks your blows."],
      fr: ["De l'écorce, héros. Rien que de l'écorce.", "Le bois boit tes coups."],
    },
    enrage: {
      en: ["The whole grove wakes!", "Roots to the bone!"],
      fr: ["Tout le bosquet s'éveille !", "Des racines jusqu'à l'os !"],
    },
  },

  wind_wraith: {
    name: { en: "The Gale Wraith", fr: "Le Spectre des Bourrasques" },
    legendaryName: { en: "The Storm Sovereign", fr: "Le Souverain des Tempêtes" },
    idle: {
      en: ["You are swinging at weather.", "Catch me, then.", "I am the space you breathe."],
      fr: [
        "Tu frappes le temps qu'il fait.",
        "Attrape-moi, alors.",
        "Je suis l'air que tu respires.",
      ],
    },
    crit: {
      en: ["You struck the wind!", "Even I felt the draught."],
      fr: ["Tu as frappé le vent !", "Même moi j'ai senti le courant d'air."],
    },
    resist: {
      en: ["Through me. Always through me.", "You cannot bruise a gust."],
      fr: ["À travers moi. Toujours à travers moi.", "On ne meurtrit pas une rafale."],
    },
    enrage: {
      en: ["Then let the storm land!", "I will scatter your village!"],
      fr: ["Alors que la tempête touche terre !", "Je disperserai ton village !"],
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
      ],
      fr: [
        "La fonderie ne dort jamais. Moi non plus.",
        "On m'a construit pour travailler plus que toi.",
        "La rouille est patiente, héros.",
      ],
    },
    crit: {
      en: ["A rivet gone. I felt it go.", "You strike like a hammer that means it."],
      fr: ["Un rivet arraché. Je l'ai senti partir.", "Tu frappes comme un marteau décidé."],
    },
    resist: {
      en: ["Iron does not bruise.", "You are ringing my plates, nothing more."],
      fr: ["Le fer ne se meurtrit pas.", "Tu fais sonner mes plaques, rien de plus."],
    },
    enrage: {
      en: ["The furnace takes over!", "I will melt before I kneel!"],
      fr: ["La fournaise prend le dessus !", "Je fondrai avant de plier !"],
    },
  },
};
