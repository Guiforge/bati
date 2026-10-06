import { useTranslation } from "react-i18next";
import { InkGauge } from "@/components/common/InkGauge";
import { bossHpColor, getHpPercent } from "./bossPhase";

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
  const percent = getHpPercent(hp, maxHp);

  return (
    <InkGauge
      testIDPrefix={testIDPrefix}
      progress={percent / 100}
      fill={bossHpColor(percent, isEnraged, isDown)}
      trail={trailHp === undefined ? undefined : getHpPercent(trailHp, maxHp) / 100}
      figure={`${hp} / ${maxHp}`}
      figureLabel={`${hp} / ${maxHp} ${t("boss.hp")}`}
    />
  );
}
