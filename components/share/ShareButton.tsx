import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Share2 } from "@/components/icons";
import { NText } from "@/components/journal/nocturne";

/**
 * The one door to the share screen, wherever a finished session is shown.
 *
 * A word next to the glyph, always. The victory screen and the recap both had a bare share icon,
 * in a corner or beside a bigger button, and it was the button nobody found. Every place that
 * offers sharing renders this, so they all open the same screen with the same picture on it.
 *
 * `veiled` draws it as the journal page's back button is drawn, a small pill on the painting,
 * in the top right corner facing it.
 */
export function ShareButton({
  sessionId,
  testID,
  fullWidth = false,
  height,
  veiled,
}: {
  sessionId: number;
  testID?: string;
  fullWidth?: boolean;
  /** The victory bar's buttons are 60 tall; everywhere else the button's own floor stands. */
  height?: number;
  veiled?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const open = () => router.push(`/share?session=${sessionId}` as never);

  if (veiled) {
    return (
      <XStack
        testID={testID}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={t("share.open")}
        height={36}
        px={12}
        gap={6}
        rounded={18}
        borderWidth={1}
        borderColor="$glassBorder"
        bg="$bgOverlaySoft"
        items="center"
        // 36 tall like the back button facing it; the hit area is taken back to the 44 floor.
        hitSlop={4}
        pressStyle={{ bg: "$ink900" }}
      >
        <Share2 size={16} color="$text" strokeWidth={2.5} />
        <NText fontWeight="500" fontSize={14}>
          {t("share.open")}
        </NText>
      </XStack>
    );
  }

  return (
    <AppButton
      testID={testID}
      variant="outline"
      fullWidth={fullWidth}
      // Spread, not `rounded={undefined}`: an explicit undefined would overwrite AppButton's own.
      {...(height ? { height, rounded: "$6" } : null)}
      size="$3"
      fontSize={16}
      px="$3"
      icon={<Share2 size={18} color="$text" strokeWidth={2.5} />}
      onPress={open}
      accessibilityLabel={t("share.open")}
    >
      {t("share.open")}
    </AppButton>
  );
}
