import * as fs from "node:fs";
import * as path from "node:path";
import { REST_HEADER_HEIGHT, sessionArtHeight } from "@/components/session/sessionArt";

/**
 * Two numbers shared by components that cannot measure each other, so what is worth testing is
 * the relationship rather than the constants.
 *
 * `BossTauntOverlay` floats above every session view and anchors its bubble under whatever the
 * screen puts at its top. That is the arena while the set runs and the flame header once it is
 * over, because a rest looks the same whether or not a boss is being fought. Get either wrong and
 * the bubble hangs in mid-air, on one of the two screens only, which is the kind of bug nobody
 * reproduces.
 */
describe("session art geometry", () => {
  // A tall phone, a short phone, and a wide one where the width cap is what bites.
  const SCREENS = [
    { width: 411, height: 916 },
    { width: 360, height: 640 },
    { width: 800, height: 600 },
  ];

  it.each(SCREENS)("the monster outsizes the movement at $width x $height", ({ width, height }) => {
    const boss = sessionArtHeight(width, height, "boss");
    const exercise = sessionArtHeight(width, height, "exercise");

    // Play testing said the boss read too small at the shared size; that is the whole reason the
    // second factor exists, so a change that flattens them is a change to the design.
    if (boss < Math.round(width * 1.1)) {
      expect(boss).toBeGreaterThan(exercise);
    }
  });

  it.each(SCREENS)(
    "never lets the art eat a narrow screen at $width x $height",
    ({ width, height }) => {
      for (const kind of ["exercise", "boss"] as const) {
        expect(sessionArtHeight(width, height, kind)).toBeLessThanOrEqual(Math.round(width * 1.1));
      }
    },
  );

  /**
   * The rest header is a fixed block, not a sum of its children, precisely so the overlay can
   * anchor to it without measuring. That only holds while `RestView` builds it from the constant,
   * and while both of them add `insets.top` the same way: the first version set the box to the
   * constant alone, which made it shorter than its own contents and would have put the timer over
   * the title on a screen with no slack.
   *
   * ponytail: text scan, the same trade `android-permissions.test.ts` makes. A rendered assertion
   * would need a layout pass jest does not run.
   */
  it("the rest header is built from the constant the bubble anchors to", () => {
    const rest = fs.readFileSync(
      path.resolve(__dirname, "..", "components", "session", "RestView.tsx"),
      "utf8",
    );
    const overlay = fs.readFileSync(
      path.resolve(__dirname, "..", "components", "session", "BossTauntOverlay.tsx"),
      "utf8",
    );

    expect(rest).toContain("height={insets.top + REST_HEADER_HEIGHT}");
    expect(overlay).toContain("REST_HEADER_HEIGHT");
    // And the arena stays off the rest screen, which is what makes the two headers comparable.
    expect(rest).not.toContain("BossArena");
    expect(REST_HEADER_HEIGHT).toBeGreaterThan(0);
  });
});
