import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingRow } from "@/components/settings/SettingRow";
import { Crest } from "@/components/village/Crest";
import { CrestSheet, type CrestView } from "@/components/village/CrestSheet";
import { type Crest as CrestData, getCrest } from "@/db/crest";
import { reportError } from "@/src/reportError";

/**
 * "Your animal: the bear". Never "the bear of Brumeval": the animal is the hero's, the village
 * only holds it. No shield yet, no row: there is nothing to choose before the 8th session.
 */
export function CrestAnimalRow() {
  const { t } = useTranslation();
  const [crest, setCrest] = useState<CrestData | null>(null);
  const [view, setView] = useState<CrestView | null>(null);

  const load = useCallback(() => {
    getCrest()
      .then(setCrest)
      .catch((error) => reportError("settings.crest", error));
  }, []);
  useFocusEffect(load);

  if (crest === null) return null;
  return (
    <>
      <SettingRow
        testID="settings-crest-animal"
        icon={<Crest crest={crest} size={24} />}
        label={t("settings.crest_animal")}
        value={t(`village.crest_the_${crest.animal}`)}
        onPress={() => setView("pick")}
      />
      <CrestSheet
        view={view}
        crest={crest}
        onView={setView}
        onClose={() => setView(null)}
        onChanged={load}
      />
    </>
  );
}
