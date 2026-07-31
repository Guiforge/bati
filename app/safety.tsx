import { ChevronLeft, HeartPulse } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";

/**
 * Train safely — the one health warning in the app (roadmap §14 H1).
 *
 * Deliberately not a PAR-Q questionnaire: a form whose answers the app does nothing with is
 * theatre. It says the true thing once, stays reachable from Settings rather than being a modal
 * nobody can find again, and gets out of the way.
 */
export default function SafetyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          circular
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={24} color="$text" />}
          accessibilityRole="button"
          accessibilityLabel={t("quests.go_back", "Go back")}
        />
        <XStack flex={1} items="center" gap="$2">
          <HeartPulse size={20} color="$primaryText" />
          <Text fontSize={22} fontWeight="700" color="$text">
            {t("safety.title")}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("safety.before_title")}
          </Text>
          <Paragraph color="$textSecondary">{t("safety.before_body")}</Paragraph>
        </Card>

        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("safety.during_title")}
          </Text>
          <Paragraph color="$textSecondary">{t("safety.during_body")}</Paragraph>
        </Card>

        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("safety.not_a_coach_title")}
          </Text>
          <Paragraph color="$textSecondary">{t("safety.not_a_coach_body")}</Paragraph>
        </Card>
      </RNScrollView>
    </YStack>
  );
}
