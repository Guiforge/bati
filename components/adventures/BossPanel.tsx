import { Shield, Skull, Target } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { getHpPercent, getPhaseFromHp } from "@/components/session/bossPhase";
import { getBossAsset } from "@/constants/assetMap";
import { bossDisplayName } from "@/constants/bosses";
import { rawColors } from "@/constants/rawColors";
import { type BossFight, threatRank } from "@/db/bossFights";

const ART_HEIGHT = 140;
/** threatRank is 1-4; identical glyphs still need stable keys. */
const SKULL_KEYS = ["skull-1", "skull-2", "skull-3", "skull-4"] as const;

/**
 * Who is waiting at the end of the campaign, and how far through it you already are.
 *
 * The adventure screen used to say `BOSS` in a primary-toned tag and nothing else — no portrait,
 * no name, no "you have it at 40 %" — so the only place a fight existed was mid-session, and there
 * was no reason to open the campaign again except to press start. This is where
 * `getBossFightByAdventure()` finally has a caller and `boss.fight_intro` finally has a home.
 *
 * A card, not an arena: this screen is card-based, and the full-bleed treatment belongs to the
 * session where the monster owns the screen. The portrait, the drain and the weakness are the same
 * facts read the same way, at a size that fits a browsing screen.
 */
export function BossPanel({ fight, language }: { fight: BossFight; language: string }) {
  const { t } = useTranslation();

  const hpPercent = getHpPercent(fight.currentHp, fight.totalHp);
  const isDefeated = fight.defeatedAt != null || fight.currentHp <= 0;
  const isEnraged = getPhaseFromHp(hpPercent) === 4 && !isDefeated;
  const hpColor = isEnraged ? "$error" : hpPercent < 50 ? "$secondary" : "$success";

  return (
    <YStack
      rounded="$8"
      overflow="hidden"
      borderWidth={1}
      borderColor={isEnraged ? "$error" : "$borderStrong"}
      bg="$surface"
    >
      <YStack height={ART_HEIGHT} width="100%" position="relative">
        <Image
          // A defeated boss shows its fallen painting — the panel becomes proof, not threat.
          source={getBossAsset(fight.imagePath, fight.tier, isDefeated ? "defeated" : undefined)}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
        />

        <LinearGradient
          colors={["transparent", rawColors.surface]}
          locations={[0, 0.9]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: ART_HEIGHT * 0.7 }}
          pointerEvents="none"
        />

        <XStack position="absolute" b="$3" l="$4" r="$4" items="flex-end" gap="$2">
          <Text
            flex={1}
            fontFamily="$heading"
            fontWeight="700"
            fontSize={22}
            lineHeight={26}
            color="$text"
            numberOfLines={2}
          >
            {bossDisplayName(fight, language)}
          </Text>
          {isDefeated ? (
            <Text fontSize={12} fontWeight="700" color="$resourceGold" textTransform="uppercase">
              {t("boss.defeated")}
            </Text>
          ) : null}
        </XStack>
      </YStack>

      <YStack px="$4" py="$3" gap="$2">
        <YStack height={6} rounded="$10" bg="$surface2" overflow="hidden">
          <YStack
            testID="boss-panel-hp"
            position="absolute"
            t={0}
            b={0}
            l={0}
            width={`${hpPercent}%`}
            bg={hpColor}
          />
        </YStack>

        <XStack items="center" gap="$2">
          <Text flex={1} fontSize={12} color="$textSecondary">
            {isDefeated ? t("boss.victory_subtitle") : t("boss.fight_intro")}
          </Text>
          {/* Threat, as skulls, from the pool the hero is actually facing — level scaling and
              rematch tier included. The Golem's 278 and a legendary Ranger's 2230 are different
              fights, and this is where the hero decides to walk in. */}
          <XStack
            items="center"
            gap={2}
            accessibilityLabel={t("boss.threat", { rank: threatRank(fight.totalHp) })}
          >
            {SKULL_KEYS.slice(0, threatRank(fight.totalHp)).map((k) => (
              <Skull key={k} size={12} color={isDefeated ? "$textSecondary" : "$error"} />
            ))}
          </XStack>
          <XStack items="baseline" gap="$1">
            <Text fontWeight="700" fontSize={14} color={hpColor}>
              {fight.currentHp}
            </Text>
            <Text fontWeight="700" fontSize={11} color="$textSecondary">
              / {fight.totalHp} {t("boss.hp")}
            </Text>
          </XStack>
        </XStack>

        <Traits fight={fight} isEnraged={isEnraged} />
      </YStack>
    </YStack>
  );
}

/**
 * The two facts that change how you fight it, and which the session screen shows on the arena's
 * own status line. Naming them here is what makes them a plan rather than a surprise halfway
 * through a set.
 */
function Traits({ fight, isEnraged }: { fight: BossFight; isEnraged: boolean }) {
  const { t } = useTranslation();

  if (!(fight.weaknessMuscle || fight.resistanceMuscle || isEnraged)) return null;

  return (
    <YStack gap="$1.5">
      <XStack items="center" gap="$3" flexWrap="wrap">
        {isEnraged ? (
          <Trait icon={<GameIcon name="flame" size={13} color="$error" />} color="$error">
            {t("boss.enraged")}
          </Trait>
        ) : null}
        {fight.weaknessMuscle ? (
          <Trait icon={<Target size={12} color="$secondary" />}>
            {t("boss.weakness")} · {t(`muscles.${fight.weaknessMuscle}`)}
          </Trait>
        ) : null}
        {fight.resistanceMuscle ? (
          <Trait icon={<Shield size={12} color="$textSecondary" />}>
            {t("boss.resistance")} · {t(`muscles.${fight.resistanceMuscle}`)}
          </Trait>
        ) : null}
      </XStack>
      {/* The causal rule the labels never stated: muscle choice drives damage. Said here,
          on the pre-fight panel, where the hero still has time to pick accordingly. */}
      {fight.weaknessMuscle || fight.resistanceMuscle ? (
        <Text fontSize={11} color="$textSecondary" opacity={0.8}>
          {t(
            "boss.matchup_hint",
            "Strike its weakness for 1.5× damage — its resistance halves yours.",
          )}
        </Text>
      ) : null}
    </YStack>
  );
}

function Trait({
  icon,
  color = "$textSecondary",
  children,
}: {
  icon: ReactNode;
  color?: ColorTokens;
  children: ReactNode;
}) {
  return (
    <XStack items="center" gap="$1">
      {icon}
      <Text fontSize={11} fontWeight="700" color={color}>
        {children}
      </Text>
    </XStack>
  );
}
