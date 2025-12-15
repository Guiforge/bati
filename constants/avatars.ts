import type { ImageSourcePropType } from "react-native";

export const avatarIds = ["elf", "forgeron", "gamin", "mage", "rogue"] as const;

export type AvatarId = (typeof avatarIds)[number];

export type Avatar = {
  id: AvatarId;
  label: string;
  source: ImageSourcePropType;
};

export const AVATARS: Avatar[] = [
  { id: "elf", label: "Elf", source: require("../assets/avatar/elf.jpg") },
  {
    id: "forgeron",
    label: "Forgeron",
    source: require("../assets/avatar/forgeron.jpg"),
  },
  {
    id: "gamin",
    label: "Gamin",
    source: require("../assets/avatar/gamin.jpg"),
  },
  { id: "mage", label: "Mage", source: require("../assets/avatar/mage.jpg") },
  {
    id: "rogue",
    label: "Rogue",
    source: require("../assets/avatar/rogue.jpg"),
  },
];

export function isAvatarId(value: unknown): value is AvatarId {
  return (
    typeof value === "string" &&
    (avatarIds as readonly string[]).includes(value)
  );
}

export function getAvatarById(id: AvatarId): Avatar {
  const found = AVATARS.find((a) => a.id === id);
  // biome-ignore lint/style/noNonNullAssertion: ids are exhaustive
  return found!;
}
