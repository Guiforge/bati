import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ChevronRight, KeyRound } from "@/components/icons";
import { PasswordCheckFlow } from "@/components/settings/PasswordCheckFlow";
import { useHaptics } from "@/hooks/useHaptics";
import { answerPasswordCheck, passwordCheckDue } from "@/src/passwordReminders";
import { protectCardVisible } from "@/src/protectHero";
import { reminderCardKind } from "@/src/reminders";
import { reportError } from "@/src/reportError";

/**
 * The reminder to check the backup password, the quietest line on Home: it speaks only when the
 * hero asked for it (`setPasswordReminders`), only when it is due, and only when nothing else is
 * asking for the same spot. The protect card and the reminders line both outrank it, and so do a
 * new release and its notes, which `reminderCardKind` already stays silent for.
 */
export function PasswordCheckCard() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const [due, setDue] = useState(false);
  const [open, setOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const decide = async () =>
        (await passwordCheckDue()) &&
        !(await protectCardVisible()) &&
        (await reminderCardKind()) === null;
      decide()
        .then((next) => {
          if (!cancelled) setDue(next);
        })
        .catch((error: unknown) => reportError("password.card", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!due) return null;

  return (
    <>
      <Card
        testID="home-password-check"
        mx="$4"
        mt="$3"
        py="$2"
        onPress={() => {
          haptics.selection();
          setOpen(true);
        }}
      >
        <XStack items="center" gap="$2">
          <KeyRound size={16} color="$primaryText" />
          <Text flex={1} fontSize="$3" color="$primaryText">
            {t("vault.checkTitle")}
          </Text>
          <ChevronRight size={16} color="$primaryText" />
        </XStack>
      </Card>
      <PasswordCheckFlow
        open={open}
        onClose={() => {
          setOpen(false);
          setDue(false);
        }}
        onAnswer={(answer) => {
          answerPasswordCheck(answer).catch((error: unknown) =>
            reportError("password.answer", error),
          );
        }}
      />
    </>
  );
}
