import type { ReactNode } from "react";
import { type ColorTokens, Text, XStack } from "tamagui";

export type StatusBadgeTone = "primary" | "success" | "warning" | "danger" | "neutral";

export type StatusBadgeProps = {
    children: ReactNode;
    tone?: StatusBadgeTone;
    /**
     * Solid tone background (e.g. "Current Arc"). Defaults to a soft tinted outline
     * (e.g. difficulty chips EASY / MEDIUM / HARD).
     */
    filled?: boolean;
};

const TONE_COLOR: Record<StatusBadgeTone, ColorTokens> = {
    primary: "$primary",
    success: "$success",
    warning: "$warning",
    danger: "$danger",
    neutral: "$muted",
};

/**
 * NEW_STYLE status / difficulty pill. UI-only.
 */
export function StatusBadge({ children, tone = "primary", filled = false }: StatusBadgeProps) {
    const toneColor = TONE_COLOR[tone];
    // Keep text readable on solid fills: dark ink on the light amber, else near-white.
    const filledText: ColorTokens = tone === "warning" ? "$shadowColor" : "$color";

    return (
        <XStack
            self="flex-start"
            items="center"
            height={22}
            px={10}
            rounded={9999}
            bg={filled ? toneColor : "$surface2"}
            borderWidth={1}
            borderColor={filled ? toneColor : "$borderStrong"}
        >
            <Text
                fontSize={10}
                fontWeight="800"
                color={filled ? filledText : toneColor}
                style={{ textTransform: "uppercase", letterSpacing: 0.6 }}
            >
                {children}
            </Text>
        </XStack>
    );
}
