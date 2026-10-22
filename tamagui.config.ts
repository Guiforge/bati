import { createAnimations } from "@tamagui/animations-react-native";
// v5 is the frozen compatibility pack: its size/space/radius/zIndex tokens are value-for-value the
// v2 `@tamagui/config/v4` ones (same `sizeToSpace` curve, keys spelled `4`/`1-5` instead of
// `$4`/`$1.5`, no `true` alias), and it uses the same `@tamagui/shorthands/v4`. `/v4` itself no
// longer exists in v3 and its upgrade-guide replacement (`/v6`) is a 4px-grid redesign: `$4`
// space 18 -> 16, `$10` 60 -> 40. Do not switch to v6 as part of this migration.
import { defaultConfig } from "@tamagui/config/v5";
import { createFont, createTamagui, createTokens } from "tamagui";
import { rawColors } from "@/constants/rawColors";

// -------------------------------------------------------------------------
// 1. TYPOGRAPHY (The Voice of the RPG)
// -------------------------------------------------------------------------
// Note: You must load these fonts in your root _layout.tsx using expo-font
// Alegreya: a calligraphic book serif, the voice of a chronicle rather than a dashboard (design
// review 2026-10-05). Its x-height is small, so the scale sits about one step above Space
// Grotesk's. Never tracked, never used for a digit: its figures are old-style and a timer set in
// it jumps. Numbers stay in the body font.
//
// `sm` replaces v2's `true` key. v3 resolves a default-sized text (`size` unset, i.e. `true`) to
// the font's `sm` key when it has one, else to `4`. v2 resolved `$true` to the key whose value
// equalled it: `2` here, `3` in the two others. Each `sm` is therefore a copy of that key's
// resolved size, line height, weight and letter spacing (createFont fills gaps from the previous
// key, which is why `sm` is spelled out in every section: left out, it would inherit key 6's).
// Numeric line heights in a font stay absolute pixels in v3; only authored JSX numbers became
// ratios.
const headingFont = createFont({
  family: "Alegreya",
  size: {
    1: 15,
    2: 20,
    3: 26,
    4: 35,
    5: 44,
    6: 52,
    sm: 20,
  },
  lineHeight: {
    1: 20,
    2: 26,
    3: 32,
    4: 42,
    5: 52,
    sm: 26,
  },
  weight: {
    4: "400",
    7: "700",
    sm: "400",
  },
  letterSpacing: {
    4: 0,
    5: 0,
    sm: 0,
  },
  face: {
    400: { normal: "Alegreya_400Regular" },
    700: { normal: "Alegreya_700Bold" },
  },
});

const bodyFont = createFont({
  family: "NotoSans",
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    sm: 16,
  },
  lineHeight: {
    3: 24,
    5: 28,
    6: 32,
    sm: 24,
  },
  weight: {
    4: "400",
    5: "500",
    7: "700",
    sm: "400",
  },
  face: {
    400: { normal: "NotoSans_400Regular" },
    700: { normal: "NotoSans_700Bold" },
  },
});

// Inter, the Nocturne design system's one family, for the Journal. Components opt in with
// `fontFamily="nocturne"`: a sub-theme recolours, but a font is not a theme value.
const nocturneFont = createFont({
  family: "Inter",
  size: { 1: 11, 2: 13, 3: 15, 4: 18, 5: 22, 6: 28, sm: 15 },
  lineHeight: { 1: 16, 2: 19, 3: 22, 4: 24, 5: 28, 6: 34, sm: 22 },
  weight: { 4: "400", 5: "500", 6: "600", sm: "400" },
  letterSpacing: { 4: 0, sm: 0 },
  face: {
    400: { normal: "Inter_400Regular" },
    500: { normal: "Inter_500Medium" },
    600: { normal: "Inter_600SemiBold" },
  },
});

// -------------------------------------------------------------------------
// 2. ANIMATIONS (Game Feel)
// -------------------------------------------------------------------------
const animations = createAnimations({
  bouncy: {
    type: "spring",
    damping: 14,
    mass: 0.8,
    stiffness: 150,
  },
  // The standard interaction animation (Buttons, Cards). Tuned for ~150-200ms
  // settle, no overshoot: press feedback must never lag behind the tap.
  quick: {
    type: "spring",
    damping: 30,
    mass: 1,
    stiffness: 400,
  },
  // A gauge earning its progress: slow enough to read, once. v2 handed RN `Animated.timing` no
  // easing, so it ran RN's default `Easing.inOut(Easing.ease)`; v3 defaults a timing to CSS `ease`
  // (a different, front-loaded curve). `ease-in-out` is the CSS spelling of RN's default.
  slow: { type: "timing", duration: 900, easing: "ease-in-out" },
});

