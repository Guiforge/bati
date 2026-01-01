import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import { Button, H2, Paragraph, Text, YStack } from "tamagui";
import { buildingNames } from "@/constants/buildingNames";
import type { BuildingCode } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";
import { LevelUpSparkle } from "./VillageAnimations";

interface ConstructionAnimationProps {
  visible: boolean;
  buildingType: BuildingCode;
  type: "unlock" | "levelup";
  level?: number;
  onClose: () => void;
}

export function ConstructionAnimation({
  visible,
  buildingType,
  type,
  level,
  onClose,
}: ConstructionAnimationProps) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const name = buildingNames[buildingType]?.[language === "fr" ? "fr" : "en"] || buildingType;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <YStack flex={1} bg="rgba(0,0,0,0.8)" items="center" justify="center" p="$4">
        <LevelUpSparkle isActive={visible} />

        <YStack
          bg="$background"
          p="$6"
          rounded="$6"
          items="center"
          gap="$4"
          borderWidth={3}
          borderColor="$primary"
          width="100%"
          style={{ maxWidth: 350 }}
        >
          <H2 style={{ textAlign: "center" }} color="$primary">
            {type === "unlock"
              ? t("village.unlocked", "Building Unlocked!")
              : t("village.levelup", "Level Up!")}
          </H2>

          <YStack width={80} height={80} bg="$primary" rounded="$4" items="center" justify="center">
            {/* Placeholder for icon */}
            <Text fontSize={40}>🏗️</Text>
          </YStack>

          <YStack items="center" gap="$1">
            <H2 style={{ textAlign: "center" }}>{name}</H2>
            {level && (
              <Paragraph opacity={0.7}>
                {t("village.level_label", "Level")} {level}
              </Paragraph>
            )}
          </YStack>

          <Button bg="$primary" color="white" onPress={onClose} width="100%" size="$5">
            {t("common.awesome", "Awesome!")}
          </Button>
        </YStack>
      </YStack>
    </Modal>
  );
}
