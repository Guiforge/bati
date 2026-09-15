import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type GetProps, styled, Text, XStack, YStack, type YStackProps } from "tamagui";
import { ChevronLeft } from "@/components/icons";
import { rawColors } from "@/constants/rawColors";

/**
 * Nocturne's pieces, as the Journal needs them.
 *
 * The design project ("Journal Bati", option 3c) takes the structure of the Nocturne design system
 * and keeps Bati's colours. Nocturne ships plain CSS classes (`.card`, `.btn`, `.seg`, `.hr`,
 * `.lighten`); this is their translation, one component each, so a screen never re-types a radius
 * or a letter-spacing. Its one accent is `$resourceGold`, stepped by the `$gold…` ramp; the stack
 * is wrapped in the `dark_journal` theme, so a shared component mounted here takes the same ground
 * and accent.
 */

const TextFrame = styled(Text, {
  fontFamily: "$nocturne",
  color: "$text",
  fontSize: 15,
  lineHeight: 22,
});
const MutedFrame = styled(TextFrame, { color: "$textSecondary", fontSize: 12, lineHeight: 17 });
const KickerFrame = styled(TextFrame, {
  fontSize: 10,
  lineHeight: 14,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "$resourceGold",
});
const NumFrame = styled(TextFrame, {
  fontWeight: "500",
  letterSpacing: -0.2,
  fontVariant: ["tabular-nums"],
});

type TextProps = GetProps<typeof TextFrame>;

/** Body text: Inter 400 on the system's text colour. */
export function NText(props: TextProps) {
  return <TextFrame {...props} />;
}

/** Dates, units, definitions. */
export function NMuted(props: TextProps) {
  return <MutedFrame {...props} />;
}

/** The accent kicker above a block: "TO BEAT TONIGHT". */
export function NKicker(props: TextProps) {
  return <KickerFrame {...props} />;
}

/** The quiet kicker: "SEPTEMBER SO FAR". */
export function NKickerQuiet(props: TextProps) {
  return <KickerFrame color="$textSecondary" {...props} />;
}

/** A number. Inter 500 in tabular figures, so a column of them lines up. */
export function NNum(props: TextProps) {
  return <NumFrame {...props} />;
}

/** A screen or block title. */
export function NTitle(props: TextProps) {
  return <TextFrame fontWeight="500" fontSize={18} lineHeight={24} {...props} />;
}

/** `.card`: a surface with no border. Nocturne lifts by tone, not by outline. */
export function NBlock({ children, ...props }: YStackProps & { children: ReactNode }) {
  return (
    <YStack
      bg="$surface2"
      rounded={8}
      p={11}
      pressStyle={props.onPress ? { opacity: 0.85 } : undefined}
      accessibilityRole={props.onPress ? "button" : undefined}
      {...props}
    >
      {children}
    </YStack>
  );
}

/**
 * `.hr`: a rule that fades out at both ends, the system's signature. A gradient rather than a
 * border, and transparent *text* at the ends rather than `transparent`, which Android paints as
 * transparent black and greys the fade.
 */
export function NRule({ my = 11 }: { my?: number }) {
  return (
    <View style={{ marginVertical: my }}>
      <LinearGradient
        colors={[
          rawColors.glassBorderClear,
          rawColors.glassBorder,
          rawColors.glassBorder,
          rawColors.glassBorderClear,
        ]}
        locations={[0, 0.15, 0.85, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.rule}
      />
    </View>
  );
}

/**
 * The raised panel, the one place the page stops: a gradient from `accent-900` to the surface and
 * an inner accent line. It says "a record fell" and "the last blow", and nothing else.
 */
export function NPanel({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <View style={styles.panel}>
      <LinearGradient
        colors={[rawColors.gold900, rawColors.surface2]}
        style={StyleSheet.absoluteFill}
      />
      <YStack px={11} py={17} items={center ? "center" : undefined}>
        {children}
      </YStack>
    </View>
  );
}

type SegOption<T extends string> = { value: T; label: string; testID?: string };

/** `.seg`: two or three options in one outlined pill, the chosen one ringed in the accent. */
export function NSeg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <XStack
      borderWidth={1}
      borderColor="$glassBorder"
      rounded={8}
      overflow="hidden"
      accessibilityRole="tablist"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <YStack
            key={option.value}
            testID={option.testID}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            minH={34}
            px={14}
            justify="center"
            borderLeftWidth={index === 0 ? 0 : 1}
            borderColor="$glassBorder"
            {...(selected ? { borderWidth: 1, borderColor: "$resourceGold", rounded: 7 } : null)}
            pressStyle={{ bg: "$ink900" }}
          >
            <NText fontSize={13} lineHeight={18} color={selected ? "$resourceGold" : "$text"}>
              {option.label}
            </NText>
          </YStack>
        );
      })}
    </XStack>
  );
}

