import { villageHeroSlot } from "@/components/village/villageArt";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";

/**
 * The painting's slot, on the windows a phone never produces.
 *
 * The rule it replaces was `height < 700`, which reads as "a short screen gets a band" and only
 * means that while `width < height`. On an unfolded foldable, 700x841 dp, it meant the opposite:
 * no band, a 700 dp square painting on an 841 dp screen, and the tier card sliced in half by the
 * tab bar. Nothing failed, nothing was covered, and no test could have seen it because the only
 * two shapes ever tried were both phones.
 *
 * So the shapes are the test. `VillageScene` passes the *column* width rather than the window's,
 * which is what keeps a tablet showing the whole painting instead of cropping to a band it does
 * not need.
 */
describe("village art geometry", () => {
  const column = (width: number) => Math.min(width, CONTENT_MAX_WIDTH);

  const WINDOWS = [
    { name: "small phone", width: 360, height: 640, band: true },
    { name: "phone", width: 411, height: 914, band: false },
    { name: "tall phone", width: 393, height: 852, band: false },
    { name: "unfolded foldable", width: 700, height: 841, band: true },
    { name: "tablet portrait", width: 800, height: 1280, band: false },
    { name: "tablet landscape", width: 1280, height: 800, band: true },
  ];

  it.each(WINDOWS)("$name keeps the painting inside the fold", ({ width, height }) => {
    const { heroHeight } = villageHeroSlot(column(width), height);

    // The tier block starts under the painting. Past half the fold there is nothing left for it,
    // which is exactly what the foldable did: 700 of 841.
    expect(heroHeight).toBeLessThanOrEqual(Math.round(height * 0.5));
  });

  it.each(WINDOWS)("$name never draws wider than the column", ({ width, height }) => {
    const { heroHeight } = villageHeroSlot(column(width), height);

    // The art is square and `cover` crops the rest, so a slot taller than the column is a slot
    // showing less of the painting than it could. The band is deliberate; overflow is not.
    expect(heroHeight).toBeLessThanOrEqual(column(width));
  });

  it.each(WINDOWS)("$name cuts to a band only when it has to: $band", ({ width, height, band }) => {
    const { heroHeight, paintingTop } = villageHeroSlot(column(width), height);

    expect(heroHeight < column(width)).toBe(band);
    // A band crops from the sky rather than the roofline, so it is shifted up; a whole painting
    // sits where it is.
    expect(paintingTop < 0).toBe(band);
  });

  /**
   * The two phone shapes this was originally tuned on, to the dp. 0.62 of the width gave 223 on
   * the small one; 0.35 of the height gives 224. A rule that fixes the foldable by moving the
   * phones is not the fix.
   */
  it("leaves the phones where they were", () => {
    expect(villageHeroSlot(360, 640).heroHeight).toBe(224);
    expect(villageHeroSlot(411, 914).heroHeight).toBe(411);
    expect(villageHeroSlot(393, 852).heroHeight).toBe(393);
  });
});
