import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ScrollView, Text, YStack } from "tamagui";
import { db } from "@/src/db/client";
import { userSettings } from "@/src/db/schema";

export default function DisclaimerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [_acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledge = async () => {
    try {
      // Store acknowledgment in database
      await db.insert(userSettings).values({
        key: "disclaimer_acknowledged",
        value: "true",
      });

      setAcknowledged(true);

      // Navigate to presentation
      router.replace("/onboarding/presentation");
    } catch (_error) {}
  };

  return (
    <YStack flex={1} bg="$bgDark" padding="$6">
      <ScrollView>
        <YStack gap="$4" paddingVertical="$8">
          <Text fontSize={32} fontWeight="bold" color="$text" textAlign="center">
            ⚠️ {t("disclaimer.title")}
          </Text>

          <YStack gap="$3" marginTop="$4">
            <Text fontSize={16} color="$text" lineHeight={24}>
              {t("disclaimer.intro")}
            </Text>

            <Text fontSize={16} color="$textSecondary" lineHeight={24}>
              • {t("disclaimer.not_medical_advice")}
            </Text>

            <Text fontSize={16} color="$textSecondary" lineHeight={24}>
              • {t("disclaimer.consult_doctor")}
            </Text>

            <Text fontSize={16} color="$textSecondary" lineHeight={24}>
              • {t("disclaimer.own_risk")}
            </Text>

            <Text fontSize={16} color="$text" lineHeight={24} marginTop="$4" fontWeight="600">
              {t("disclaimer.motivation_tool")}
            </Text>
          </YStack>

          <Button
            size="$5"
            bg="$primary"
            color="$text"
            marginTop="$6"
            onPress={handleAcknowledge}
            pressStyle={{ opacity: 0.8 }}
          >
            {t("disclaimer.i_understand")}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
