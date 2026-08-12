import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import * as schema from "../db/schema";
import { clientMock, createTestDb } from "./helpers/testDb";

const { completedQuest, userPreferences } = schema;

const ensureMigrations = jest.fn();
const reportError = jest.fn();

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
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ensureMigrations.mockResolvedValue(undefined);
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

  test("a failing migration still resolves and still draws a fallback", async () => {
    ensureMigrations.mockRejectedValueOnce(new Error("database is on fire"));
    const { props, renderWidget } = taskProps("Flame");

    await expect(widget().widgetTaskHandler(props)).resolves.toBeUndefined();

    // The failure is reported, and the OS still gets a frame — never the blank placeholder.
    expect(reportError).toHaveBeenCalledWith("widget.task", expect.any(Error));
    expect(renderWidget).toHaveBeenCalledTimes(1);
  });
});
