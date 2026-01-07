import type { ImageSourcePropType } from "react-native";

export const avatarIds = ["shadow", "scout", "guardian", "archmage", "elder", "archer"] as const;

export type AvatarId = (typeof avatarIds)[number];

export type Avatar = {
  id: AvatarId;
  labelKey: string;
  source: ImageSourcePropType;
};

export const AVATARS: Avatar[] = [
  {
    id: "shadow",
    labelKey: "avatars.shadow",
    source: require("../assets/avatar/shadow.jpg"),
  },
  {
    id: "scout",
    labelKey: "avatars.scout",
    source: require("../assets/avatar/scout.jpg"),
  },
  {
    id: "guardian",
    labelKey: "avatars.guardian",
    source: require("../assets/avatar/guardian.jpg"),
  },
  {
    id: "archmage",
    labelKey: "avatars.archmage",
    source: require("../assets/avatar/archmage.jpg"),
  },
  {
    id: "elder",
    labelKey: "avatars.elder",
    source: require("../assets/avatar/elder.jpg"),
  },
  {
    id: "archer",
    labelKey: "avatars.archer",
    source: require("../assets/avatar/archer.jpg"),
  },
];

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && (avatarIds as readonly string[]).includes(value);
}

export function getAvatarById(id: AvatarId): Avatar {
  const found = AVATARS.find((a) => a.id === id);
  // biome-ignore lint/style/noNonNullAssertion: ids are exhaustive
  return found!;
}
