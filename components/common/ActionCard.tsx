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
};

export function ActionCard({
  children,
  title,
  subtitle,
  ctaText,
  icon,
  onPress,
  ...props
}: ActionCardProps) {
  return (
    <YStack
      bg="$bgLight"
      borderWidth={1}
      borderColor="#dcdcdc"
      rounded="$4"
      shadowColor="$color"
      shadowRadius={4}
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.1}
      elevation={3} // Android shadow
      onPress={onPress}
      pressStyle={{ opacity: 0.7, scale: 0.99 }}
      animation="quick"
      overflow="hidden"
      {...props}
    >
      <XStack p="$4" items="center" gap="$3">
        {/* Optional Left Icon */}
        {icon && <YStack>{icon}</YStack>}

        {/* Content */}
        <YStack flex={1} gap="$1">
          {title && (
            <Text fontSize="$4" fontWeight="bold" color="$color">
              {title}
            </Text>
          )}
          {subtitle && (
            <Text fontSize="$3" color="$color" opacity={0.7}>
              {subtitle}
            </Text>
          )}
          {children}
        </YStack>

        {/* Right Side: CTA or Chevron */}
        <XStack items="center" gap="$2">
          {ctaText && (
            <Text fontSize="$3" color="$primary" fontWeight="bold">
              {ctaText}
            </Text>
          )}
          <ChevronRight size={20} color="$color" opacity={0.5} />
        </XStack>
      </XStack>
    </YStack>
  );
}
