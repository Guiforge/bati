import { Image } from "expo-image";
import { type ColorTokens, type GetProps, useTheme, YStack } from "tamagui";
import { type GameIconName, useGameIcon } from "@/hooks/useGameIcon";

export type GameIconProps = {
  name: GameIconName;
  size?: number;
  color?: string | ColorTokens;
  bgColor?: ColorTokens;
  shape?: "circle" | "square" | "rounded";
  borderWidth?: number;
  borderColor?: ColorTokens;
  badge?: GameIconName;
  badgeColor?: string | ColorTokens;
  badgeBg?: ColorTokens;
} & Omit<GetProps<typeof YStack>, "bg" | "bgColor" | "backgroundColor" | "borderColor">;

export function GameIcon({
  name,
  size = 64,
  color,
  bgColor,
  shape = "rounded",
  borderWidth,
  borderColor,
  badge,
  badgeColor,
  badgeBg,
  ...props
}: GameIconProps) {
  const iconSource = useGameIcon(name);
  // Always call hook, use fallback if badge is undefined
  const badgeSource = useGameIcon(badge ?? "sword");
  const theme = useTheme();

  // Helper to resolve color tokens if needed, though Tamagui usually handles it.
  // For expo-image tintColor, we might need the raw value.
  // We try to get it from theme if it matches a key, otherwise use as is.
  const resolveColor = (c?: string | ColorTokens) => {
    if (!c) return undefined;
    const val = theme[c]?.val;
    return val ? (val as string) : (c as string);
  };

  const finalColor = resolveColor(color) ?? (theme.color?.val as string);
  const finalBadgeColor = resolveColor(badgeColor) ?? finalColor;

  const resolvedBg = bgColor as unknown as GetProps<typeof YStack>["bg"];
  const resolvedBorderColor = (borderColor ?? "$text") as unknown as GetProps<
    typeof YStack
  >["borderColor"];
  const resolvedBadgeBg = (badgeBg ?? "$background") as unknown as GetProps<typeof YStack>["bg"];

  const borderRadius = shape === "circle" ? 999 : shape === "rounded" ? size / 4 : 0;

  return (
    <YStack
      width={size}
      height={size}
      bg={resolvedBg}
      rounded={borderRadius}
      borderWidth={borderWidth}
      borderColor={resolvedBorderColor}
      justify="center"
      items="center"
      overflow="hidden"
      {...props}
    >
      <Image
        source={iconSource}
        style={{ width: "80%", height: "80%" }}
        contentFit="contain"
        tintColor={finalColor}
      />
      {badge && (
        <YStack
          position="absolute"
          b={0}
          r={0}
          width={size / 2.5}
          height={size / 2.5}
          bg={resolvedBadgeBg}
          rounded={999}
          justify="center"
          items="center"
          borderWidth={1}
          borderColor={resolvedBorderColor}
        >
          <Image
            source={badgeSource}
            style={{ width: "70%", height: "70%" }}
            contentFit="contain"
            tintColor={finalBadgeColor}
          />
        </YStack>
      )}
    </YStack>
  );
}
