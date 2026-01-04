import { Card } from "@/components/common/Card";
import { useGameIcons } from "@/hooks/useGameIcon";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { useSmartAction } from "./useSmartAction";

export function CurrentAdventureWidget() {
    const router = useRouter();
    const { t } = useTranslation();
    const { config, isLoading } = useSmartAction();
    const icons = useGameIcons(["scroll", "sword"]);

    if (isLoading) {
        return null; // Or a skeleton
    }

    // If no config, it means no active adventure/quest.
    // We force the user to pick one by showing a "Start Adventure" CTA.
    const effectiveConfig = config || {
        variant: "adventure",
        label: t("home.start_adventure", "Start Adventure"),
        subtext: t("home.no_active_adventure", "Choose your path"),
        onPress: () => router.push("/adventures"),
    };

    const isAdventure = effectiveConfig.variant === "adventure";
    const title = isAdventure
        ? t("home.continue_adventure", "Continue Adventure")
        : t("home.next_step", "Next Step");

    // If we synthesized the config, use its values, otherwise fallbacks
    const subtitle = effectiveConfig.subtext || t("home.start_journey", "Start your journey");
    const label = effectiveConfig.label || t("home.play", "Play");
    const handlePress = effectiveConfig.onPress || (() => router.push("/adventures"));

    return (
        <Card
            bg="$bgLight"
            borderWidth={3}
            borderColor="$color"
            p={0}
            overflow="hidden"
            onPress={handlePress}
            pressStyle={{ scale: 0.98 }}
            animation="bouncy"
        >
            <XStack>
                {/* Left: Image/Icon Area */}
                <YStack
                    width={100}
                    bg="$primary"
                    justify="center"
                    items="center"
                    borderRightWidth={3}
                    borderColor="$color"
                >
                    <Image
                        source={isAdventure ? icons.scroll : icons.sword}
                        style={{ width: 48, height: 48, tintColor: "white" }}
                        contentFit="contain"
                    />
                </YStack>

                {/* Right: Content */}
                <YStack flex={1} p="$4" justify="center" gap="$1">
                    <Text
                        fontSize={12}
                        fontWeight="bold"
                        opacity={0.6}
                        textTransform="uppercase"
                        color="$color"
                    >
                        {title}
                    </Text>
                    <H3 fontSize={20} fontWeight="900" color="$color" numberOfLines={2}>
                        {subtitle}
                    </H3>

                    <XStack mt="$2">
                        <Button
                            size="$3"
                            bg="$color"
                            color="$bgLight"
                            fontWeight="bold"
                            onPress={handlePress}
                            pressStyle={{ opacity: 0.8 }}
                        >
                            {label}
                        </Button>
                    </XStack>
                </YStack>
            </XStack>
        </Card>
    );
}
