import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "tamagui";
import { Sprout } from "@/components/icons";
import { preferences, type TrainingLevel } from "@/db/preferences";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import { SettingRow } from "./SettingRow";

/**
 * The answer onboarding asks for ("Tu en es où ?"), editable here because that screen promises
 * it. Two states, like the question: an old `advanced` reads as `regular` everywhere
 * (`startingDifficulty`). A hero who never answered sees the note alone, not an answer they did
 * not give.
 *
 * The answer is the first sentence of the note rather than a value on the right of the row: at
 * 55 % of the row, "Je commence ou je reprends" was cut.
 */
export function StartingPointRow() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const [answer, setAnswer] = useState<TrainingLevel | null>(null);

  useEffect(() => {
    let cancelled = false;
    preferences
      .getTrainingLevel()
      .then((value) => {
        if (!cancelled) setAnswer(value);
      })
      .catch((error) => {
        // Non-blocking: the row just shows no answer.
        reportError("settings.startingPointRead", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = () => {
    const next: TrainingLevel = answer === "beginner" ? "regular" : "beginner";
    haptics.selection();
    setAnswer(next);
    preferences.setTrainingLevel(next).catch((error) => {
      reportError("settings.startingPointWrite", error);
    });
  };

  const said =
    answer === null
      ? null
      : t(answer === "beginner" ? "onboarding.level_beginner" : "onboarding.level_regular");

  return (
    <>
      <SettingRow
        testID="settings-starting-point"
        icon={<Sprout size={22} color="$text" />}
        label={t("settings.starting_point")}
        onPress={toggle}
      />
      <Text testID="settings-starting-point-note" fontSize="$2" color="$textSecondary" px="$3">
        {said === null
          ? t("settings.starting_point_note")
          : `${said}. ${t("settings.starting_point_note")}`}
      </Text>
    </>
  );
}
