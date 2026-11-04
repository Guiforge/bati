// A browser's radialGradient only has `r`; react-native-svg's native side also takes rx and ry.
// Numeric ones become `r` plus a scale about the centre, the same ellipse. Percentages (50 %, the
// browser's default) pass through.
import type { ComponentProps } from "react";
import { RadialGradient as Base } from "react-native-svg";

export * from "react-native-svg";
export { default } from "react-native-svg";

export function RadialGradient(props: ComponentProps<typeof Base>) {
  const { rx, ry, cx, cy, ...rest } = props;
  if (typeof rx !== "number" || typeof ry !== "number") return <Base {...props} />;
  const [x, y] = [Number(cx), Number(cy)];
  return (
    <Base
      {...rest}
      cx={cx}
      cy={cy}
      r={rx}
      gradientTransform={`translate(${x} ${y}) scale(1 ${ry / rx}) translate(${-x} ${-y})`}
    />
  );
}
