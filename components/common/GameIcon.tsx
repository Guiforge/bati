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

  // expo-image's tintColor takes a real colour, not a token, so a `$name` has to be resolved
  // here. Theme keys are unprefixed — `theme.text`, never `theme["$text"]` — so the lookup has
  // to drop the `$` first. Without that every token missed, fell through to the raw string, and
  // expo-image was handed the literal "$text": nineteen call sites all tinted with the fallback,
  // and one warning per icon.
  const resolveColor = (c?: string | ColorTokens) => {
    if (!c) return undefined;
    const key = typeof c === "string" && c.startsWith("$") ? c.slice(1) : (c as string);
    const val = theme[key]?.val;
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
      {!!badge && (
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
