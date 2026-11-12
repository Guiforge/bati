import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "@/components/icons";
import { nativeHealth } from "@/modules/bati-health";
import { SettingRow } from "./SettingRow";

/** Settings' door to Devices and health data. Where Health Connect is absent, it does not exist. */
export function HealthDataRow() {
  const router = useRouter();
  const { t } = useTranslation();
  // Asked once per visit: the answer only changes when Health Connect is installed or updated.
  const [available] = useState(() => nativeHealth.available());
  if (!available) return null;
  return (
    <SettingRow
      testID="settings-health-data"
      icon={<Activity size={22} color="text" />}
      label={t("healthExport.row")}
      onPress={() => router.push("/health-data" as never)}
    />
  );
}
