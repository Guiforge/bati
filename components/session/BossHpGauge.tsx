import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { bossHpColor, getHpPercent } from "./bossPhase";

const GAUGE_HEIGHT = 10;

/**
 * The boss's health, drawn once: a 10 dp framed track with the figure beside it. The arena and the
 * campaign's boss panel both mount this, so the same monster never reads two ways. `trailHp` is
 * the arena's damage trail (where HP was, drained after a hold); omit it and no trail is drawn.
 */
export function BossHpGauge({
  hp,
  maxHp,
  isEnraged,
  isDown,
  trailHp,
  testIDPrefix = "boss-hp",
}: {
  hp: number;
  maxHp: number;
  isEnraged: boolean;
  isDown: boolean;
  trailHp?: number;
  testIDPrefix?: string;
}) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const quick = reducedMotion ? undefined : ("quick" as const);
  const percent = getHpPercent(hp, maxHp);

  return (
    <XStack items="center" gap="$2">
      <YStack
        flex={1}
        height={GAUGE_HEIGHT}
        bg="$bgDark"
        borderWidth={1.5}
        borderColor="$borderStrong"
        rounded="$1"
        overflow="hidden"
      >
        {trailHp === undefined ? null : (
          <YStack
            testID={`${testIDPrefix}-trail`}
            position="absolute"
            t={0}
            b={0}
            l={0}
            width={`${getHpPercent(trailHp, maxHp)}%`}
            bg="$error"
            opacity={0.45}
            transition={quick}
          />
        )}
        <YStack
          testID={`${testIDPrefix}-fill`}
          position="absolute"
          t={0}
          b={0}
          l={0}
          width={`${percent}%`}
          bg={bossHpColor(percent, isEnraged, isDown)}
          transition={quick}
        />
      </YStack>
      <Text
        testID={`${testIDPrefix}-figure`}
        fontFamily="$body"
        fontWeight="700"
        fontSize={13}
        color="$text"
        fontVariant={["tabular-nums"]}
        accessibilityLabel={`${hp} / ${maxHp} ${t("boss.hp")}`}
      >
        {hp} / {maxHp}
      </Text>
    </XStack>
  );
}
