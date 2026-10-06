import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { ChevronDown, ChevronUp, Lock } from "@/components/icons";

/**
 * How the encryption works, for the hero who is about to trust a password with their hero. Five
 * plain sentences for everyone, which are the whole of what they need, and a folded section for
 * the person who wants to know what is under them. Readable offline like the privacy policy, for
 * the same reason: it is where the hero goes to decide whether to believe the app.
 */
const POINTS = ["howP1", "howP2", "howP3", "howP4", "howP5"] as const;
const CURIOUS = ["howC1", "howC2", "howC3", "howC4"] as const;

export default function EncryptionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <XStack flex={1} items="center" gap="$2">
          <Lock size={20} color="$primaryText" />
          <Text fontSize={22} fontWeight="700" color="$text">
            {t("vault.howTitle")}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        {POINTS.map((point, i) => (
          <Card key={point} gap="$3">
            <Paragraph testID={`encryption-${point}`} color={i === 0 ? "$text" : "$textSecondary"}>
              {t(`vault.${point}`)}
            </Paragraph>
          </Card>
        ))}

        <Card gap="$3">
          <Pressable
            testID="encryption-curious"
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((value) => !value)}
          >
            <XStack items="center" justify="space-between">
              <Text fontSize="$4" fontWeight="700" color="$text">
                {t("vault.howCurious")}
              </Text>
              {open ? (
                <ChevronUp size={20} color="$text" opacity={0.6} />
              ) : (
                <ChevronDown size={20} color="$text" opacity={0.6} />
              )}
            </XStack>
          </Pressable>
          {open
            ? CURIOUS.map((line) => (
                <Paragraph key={line} testID={`encryption-${line}`} color="$textSecondary">
                  {t(`vault.${line}`)}
                </Paragraph>
              ))
            : null}
        </Card>
      </RNScrollView>
    </YStack>
  );
}
