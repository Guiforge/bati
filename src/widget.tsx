import { Platform } from "react-native";
import {
  FlexWidget,
  requestWidgetUpdate,
  TextWidget,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";

import { getStreakInfo } from "@/db/streaks";
import { type FlameLevel, getFlameLevel } from "@/db/village";

// Same values as DESIGN.md `resource-fire`/`muted`/`surface`/`text`. Duplicated as literals
// rather than importing the tamagui config (font loading, platform branches) into a headless
// task for four hex strings.
const FLAME_COLOR = "#FF6B35";
const DIM_COLOR = "#64748B";
const SURFACE_COLOR = "#101322";
const TEXT_COLOR = "#E8ECFF";

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
      <TextWidget
        text={flameLevel > 0 ? "🔥" : "🕯️"}
        style={{ fontSize: 32, color: flameLevel > 0 ? FLAME_COLOR : DIM_COLOR }}
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
