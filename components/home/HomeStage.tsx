import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Info, Play, Sparkles, Target } from "@/components/icons";
import { ADVENTURE_ASSETS, getAdventureAsset, getQuestAsset } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import { reportError } from "@/src/reportError";
import { OathStrip } from "./OathStrip";
import { RestNote } from "./RestNote";
import { type SmartActionConfig, useSmartAction } from "./useSmartAction";
import { useStartQuest } from "./useStartQuest";

// The floor under which a scene stops being one. At 360x640 the strip, the quick actions and the
// tab bar leave it about 390, and a recovery card above it can take much of that: below this the
// column scrolls rather than crushing the title into the button. What it has to hold: two title
// lines, meta, reason, a 56 button, the rest line, the oath strip, and some art above them.
const STAGE_MIN_HEIGHT = 320;

/** The stage is always a scene. With nothing running, the on-ramp route's art stands in. */
function resolveCover(config: SmartActionConfig | null): ImageSourcePropType {
  const path = config?.scene?.imagePath;
  if (!path) return ADVENTURE_ASSETS.squire_path;
  if (path.startsWith("http")) return { uri: path };
  return config?.variant === "quest" ? getQuestAsset(path) : getAdventureAsset(path);
}

/**
 * The one thing Home asks the hero to do tonight, shown as the thing itself.
 *
 * The scene names what the button starts, and the button starts it: a quest is one tap from Home
 * to its countdown, and the quest screen is behind Details for the hero who wants to look first.
 * An adventure, the gallery, and a quest that reads the position still only navigate, because each
 * has something to say on its own screen before a session can honestly begin.
 *
 * A card inset to the quick actions' edge rather than full bleed: the scene still takes every
 * spare dp of height, and the margin is what lets it read as one thing you can pick up.
 */
