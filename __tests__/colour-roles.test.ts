import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Gold is earned, braise is done, metadata is ash. Four families, one assertion each.
 *
 * ponytail: text scan around an anchor, the trade `color-contrast.test.ts` makes. It reads the
 * `color="$x"` written near a known line; it cannot see a colour computed in a ternary. A
 * rendered assertion would need Tamagui's resolved styles, which jest does not give.
 */
const read = (file: string) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

/** The source from the first line containing `anchor`, `lines` lines long. */
function near(file: string, anchor: string, lines = 8): string {
  const all = read(file).split("\n");
  const at = all.findIndex((l) => l.includes(anchor));
  if (at < 0) throw new Error(`${anchor} not found in ${file}`);
  return all.slice(at, at + lines).join("\n");
}

describe("colour roles", () => {
  it("the Victory XP figure and its trophy are gold", () => {
    const victory = "components/session/VictoryView.tsx";
    expect(near(victory, 'testID={result ? "session-victory-xp"')).toContain(
      'color="$resourceGold"',
    );
    expect(near(victory, 'name={isBossDefeat ? "sword" : "trophy"}', 1)).toContain(
      'color="$resourceGold"',
    );
  });

  it("an oath's progress bar is gold on a gold track", () => {
    const bars = read("app/oath.tsx").match(/<ProgressBar[^>]*>/g) ?? [];
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(bar).toContain('color="$resourceGold"');
      expect(bar).toContain('trackColor="$gold800"');
    }
  });

  it("a boss's weakness is braise", () => {
    expect(
      near(
        "components/session/ActiveExerciseView.tsx",
        "bossFight?.weaknessMuscle === targetMuscle",
        2,
      ),
    ).toContain('"$primaryText" : "$textSecondary"');
    expect(near("components/session/BossArena.tsx", "{!!weaknessMuscle && (", 6)).toContain(
      'color="$primaryText"',
    );
  });

  it("the exercise list's metadata captions are ash", () => {
    const caption = near("app/exercises/index.tsx", "function LeadsToCaption", 12);
    expect(caption).not.toContain("$primaryText");
    expect(caption).toContain('color="$muted"');
    expect(read("components/exercises/MineCaption.tsx")).not.toContain("$primaryText");
  });
});
