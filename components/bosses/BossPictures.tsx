import { useTranslation } from "react-i18next";
import { Text, YStack } from "tamagui";
import { Fold } from "@/components/bosses/Fold";
import { ImageChoiceField } from "@/components/common/ImageChoiceField";
import { getBossAsset } from "@/constants/assetMap";
import { BOSS_ART_STATES, type BossArt, type BossArtState } from "@/db/bossVoice";

/** The painted form each picture stands in for, as `getBossAsset` is asked for it. */
const PAINTED_FORM: Record<BossArtState, { tier: number; state?: "wounded" | "defeated" }> = {
  fresh: { tier: 0 },
  wounded: { tier: 0, state: "wounded" },
  defeated: { tier: 0, state: "defeated" },
  legendary: { tier: 1 },
};

type Props = {
  art: BossArt;
  /** The painted monster the forms fall back to: its key (the "choice" tile) and its path. */
  monster: { key: string; bossImagePath: string };
  /** Its name, for the screen reader on that tile. */
  monsterLabel: string;
  onChange: (art: BossArt) => void;
};

/**
 * One picture per form of the boss, each the painted monster's own or a photo from the album
 * (`ImageChoiceField`, the same photo path as an exercise's). Every form is optional: one without a
 * picture of its own shows the normal one with the arena's effects (darkening, lying pose), and
 * with no normal one, the painted monster. The help line says whose photo may be used (decision D2).
 */
export function BossPictures({ art, monster, monsterLabel, onChange }: Props) {
  const { t } = useTranslation();
  const picture = (form: BossArtState) => {
    const { tier, state } = PAINTED_FORM[form];
    return (
      <YStack key={form} gap="$2" testID={`editor-boss-art-${form}`}>
        <Text fontWeight="700" fontSize={14} color="$textSecondary">
          {t(`adventures.editor_boss_art_${form}`)}
        </Text>
        <ImageChoiceField
          value={art[form] ?? monster.key}
          onChange={(next) => {
            // Without this form's picture, then with the new one if it is a photo.
            const rest = Object.fromEntries(Object.entries(art).filter(([k]) => k !== form));
            onChange(next.startsWith("data:") ? { ...rest, [form]: next } : rest);
          }}
          label={t("boss_editor.picture_of", { form: t(`adventures.editor_boss_art_${form}`) })}
          choices={[monster.key]}
          choiceLabel={() => monsterLabel}
          // What the boss will really show in this form: a form without a picture of its own
          // wears the normal one, so the preview says so.
          resolve={(v) =>
            v.startsWith("data:")
              ? { uri: v }
              : getBossAsset(monster.bossImagePath, tier, state, { fresh: art.fresh })
          }
          resolveThumb={() => getBossAsset(monster.bossImagePath, tier, state)}
          aspect={[1, 1]}
        />
      </YStack>
    );
  };
  return (
    <YStack gap="$3">
      <Text testID="editor-boss-art-hint" fontSize={13} color="$textSecondary">
        {t("boss_editor.pictures_hint")}
      </Text>
      {picture("fresh")}
      <Fold testID="editor-boss-art-others-toggle" title={t("boss_editor.other_pictures")}>
        {BOSS_ART_STATES.filter((form) => form !== "fresh").map(picture)}
      </Fold>
      <Text testID="editor-boss-art-consent" fontSize={13} color="$textSecondary">
        {t("adventures.editor_boss_art_consent")}
      </Text>
    </YStack>
  );
}
