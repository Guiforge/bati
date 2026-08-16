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
import { preferences } from "@/db/preferences";
import { type FlameLevel, getFlameLevel, getStreakInfo, getWeeklyProgress } from "@/db/streaks";
import { getDevicePreferredAppLanguage, resolveAppLanguage } from "@/src/i18n/deviceLanguage";
import { reportError } from "./reportError";

// These used to be literals, because importing tamagui.config into a headless task drags in
// font loading and platform branches. constants/rawColors.ts is a plain object with type-only
// imports, so it costs nothing at runtime and the widget shares the app's palette for real.
const FLAME_COLOR = rawColors.resourceFire;
const GOLD_COLOR = rawColors.resourceGold;
const DIM_COLOR = rawColors.muted;
const TEXT_COLOR = rawColors.text;
const SUBTLE_COLOR = rawColors.textSecondary;

// Same frame the app draws around its screens: a surface fading into the void, held by the
// hairline border — not a flat dark slab.
const ROOT_STYLE = {
  height: "match_parent",
  width: "match_parent",
  alignItems: "center",
  justifyContent: "center",
  backgroundGradient: {
    from: rawColors.surface2,
    to: rawColors.bgDark,
    orientation: "TOP_BOTTOM",
  },
  borderWidth: 1,
  borderColor: rawColors.borderStrong,
  borderRadius: 16,
} as const;

/**
 * The launcher decides the cell, not us: a 2×2 grid hands ~110dp, while Bliss on /e/OS gives
 * its widget panel the full screen width and a tall cell — fixed sizes drown in one and would
 * overflow the other. Everything below scales from the cell's short side instead.
 */
type CellSize = { width: number; height: number };

function scaleFor(size: CellSize): number {
  const ref = Math.min(size.width, size.height);
  return Math.min(Math.max(ref / 110, 1), 2.4);
}

const titleStyle = (k: number) =>
  ({ fontSize: 11 * k, letterSpacing: 2, color: SUBTLE_COLOR }) as const;
const unitStyle = (k: number) => ({ fontSize: 11 * k, color: SUBTLE_COLOR }) as const;
const numberStyle = (k: number) =>
  ({ fontSize: 26 * k, fontWeight: "700", color: TEXT_COLOR, marginTop: 2 * k }) as const;

// ponytail: two labels per widget, hardcoded next to their one consumer instead of wired
// through i18next (whose init drags the whole app's locale files into the headless task).
// Ceiling: a third language, or these strings appearing anywhere else — move them to locales/.
const STRINGS = {
  fr: { flame: "FLAMME", days: "jours", week: "SEMAINE", sessions: "séances" },
  en: { flame: "FLAME", days: "days", week: "WEEK", sessions: "sessions" },
} as const;
type Lang = keyof typeof STRINGS;

/** The app's own stored language, resolved by the same rule the app itself uses. */
async function getLang(): Promise<Lang> {
  return resolveAppLanguage(await preferences.getLanguage());
}

// A `null` value is the error fallback: the branded surface with an em dash beats the blank
// rn_widget placeholder the OS shows when the task handler's promise rejects, and the next
// update tick self-heals.

