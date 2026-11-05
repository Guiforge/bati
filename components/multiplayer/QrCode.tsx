import Svg, { Path, Rect } from "react-native-svg";
import { encode } from "uqr";
import { rawColors } from "@/constants/rawColors";
import { qrPath } from "@/src/multiplayer/qrPath";

/** The four modules of light margin the QR standard asks for, without which scanners fail. */
const QUIET = 4;

/**
 * Black on white whatever the theme: a phone's scanner expects dark modules on light, and this is
 * the one place the app's dark mode gives way, the way a boarding pass does.
 */
export function QrCode({ value, size }: { value: string; size: number }) {
  // Medium correction: a screen seen through a camera loses a little, and a higher level would
  // grow the code for damage a screen does not suffer.
  const { data, size: modules } = encode(value, { ecc: "M", border: 0 });
  const box = modules + QUIET * 2;
  return (
    <Svg testID="qr-code" width={size} height={size} viewBox={`${-QUIET} ${-QUIET} ${box} ${box}`}>
      <Rect x={-QUIET} y={-QUIET} width={box} height={box} fill={rawColors.qrPaper} />
      <Path d={qrPath(data)} fill={rawColors.qrInk} />
    </Svg>
  );
}
