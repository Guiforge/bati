import {
  BORDER,
  type CrestSize,
  filetInset,
  filetWidth,
  VIEW_W,
} from "@/components/village/crestGeometry";

// "Calé au pixel en 24": the ink line is one whole pixel wide and starts on a whole pixel, or the
// phone anti-aliases it into a grey smear that reads as a different colour.
describe("crest filet geometry", () => {
  const px = (units: number, size: CrestSize) => units * (size / VIEW_W);

  it("is exactly 1 px wide and starts on pixel 2 at size 24", () => {
    expect(px(filetWidth(24), 24)).toBeCloseTo(1, 10);
    expect(px(BORDER, 24)).toBe(2);
    // Stroked along its centre line: the outer edge is the border's inner edge.
    expect(px(filetInset(24) - filetWidth(24) / 2, 24)).toBe(2);
  });

  it("is 2 px wide from 48 up", () => {
    for (const size of [48, 56, 96] as const) expect(px(filetWidth(size), size)).toBeCloseTo(2, 10);
  });
});
