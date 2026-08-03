import { Image } from "expo-image";
import { Text } from "tamagui";

import { Card } from "@/components/common/Card";
import { ProgressBar } from "@/components/common/ProgressBar";
import { GrowthPulse } from "@/components/village/GrowthPulse";
import { LevelPips } from "@/components/village/LevelPips";
import { getBuildingIconAsset } from "@/constants/assetMap";
import { getBuildingProgress, type VillageBuilding } from "@/db/village";
import type { AppLanguage } from "@/stores/settings";

/**
 * A level-5 forge has to read differently from a level-1 forge, and the way to do that is one
 * ramp over the single icon each building already has — not five paintings per building
 * (docs/content/missing-image.md). Level 0 is the flat silhouette in the "to build" grid; this
 * continues the same language upward, from barely-there to fully realised, so the pips stop
 * being the only tell.
 *
 * Indexed by level; level 0 never reaches here because the silhouettes render in their own grid.
 */
const LEVEL_OPACITY = [0.5, 0.5, 0.65, 0.78, 0.9, 1] as const;

type Props = {
  building: VillageBuilding;
  language: AppLanguage;
  /** Grew during the session that navigated here — pulses once, then never again. */
  justGrew: boolean;
  onPress: () => void;
};

export function BuiltBuildingCard({ building, language, justGrew, onPress }: Props) {
  const name = language === "fr" ? building.frName : building.enName;
  // Already computed for every building on every render, and until now only visible after a tap.
  // "Almost there" is the part that gets someone training.
  const progress = getBuildingProgress(building);

  return (
    <GrowthPulse active={justGrew}>
      <Card
        flat
        bg="$surface"
        width="31.5%"
        p="$3"
        gap="$2"
        items="center"
        onPress={onPress}
        accessibilityLabel={name}
        borderWidth={justGrew ? 2 : undefined}
        borderColor={justGrew ? "$primary" : undefined}
        shadowColor={justGrew ? "$shadowColor" : undefined}
        shadowRadius={justGrew ? 8 : undefined}
        shadowOpacity={justGrew ? 0.4 : undefined}
      >
        <Image
          source={getBuildingIconAsset(building.code, building.relatedMuscle, building.level)}
          style={{ width: 48, height: 48, opacity: LEVEL_OPACITY[building.level] ?? 1 }}
          contentFit="contain"
        />
        <Text
          fontSize={12}
          fontWeight="700"
          color="$text"
          numberOfLines={1}
          style={{ textAlign: "center" }}
        >
          {name}
        </Text>
        <LevelPips level={building.level} />
        {/* A maxed building gets no bar: nothing left to count is the message. */}
        {progress !== null ? <ProgressBar progress={progress} height={3} /> : null}
      </Card>
    </GrowthPulse>
  );
}
