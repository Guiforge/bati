/**
 * The module's one decision: a build without the native half must fail loudly by name, not as
 * "undefined is not a function" three calls later. Jest has no native modules, so the loader is
 * the thing doubled.
 */
let mockNative: object | null = null;
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative }));

function load() {
  let module: typeof import("@/modules/bati-crypto") | undefined;
  jest.isolateModules(() => {
    module = require("@/modules/bati-crypto");
  });
  if (!module) throw new Error("module did not load");
  return module;
}

test("a build without the native module says so by name", () => {
  mockNative = null;
  expect(() => load().batiCrypto()).toThrow("BatiCrypto native module is not in this build");
});

test("a build with it hands it over as is", () => {
  mockNative = { randomBytes: jest.fn() };
  expect(load().batiCrypto()).toBe(mockNative);
});
