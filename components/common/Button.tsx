import { createContext, type ReactNode, use } from "react";
import { createStyledHOC, getTokenValue, styled } from "tamagui";
import {
  type ButtonBehaviorProps,
  ButtonFrame,
  getThemedIconSize,
  SizableText,
  type TextContextStyles,
  textParentInlineProps,
  useButton,
} from "tamagui/unstyled";

/**
 * Tamagui 2's Button, ported onto Tamagui 3's button behaviour. Tamagui 3's own Button is a
 * redesign (named sizes, a `level2` theme, press opacity, a 600 label, a min height instead of a
 * height) that no config turns back into the old one, so the app owns its look:
 * `__tests__/tamagui-skin-golden.test.tsx` holds the figures it must keep.
 *
 * Sizes are the v5 token keys the app uses. Height, padding and radius read the size, space and
 * radius token of that key; the gap reads the *radius* token, because that is what v2's
 * `getTokenValue("$3")` with no category picked (the first category holding the key).
 */
type ButtonSize = "2" | "3" | "4" | "5";

const Frame = styled(ButtonFrame, {
  bg: "background",
  borderWidth: 1,
  borderStyle: "solid",
  // v2 pressed a stock Button to the theme's hover border. Its pressed background asked for
  // `backgroundPress`, which the theme never had, so it is not drawn here either.
  borderColor: "transparent press:borderColorHover",
  variants: {
    size: styled.dynamic<ButtonSize>((size) => ({
      height: size,
      px: size,
      rounded: size,
      gap: getTokenValue(size, "radius"),
    })),
    chromeless: {
      true: {
        bg: "transparent",
        borderColor: "transparent press:borderColorHover",
        shadowColor: "transparent",
      },
    },
  } as const,
  defaultVariants: {
    size: "4",
  },
});

// The text props a Button passes down to a `Button.Text` it is handed instead of a string.
const LabelContext = createContext<TextContextStyles>({});

const Label = styled(SizableText, {
  color: "color",
  // flexGrow 1 pushes the text to the start of its parent on native
  grow: 0,
  shrink: 1,
  select: "none",
  // One line, as v2's `ellipsis` gave. A caller that wants the label to wrap says `numberOfLines={0}`.
  numberOfLines: 1,
  // The font's default rung, named: v3 drops the font's line height and letter spacing for a text
  // left at `size: true` with a numeric fontSize (AppButton's 20), where v2 kept the default rung's.
  size: "sm",
});

function ButtonText(props: Parameters<typeof Label>[0]) {
  return <Label {...use(LabelContext)} {...props} />;
}

type ButtonOwnProps = ButtonBehaviorProps & {
  size?: ButtonSize;
  /** A square of the size's height, fully rounded, no padding. */
  circular?: boolean;
  /** No fill, no border, no shadow. */
  chromeless?: boolean;
};

const ButtonComponent = createStyledHOC(
  Frame,
  function Button({ size, circular, chromeless, ...rest }: ButtonOwnProps, ref): ReactNode {
    const { color, fontFamily, fontSize, fontStyle, fontWeight, letterSpacing, textAlign } = rest;
    // An unsized Button is a `4` frame around a default-sized label and icon (16), as in v2.
    const { props } = useButton(rest, {
      Text: Label,
      iconColor: typeof color === "string" ? color : undefined,
      iconSize: getThemedIconSize(size),
      textProps: size ? { size } : {},
    });
    const side = getTokenValue(size ?? "4", "size");
    return (
      <LabelContext
        value={{ color, fontFamily, fontSize, fontStyle, fontWeight, letterSpacing, textAlign }}
      >
        <Frame
          ref={ref}
          size={size}
          chromeless={chromeless}
          {...(circular && {
            width: side,
            height: side,
            minW: side,
            maxW: side,
            minH: side,
            maxH: side,
            rounded: 100_000,
            p: 0,
          })}
          {...props}
        />
      </LabelContext>
    );
  },
  { staticConfig: { inlineProps: textParentInlineProps } },
);

export const Button = Object.assign(ButtonComponent, { Text: ButtonText });
