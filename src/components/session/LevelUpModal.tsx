import { BlurView } from "expo-blur";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { Button, Card, H1, H3, Paragraph, Text, YStack } from "tamagui";

import { SOUNDS } from "@/src/constants/sounds";
import { getLevelTitle } from "@/src/db/userLevel";
import { useSound } from "@/src/hooks/useSound";

interface LevelUpModalProps {
  visible: boolean;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpModal({ visible, newLevel, onClose }: LevelUpModalProps) {
  const { t, i18n } = useTranslation();
  const { playSound } = useSound();

  const titleObj = getLevelTitle(newLevel);
  const title = i18n.language === "fr" ? titleObj.fr : titleObj.en;

  useEffect(() => {
    if (visible) {
      playSound(SOUNDS.levelUp);
    }
  }, [visible, playSound]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <BlurView intensity={90} tint="dark" style={{ flex: 1 }}>
        <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} />
        <YStack flex={1} justify="center" items="center" p="$4">
          <Card
            bordered
            elevate
            width="100%"
            maxWidth={400}
            bg="$bgLight"
            borderColor="$primary"
            borderWidth={4}
            p="$6"
            items="center"
            gap="$4"
            animation="bouncy"
            enterStyle={{ scale: 0.5, opacity: 0 }}
          >
            <Text fontSize={60}>🆙</Text>

            <YStack items="center" gap="$2">
              <H3 color="$primary" textTransform="uppercase" fontWeight="900">
                {t("session.level_up", "Level Up!")}
              </H3>

              <H1 fontSize={80} color="$color" fontWeight="900" lineHeight={80}>
                {newLevel}
              </H1>

              <Paragraph size="$4" fontWeight="bold" color="$secondary" textTransform="uppercase">
                {title}
              </Paragraph>
            </YStack>

            <Button
              size="$5"
              bg="$primary"
              width="100%"
              onPress={onClose}
              borderWidth={3}
              borderColor="$color"
              mt="$4"
            >
              <Button.Text color="white" fontWeight="bold" fontSize={18}>
                {t("common.awesome", "Awesome!")}
              </Button.Text>
            </Button>
          </Card>
        </YStack>
      </BlurView>
    </Modal>
  );
}
