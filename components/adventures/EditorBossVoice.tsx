import { useTranslation } from "react-i18next";
import { Input, Text, YStack } from "tamagui";
import {
  BOSS_LINE_MOMENTS,
  clip,
  type HeroBossVoice,
  MAX_BOSS_LINE,
  MAX_BOSS_LINES,
  MAX_BOSS_NAME,
} from "@/db/bossVoice";

type Props = {
  voice: HeroBossVoice;
  /** The painted monster's name: what the boss keeps if the hero leaves the field empty. */
  placeholder: string;
  onChange: (voice: HeroBossVoice) => void;
};

/**
 * The hero's words for their boss: a name and up to three lines for each moment. Outside the
 * frozen part of the editor, because texts stay editable under a run. A fourth line or a 61st
 * character simply does not appear, so nothing is cut silently at save.
 */
export function EditorBossVoice({ voice, placeholder, onChange }: Props) {
  const { t } = useTranslation();
  const tooMany = BOSS_LINE_MOMENTS.some(
    (m) => voice.lines[m].filter((l) => l.trim()).length > MAX_BOSS_LINES,
  );
  return (
    <YStack gap="$3">
      <YStack gap="$2">
        <Text fontWeight="700" fontSize={14} color="$textSecondary">
          {t("adventures.editor_boss_name")}
        </Text>
        <Input
          testID="editor-boss-name"
          // The size token's fixed height clipped the text's top at 130%: grow with the font.
          height="auto"
          minH={44}
          value={voice.name}
          onChangeText={(name) => onChange({ ...voice, name })}
          maxLength={MAX_BOSS_NAME}
          placeholder={placeholder}
          bg="$background"
          borderColor="$borderStrong"
          color="$text"
        />
      </YStack>
      {BOSS_LINE_MOMENTS.map((m) => (
        <YStack key={m} gap="$2">
          <Text fontWeight="700" fontSize={14} color="$textSecondary">
            {t(`adventures.editor_boss_lines_${m}`)}
          </Text>
          <Input
            testID={`editor-boss-lines-${m}`}
            value={voice.lines[m].join("\n")}
            onChangeText={(s) =>
              onChange({
                ...voice,
                lines: {
                  ...voice.lines,
                  // No cut to MAX_BOSS_LINES here: it ate the fourth Enter and glued what followed
                  // onto line 3. The save keeps the first three (`cleanBossLines`), the hint warns.
                  [m]: s.split("\n").map((l) => clip(l, MAX_BOSS_LINE)),
                },
              })
            }
            multiline
            bg="$background"
            borderColor="$borderStrong"
            color="$text"
          />
        </YStack>
      ))}
      <Text fontSize={13} color={tooMany ? "$warning" : "$textSecondary"}>
        {t("adventures.editor_boss_lines_hint")}
      </Text>
    </YStack>
  );
}
