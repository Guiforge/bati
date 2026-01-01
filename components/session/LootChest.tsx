import { SOUNDS } from "@/constants/sounds";
import type { ResourceLoot } from "@/db/resources";
import { useHaptics } from "@/hooks/useHaptics";
import { useSound } from "@/hooks/useSound";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, Button, Paragraph, YStack } from "tamagui";
import { LootDisplay } from "./LootDisplay";

export function LootChest({ loot }: { loot: ResourceLoot }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const { playSound } = useSound();
    const { success } = useHaptics();

    const handleOpen = () => {
        success();
        playSound(SOUNDS.chestOpen);
        setIsOpen(true);
    };

    // If no loot, don't show chest
    const hasLoot = loot.gold > 0 || loot.materials.length > 0;
    if (!hasLoot) return null;

    return (
        <YStack width="100%" items="center" height={150} justify="center">
            <AnimatePresence>
                {!isOpen ? (
                    <YStack
                        key="chest"
                        animation="bouncy"
                        exitStyle={{ opacity: 0, scale: 0.5, rotate: "10deg" }}
                        enterStyle={{ opacity: 0, scale: 0.5, y: -20 }}
                        onPress={handleOpen}
                        pressStyle={{ scale: 0.9 }}
                        cursor="pointer"
                        items="center"
                        gap="$2"
                    >
                        <Paragraph fontSize={80}>🎁</Paragraph>
                        <Button
                            size="$3"
                            bg="$primary"
                            onPress={handleOpen}
                            pressStyle={{ opacity: 0.9, scale: 0.98 }}
                            borderWidth={3}
                            borderColor="$color"
                            rounded="$6"
                        >
                            <Button.Text color="white" fontWeight="900">
                                {t("session.open_loot", "Open Loot")}
                            </Button.Text>
                        </Button>
                    </YStack>
                ) : (
                    <YStack
                        key="loot"
                        width="100%"
                        animation="quick"
                        enterStyle={{ opacity: 0, scale: 0.8, y: 20 }}
                    >
                        <LootDisplay loot={loot} />
                    </YStack>
                )}
            </AnimatePresence>
        </YStack>
    );
}
