import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { EyeOff } from "@/components/icons";
import { SettingRow } from "@/components/settings/SettingRow";
import { preferences } from "@/db/preferences";
import { reportError } from "@/src/reportError";

/** "Set-aside exercises", with how many, opening the list (issue #145). */
export function SetAsideRow() {
  const { t } = useTranslation();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);

  // On focus: the list behind this row is edited on its own screen and on every exercise page.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      preferences
        .getSetAsideExercises()
        .then((list) => {
          if (!cancelled) setCount(list.length);
        })
        .catch((error) => reportError("settings.setAsideRead", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <SettingRow
      testID="settings-set-aside"
      icon={<EyeOff size={22} color="$text" />}
      label={t("setAside.title")}
      value={count === null ? undefined : count === 0 ? t("setAside.none") : String(count)}
      onPress={() => router.push("/set-aside" as never)}
    />
  );
}
