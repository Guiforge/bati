import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// React Native's processTransformOrigin throws "must have exactly 3 values" on an array of
// any other length, in dev only, so jest and the .perf build never see it.
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

/** Values in the array literal whose body starts at `from`; a trailing comma is not a value. */
function countValues(src: string, from: number): number {
  let depth = 1;
  let commas = 0;
  let last = "";
  for (let i = from; depth > 0 && i < src.length; i++) {
    const c = src.charAt(i);
    depth += "([{".includes(c) ? 1 : ")]}".includes(c) ? -1 : 0;
    commas += c === "," && depth === 1 ? 1 : 0;
    last = depth > 0 && /\S/.test(c) ? c : last;
  }
  return commas + (last === "," ? 0 : 1);
}

test("every array transformOrigin in components/village has three values", () => {
  const bad: string[] = [];
  for (const file of sources(join(__dirname, "..", "components", "village"))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/transformOrigin:\s*\[/g)) {
      const n = countValues(src, m.index + m[0].length);
      if (n !== 3) bad.push(`${file}:${src.slice(0, m.index).split("\n").length} has ${n}`);
    }
  }
  expect(bad).toEqual([]);
});

test("the detector counts values, nested calls and trailing commas included", () => {
  expect(countValues("a / 2, b]", 0)).toBe(2);
  expect(countValues("a / 2, b, 0]", 0)).toBe(3);
  expect(countValues("f(a, b), g[1, 2], 0,\n]", 0)).toBe(3);
});
