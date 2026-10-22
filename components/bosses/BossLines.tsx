import { useTranslation } from "react-i18next";
import { Text, YStack } from "tamagui";
import { Input } from "@/components/common/Input";
import {
  BOSS_LINE_MOMENTS,
  clip,
  type HeroBossLines,
  MAX_BOSS_LINE,
  MAX_BOSS_LINES,
} from "@/db/bossVoice";

type Props = { lines: HeroBossLines; onChange: (lines: HeroBossLines) => void };

/**
 * A boss's lines: up to three for each moment. A fourth line or a 61st character simply does not
 * appear, so nothing is cut silently at save. Added to the painted pool, never replacing it.
 */
export function BossLines({ lines, onChange }: Props) {
  const { t } = useTranslation();
  const tooMany = BOSS_LINE_MOMENTS.some(
    (m) => lines[m].filter((l) => l.trim()).length > MAX_BOSS_LINES,
  );
  return (
    <YStack gap="3">
      {BOSS_LINE_MOMENTS.map((m) => (
        <YStack key={m} gap="2">
          <Text fontWeight="700" fontSize={14} color="textSecondary">
            {t(`adventures.editor_boss_lines_${m}`)}
          </Text>
          <Input
            testID={`editor-boss-lines-${m}`}
            value={lines[m].join("\n")}
            onChangeText={(s) =>
              // No cut to MAX_BOSS_LINES here: it ate the fourth Enter and glued what followed
              // onto line 3. The save keeps the first three (`cleanBossLines`), the hint warns.
              onChange({ ...lines, [m]: s.split("\n").map((l) => clip(l, MAX_BOSS_LINE)) })
            }
            multiline
            py={8}
            bg="background"
            borderColor="borderStrong"
            color="text"
          />
        </YStack>
      ))}
      <Text fontSize={13} color={`${tooMany ? "warning" : "textSecondary"}`}>
        {t("adventures.editor_boss_lines_hint")}
      </Text>
    </YStack>
  );
}
