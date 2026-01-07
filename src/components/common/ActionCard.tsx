import { ChevronRight } from "@tamagui/lucide-icons";
import type { ReactNode } from "react";
import { Text, XStack, YStack, type YStackProps } from "tamagui";

export type ActionCardProps = Omit<YStackProps, "children"> & {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  icon?: ReactNode;
  onPress?: () => void;
  variant?: "default" | "featured";
};

export function ActionCard({
  children,
  title,
  subtitle,
  ctaText,
  icon,
  onPress,
  variant = "default",
  ...props
}: ActionCardProps) {
  const isFeatured = variant === "featured";

  return (
    <YStack
      bg={isFeatured ? "rgba(13, 51, 242, 0.1)" : "$glassBg"}
      borderWidth={1}
      borderColor={isFeatured ? "$primary" : "$borderStrong"}
      rounded="$4"
      onPress={onPress}
      pressStyle={{ opacity: 0.8, scale: 0.98 }}
      animation="quick"
      overflow="hidden"
      {...props}
    >
      <XStack p="$4" items="center" gap="$3">
        {/* Optional Left Icon */}
        {icon && (
          <YStack opacity={isFeatured ? 1 : 0.8} scale={isFeatured ? 1.1 : 1}>
            {icon}
          </YStack>
        )}

        {/* Content */}
        <YStack flex={1} gap="$1">
          {title && (
            <Text
              fontSize="$4"
              fontWeight="900"
              color={isFeatured ? "$primary" : "$text"}
              letterSpacing={0.5}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text fontSize="$3" color="$textSecondary" opacity={0.8}>
              {subtitle}
            </Text>
          )}
          {children}
        </YStack>

        {/* Right Side: CTA or Chevron */}
        <XStack items="center" gap="$2">
          {ctaText && (
            <Text
              fontSize="$2"
              color={isFeatured ? "$primary" : "$textSecondary"}
              fontWeight="bold"
              textTransform="uppercase"
            >
              {ctaText}
            </Text>
          )}
          <ChevronRight size={18} color="$textSecondary" opacity={0.5} />
        </XStack>
      </XStack>
    </YStack>
  );
}
