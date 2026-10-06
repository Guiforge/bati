import { batiSave } from "@/modules/bati-save";

// The JS half names the missing build instead of calling undefined. jest is that situation, and so
// is a build made before the module existed.
let mockNative: object | null = null;
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative }));

test("says which module is missing rather than failing on an undefined call", () => {
  mockNative = null;

  expect(() => batiSave()).toThrow("BatiSave native module is not in this build");
});

test("hands back the module it found", () => {
  mockNative = { pickTarget: jest.fn(), writeTo: jest.fn(), discard: jest.fn() };

  expect(batiSave()).toBe(mockNative);
});
