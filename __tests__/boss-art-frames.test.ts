import { spawnSync } from "node:child_process";

/**
 * Bosses are painted on a dark arena and the art is shown edge to edge. A white margin baked into
 * the webp (seven of them were, up to 40 px) shows as a bright band across the prep screen and
 * bars down both sides of the arena. The decoding is Pillow's, in a script, because nothing in
 * node_modules reads webp.
 */
describe("boss art", () => {
  it("has no white frame on any edge", () => {
    const run = spawnSync("python3", ["scripts/check-boss-frames.py"], { encoding: "utf8" });
    // ponytail: skipped on a machine without python3 + Pillow. Never in CI: ci.yml and
    // release.yml install python3-pil, and a CI run that cannot decode the art fails here.
    if (run.error || run.status === 2) {
      expect(process.env.CI).toBeFalsy();
      return;
    }
    expect(run.stderr).toBe("");
    expect(run.stdout.trim().split("\n").filter(Boolean)).toEqual([]);
  });
});
