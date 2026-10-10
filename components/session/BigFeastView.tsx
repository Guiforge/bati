import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Crest } from "@/components/village/Crest";
import { CREST_ICON } from "@/components/village/crestText";
import { getVillageTierAsset } from "@/constants/assetMap";
import { fade, rawColors } from "@/constants/rawColors";
import type { VillageTier } from "@/db/village";
import { useGameIcon } from "@/hooks/useGameIcon";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSettingsStore } from "@/stores/settings";
import { nextTierLevel, revealBody, revealTitle, tierSentence } from "./bigFeastText";
import type { Feast } from "./feasts";

/** The feasts that fill the screen. Age and anniversary have no producer yet (V-03). */
export type BigFeast = Extract<Feast, { kind: "reveal" | "tier" | "age" | "anniversary" }>;

/** Tamagui's "bouncy" (tamagui.config.ts), which is not exported: a spring, once. */
const BOUNCY = { damping: 14, mass: 0.8, stiffness: 150 } as const;

/** The veil over the painting lifts with each beat: 0.75, then 0.6, then 0.5 (the mockup's). */
const VEIL = [0.75, 0.6, 0.5];
/** One beat is 550 ms: the whole storyboard is about 1.6 s, played once and never looped. */
const BEAT = 550;
const RISE = 24;
/** A tier's painting is the point of it: a lighter veil than the reveal's. */
const TEXT_VEIL = 0.35;

const heading = (text: string) => (/\d/.test(text) ? "$body" : "$heading");

function Kicker({ children }: { children: string }) {
  return (
    <Text
      testID="big-feast-kicker"
      fontFamily="$body"
      fontWeight="700"
      fontSize={13}
      letterSpacing={2}
      color="$resourceGold"
      style={{ textAlign: "center" }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

function Title({ children }: { children: string }) {
  return (
    <Text
      testID="big-feast-title"
      fontFamily={heading(children)}
      fontWeight="700"
      fontSize={26}
      color="$text"
      style={{ textAlign: "center" }}
    >
      {children}
    </Text>
  );
}

function Line({ children, testID }: { children: string; testID: string }) {
  return (
    <Text testID={testID} fontSize={15} color="$textSecondary" style={{ textAlign: "center" }}>
      {children}
    </Text>
  );
}

type Ctx = {
  feast: BigFeast;
  villageName: string;
  /** Sessions that count, for a tier's "after 118 sessions"; null says no such figure. */
  sessions: number | null;
};

/** The text of the last image, which is the whole feast under reduced motion. */
function FeastText({ feast, villageName, sessions }: Ctx) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  if (feast.kind === "reveal") {
    const body = revealBody(t, feast);
    return (
      <>
        <Kicker>
          {villageName
            ? t("session.feast_reveal_kicker", { name: villageName })
            : t("session.feast_reveal_kicker_unnamed")}
        </Kicker>
        <Title>{revealTitle(t, feast, villageName)}</Title>
        {body ? <Line testID="big-feast-body">{body}</Line> : null}
      </>
    );
  }
  if (feast.kind === "tier") {
    const next = nextTierLevel(feast.tier);
    return (
      <>
        <Kicker>{t("session.feast_tier_kicker")}</Kicker>
        <Title>{tierSentence(t, feast.tier, villageName, language)}</Title>
        {sessions !== null && feast.level !== null ? (
          <Text
            testID="big-feast-level"
            fontFamily="$body"
            fontSize={16}
            color="$text"
            style={{ textAlign: "center" }}
          >
            {t("session.feast_tier_level", { level: feast.level, count: sessions })}
          </Text>
        ) : null}
        <Line testID="big-feast-body">
          {[
            t("session.tonight_tier_plain"),
            next === null ? "" : t("session.feast_tier_next", { level: next }),
          ]
            .filter(Boolean)
            .join(" ")}
        </Line>
      </>
    );
  }
  return (
    <Title>
      {feast.kind === "age" ? feast.name : t("session.tonight_anniversary", { count: feast.years })}
    </Title>
  );
}

function Shield({
  feast,
  style,
}: {
  feast: Extract<BigFeast, { kind: "reveal" }>;
  style?: object;
}) {
  return (
    <Animated.View style={style}>
      <Crest
        size={96}
        onPainting
        crest={{
          animal: feast.animal,
          manual: false,
          second: null,
          quarters: feast.quarters,
          longestFlame: 0,
          rings: 0,
        }}
      />
    </Animated.View>
  );
}

/** The frame: painting, veil, a content band and the one button, there from the first image. */
function Frame({
  tier,
  veil,
  villageName,
  onSeeVillage,
  children,
}: {
  tier: VillageTier;
  veil: object;
  villageName: string;
  onSeeVillage: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <YStack flex={1} bg="$bgDark" testID="big-feast">
      <Image
        source={getVillageTierAsset(tier)}
        contentFit="cover"
        style={FILL}
        accessible={false}
      />
      <Animated.View
        pointerEvents="none"
        style={[FILL, { backgroundColor: rawColors.bgDark }, veil]}
      />
      {/* Still, under the words: the painting is busy and the body is small. */}
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", fade(rawColors.bgDark, 0.9)]}
        locations={[0.3, 0.75]}
        style={FILL}
      />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      <YStack px="$4" pt="$3" pb={insets.bottom + 16} bg="$bgDark">
        <AppButton testID="big-feast-view-village" height={48} onPress={onSeeVillage}>
          {villageName
            ? t("session.feast_view_village", { name: villageName })
            : t("session.village_growth_cta")}
        </AppButton>
      </YStack>
    </YStack>
  );
}

const FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
const SECTION = { alignItems: "center", gap: 12, maxWidth: 520 } as const;
const LAYER = { position: "absolute", alignItems: "center", gap: 16 } as const;

type Props = Ctx & { tier: VillageTier; onSeeVillage: () => void };

/** The last image of the reveal, and the whole of it under reduced motion: nothing moves. */
function RevealFinal({ feast, tier, villageName, sessions, onSeeVillage }: Props) {
  if (feast.kind !== "reveal") return null;
  return (
    <Frame
      tier={tier}
      veil={{ opacity: VEIL[2] }}
      villageName={villageName}
      onSeeVillage={onSeeVillage}
    >
      <YStack style={SECTION}>
        <Shield feast={feast} />
        <FeastText feast={feast} villageName={villageName} sessions={sessions} />
      </YStack>
    </Frame>
  );
}

/** The three beats of the reveal, once: two eyes, the silhouette, the shield and its text. */
function RevealStoryboard({ feast, tier, villageName, sessions, onSeeVillage }: Props) {
  const { t } = useTranslation();
  const animal = feast.kind === "reveal" ? feast.animal : "bear";
  const icon = useGameIcon(CREST_ICON[animal]);
  // `beat` runs 0 to 2 in a straight line (the veil and the crossfades); the springs are for the
  // silhouette's rise, the shield's landing and the text, each started once.
  const beat = useSharedValue(0);
  const rise = useSharedValue(0);
  const land = useSharedValue(0);
  const text = useSharedValue(0);
  useEffect(() => {
    beat.value = withTiming(2, { duration: 2 * BEAT, easing: Easing.linear });
    rise.value = withDelay(BEAT, withSpring(1, BOUNCY));
    land.value = withDelay(2 * BEAT, withSpring(1, BOUNCY));
    text.value = withDelay(2 * BEAT, withTiming(1, { duration: 500 }));
  }, [beat, rise, land, text]);

  const veil = useAnimatedStyle(() => ({ opacity: interpolate(beat.value, [0, 1, 2], VEIL) }));
  const eyes = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0, 0.4], [0, 1], "clamp"),
  }));
  const first = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0.8, 1], [1, 0], "clamp"),
  }));
  const second = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0.8, 1, 1.8, 2], [0, 1, 1, 0], "clamp"),
    transform: [{ translateY: (1 - rise.value) * RISE }],
  }));
  const shield = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [1.8, 2], [0, 1], "clamp"),
    transform: [{ scale: 0.9 + 0.1 * land.value }],
  }));
  const words = useAnimatedStyle(() => ({ opacity: text.value }));

  if (feast.kind !== "reveal") return null;
  return (
    <Frame tier={tier} veil={veil} villageName={villageName} onSeeVillage={onSeeVillage}>
      <YStack width="100%" maxW={520} minH={360} items="center" justify="center">
        <Animated.View style={[LAYER, first]}>
          <Animated.View style={[{ flexDirection: "row", gap: 14 }, eyes]}>
            <YStack width={7} height={7} rounded={4} bg="$text" />
            <YStack width={7} height={7} rounded={4} bg="$text" />
          </Animated.View>
          <Title>{t("session.feast_reveal_t1")}</Title>
        </Animated.View>
        <Animated.View style={[LAYER, second]}>
          <Image
            source={icon}
            tintColor={rawColors.text}
            contentFit="contain"
            style={{ width: 120, height: 120 }}
            accessible={false}
          />
          <Title>{t(`session.feast_reveal_t2_${feast.animal}`)}</Title>
        </Animated.View>
        <YStack style={SECTION}>
          <Shield feast={feast} style={shield} />
          <Animated.View style={[SECTION, words]}>
            <FeastText feast={feast} villageName={villageName} sessions={sessions} />
          </Animated.View>
        </YStack>
      </YStack>
    </Frame>
  );
}

