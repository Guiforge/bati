// The design-sync entry: the BD core components as a web package for claude.ai/design.
// Built by .design-sync/web/build.mjs (react-native -> react-native-web); never imported by the app.
import "../../i18n";
import type { ReactNode } from "react";
import { TamaguiProvider } from "tamagui";
import config from "../../tamagui.config";

// react-native-web injects <style id="react-native-stylesheet"> and fills it through the CSSOM, so its
// innerHTML stays empty; the design-sync render check takes the first `[id^="r"]` element as the
// mount root and reads that empty tag as an empty preview. RNW keeps its own reference to the sheet,
// so renaming the element is invisible to it.
if (typeof document !== "undefined") {
  const rename = () => {
    const el = document.getElementById("react-native-stylesheet");
    if (el) el.id = "native-web-stylesheet";
    return !!el;
  };
  if (!rename()) {
    const watch = new MutationObserver(() => rename() && watch.disconnect());
    watch.observe(document.documentElement, { childList: true, subtree: true });
  }
}

export { AppButton, AppIconButton } from "../../components/common/AppButton";
export { Card } from "../../components/common/Card";
export { Chip } from "../../components/common/Chip";
export { GameIcon } from "../../components/common/GameIcon";
export { InkGauge } from "../../components/common/InkGauge";
export { ProgressBar } from "../../components/common/ProgressBar";
export { Recitatif } from "../../components/common/Recitatif";
export { SectionLabel } from "../../components/common/SectionLabel";
export { Stepper } from "../../components/common/Stepper";
export { Tag } from "../../components/common/Tag";
export { Text, XStack, YStack } from "tamagui";

/** The app's root: Tamagui config and the dark theme. Every Bati component renders inside it. */
export function BatiProvider({ children }: { children: ReactNode }) {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      {children}
    </TamaguiProvider>
  );
}
