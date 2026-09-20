import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { ShieldCheck } from "@/components/icons";

/**
 * The privacy policy, readable without a network, which is the whole point: the claim being made
 * is that the app never touches one until the hero switches the map on. The same text is
 * published at the URL both stores require (docs/legal/privacy.md); this screen is what a hero
 * can actually reach mid-flight.
 *
 * Sections are listed rather than hand-written so adding one is a locale change, not a JSX one.
 */
const SECTIONS = [
  "storage",
  "backups",
  "never",
  "permissions",
  "crashes",
  "children",
  "contact",
] as const;

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <XStack flex={1} items="center" gap="$2">
          <ShieldCheck size={20} color="$primaryText" />
          <Text fontSize={22} fontWeight="700" color="$text">
            {t("privacy.title")}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Card gap="$3">
          <Paragraph color="$text" fontWeight="700">
            {t("privacy.summary")}
          </Paragraph>
        </Card>

        {SECTIONS.map((section) => (
          <Card key={section} gap="$3">
            <Text fontSize="$4" fontWeight="700" color="$text">
              {t(`privacy.${section}_title`)}
            </Text>
            <Paragraph color="$textSecondary">{t(`privacy.${section}_body`)}</Paragraph>
          </Card>
        ))}

        <Paragraph color="$textSecondary" fontSize="$2">
          {t("privacy.updated")}
        </Paragraph>
      </RNScrollView>
    </YStack>
  );
}
