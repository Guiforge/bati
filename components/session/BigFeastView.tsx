import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
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
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { headingFont } from "@/components/common/headingFont";
import { ChevronRight } from "@/components/icons";
import { AnimalPortrait } from "@/components/village/AnimalPortrait";
import { Crest, type CrestShape } from "@/components/village/Crest";
import { CREST_ICON } from "@/components/village/crestText";
import { getVillageTierAsset } from "@/constants/assetMap";
import { fade, rawColors } from "@/constants/rawColors";
import type { Animal, CrestStage } from "@/db/crestRules";
import type { FlameLevel } from "@/db/streaks";
import type { VillageTier } from "@/db/village";
import { useGameIcon } from "@/hooks/useGameIcon";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { useSettingsStore } from "@/stores/settings";
import {
  ageBody,
  ageTitle,
  anniversaryBody,
  BEAT,
  legendaryBody,
  legendaryTitle,
  nextTierLevel,
  revealBody,
  revealColors,
  revealTitle,
  TEXT_FADE,
  tierSentence,
} from "./bigFeastText";
import type { Feast } from "./feasts";

/** The feasts that fill the screen. */
export type BigFeast = Extract<
  Feast,
  { kind: "reveal" | "tier" | "age" | "anniversary" | "legendary" }
>;

/** Tamagui's "bouncy" (tamagui.config.ts), which is not exported: a spring, once. */
const BOUNCY = { damping: 14, mass: 0.8, stiffness: 150 } as const;

/** The veil over the painting lifts with each beat: 0.75, then 0.6, then 0.5 (the mockup's). */
const VEIL = [0.75, 0.6, 0.5];
const RISE = 24;
/** A tier's painting is the point of it: a lighter veil than the reveal's. */
const TEXT_VEIL = 0.2;

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
      fontFamily={headingFont(children)}
      fontWeight="700"
      fontSize={26}
      color="$text"
      style={{ textAlign: "center" }}
    >
      {children}
    </Text>
  );
}

/** The fact is the line to read: `$text` at 16, the mockup's. A plain explanation stays pale. */
function Line({
  children,
  testID,
  fact = false,
}: {
  children: string;
  testID: string;
  fact?: boolean;
}) {
  return (
    <Text
      testID={testID}
      fontSize={fact ? 16 : 15}
      color={fact ? "$text" : "$textSecondary"}
      style={{ textAlign: "center" }}
    >
      {children}
    </Text>
  );
}

type Ctx = {
  feast: BigFeast;
  /** A reveal's crest as the Village will draw it, with the animal it names; null for the others. */
  crest: CrestShape | null;
  villageName: string;
  /** Sessions that count, for a tier's "after 118 sessions"; null says no such figure. */
  sessions: number | null;
  /** What the animal's portrait needs besides the feast's animal; null draws none. */
  portrait?: { stage: CrestStage; longestFlame: FlameLevel } | null;
  /** The reveal's "Why the Bear?" link: the Village's shield opens the same sheet. */
  onWhy?: () => void;
};

/** "Why the Bear?": the reveal's way into the sheet the Village's shield opens too. */
function WhyLink({
  animal,
  onPress,
  inert,
}: {
  animal: Animal;
  onPress: (() => void) | undefined;
  /** The storyboard has not shown the text yet: no press lands and TalkBack skips it. */
  inert?: boolean;
}) {
  const { t } = useTranslation();
  if (!onPress) return null;
  return (
    <Pressable
      testID="big-feast-why"
      accessibilityRole="button"
      pointerEvents={inert ? "none" : "auto"}
      accessibilityElementsHidden={inert}
      importantForAccessibility={inert ? "no-hide-descendants" : "auto"}
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <XStack items="center" gap="$1">
        <Text fontSize={15} fontWeight="600" color="$primaryText">
          {t(`village.crest_why_title_${animal}`)}
        </Text>
        <ChevronRight size={16} color="$primaryText" />
      </XStack>
    </Pressable>
  );
}

/**
 * The animal's portrait, 192 dp: the largest square that leaves the title and the body above the
 * fold on a 640 dp phone at 130 % text, and one the 24 dp margins of a 360 dp screen still hold.
 */
const PORTRAIT = 192;

