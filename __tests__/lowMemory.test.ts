import { isLowMemory } from "@/src/lowMemory";

describe("isLowMemory", () => {
  test("the coded error the module raises", () => {
    expect(isLowMemory(Object.assign(new Error("Not enough memory"), { code: "LOW_MEMORY" }))).toBe(
      true,
    );
  });

  test("the word in a message, which is all an older module gave", () => {
    expect(
      isLowMemory(
        new Error(
          "Call to function 'BatiCrypto.wrapSlot' has been rejected.\n→ Caused by: LOW_MEMORY",
        ),
      ),
    ).toBe(true);
  });

  test("any other failure is not it", () => {
    expect(isLowMemory(new Error("Wrong key"))).toBe(false);
    expect(isLowMemory(Object.assign(new Error("x"), { code: "ERR_UNEXPECTED" }))).toBe(false);
    expect(isLowMemory(null)).toBe(false);
    expect(isLowMemory(undefined)).toBe(false);
  });
});
