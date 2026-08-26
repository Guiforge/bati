import { useTranslation } from "react-i18next";
import { Text } from "tamagui";

/**
 * "À toi" — the one thing a row has to say about a movement the hero wrote.
 *
 * Shared by the catalogue and the quest editor's picker sheet, because a hero may name a
 * movement exactly as seed content is named (see `docs/architecture/exercise-ownership.md`), and
 * two rows reading "Squat" with nothing to tell them apart is the picker's version of that
 * collision. The word itself lives in `common` — quests wear it too, on their gallery card and
 * their own page.
 */
export function MineCaption() {
  const { t } = useTranslation();

  return (
    <Text fontSize={12} fontWeight="700" color="$primaryText" numberOfLines={1}>
      {t("common.hero_badge")}
    </Text>
  );
}
