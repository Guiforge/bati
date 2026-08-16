// The widget task handler is tested thoroughly in widget.test.ts. The line that *registers* it
// was not tested at all — so if `registerWidgetTaskHandler(widgetTaskHandler)` were dropped or
// reordered, every widget test would still pass and both home screen widgets would silently stop
// updating on a real device. index.ts has three statements and no way to fail loudly.
//
// The `mock` prefix on these bindings is load-bearing: jest hoists `jest.mock` factories above
// the file, and only names starting with `mock` may be referenced from inside one.

const mockRegister = jest.fn();
const mockRenderRoot = jest.fn();
/** Import order as the module actually executed it. */
const mockImportOrder: string[] = [];

jest.mock("@expo/metro-runtime", () => {
  mockImportOrder.push("@expo/metro-runtime");
  return {};
});
jest.mock("expo-router/build/qualified-entry", () => ({ App: "App" }));
jest.mock("expo-router/build/renderRootComponent", () => ({
  renderRootComponent: mockRenderRoot,
}));
jest.mock("react-native-android-widget", () => ({ registerWidgetTaskHandler: mockRegister }));
jest.mock("@/src/widget", () => {
  mockImportOrder.push("@/src/widget");
  return { widgetTaskHandler: "the-handler" };
});

describe("index.ts (the app entry point)", () => {
  beforeAll(() => {
    require("../index");
  });

  test("mounts the router root", () => {
    expect(mockRenderRoot).toHaveBeenCalledWith("App");
  });

  test("registers the widget task handler that src/widget.tsx exports", () => {
    expect(mockRegister).toHaveBeenCalledWith("the-handler");
  });

  test("imports the metro runtime before anything that could pull in React", () => {
    // Not decoration: Fast Refresh breaks on web if this stops being the first import, and the
    // symptom is "the dev server stopped reloading", which nobody traces back to an import order.
    expect(mockImportOrder[0]).toBe("@expo/metro-runtime");
  });
});
