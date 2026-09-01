import * as fs from "node:fs";
import * as path from "node:path";
import { bossArtKind, sessionArtHeight } from "@/components/session/sessionArt";

/**
 * The arena's height is shared by two components that cannot measure each other: `BossArena`
 * draws it, `BossTauntOverlay` anchors its bubble to the bottom of it. This module is the one
 * answer both read, so what is worth testing is the *relationship*, not the constants.
 *
 * The bug behind `boss_rest`: during a rest the monster kept 46% of the screen while the timer
 * became the subject, the rest column overflowed, and the set-review card was cut in half at the
 * fold with the scroll indicator switched off. A resting boss must be shorter than a fighting one
 * or the fix is a comment.
 */
describe("sessionArtHeight", () => {
  // A tall phone, a short phone, and a wide one where the width cap is what bites.
  const SCREENS = [
    { width: 411, height: 916 },
    { width: 360, height: 640 },
    { width: 800, height: 600 },
  ];

  it.each(SCREENS)(
    "a resting boss gives the screen back at $width x $height",
    ({ width, height }) => {
      const fighting = sessionArtHeight(width, height, "boss");
      const resting = sessionArtHeight(width, height, "boss_rest");

      expect(resting).toBeLessThanOrEqual(fighting);
      // On any screen the width cap does not already flatten, the gap is what buys the rest column
      // its overflow back, so it has to be worth having.
      if (fighting < Math.round(width * 1.1)) {
        expect(fighting - resting).toBeGreaterThan(height * 0.1);
      }
    },
  );

  it.each(SCREENS)(
    "never lets the art eat a narrow screen at $width x $height",
    ({ width, height }) => {
      for (const kind of ["exercise", "boss", "boss_rest"] as const) {
        expect(sessionArtHeight(width, height, kind)).toBeLessThanOrEqual(Math.round(width * 1.1));
      }
    },
  );

  it("names the slot from the only thing that decides it", () => {
    expect(bossArtKind(true)).toBe("boss_rest");
    expect(bossArtKind(false)).toBe("boss");
  });

  /**
   * The anchor bug this shape exists to prevent.
   *
   * `BossArena` and `BossTauntOverlay` decide the slot from different inputs, a prop and the store's
   * status, and must land on the same one. Comparing the two function calls would compare an
   * expression to itself and prove nothing, so this reads the source: neither may name a slot
   * itself. Inline a ternary at one of them and the bubble hangs in mid-air over the timer, during
   * rests only, which is the kind of bug nobody reproduces.
   *
   * ponytail: text scan, the same trade `android-permissions.test.ts` makes. Fine while the
   * mapping is one exported function; if the slot ever depends on more than resting, this has to
   * become a real assertion on rendered output.
   */
  it.each(["BossArena.tsx", "BossTauntOverlay.tsx"])(
    "%s asks for the slot, never names one",
    (file) => {
      const source = fs.readFileSync(
        path.resolve(__dirname, "..", "components", "session", file),
        "utf8",
      );

      expect(source).toContain("bossArtKind(");
      expect(source).not.toMatch(/"boss_rest"/);
      expect(source).not.toMatch(/sessionArtHeight\([^)]*"boss"/);
    },
  );
});