function FeastPortrait({
  animal,
  portrait,
  fallback,
  size = PORTRAIT,
}: {
  animal: Animal;
  portrait: Ctx["portrait"];
  fallback?: ReactNode;
  size?: number;
}) {
  if (!portrait) return fallback ?? null;
  return <AnimalPortrait animal={animal} size={size} fallback={fallback} {...portrait} />;
}

/**
 * The reveal's portrait, 160 dp, beside the 96 dp shield (a row of 268 dp in the 312 dp a 360 dp
 * screen leaves) so the shield costs no height: kicker, title, body, colours and the "Why" link
 * stay above the button at 130 %. The same size in the storyboard and in the last image.
 */
const REVEAL_PORTRAIT = 160;

/** The portrait of the reveal, or the animal's silhouette while its portrait has not shipped. */
function RevealPortrait({ animal, portrait }: { animal: Animal; portrait: Ctx["portrait"] }) {
  const icon = useGameIcon(CREST_ICON[animal]);
  return (
    <FeastPortrait
      animal={animal}
      portrait={portrait}
      size={REVEAL_PORTRAIT}
      fallback={
        <Image
          testID="big-feast-silhouette"
          source={icon}
          tintColor={rawColors.text}
          contentFit="contain"
          style={{ width: 120, height: 120 }}
          accessible={false}
        />
      }
    />
  );
}

