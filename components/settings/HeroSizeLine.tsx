import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "tamagui";
import { photosBytes } from "@/db/sessionPhotos";
import { databaseBytes } from "@/src/databaseSize";
import { reportError } from "@/src/reportError";

const MB = 1024 * 1024;

/**
 * "Your hero: 42 MB, photos 18 MB of it", under the backup rows: the number Google's 25 MB limit
 * is read against, and what the photos add to it. Nothing while it loads, because a placeholder
 * figure would read as a verdict. The photos are summed from the row headers, not read.
 */
export function HeroSizeLine() {
  const { t, i18n } = useTranslation();
  const [sizes, setSizes] = useState<{ total: number; photos: number } | null>(null);

  useEffect(() => {
    photosBytes()
      .then((photos) => setSizes({ total: databaseBytes(), photos }))
      .catch((error: unknown) => reportError("settings.heroSize", error));
  }, []);

  if (sizes === null) return null;
  const mb = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  return (
    <Text testID="settings-hero-size" fontSize="$2" color="$textSecondary" px="$3">
      {t("backup.heroSize", {
        total: mb.format(sizes.total / MB),
        photos: mb.format(sizes.photos / MB),
      })}
    </Text>
  );
}
