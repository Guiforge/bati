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
  test("the unit under the number agrees with it, in each language's own plural rule", () => {
    const { widgetUnit } = widget();
    // French counts 0 and 1 as singular, English only 1.
    expect(widgetUnit("fr", "days", 0)).toBe("jour");
    expect(widgetUnit("fr", "days", 1)).toBe("jour");
    expect(widgetUnit("fr", "days", 2)).toBe("jours");
    expect(widgetUnit("en", "days", 0)).toBe("days");
    expect(widgetUnit("en", "days", 1)).toBe("day");
    expect(widgetUnit("de", "days", 1)).toBe("Tag");
    expect(widgetUnit("es", "days", 1)).toBe("día");
    expect(widgetUnit("fr", "sessions", 1)).toBe("séance");
    expect(widgetUnit("en", "sessions", 1)).toBe("session");
    expect(widgetUnit("de", "sessions", 1)).toBe("Einheit");
    expect(widgetUnit("es", "sessions", 1)).toBe("sesión");
    // No reading (the error fallback) keeps the plural.
    expect(widgetUnit("fr", "days", null)).toBe("jours");
  });

  // "1/3" reads as "one of three sessions": the unit is the quota's, not the count's.
  test("the weekly unit agrees with the quota, so 1/3 is never '1/3 session'", async () => {
    const { props, renderWidget } = taskProps("Weekly");
    await widget().widgetTaskHandler(props);
    const element = renderWidget.mock.calls[0][0] as {
      type: (p: object) => unknown;
      props: object;
    };
    const texts: string[] = [];
    const walk = (node: unknown) => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object" && "props" in node) {
        const p = (node as { props: { text?: string; children?: unknown } }).props;
        if (p.text) texts.push(p.text);
        walk(p.children);
      }
    };
    walk(element.type({ ...element.props, done: 1, quota: 3, lang: "en" }));
    expect(texts).toContain("sessions");
    texts.length = 0;
    walk(element.type({ ...element.props, done: 0, quota: 1, lang: "en" }));
    expect(texts).toContain("session");
  });

  // Hermes ships Intl.Collator, DateTimeFormat and NumberFormat, and no PluralRules: a call to it
  // throws in the headless task and the widget stays a placeholder.
  test("the unit agrees without Intl.PluralRules, which Hermes does not have", () => {
    const { widgetUnit } = widget();
    const real = Intl.PluralRules;
    Reflect.deleteProperty(Intl, "PluralRules");
    try {
      expect(widgetUnit("fr", "days", 0)).toBe("jour");
      expect(widgetUnit("en", "days", 0)).toBe("days");
      expect(widgetUnit("de", "sessions", 1)).toBe("Einheit");
    } finally {
      Object.defineProperty(Intl, "PluralRules", {
        value: real,
        configurable: true,
        writable: true,
      });
    }
  });
});
