import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { AppText } from "@/components/common/AppText";
import { useSessionStore } from "@/stores/session";

/**
 * "I'm stopping, it hurts", beside the pain rule. One tap and no dialog: a hero in pain does not
 * answer questions, and what the tap does cannot cost them anything, the sets being kept.
 */
export function PainStopLink() {
  const { t } = useTranslation();
  const stopForPain = useSessionStore((s) => s.stopForPain);
  return (
    <Pressable
      testID="session-pain-stop"
      hitSlop={12}
      onPress={stopForPain}
      accessibilityRole="button"
      accessibilityLabel={t("session.pain_stop")}
    >
      <AppText py="2" fontSize={14} fontWeight="700" color="text" style={{ textAlign: "center" }}>
        {t("session.pain_stop")}
      </AppText>
    </Pressable>
  );
}
