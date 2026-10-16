import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { ScrollText } from "@/components/icons";
import licenses from "@/src/licenses.json";

export default function LicensesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <XStack flex={1} items="center" gap="$2">
          <ScrollText size={20} color="$primaryText" />
          <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$text">
            {t("credits.licenses_title")}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Paragraph color="$textSecondary">{t("credits.licenses_body")}</Paragraph>
        <Card gap="$3">
          {licenses.map((dep, i) => (
            <YStack key={dep.name} gap="$3">
              {i > 0 ? <Separator /> : null}
              <XStack items="center" justify="space-between" gap="$3">
                <YStack flex={1}>
                  <Text fontSize="$3" fontWeight="700" color="$text">
                    {dep.name}
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    {dep.version}
                  </Text>
                </YStack>
                <Text fontSize="$3" color="$textSecondary">
                  {dep.license}
                </Text>
              </XStack>
            </YStack>
          ))}
        </Card>
      </RNScrollView>
    </YStack>
  );
}