// Drawn by a headless Android task, never mounted in the React tree, so Fast Refresh has
// nothing to refresh here — the render sites below are the only consumers.
// biome-ignore lint/style/useComponentExportOnlyModules: headless widget task, not a screen
function FlameWidget({
  streak,
  flameLevel,
  lang,
  size,
}: {
  streak: number | null;
  flameLevel: FlameLevel;
  lang: Lang;
  size: CellSize;
}) {
  const s = STRINGS[lang];
  const k = scaleFor(size);
  return (
    <FlexWidget clickAction="OPEN_APP" style={ROOT_STYLE}>
      <TextWidget text={s.flame} style={titleStyle(k)} />
      <TextWidget text={`🔥 ${streak === null ? "–" : streak}`} style={numberStyle(k)} />
      <TextWidget text={s.days} style={unitStyle(k)} />
      <FlexWidget style={{ flexDirection: "row", flexGap: 4 * k, marginTop: 8 * k }}>
        {([0, 1, 2, 3, 4] as const).map((i) => (
          <FlexWidget
            key={i}
            style={{
              width: 8 * k,
              height: 8 * k,
              borderRadius: 4 * k,
              backgroundColor: i < flameLevel ? FLAME_COLOR : DIM_COLOR,
            }}
          />
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

// biome-ignore lint/style/useComponentExportOnlyModules: headless widget task, not a screen
function WeeklyWidget({
  done,
  quota,
  lang,
  size,
}: {
  done: number | null;
  quota: number | null;
  lang: Lang;
  size: CellSize;
}) {
  const s = STRINGS[lang];
  const k = scaleFor(size);
  const filled = done === null || quota === null ? 0 : Math.min(done, quota);
  const rest = done === null || quota === null ? 1 : Math.max(quota - done, 0);
  // The sworn quota reached is the week's small victory — it pays out in gold.
  const doneColor = filled > 0 && rest === 0 ? GOLD_COLOR : FLAME_COLOR;
  // A bar spanning a full-width panel cell reads as a divider, not a gauge — cap it.
  const barWidth = Math.round(Math.min(size.width - 48, 140 * k));
  return (
    <FlexWidget clickAction="OPEN_APP" style={ROOT_STYLE}>
      <TextWidget text={s.week} style={titleStyle(k)} />
      <TextWidget
        text={done === null || quota === null ? "–/–" : `⚔️ ${done}/${quota}`}
        style={numberStyle(k)}
      />
      <TextWidget text={s.sessions} style={unitStyle(k)} />
      <FlexWidget
        style={{
          flexDirection: "row",
          width: barWidth,
          height: 8 * k,
          borderRadius: 4 * k,
          marginTop: 8 * k,
          backgroundColor: DIM_COLOR,
        }}
      >
        <FlexWidget
          style={{
            flex: filled,
            height: "match_parent",
            borderRadius: 4 * k,
            backgroundColor: doneColor,
          }}
        />
        <FlexWidget style={{ flex: rest, height: "match_parent" }} />
      </FlexWidget>
    </FlexWidget>
  );
}

async function renderFlame(renderWidget: WidgetTaskHandlerProps["renderWidget"], size: CellSize) {
  const [{ current }, lang] = await Promise.all([getStreakInfo(), getLang()]);
  renderWidget(
    <FlameWidget streak={current} flameLevel={getFlameLevel(current)} lang={lang} size={size} />,
  );
}

async function renderWeekly(renderWidget: WidgetTaskHandlerProps["renderWidget"], size: CellSize) {
  const [{ done, quota }, lang] = await Promise.all([getWeeklyProgress(), getLang()]);
  renderWidget(<WeeklyWidget done={done} quota={quota} lang={lang} size={size} />);
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
      await renderWeekly(renderWidget, widgetInfo);
    } else {
      await renderFlame(renderWidget, widgetInfo);
    }
  } catch (e) {
    reportError("widget.task", e);
    // The database is broken enough that the *stored* language is unreachable — but the device's
    // is not: `getDevicePreferredAppLanguage()` reads expo-localization, not SQLite. This used to
    // hardcode "fr" on that reasoning, which drew FLAMME on an English phone every time the widget
    // errored. Same rule as the happy path, minus the half that needs the DB.
    const lang = getDevicePreferredAppLanguage();
    renderWidget(
      widgetInfo.widgetName === "Weekly" ? (
        <WeeklyWidget done={null} quota={null} lang={lang} size={widgetInfo} />
      ) : (
        <FlameWidget streak={null} flameLevel={0} lang={lang} size={widgetInfo} />
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
  const [{ current }, weekly, lang] = await Promise.all([
    getStreakInfo(),
    getWeeklyProgress(),
    getLang(),
  ]);
  await Promise.all([
    requestWidgetUpdate({
      widgetName: "Flame",
      renderWidget: (info) => (
        <FlameWidget streak={current} flameLevel={getFlameLevel(current)} lang={lang} size={info} />
      ),
    }),
    requestWidgetUpdate({
      widgetName: "Weekly",
      renderWidget: (info) => (
        <WeeklyWidget done={weekly.done} quota={weekly.quota} lang={lang} size={info} />
      ),
    }),
  ]);
}
