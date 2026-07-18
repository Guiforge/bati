import { type ColorTokens, XStack, YStack } from "tamagui";

export type ProgressBarProps = {
    /**
     * Progress ratio between 0 and 1 (clamped).
     */
    value: number;
    height?: number;
    /**
     * Fill color token. Defaults to the primary (XP). Use "$success"/"$danger" for HP, etc.
     */
    fill?: ColorTokens;
    /**
     * Adds the NEW_STYLE glow under the fill.
     */
    glow?: boolean;
};

/**
 * NEW_STYLE XP / HP progress bar with optional glow. UI-only.
 */
export function ProgressBar({
    value,
    height = 8,
    fill = "$primary",
    glow = true,
}: ProgressBarProps) {
    const clamped = Math.max(0, Math.min(1, value));

    return (
        <XStack width="100%" height={height} bg="$surface2" rounded={9999} overflow="hidden">
            <YStack
                height="100%"
                width={`${clamped * 100}%`}
                bg={fill}
                rounded={9999}
                shadowColor="$primaryGlow"
                shadowOpacity={glow ? 0.9 : 0}
                shadowRadius={glow ? 8 : 0}
                shadowOffset={{ width: 0, height: 0 }}
            />
        </XStack>
    );
}
