import type { ReactNode } from "react";
import { Paragraph, Text, YStack, type YStackProps } from "tamagui";
import { Card } from "./Card";

type EmptyStateProps = {
    emoji?: string;
    title: string;
    subtitle?: string;
    action?: ReactNode;
} & Omit<YStackProps, "children">;

/**
 * Consistent empty state component for when there's no data to display.
 * Used across quests, sessions, journal, etc.
 */
export function EmptyState({ emoji = "📭", title, subtitle, action, ...props }: EmptyStateProps) {
    return (
        <Card {...props}>
            <YStack gap="$3" items="center" py="$4">
                <Text fontSize={48} animation="bouncy" enterStyle={{ scale: 0.5, opacity: 0 }}>
                    {emoji}
                </Text>
                <YStack gap="$1" items="center">
                    <Text fontWeight="900" fontSize={18} color="$color" style={{ textAlign: "center" }}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Paragraph color="$color" opacity={0.6} size="$3" style={{ textAlign: "center" }}>
                            {subtitle}
                        </Paragraph>
                    )}
                </YStack>
                {action && <YStack pt="$2">{action}</YStack>}
            </YStack>
        </Card>
    );
}
