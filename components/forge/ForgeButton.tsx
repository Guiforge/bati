import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/common/AppButton";
import { Hammer } from "@/components/icons";

/**
 * The way to the Forge, in the header of the three galleries: the same word and the same place
 * in each. It says "Create" in words because an icon alone was the `+` nobody could decode, and
 * it takes the place of the old create icons, never sits beside them: the title is what gives
 * way in those rows, and a header with one more control than this is where "Exerci…" came from.
 */
export function ForgeButton() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <AppButton
      testID="forge-open"
      variant="outline"
      fullWidth={false}
      fontSize={14}
      px="$3"
      icon={<Hammer size={16} color="$text" strokeWidth={2.5} />}
      onPress={() => router.push("/forge" as never)}
    >
      {t("forge.open")}
    </AppButton>
  );
}
