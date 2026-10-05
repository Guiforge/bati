import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Rule 1 of the 2026-10 refresh: the states and the gold are light fills, so what is written on
 * them is ink. A JSX element that paints one of those fills and names a light label in the same
 * opening tag is the bug this catches (the quest screen's "Hard" chip shipped white on magenta,
 * and moved to the error fill with it).
 *
 * ponytail: per-tag text scan. It misses a label set on a child `<Text>`; the contrast test's
 * FILL_LABELS pairs are the floor for those. A rendered assertion needs the layout pass jest
 * does not run.
 */
const LIGHT_FILLS = ["success", "error", "warning", "resourceGold"];
const LIGHT_LABELS = ["text", "white", "onPrimary", "textSecondary"];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx$/.test(entry.name)) out.push(full);
    }
  };
  for (const d of ["app", "components"]) walk(path.resolve(__dirname, "..", d));
  return out;
}

describe("labels on light fills", () => {
  it("no opening tag puts a light label on a state or gold fill", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const source = fs.readFileSync(file, "utf8");
      for (const tag of source.matchAll(/<[A-Z][\w.]*\s[^<>]*?>/gs)) {
        const body = tag[0];
        const fill = body.match(/\b(?:bg|backgroundColor)="\$(\w+)"/)?.[1];
        const label = body.match(/\bcolor="\$(\w+)"/)?.[1];
        if (fill && label && LIGHT_FILLS.includes(fill) && LIGHT_LABELS.includes(label)) {
          offenders.push(`${path.relative(process.cwd(), file)}: $${label} on $${fill}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the magenta is gone", () => {
    const left = sourceFiles().filter((f) => /\$secondary\b/.test(fs.readFileSync(f, "utf8")));
    expect(left.map((f) => path.relative(process.cwd(), f))).toEqual([]);
  });
});
