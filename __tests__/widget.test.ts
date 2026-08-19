import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import * as schema from "../db/schema";
import { clientMock, createTestDb } from "./helpers/testDb";

const { completedQuest, userPreferences } = schema;

const ensureMigrations = jest.fn();
const reportError = jest.fn();

/** What the OS says the device speaks. Swapped per test. */
let deviceLocales: { languageCode: string; languageTag: string }[] = [];

/**
 * The blank-widget bug: the headless task threw on a database whose migrations had never run,
 * the promise rejected with no catch, and the OS left the placeholder up forever. These cases
 * pin the two properties that make that impossible again — the handler always resolves, and it
 * always hands the OS *something* to draw.
 */
describe("src/widget", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
    // The real runner needs expo-sqlite's async client; the test db has already applied the
    // real migrations, so the handler's call is what matters, not the runner.
    jest.doMock("../db/migrate", () => ({ ensureMigrations }));
    jest.doMock("../src/reportError", () => ({ reportError }));
    jest.doMock("react-native-android-widget", () => ({
      FlexWidget: () => null,
      TextWidget: () => null,
      requestWidgetUpdate: jest.fn().mockResolvedValue(undefined),
    }));
    // The real `expo-localization`, so the widget resolves its language through the same
    // `resolveAppLanguage` the app uses instead of a test-local reimplementation of the rule.
    jest.doMock("expo-localization", () => ({ getLocales: () => deviceLocales }));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ensureMigrations.mockResolvedValue(undefined);
    deviceLocales = [{ languageCode: "en", languageTag: "en-US" }];
    t.db.delete(completedQuest).run();
    t.db.delete(userPreferences).run();
  });

  function widget() {
    return require("../src/widget") as typeof import("../src/widget");
  }

  function taskProps(widgetName: "Flame" | "Weekly") {
    const renderWidget = jest.fn();
    const props = {
      widgetAction: "WIDGET_UPDATE",
      widgetInfo: { widgetName, widgetId: 1, width: 110, height: 110 },
      renderWidget,
    } as unknown as WidgetTaskHandlerProps;
    return { props, renderWidget };
  }

  /** The language on the element the handler actually gave the OS to draw. */
  function renderedLang(renderWidget: jest.Mock) {
    const element = renderWidget.mock.calls[0][0] as { props: { lang: string } };
    return element.props.lang;
  }

  test("Flame renders on an empty database instead of rejecting", async () => {
    const { props, renderWidget } = taskProps("Flame");

    await expect(widget().widgetTaskHandler(props)).resolves.toBeUndefined();

    expect(ensureMigrations).toHaveBeenCalled();
    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(reportError).not.toHaveBeenCalled();
  });

  test("Weekly renders on an empty database instead of rejecting", async () => {
    const { props, renderWidget } = taskProps("Weekly");

    await expect(widget().widgetTaskHandler(props)).resolves.toBeUndefined();

    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(reportError).not.toHaveBeenCalled();
  });

  /**
   * The widget used to read the *stored* language and default a `null` to French, while the app
   * read the device. On an English phone a fresh install showed FLAMME / jours next to an English
   * app until the hero opened Settings and tapped Language once (F-Droid MR !45076, finding 4).
   * These assert the resolved language on the element the OS is handed, not that a frame appeared.
   */
  test.each(["Flame", "Weekly"] as const)(
    "%s speaks the device's language when the hero never chose one",
    async (name) => {
      const { props, renderWidget } = taskProps(name);

      await widget().widgetTaskHandler(props);

      expect(renderedLang(renderWidget)).toBe("en");
    },
  );

  test("a stored choice still beats the device", async () => {
    t.db.insert(userPreferences).values({ key: "language", value: "fr" }).run();
    const { props, renderWidget } = taskProps("Flame");

    await widget().widgetTaskHandler(props);

    expect(renderedLang(renderWidget)).toBe("fr");
  });

  /**
   * A launcher that has not filled the widget's options bundle yet reports 0 for both sides —
   * `RNWidgetUtil.getWidgetSizeInDp` reads it with `getInt(key, 0)`. The weekly bar was
   * `size.width - 48` with no floor, so that cell handed Android a negative LayoutParams width,
   * which is neither MATCH_PARENT nor WRAP_CONTENT: the progress bar simply disappeared.
   */
  test("the weekly bar keeps a positive width on a cell the launcher has not measured", () => {
    expect(widget().weeklyBarWidth({ width: 0, height: 0 }, 1)).toBeGreaterThan(0);
    // And a real cell is still driven by the cell, not by the floor.
    expect(widget().weeklyBarWidth({ width: 110, height: 110 }, 1)).toBe(62);
    expect(widget().weeklyBarWidth({ width: 400, height: 200 }, 2)).toBe(280);
  });

  test("a failing migration still resolves and still draws a fallback", async () => {
    ensureMigrations.mockRejectedValueOnce(new Error("database is on fire"));
    const { props, renderWidget } = taskProps("Flame");

    await expect(widget().widgetTaskHandler(props)).resolves.toBeUndefined();

    // The failure is reported, and the OS still gets a frame — never the blank placeholder.
    expect(reportError).toHaveBeenCalledWith("widget.task", expect.any(Error));
    expect(renderWidget).toHaveBeenCalledTimes(1);
    // And it speaks the device's language. The error path hardcoded "fr" long after the happy
    // path was fixed, precisely because this test asserted that a frame appeared and not what
    // was in it.
    expect(renderedLang(renderWidget)).toBe("en");
  });

  test("the fallback follows the device too, not a hardcoded locale", async () => {
    deviceLocales = [{ languageCode: "fr", languageTag: "fr-FR" }];
    ensureMigrations.mockRejectedValueOnce(new Error("database is on fire"));
    const { props, renderWidget } = taskProps("Weekly");

    await widget().widgetTaskHandler(props);

    expect(renderedLang(renderWidget)).toBe("fr");
  });
});
