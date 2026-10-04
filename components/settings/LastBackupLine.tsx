import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "tamagui";
import { daysSinceLastBackup } from "@/src/protectHero";
import { reportError } from "@/src/reportError";

/**
 * "Last backup 3 days ago", under the automatic backup row. Nothing while the feature is off or
 * has not written yet: a line that says "never" about a folder picked a second ago is worse than
 * none. Reloaded when `folderOn` flips, so turning it on or off is reflected without a reopen.
 */
export function LastBackupLine({ folderOn }: { folderOn: boolean }) {
  const { t } = useTranslation();
  const [days, setDays] = useState<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `folderOn` is the trigger, not an input of the read
  useEffect(() => {
    daysSinceLastBackup()
      .then(setDays)
      .catch((error: unknown) => reportError("backup.lastLine", error));
  }, [folderOn]);

  if (!folderOn || days === null) return null;

  return (
    <Text testID="settings-last-backup" fontSize="$2" color="$textSecondary" px="$3">
      {days === 0 ? t("backup.lastBackupToday") : t("backup.lastBackupDays", { count: days })}
    </Text>
  );
}
