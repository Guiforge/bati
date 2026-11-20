import { Image } from "expo-image";
import { XStack, YStack } from "tamagui";
import { AppText } from "@/components/common/AppText";
import { getBossAsset } from "@/constants/assetMap";
import { bossDisplayName } from "@/constants/bosses";
import { useBossArt } from "@/hooks/useBossArt";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossHpGauge } from "./BossHpGauge";
import { getHpPercent, getPhaseFromHp } from "./bossPhase";

/**
 * The boss during a rest: a thumbnail, its name and the same health gauge the arena draws. The
 * arena itself stays off this screen (it took 46% of a view whose subject is the clock), so the
 * fight is still in sight for the half of it the hero spends sitting down.
 */
export function BossRestStrip() {
  const language = useSettingsStore((s) => s.language);
  const fight = useSessionStore((s) => s.bossFight);
  const art = useBossArt(fight);
  if (!fight) return null;
  const isDown = fight.currentHp <= 0;
  const isEnraged = getPhaseFromHp(getHpPercent(fight.currentHp, fight.totalHp)) === 4;
  const name = bossDisplayName(fight, language);

  return (
    <XStack testID="rest-boss" px="4" gap="3" items="center" accessible accessibilityLabel={name}>
      <Image
        source={getBossAsset(fight.imagePath, fight.tier, isDown ? "defeated" : undefined, art)}
        style={{ width: 56, height: 56, borderRadius: 8 }}
        contentFit="cover"
        accessible={false}
      />
      <YStack flex={1} gap="1">
        <AppText fontFamily="heading" fontWeight="700" fontSize={18} color="text" numberOfLines={1}>
          {name}
        </AppText>
        <BossHpGauge
          hp={fight.currentHp}
          maxHp={fight.totalHp}
          isEnraged={isEnraged}
          isDown={isDown}
        />
      </YStack>
    </XStack>
  );
}
