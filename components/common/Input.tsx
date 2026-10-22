import { styled } from "tamagui";
import { Input as InputBehavior } from "tamagui/unstyled";

/**
 * Tamagui 2's Input look on Tamagui 3's unstyled input behaviour. Tamagui 3's own Input is a
 * redesign (named sizes, an `Input` theme, kebab border keys), so the app owns its look:
 * `__tests__/tamagui-skin-golden.test.tsx` holds the figures it must keep.
 *
 * Every field gets the muted placeholder, so it never shows the platform's default grey: next to
 * typed text it read as a filled name and the quest editor refused to save it.
 *
 * `py: 4`, not 8: the first line's top is clipped at the content box, which is the field minus its
 * padding. At 130% the 44 dp floor less 16 dp of padding left 28 dp for a ~28.3 dp line, and the
 * accent of a capital (the E of "Epreuve du Guet") is the first thing past it. The multi-line
 * fields, which want the air above their first line, say `py={8}` themselves.
 *
 * ponytail: a single-line field is 44 dp tall and 9 dp rounded, whatever the font scale. Tamagui 2's
 * config asked for `height: "auto"` and radius 3 too, but its size variant overrode both, so 44 and
 * 9 are what shipped (measured by the golden). A real auto height is a visible change at 130%: make
 * it on purpose, with a device check, not as part of an upgrade.
 */
export const Input = styled(InputBehavior, {
  fontFamily: "body",
  // The body font's default rung, 16. No line height: on native it shifts the text in the field.
  fontSize: "sm",
  // Tamagui maps family + weight to a loaded face (NotoSans_400Regular) only when a weight is set;
  // without one Android gets the bare family name, which no font answers to.
  fontWeight: "400",
  color: "color",
  bg: "background",
  borderColor: "borderColor",
  borderWidth: 1,
  borderStyle: "solid",
  rounded: "4",
  height: "4",
  minH: 44,
  py: 4,
  px: "3-5",
  placeholderTextColor: "textSecondary",
}).resolve((props) =>
  props.multiline && props.height === undefined ? { height: "auto" } : undefined,
);
