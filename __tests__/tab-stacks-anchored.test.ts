// A detail opened from outside its own tab (a cold bati:// link, a sync's returnTo, a quest's
// "again" door) must have the tab's index under it, or back falls through to Home and the tab
// stays stuck on the detail. Each tab stack carries the anchor; this holds all of them.
jest.mock("expo-router", () => ({ Stack: () => null }));
jest.mock("tamagui", () => ({ Theme: () => null }));

test.each([
  ["journal", () => require("@/app/(tabs)/journal/_layout")],
  ["quests", () => require("@/app/(tabs)/quests/_layout")],
  ["adventures", () => require("@/app/(tabs)/adventures/_layout")],
])("the %s stack is anchored on its index", (_name, load) => {
  expect(load().unstable_settings).toEqual({ initialRouteName: "index" });
});
