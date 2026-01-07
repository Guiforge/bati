import type { BuildingCode } from "@/src/db/schema";

export const buildingNames: Record<BuildingCode, { en: string; fr: string }> = {
  campfire: { en: "Campfire", fr: "Feu de camp" },
  tent: { en: "Tent", fr: "Tente" },
  training_dummy: { en: "Training Dummy", fr: "Mannequin d'entraînement" },
  archery_range: { en: "Archery Range", fr: "Champ de tir" },
  quarry: { en: "Quarry", fr: "Carrière" },
  forge: { en: "Forge", fr: "Forge" },
  well: { en: "Well", fr: "Puits" },
  windmill: { en: "Windmill", fr: "Moulin" },
  farm: { en: "Farm", fr: "Ferme" },
  watchtower: { en: "Watchtower", fr: "Tour de guet" },
  castle_wall: { en: "Castle Wall", fr: "Muraille" },
  armory: { en: "Armory", fr: "Armurerie" },
  fountain: { en: "Fountain", fr: "Fontaine" },
  observatory: { en: "Observatory", fr: "Observatoire" },
  barn: { en: "Barn", fr: "Grange" },
  dragon_lair: { en: "Dragon Lair", fr: "Antre du dragon" },
  heroes_hall: { en: "Hero's Hall", fr: "Salle des héros" },
  wizard_tower: { en: "Wizard Tower", fr: "Tour du mage" },
  druid_grove: { en: "Druid Grove", fr: "Bosquet druidique" },
  champion_arena: { en: "Champion Arena", fr: "Arène des champions" },
};
