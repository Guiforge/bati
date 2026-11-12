import { useTranslation } from "react-i18next";
import { Text, XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Clock, Map as MapIcon } from "@/components/icons";
import { SettingRow } from "@/components/settings/SettingRow";
import type { HealthExportState } from "@/src/healthExport/sync";

type Props = {
  details: Extract<HealthExportState, { kind: "on" | "withdrawn" }>;
  busy: boolean;
  /** Android's answer to the last tap on the route option, said on this visit only. */
  routeRefused: boolean;
  onRoute(): void;
  onHistory(start: boolean): void;
};

/**
 * What sits under the Health Connect switch while it is on: "with the GPS route", the past
 * sessions (a row, or their progress and a way to stop), and the counts. Progress lives here and
 * nowhere else in the app.
 */
export function HealthExportOptions({ details, busy, routeRefused, onRoute, onHistory }: Props) {
  const { t } = useTranslation();
  const { route, history } = details;
  return (
    <>
      <SettingRow
        testID="health-export-route"
        icon={<MapIcon size={22} color="text" />}
        label={t("healthExport.route")}
        value={route ? t("common.on") : t("common.off")}
        checked={route}
        disabled={busy}
        onPress={onRoute}
      />
      <Text fontSize="3" color="textSecondary" px="3">
        {routeRefused && !route ? t("healthExport.route_refused") : t("healthExport.route_explain")}
      </Text>

      {history.running ? (
        <XStack testID="health-export-history-progress" items="center" px="3" gap="3">
          {/* Polite: TalkBack says the count as it moves, without cutting what it is reading. */}
          <Text flex={1} fontSize="3" color="text" aria-live="polite">
            {t("healthExport.history_progress", {
              done: history.done,
              total: history.total,
            })}
          </Text>
          <AppButton
            testID="health-export-history-stop"
            variant="outline"
            onPress={() => onHistory(false)}
          >
            {t("healthExport.history_stop")}
          </AppButton>
        </XStack>
      ) : history.left > 0 ? (
        <SettingRow
          testID="health-export-history"
          icon={<Clock size={22} color="text" />}
          label={t("healthExport.history_row")}
          disabled={busy}
          onPress={() => onHistory(true)}
        />
      ) : null}

      {details.pending > 0 ? (
        <Text testID="health-export-pending" fontSize="3" color="textSecondary" px="3">
          {t("healthExport.pending", { count: details.pending })}
        </Text>
      ) : null}
      {details.failed > 0 ? (
        <Text testID="health-export-failed" fontSize="3" color="textSecondary" px="3">
          {t("healthExport.failed", { count: details.failed })}
        </Text>
      ) : null}
    </>
  );
}