/** An Age or an anniversary: a kicker, a title and the one line of the year (none when it has nothing true to add). */
function YearsText({
  feast,
  language,
}: {
  feast: Extract<BigFeast, { kind: "age" | "anniversary" }>;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  if (feast.kind === "age") {
    const body = ageBody(t, feast);
    return (
      <>
        <Kicker>{t("session.feast_age_kicker")}</Kicker>
        <Title>{ageTitle(t, feast, language)}</Title>
        <Line testID="big-feast-body" fact>
          {body}
        </Line>
      </>
    );
  }
  const body = anniversaryBody(t, feast, language);
  return (
    <>
      <Kicker>{t("session.feast_anniversary_kicker")}</Kicker>
      <Title>{t("session.tonight_anniversary", { count: feast.years })}</Title>
      {body ? (
        <Line testID="big-feast-body" fact>
          {body}
        </Line>
      ) : null}
    </>
  );
}

/** The text of the last image, which is the whole feast under reduced motion. */
function FeastText({
  feast,
  villageName,
  sessions,
  portrait,
  onWhy,
  whyInert,
}: Omit<Ctx, "crest"> & { whyInert?: boolean }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  if (feast.kind === "reveal") {
    const body = revealBody(t, feast);
    const colors = revealColors(t, feast);
    return (
      <>
        <Kicker>
          {villageName
            ? t("session.feast_reveal_kicker", { name: villageName })
            : t("session.feast_reveal_kicker_unnamed")}
        </Kicker>
        <Title>{revealTitle(t, feast, villageName)}</Title>
        {body ? (
          <Line testID="big-feast-body" fact>
            {body}
          </Line>
        ) : null}
        {body && colors ? <Line testID="big-feast-colors">{colors}</Line> : null}
        <WhyLink animal={feast.animal} onPress={onWhy} inert={whyInert} />
      </>
    );
  }
  if (feast.kind === "tier") {
    const next = nextTierLevel(feast.tier);
    return (
      <>
        <Kicker>{t("session.feast_tier_kicker")}</Kicker>
        <Title>{tierSentence(t, feast.tier, villageName, language, true)}</Title>
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
  if (feast.kind === "legendary") {
    return (
      <>
        <FeastPortrait animal={feast.animal} portrait={portrait} />
        <Kicker>{t("village.crest_stage_legendary")}</Kicker>
        <Title>{legendaryTitle(t, feast)}</Title>
        <Line testID="big-feast-body" fact>
          {legendaryBody(t, feast)}
        </Line>
      </>
    );
  }
  return <YearsText feast={feast} language={language} />;
}

function Shield({ crest, style }: { crest: CrestShape | null; style?: object }) {
  return (
    <Animated.View style={style}>
      <Crest size={96} onPainting crest={crest} />
    </Animated.View>
  );
}

/** The frame: painting, veil, a content band and the one button, there from the first image. */
function Frame({
  tier,
  veil,
  villageName,
  onSeeVillage,
  low = false,
  children,
}: {
  tier: VillageTier;
  veil: object;
  villageName: string;
  onSeeVillage: () => void;
  /** The mockup's tier feast: painting on top, the words in a block at the bottom on the dark. */
  low?: boolean;
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
        colors={["transparent", fade(rawColors.bgDark, low ? 0.97 : 0.9)]}
        locations={low ? [0.3, 0.62] : [0.3, 0.75]}
        style={FILL}
      />
      <ScrollView
        testID="big-feast-scroll"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: low ? "flex-end" : "center",
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
function RevealFinal({
  feast,
  crest,
  tier,
  villageName,
  sessions,
  portrait,
  onSeeVillage,
  onWhy,
}: Props) {
  if (feast.kind !== "reveal") return null;
  return (
    <Frame
      tier={tier}
      veil={{ opacity: VEIL[2] }}
      villageName={villageName}
      onSeeVillage={onSeeVillage}
    >
      <YStack style={SECTION}>
        <XStack testID="big-feast-reveal-row" items="center" justify="center" gap="$3">
          <RevealPortrait animal={feast.animal} portrait={portrait} />
          <Shield crest={crest} />
        </XStack>
        <FeastText
          feast={feast}
          villageName={villageName}
          sessions={sessions}
          portrait={null}
          onWhy={onWhy}
        />
      </YStack>
    </Frame>
  );
}

/** The three beats of the reveal, once: two eyes, the silhouette, the shield and its text. */
function RevealStoryboard({
  feast,
  crest,
  tier,
  villageName,
  sessions,
  portrait,
  onSeeVillage,
  onWhy,
}: Props) {
  const { t } = useTranslation();
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
    text.value = withDelay(2 * BEAT, withTiming(1, { duration: TEXT_FADE }));
  }, [beat, rise, land, text]);
  // The words fade in over TEXT_FADE after two beats: until then the link is invisible, not absent.
  const [textShown, setTextShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTextShown(true), 2 * BEAT + TEXT_FADE);
    return () => clearTimeout(id);
  }, []);

  const veil = useAnimatedStyle(() => ({ opacity: interpolate(beat.value, [0, 1, 2], VEIL) }));
  const eyes = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0, 0.4], [0, 1], "clamp"),
  }));
  const first = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0.6, 0.8], [1, 0], "clamp"),
  }));
  // The portrait is the last image's own: its slot is in the layout from the first beat, so it
  // rises at the second beat and then stays where it is.
  const portraitIn = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0.8, 1], [0, 1], "clamp"),
    transform: [{ translateY: (1 - rise.value) * RISE }],
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
        <YStack style={SECTION}>
          <XStack testID="big-feast-reveal-row" items="center" justify="center" gap="$3">
            <Animated.View style={portraitIn}>
              <RevealPortrait animal={feast.animal} portrait={portrait} />
            </Animated.View>
            <Shield crest={crest} style={shield} />
          </XStack>
          <YStack style={SECTION}>
            {/* Over the title's place: it fades out as the shield lands beside the portrait. */}
            <Animated.View style={[LAYER, { top: 0, left: 0, right: 0 }, second]}>
              <Title>{t(`session.feast_reveal_t2_${feast.animal}`)}</Title>
            </Animated.View>
            <Animated.View style={[SECTION, words]}>
              <FeastText
                feast={feast}
                villageName={villageName}
                sessions={sessions}
                portrait={null}
                onWhy={onWhy}
                whyInert={!textShown}
              />
            </Animated.View>
          </YStack>
        </YStack>
      </YStack>
    </Frame>
  );
}

/** A tier's feast, and any other: the text comes up once, a little, over the painting. */
function TextStoryboard({ feast, tier, villageName, sessions, portrait, onSeeVillage }: Props) {
  const lift = useSharedValue(0);
  const text = useSharedValue(0);
  useEffect(() => {
    lift.value = withSpring(1, BOUNCY);
    text.value = withTiming(1, { duration: TEXT_FADE });
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
      low
    >
      <Animated.View style={[SECTION, words]}>
        <FeastText
          feast={feast}
          villageName={villageName}
          sessions={sessions}
          portrait={portrait}
        />
      </Animated.View>
    </Frame>
  );
}

function TextFinal({ feast, tier, villageName, sessions, portrait, onSeeVillage }: Props) {
  return (
    <Frame
      tier={tier}
      veil={{ opacity: TEXT_VEIL }}
      villageName={villageName}
      onSeeVillage={onSeeVillage}
      low
    >
      <YStack style={SECTION}>
        <FeastText
          feast={feast}
          villageName={villageName}
          sessions={sessions}
          portrait={portrait}
        />
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
