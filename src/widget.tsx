"use no memo";

import { Platform } from "react-native";
import {
  FlexWidget,
  requestWidgetUpdate,
  TextWidget,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { rawColors } from "@/constants/rawColors";
import { ensureMigrations } from "@/db/migrate";
import { type FlameLevel, getFlameLevel, getStreakInfo, getWeeklyProgress } from "@/db/streaks";
import { reportError } from "./reportError";

// These used to be literals, because importing tamagui.config into a headless task drags in
// font loading and platform branches. constants/rawColors.ts is a plain object with type-only
// imports, so it costs nothing at runtime and the widget shares the app's palette for real.
const FLAME_COLOR = rawColors.resourceFire;
const DIM_COLOR = rawColors.muted;
const SURFACE_COLOR = rawColors.surface;
const TEXT_COLOR = rawColors.text;

const ROOT_STYLE = {
  height: "match_parent",
  width: "match_parent",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: SURFACE_COLOR,
  borderRadius: 16,
} as const;

const NUMBER_STYLE = { fontSize: 24, fontWeight: "700", color: TEXT_COLOR } as const;

// A `null` value is the error fallback: the branded surface with an em dash beats the blank
// rn_widget placeholder the OS shows when the task handler's promise rejects, and the next
// update tick self-heals.

// Drawn by a headless Android task, never mounted in the React tree, so Fast Refresh has
// nothing to refresh here — the render sites below are the only consumers.
// biome-ignore lint/style/useComponentExportOnlyModules: headless widget task, not a screen
function FlameWidget({ streak, flameLevel }: { streak: number | null; flameLevel: FlameLevel }) {
  return (
    <FlexWidget clickAction="OPEN_APP" style={ROOT_STYLE}>
      <FlexWidget style={{ flexDirection: "row", flexGap: 4, marginBottom: 8 }}>
        {([0, 1, 2, 3, 4] as const).map((i) => (
          <FlexWidget
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i < flameLevel ? FLAME_COLOR : DIM_COLOR,
            }}
          />
        ))}
      </FlexWidget>
      <TextWidget text={streak === null ? "–" : String(streak)} style={NUMBER_STYLE} />
    </FlexWidget>
  );
}

// biome-ignore lint/style/useComponentExportOnlyModules: headless widget task, not a screen
function WeeklyWidget({ done, quota }: { done: number | null; quota: number | null }) {
  const filled = done === null || quota === null ? 0 : Math.min(done, quota);
  const rest = done === null || quota === null ? 1 : Math.max(quota - done, 0);
  return (
    <FlexWidget clickAction="OPEN_APP" style={ROOT_STYLE}>
      <TextWidget
        text={done === null || quota === null ? "–/–" : `${done}/${quota}`}
        style={NUMBER_STYLE}
      />
      <FlexWidget
        style={{
          flexDirection: "row",
          width: "match_parent",
          height: 8,
          borderRadius: 4,
          marginTop: 8,
          marginHorizontal: 24,
          backgroundColor: DIM_COLOR,
        }}
      >
        <FlexWidget
          style={{
            flex: filled,
            height: "match_parent",
            borderRadius: 4,
            backgroundColor: FLAME_COLOR,
          }}
        />
        <FlexWidget style={{ flex: rest, height: "match_parent" }} />
      </FlexWidget>
    </FlexWidget>
  );
}

async function renderFlame(renderWidget: WidgetTaskHandlerProps["renderWidget"]) {
  const { current } = await getStreakInfo();
  renderWidget(<FlameWidget streak={current} flameLevel={getFlameLevel(current)} />);
}

async function renderWeekly(renderWidget: WidgetTaskHandlerProps["renderWidget"]) {
  const { done, quota } = await getWeeklyProgress();
  renderWidget(<WeeklyWidget done={done} quota={quota} />);
}

/** Registered once from the custom entry point (index.ts). Handles every widget lifecycle event. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget } = props;
  if (
    widgetAction !== "WIDGET_ADDED" &&
    widgetAction !== "WIDGET_UPDATE" &&
    widgetAction !== "WIDGET_RESIZED"
  ) {
    return;
  }

  try {
    // The headless task can run before the app has ever opened (widget added on a fresh
    // install, or an OS tick after an update ships a schema bump). Nothing else runs
    // migrations on this path — without this line the first query throws and the widget
    // stays on the blank placeholder forever.
    await ensureMigrations();
    if (widgetInfo.widgetName === "Weekly") {
      await renderWeekly(renderWidget);
    } else {
      await renderFlame(renderWidget);
    }
  } catch (e) {
    reportError("widget.task", e);
    renderWidget(
      widgetInfo.widgetName === "Weekly" ? (
        <WeeklyWidget done={null} quota={null} />
      ) : (
        <FlameWidget streak={null} flameLevel={0} />
      ),
    );
  }
}

/**
 * Poke both widgets to redraw now, instead of waiting for the OS's 30-minute
 * `updatePeriodMillis` tick. Call after anything that can move the streak or the weekly count —
 * a saved session, an oath sworn or broken, a cold start. Android-only and best-effort — same
 * non-blocking contract as `rescheduleOathReminder()`.
 */
export async function requestWidgetsUpdate(): Promise<void> {
  if (Platform.OS !== "android") return;
  const [{ current }, weekly] = await Promise.all([getStreakInfo(), getWeeklyProgress()]);
  await Promise.all([
    requestWidgetUpdate({
      widgetName: "Flame",
      renderWidget: () => <FlameWidget streak={current} flameLevel={getFlameLevel(current)} />,
    }),
    requestWidgetUpdate({
      widgetName: "Weekly",
      renderWidget: () => <WeeklyWidget done={weekly.done} quota={weekly.quota} />,
    }),
  ]);
}
