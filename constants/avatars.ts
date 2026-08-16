import type { ImageSourcePropType } from "react-native";

export const avatarIds = ["shadow", "scout", "guardian", "archmage", "elder", "archer"] as const;

export type AvatarId = (typeof avatarIds)[number];

export type Avatar = {
  id: AvatarId;
  labelKey: string;
  source: ImageSourcePropType;
};

export const AVATARS = [
  {
    id: "shadow",
    labelKey: "avatars.shadow",
    source: require("../assets/avatar/shadow.webp"),
  },
  {
    id: "scout",
    labelKey: "avatars.scout",
    source: require("../assets/avatar/scout.webp"),
  },
  {
    id: "guardian",
    labelKey: "avatars.guardian",
    source: require("../assets/avatar/guardian.webp"),
  },
  {
    id: "archmage",
    labelKey: "avatars.archmage",
    source: require("../assets/avatar/archmage.webp"),
  },
  {
    id: "elder",
    labelKey: "avatars.elder",
    source: require("../assets/avatar/elder.webp"),
  },
  {
    id: "archer",
    labelKey: "avatars.archer",
    source: require("../assets/avatar/archer.webp"),
  },
] as const satisfies readonly [Avatar, ...Avatar[]];

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && (avatarIds as readonly string[]).includes(value);
}

export function getAvatarById(id: AvatarId): Avatar {
  const found = AVATARS.find((a) => a.id === id);
  // biome-ignore lint/style/noNonNullAssertion: ids are exhaustive
  return found!;
}

export function getAvatarSource(
  avatarId: AvatarId,
  customAvatarUri: string | null,
): ImageSourcePropType {
  return customAvatarUri ? { uri: customAvatarUri } : getAvatarById(avatarId).source;
}
