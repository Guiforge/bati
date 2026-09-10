import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ChevronLeft, Zap } from "@/components/icons";

/**
 * How XP is counted, written where the hero can read it.
 *
 * Seven rules, and the reason they are on a screen rather than only in `db/xp.ts` is that a
 * progression nobody can follow is a progression nobody trusts: a six-hour hike paid the game's
 * per-session ceiling and the hero who reported it could not tell whether that was the design or
 * a bug. It was a bug, and there was nowhere to look it up.
 *
 * The rules on this page are the ones the code enforces, in the order the code applies them. When
 * one changes here it changes there, and `docs/gameplay/progression.md` is the third copy that
 * has to move with them.
 *
 * Sections are listed rather than hand-written so adding one is a locale change, not a JSX one —
 * the same shape `app/privacy.tsx` uses. Unlike that page and `app/safety.tsx`, this one speaks to
 * the hero, so it says `tu` (`__tests__/locale-style.test.ts` holds it to that).
 */
const RULES = ["unit", "rest", "movement", "outside", "decay", "ceiling", "kept"] as const;

export default function XpScreen() {
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
          <Zap size={20} color="$primaryText" />
          <Text fontSize={22} fontWeight="700" color="$text">
            {t("xp.title")}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Card gap="$3">
          <Paragraph color="$text" fontWeight="700">
            {t("xp.summary")}
          </Paragraph>
        </Card>

        {RULES.map((rule) => (
          <Card key={rule} gap="$3">
            <Text fontSize="$4" fontWeight="700" color="$text">
              {t(`xp.${rule}_title`)}
            </Text>
            <Paragraph color="$textSecondary">{t(`xp.${rule}_body`)}</Paragraph>
          </Card>
        ))}
      </RNScrollView>
    </YStack>
  );
}
