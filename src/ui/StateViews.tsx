import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";
import { Spinner, Text, YStack } from "tamagui";
import { RPGButton } from "./RPGButton";

const stateFrame = {
    flex: 1,
    items: "center",
    justify: "center",
    gap: "$3",
    p: "$6",
} as const;

export type LoadingStateProps = {
    /** Translated label. Screens should pass an i18n string. */
    label?: string;
};

/**
 * NEW_STYLE loading placeholder. UI-only.
 */
export function LoadingState({ label }: LoadingStateProps) {
    return (
        <YStack {...stateFrame}>
            <Spinner size="large" color="$primary" />
            {label ? (
                <Text fontSize={14} color="$muted">
                    {label}
                </Text>
            ) : null}
        </YStack>
    );
}

export type EmptyStateProps = {
    title: string;
    description?: string;
    icon?: ReactNode;
    actionLabel?: string;
    onAction?: ((event: GestureResponderEvent) => void) | undefined;
};

/**
 * NEW_STYLE empty state that teaches the interface. UI-only.
 */
export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
    return (
        <YStack {...stateFrame}>
            {icon}
            <Text fontSize={18} fontWeight="800" color="$color" style={{ textAlign: "center" }}>
                {title}
            </Text>
            {description ? (
                <Text
                    fontSize={14}
                    lineHeight={20}
                    color="$muted"
                    style={{ textAlign: "center", maxWidth: 280 }}
                >
                    {description}
                </Text>
            ) : null}
            {actionLabel && onAction ? (
                <YStack mt="$2" style={{ minWidth: 180 }}>
                    <RPGButton onPress={onAction}>{actionLabel}</RPGButton>
                </YStack>
            ) : null}
        </YStack>
    );
}

export type ErrorStateProps = {
    title: string;
    description?: string;
    retryLabel?: string;
    onRetry?: ((event: GestureResponderEvent) => void) | undefined;
};

/**
 * NEW_STYLE error state with an optional retry action. UI-only.
 */
export function ErrorState({ title, description, retryLabel, onRetry }: ErrorStateProps) {
    return (
        <YStack {...stateFrame}>
            <Text fontSize={18} fontWeight="800" color="$danger" style={{ textAlign: "center" }}>
                {title}
            </Text>
            {description ? (
                <Text
                    fontSize={14}
                    lineHeight={20}
                    color="$muted"
                    style={{ textAlign: "center", maxWidth: 280 }}
                >
                    {description}
                </Text>
            ) : null}
            {retryLabel && onRetry ? (
                <YStack mt="$2" style={{ minWidth: 160 }}>
                    <RPGButton variant="secondary" onPress={onRetry}>
                        {retryLabel}
                    </RPGButton>
                </YStack>
            ) : null}
        </YStack>
    );
}
