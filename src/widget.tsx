"use no memo";

import { Platform } from "react-native";
import {
  FlexWidget,
  requestWidgetUpdate,
  TextWidget,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { rawColors } from "@/constants/rawColors";
import { getStreakInfo } from "@/db/streaks";
import { type FlameLevel, getFlameLevel } from "@/db/village";

// These used to be literals, because importing tamagui.config into a headless task drags in
// font loading and platform branches. constants/rawColors.ts is a plain object with type-only
// imports, so it costs nothing at runtime and the widget shares the app's palette for real.
const FLAME_COLOR = rawColors.resourceFire;
const DIM_COLOR = rawColors.muted;
const SURFACE_COLOR = rawColors.surface;
const TEXT_COLOR = rawColors.text;

// Drawn by a headless Android task, never mounted in the React tree, so Fast Refresh has
// nothing to refresh here — the two render sites below are the only consumers.
// biome-ignore lint/style/useComponentExportOnlyModules: headless widget task, not a screen
function FlameWidget({ streak, flameLevel }: { streak: number; flameLevel: FlameLevel }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: SURFACE_COLOR,
        borderRadius: 16,
      }}
    >
      <FlexWidget
        style={{
          width: 32,
          height: 8,
          borderRadius: 4,
          backgroundColor: flameLevel > 0 ? FLAME_COLOR : DIM_COLOR,
          marginBottom: 8,
        }}
      />
      <TextWidget
        text={String(streak)}
        style={{ fontSize: 24, fontWeight: "700", color: TEXT_COLOR }}
      />
    </FlexWidget>
  );
}

async function renderFlame(renderWidget: WidgetTaskHandlerProps["renderWidget"]) {
  const { current } = await getStreakInfo();
  renderWidget(<FlameWidget streak={current} flameLevel={getFlameLevel(current)} />);
}

/** Registered once from the custom entry point (index.ts). Handles every widget lifecycle event. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      await renderFlame(props.renderWidget);
      break;
    default:
      break;
  }
}

/**
 * Poke the flame widget to redraw now, instead of waiting for the OS's 30-minute
 * `updatePeriodMillis` tick. Call after anything that can move the streak. Android-only and
 * best-effort — same non-blocking contract as `rescheduleOathReminder()`.
 */
export async function requestFlameWidgetUpdate(): Promise<void> {
  if (Platform.OS !== "android") return;
  const { current } = await getStreakInfo();
  await requestWidgetUpdate({
    widgetName: "Flame",
    renderWidget: () => <FlameWidget streak={current} flameLevel={getFlameLevel(current)} />,
  });
}