export function HomeStage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { config, isLoading } = useSmartAction();
  const startQuest = useStartQuest();

  if (isLoading) {
    // Reserve the stage so the frame doesn't jump when the scene lands.
    return <YStack flex={1} minH={STAGE_MIN_HEIGHT} mx="$4" mt="$3" rounded={16} bg="$surface" />;
  }

  const effectiveConfig: SmartActionConfig = config ?? {
    label: t("home.start_adventure", "Start Adventure"),
    subtext: t("home.no_active_adventure", "Choose your path"),
    onPress: () => router.push("/adventures"),
    variant: "gallery",
    scene: null,
    startQuestId: null,
  };

  const { scene, startQuestId } = effectiveConfig;
  const title = scene?.title ?? t("home.start_journey", "Start your journey");
  const subtitle = effectiveConfig.subtext || t("home.start_journey", "Start your journey");
  const label = effectiveConfig.label || t("home.play", "Play");
  const handlePress =
    startQuestId === null
      ? effectiveConfig.onPress
      : () => {
          startQuest(startQuestId).catch((error) => reportError("home.startQuest", error));
        };
  const progress = scene?.progress ?? null;
  const stepProgress = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <YStack
      flex={1}
      minH={STAGE_MIN_HEIGHT}
      mx="$4"
      mt="$3"
      rounded={16}
      borderWidth={1}
      borderColor="$borderStrong"
      overflow="hidden"
    >
      {/* Anchored to the bottom and 18% taller than the stage, so the top 15% of the art sits
          above it: 37 of the 45 covers have a near-black band baked into their top edge, which a
          156 dp crop never reached and a full-height scene shows as a hard line under the strip.
          The bottom bands go under the gradient's solid ground on their own.
          ponytail: one overscan for every cover; forge_dragon_blade's 21% band still shows a
          sliver. Re-crop that asset if it is ever the one on stage. */}
      <Image
        source={resolveCover(config)}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "118%" }}
        contentFit="cover"
        transition={200}
      />
      {/* $bgDark (#0B0F19) as rgba: LinearGradient takes plain colors, not tokens. A touch of
          dark under the strip's edge, the art clear, then solid ground under the words. */}
      <LinearGradient
        colors={[
          "rgba(11,15,25,0.25)",
          "rgba(11,15,25,0)",
          "rgba(11,15,25,0.78)",
          rawColors.bgDark,
        ]}
        locations={[0, 0.2, 0.62, 1]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <YStack flex={1}>
        {/* The picture and its title are a door too: they open where the scene leads, the
            adventure or the quest screen, and never the session, so a thumb resting on the art
            cannot start a workout. The buttons and the oath below keep their own taps. */}
        <YStack
          flex={1}
          justify="flex-end"
          onPress={effectiveConfig.onPress}
          pressStyle={{ opacity: 0.85 }}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          <YStack px="$4" gap="$1.5">
            <H3 fontSize={27} fontWeight="700" color="$text" numberOfLines={2} lineHeight={30}>
              {title}
            </H3>
            {/* What the session is made of, then why it is the one being offered. */}
            {scene?.meta ? (
              <Text fontSize={12} color="$textSecondary">
                {scene.meta}
              </Text>
            ) : null}

            {progress ? (
              // One count, not two: the sentence carries both numbers and says which is which,
              // the bar shows how much of it is behind them. Gold, because a step walked is
              // progression.
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="700" color="$textSecondary">
                  {subtitle}
                </Text>
                <ProgressBar progress={stepProgress} height={4} color="$resourceGold" />
              </YStack>
            ) : (
              // The reason is advice, not progression, so it is grey with a target, never gold:
              // the strongest colour on the screen used to go to its least actionable sentence.
              <XStack gap="$1.5" items="flex-start">
                <YStack pt={2}>
                  <Target size={13} color="$primaryText" />
                </YStack>
                <Text flex={1} fontSize={12} lineHeight={17} color="$textSecondary">
                  {subtitle}
                </Text>
              </XStack>
            )}
          </YStack>
        </YStack>

        <XStack px="$4" pt="$4" gap="$2.5" items="center">
          {/* The one filled button on the screen */}
          <Button
            testID="home-start-session"
            flex={1}
            height={56}
            rounded={14}
            bg="$primary"
            color="$text"
            fontWeight="700"
            fontSize={17}
            icon={<Play size={16} color="$text" />}
            onPress={handlePress}
            pressStyle={{ bg: "$primaryPress", scale: 0.98 }}
            shadowColor="$primary"
            shadowRadius={13}
            shadowOffset={{ width: 0, height: 0 }}
            shadowOpacity={0.45}
          >
            {label}
          </Button>
          {startQuestId === null ? null : (
            <YStack
              testID="home-quest-details"
              width={56}
              height={56}
              rounded={14}
              borderWidth={1}
              borderColor="$glassBorder"
              bg="$glassBg"
              items="center"
              justify="center"
              gap={2}
              onPress={effectiveConfig.onPress}
              pressStyle={{ opacity: 0.8 }}
              accessibilityRole="button"
              accessibilityLabel={t("home.see_quest", "See the quest")}
            >
              <Info size={18} color="$primaryText" />
              <Text fontSize={10} fontWeight="700" color="$primaryText">
                {t("home.details", "Details")}
              </Text>
            </YStack>
          )}
        </XStack>

        {/* Advice, never a gate: the button above still offers a session */}
        <RestNote />

        <YStack mt="$3">
          <OathStrip />
        </YStack>
      </YStack>

      {/* Why this scene, when it is not the usual one: a first day, an adventure under way. Last,
          so it paints over the art, and deaf to touch, so a tap on it lands on the scene. */}
      {scene?.kicker ? (
        <XStack
          position="absolute"
          t="$3"
          l="$4"
          height={26}
          px="$2.5"
          gap="$1.5"
          items="center"
          rounded={13}
          bg="$glassBg"
          borderWidth={1}
          borderColor="$glassBorder"
          pointerEvents="none"
        >
          <Sparkles size={11} color="$primaryText" />
          <Text fontSize={10} fontWeight="700" letterSpacing={1.2} color="$text">
            {scene.kicker.toUpperCase()}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