/** `.btn`: always an outline. Primary is the accent, secondary the divider. */
export function NButton({
  children,
  onPress,
  variant = "secondary",
  block,
  minH = 40,
  testID,
}: {
  children: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  block?: boolean;
  minH?: number;
  testID?: string;
}) {
  const primary = variant === "primary";
  return (
    <YStack
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      minH={minH}
      px={10}
      rounded={8}
      borderWidth={1}
      borderColor={primary ? "$resourceGold" : "$glassBorder"}
      items="center"
      justify="center"
      width={block ? "100%" : undefined}
      pressStyle={{ bg: primary ? "$gold900" : "$ink900" }}
    >
      <NText
        fontWeight="500"
        fontSize={primary ? 15 : 14}
        color={primary ? "$resourceGold" : "$text"}
      >
        {children}
      </NText>
    </YStack>
  );
}

/**
 * `.lighten`: a painting blended into the ground instead of framed on it. Every Bati painting is
 * dark-backed, so the dark values drop out and the subject stays.
 */
export function NImage({
  source,
  size,
  width,
  height,
  radius = 4,
  round,
}: {
  source: ImageSource | number | null;
  size?: number;
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  round?: boolean;
}) {
  const w = size ?? width ?? "100%";
  const h = size ?? height ?? 44;
  return (
    <View
      style={[
        styles.lighten,
        { width: w, height: h, borderRadius: round ? 999 : radius, overflow: "hidden" },
      ]}
    >
      {source != null && (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
    </View>
  );
}

/** A thin track with the accent filled to `progress` (0-100). */
export function NBar({
  progress,
  height = 4,
  fill = "$resourceGold",
}: {
  progress: number;
  height?: number;
  fill?: "$resourceGold" | "$gold600" | "$gold700" | "$gold800";
}) {
  const width = `${Math.max(0, Math.min(100, progress))}%` as const;
  return (
    <YStack height={height} bg="$ink900" rounded={height / 2} overflow="hidden">
      <YStack height="100%" width={width} bg={fill} />
    </YStack>
  );
}

/** A dot in a list of facts: accent for what moved, a lower step for what is still coming. */
export function NFact({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "soft" | "quiet";
}) {
  const bg = tone === "accent" ? "$resourceGold" : tone === "soft" ? "$gold600" : "$muted";
  return (
    <XStack items="center" gap={11}>
      <YStack width={6} height={6} rounded={3} bg={bg} />
      <YStack flex={1}>{children}</YStack>
    </XStack>
  );
}

/** The header of a page pushed on the Journal: a round back button and a title. */
export function NPageHeader({
  title,
  onBack,
  backLabel,
}: {
  title: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <XStack items="center" gap={11} py={11}>
      <NBackButton onPress={onBack} label={backLabel} />
      <NTitle>{title}</NTitle>
    </XStack>
  );
}

/** A page pushed on the Journal: the header, then its content scrolling under the safe area. */
export function NPage({
  title,
  testID,
  children,
}: {
  title: string;
  testID?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <YStack testID={testID} flex={1} bg="$bgDark">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack px={11}>
          <NPageHeader title={title} onBack={() => router.back()} backLabel={t("common.go_back")} />
          {children}
        </YStack>
      </ScrollView>
      <NStatusScrim />
    </YStack>
  );
}

/**
 * The status bar is translucent, so a page that scrolls runs its text under the clock. A strip of
 * the ground behind it, the height of the inset, keeps both readable.
 */
export function NStatusScrim() {
  const insets = useSafeAreaInsets();
  return <YStack position="absolute" t={0} l={0} r={0} height={insets.top} bg="$bgOverlay" />;
}

export function NBackButton({
  onPress,
  label,
  veiled,
}: {
  onPress: () => void;
  label: string;
  veiled?: boolean;
}) {
  return (
    <YStack
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      width={36}
      height={36}
      rounded={18}
      borderWidth={1}
      borderColor="$glassBorder"
      bg={veiled ? "$bgOverlaySoft" : undefined}
      items="center"
      justify="center"
      hitSlop={6}
      pressStyle={{ bg: "$ink900" }}
    >
      <ChevronLeft size={18} color="$text" strokeWidth={2.5} />
    </YStack>
  );
}

const styles = StyleSheet.create({
  rule: { height: 1 },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: rawColors.gold700,
    overflow: "hidden",
  },
  lighten: { mixBlendMode: "lighten" },
});
