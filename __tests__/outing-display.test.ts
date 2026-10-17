import { DEFAULT_VIEW, parseOutingDisplay, viewOf, withActivity } from "@/constants/outingDisplay";

const mockReportError = jest.fn();
jest.mock("@/src/reportError", () => ({ reportError: (...a: never[]) => mockReportError(...a) }));

describe("parseOutingDisplay", () => {
  beforeEach(() => mockReportError.mockClear());

  test("nothing stored, or a blob that is not JSON, reads as the original and reports", () => {
    expect(parseOutingDisplay(null)).toEqual({});
    expect(mockReportError).not.toHaveBeenCalled();
    expect(parseOutingDisplay("{not json")).toEqual({});
    expect(mockReportError).toHaveBeenCalledWith(
      "preferences.outingDisplay.parse",
      expect.any(SyntaxError),
    );
    expect(parseOutingDisplay("[1]")).toEqual({});
    expect(parseOutingDisplay('"x"')).toEqual({});
  });

  test("an unknown activity, metric or layout falls to the default, field by field", () => {
    const raw = JSON.stringify({
      swim: { big: "rate" },
      run: { big: "speed", small: ["time", "nope", null, "climb"], layout: "huge" },
      ride: { big: "rate", layout: "bigFigures" },
    });
    expect(parseOutingDisplay(raw)).toEqual({
      run: { small: ["time", "climb", null] },
      ride: { big: "rate", layout: "bigFigures" },
    });
  });

  test("a small list shorter than three is padded with the defaults of those places", () => {
    expect(parseOutingDisplay('{"walk":{"small":["time"]}}')).toEqual({
      walk: { small: ["time", "climb", "rate"] },
    });
  });
});

describe("viewOf and withActivity", () => {
  test("viewOf of nothing is the default view, and never aliases it", () => {
    const view = viewOf({}, "walk");
    expect(view).toEqual(DEFAULT_VIEW);
    expect(view.small).not.toBe(DEFAULT_VIEW.small);
  });

  test("a stored field overrides, the rest stays default", () => {
    expect(viewOf({ ride: { big: "rate" } }, "ride")).toEqual({ ...DEFAULT_VIEW, big: "rate" });
    expect(viewOf({ ride: { big: "rate" } }, "walk")).toEqual(DEFAULT_VIEW);
  });

  test("a reset removes the activity, and the last one leaves {} rather than nothing", () => {
    const two = withActivity(withActivity({}, "run", { big: "distance" }), "ride", {
      layout: "bigFigures",
    });
    expect(Object.keys(two)).toEqual(["run", "ride"]);
    expect(withActivity(two, "run", null)).toEqual({ ride: { layout: "bigFigures" } });
    expect(withActivity(withActivity(two, "run", null), "ride", null)).toEqual({});
  });

  test("a choice equal to the original is dropped, and an activity left empty goes", () => {
    const changed = withActivity({}, "walk", { big: "time", layout: "bigFigures" });
    expect(changed).toEqual({ walk: { big: "time", layout: "bigFigures" } });
    expect(withActivity(changed, "walk", { big: "auto" })).toEqual({
      walk: { layout: "bigFigures" },
    });
    expect(withActivity(changed, "walk", { big: "auto", layout: "map" })).toEqual({});
    expect(withActivity({ walk: { big: "time" } }, "walk", { big: "auto" })).toEqual({});
    expect(withActivity({}, "walk", { small: ["auto", "climb", "rate"] })).toEqual({});
  });

  test("patching one field keeps the others of the same activity", () => {
    const first = withActivity({}, "ride", { big: "rate" });
    expect(withActivity(first, "ride", { layout: "bigFigures" })).toEqual({
      ride: { big: "rate", layout: "bigFigures" },
    });
  });
});