/** A tier's feast, and any other: the text comes up once, a little, over the painting. */
function TextStoryboard({ feast, tier, villageName, sessions, onSeeVillage }: Props) {
  const lift = useSharedValue(0);
  const text = useSharedValue(0);
  useEffect(() => {
    lift.value = withSpring(1, BOUNCY);
    text.value = withTiming(1, { duration: 500 });
  }, [lift, text]);
  const words = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - lift.value) * 12 }],
  }));
  return (
    <Frame
      tier={tier}
      veil={{ opacity: TEXT_VEIL }}
      villageName={villageName}
      onSeeVillage={onSeeVillage}
    >
      <Animated.View style={[SECTION, words]}>
        <FeastText feast={feast} villageName={villageName} sessions={sessions} />
      </Animated.View>
    </Frame>
  );
}

function TextFinal({ feast, tier, villageName, sessions, onSeeVillage }: Props) {
  return (
    <Frame
      tier={tier}
      veil={{ opacity: TEXT_VEIL }}
      villageName={villageName}
      onSeeVillage={onSeeVillage}
    >
      <YStack style={SECTION}>
        <FeastText feast={feast} villageName={villageName} sessions={sessions} />
      </YStack>
    </Frame>
  );
}

/**
 * The big feast, full screen. Reduced motion (the OS setting or the app's) renders the last
 * image at once and starts nothing; otherwise one short sequence plays and ends: no loop.
 * Only transform and opacity move.
 */
export function BigFeastView(props: Props) {
  const reducedMotion = useReducedMotion();
  const reveal = props.feast.kind === "reveal";
  if (reducedMotion) return reveal ? <RevealFinal {...props} /> : <TextFinal {...props} />;
  return reveal ? <RevealStoryboard {...props} /> : <TextStoryboard {...props} />;
}