// -------------------------------------------------------------------------
// 3. TOKENS (Palette)
// -------------------------------------------------------------------------
const tokens = createTokens({
  ...defaultConfig.tokens,
  // No colour tokens: every colour is a theme key, built from constants/rawColors.ts (the one
  // place a colour is written down, which keeps .biome/plugins/noRawHexColor.grit exceptionless).
  // v3 resolves `bg="error"` against a colour *token* first and the theme only when no token has
  // that name; v2 asked the theme first. With the palette also registered as tokens, every key a
  // theme remaps (`muted` in dark, `primary`/`error`/`surface`… in the Journal) silently painted
  // the raw token instead. An empty colour scale leaves the theme as the only answer, as in v2.
  color: {},
});

// The border keys v3's stock skins read are kebab-case (`border-color hover:border-color-hover
// focus:border-color-focus` on Input, `shadow-color` on Sheet.Overlay). Each is a twin of a key
// the theme already had, never a new colour: a key v2 lacked (`background-focus`, which
// Separator reads, `background-press`, `outline-color`) stays absent, so nothing that rendered
// without it starts rendering with it.
const kebabTwins = <T>(t: { borderColor: T; shadowColor: T }) => ({
  "border-color": t.borderColor,
  "border-color-hover": t.borderColor,
  "border-color-press": t.borderColor,
  "border-color-focus": t.borderColor,
  "shadow-color": t.shadowColor,
});

const darkBase = {
  ...rawColors,
  background: rawColors.bgOverlay,
  color: rawColors.text,
  // What is written on a `primary` fill: light on the app's braise, dark on the Journal's gold.
  onPrimary: rawColors.onPrimary,
  // What is written on an `error` fill: ink here, bone in the Journal where error is dark.
  onError: rawColors.bgDark,
  danger: rawColors.error, // alias, no matching token
  muted: rawColors.textSecondary, // deliberately not rawColors.muted
  // Stock primitives ask the theme for a border colour, and Tamagui logged a missing token for
  // each at every launch. The app's one border colour answers, in every state.
  borderColor: rawColors.borderStrong,
  borderColorHover: rawColors.borderStrong,
  borderColorPress: rawColors.borderStrong,
  borderColorFocus: rawColors.borderStrong,
};

const journal = {
  ...rawColors,
  background: rawColors.bgDark,
  color: rawColors.text,
  danger: rawColors.ink800,
  bgLight: rawColors.surface2,
  bgOverlay: rawColors.bgDark,
  surface: rawColors.surface2,
  primary: rawColors.resourceGold,
  primaryText: rawColors.resourceGold,
  primaryHover: rawColors.gold300,
  primaryPress: rawColors.gold600,
  success: rawColors.resourceGold,
  warning: rawColors.gold300,
  error: rawColors.borderStrong,
  // Surfaces carry no border here: a shared card's outline takes the surface's own colour.
  borderStrong: rawColors.surface2,
  // Same for a stock primitive's (it would inherit dark's visible border otherwise).
  borderColor: rawColors.surface2,
  borderColorHover: rawColors.surface2,
  borderColorPress: rawColors.surface2,
  borderColorFocus: rawColors.surface2,
  onPrimary: rawColors.bgDark,
  onError: rawColors.text,
  primaryEdge: rawColors.gold700,
  // The shared Tag's tones: flat inks here, where the history rows used to carry a red and a
  // brown that meant nothing on a one-accent page.
  pastelGreen: rawColors.gold900,
  pastelPink: rawColors.ink800,
  pastelBlue: rawColors.ink800,
};

// -------------------------------------------------------------------------
// 4. CONFIG EXPORT
// -------------------------------------------------------------------------
// Default export only: app/_layout.tsx and tamagui.d.ts both take the default, and a named
// twin of the same object is one more thing that can be imported inconsistently.
//
// `defaultProps` is gone in v3. The Input defaults it carried (placeholder colour, radius 3,
// `height: "auto"` over a 44 dp floor, `py: 4`, and the reasons for each) now live in the
// app-owned skin, components/common/Input.tsx.
const config = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    // What v2's `@tamagui/config/v4` set and v5 changed. Both only act on web (flex expansion,
    // default position), so on Android they are inert; they are kept so the config says what the
    // app was built against rather than what a newer pack prefers.
    styleCompat: "legacy",
    defaultPosition: "relative",
  },
  animations,
  tokens,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    nocturne: nocturneFont,
  },
  themes: {
    // We force a unified DARK theme structure even for 'light' key
    // to prevent white flash if system theme is light.
    // Every colour token is a theme key: SVG icons (@tamagui/lucide-icons)
    // resolve `color="x"` against the theme first, then the token map.
    light: { ...darkBase, ...kebabTwins(darkBase) },
    dark: { ...darkBase, ...kebabTwins(darkBase) },
    // The Journal (`<Theme name="journal">` in app/(tabs)/journal/_layout.tsx). The app's own keys
    // are remapped rather than left alone, so a shared component the Journal still mounts (the
    // achievements list, the balance card, a history row) takes its ground and its one accent
    // without knowing it is on another tab. The braise, green and red fold into the gold ramp.
    dark_journal: { ...journal, ...kebabTwins(journal) },
  },
});

export default config;
