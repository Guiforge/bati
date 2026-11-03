import { requireNativeView } from "expo";
import type { ViewProps } from "react-native";

type ScannerProps = ViewProps & {
  /** Fires once per distinct QR code while the view is on screen. */
  onScan: (event: { nativeEvent: { text: string } }) => void;
  onCameraError: (event: { nativeEvent: { message: string } }) => void;
};

/** The camera and a QR decoder with no Google code in either. Mount it after the permission. */
export const ScannerView = requireNativeView<ScannerProps>("BatiScanner");
