import { fade, rawColors } from "@/constants/rawColors";

describe("fade", () => {
  it("turns a token into the rgba a gradient needs", () => {
    expect(fade("#0C0D11", 0.92)).toBe("rgba(12, 13, 17, 0.92)");
  });

  it("agrees with the overlays written in the palette", () => {
    expect(fade(rawColors.bgDark, 0.92)).toBe(rawColors.bgOverlay);
    expect(fade(rawColors.bgDark, 0.72)).toBe(rawColors.bgOverlaySoft);
    expect(fade(rawColors.bgDark, 0)).toBe(rawColors.bgDarkClear);
  });
});
