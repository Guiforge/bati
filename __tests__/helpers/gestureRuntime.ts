import "react-native-gesture-handler/jestSetup";

// Under jest, RNGH asks react-native-worklets for its UI runtime in a microtask, which the worklets
// mock refuses; an empty holder is enough. Every suite that renders VillageScene imports this first.
jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
