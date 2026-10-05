import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "@babel/parser";

/**
 * Rule 1 of the 2026-10 refresh: the states and the gold are light fills, so what is written on
 * them is ink.
 *
 * Covers: one JSX opening element (self-closing included) whose `bg` / `backgroundColor` expression
 * holds a literal light-fill token anywhere (ternaries included) and whose own `color` expression
 * holds a literal light-label token.
 *
 * Does not cover: a label on a child `<Text>`, or a fill or label passed through a variable, a
 * record or a prop (the quest screen's LEVEL_CHIP_COLORS is one). `FILL_LABELS` in
 * color-contrast.test.ts is the floor for those pairs.
 */
const LIGHT_FILLS = ["$success", "$error", "$warning", "$resourceGold"];
const LIGHT_LABELS = ["$text", "$white", "$onPrimary", "$textSecondary"];

type Node = { type: string; [key: string]: unknown };

/** Every AST node under `root`, `root` included. */
function* nodes(root: unknown): Generator<Node> {
  if (Array.isArray(root)) {
    for (const child of root) yield* nodes(child);
  } else if (root && typeof root === "object") {
    yield root as Node;
    for (const [key, child] of Object.entries(root)) {
      if (key !== "loc" && key !== "extra") yield* nodes(child);
    }
  }
}

/** First string literal of `wanted` anywhere under `node`, ternaries included. */
function tokenIn(node: unknown, wanted: string[]): string | undefined {
  for (const n of nodes(node)) {
    if (n.type === "StringLiteral" && wanted.includes(n.value as string)) return n.value as string;
  }
  return undefined;
}

/** "$label on $fill" for each offending JSX element in `source`. */
function lightLabelsOnLightFills(source: string): string[] {
  const ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  const out: string[] = [];
  for (const n of nodes(ast.program)) {
    if (n.type !== "JSXOpeningElement") continue;
    const attr = (names: string[]) =>
      (n.attributes as Node[]).find(
        (a) => a.type === "JSXAttribute" && names.includes((a.name as Node).name as string),
      )?.value;
    const fill = tokenIn(attr(["bg", "backgroundColor"]), LIGHT_FILLS);
    const label = tokenIn(attr(["color"]), LIGHT_LABELS);
    if (fill && label) out.push(`${label} on ${fill}`);
  }
  return out;
}

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
  };
  for (const d of ["app", "components", "src", "constants"]) walk(path.resolve(__dirname, "..", d));
  return out;
}

describe("labels on light fills", () => {
  it("the matcher flags what it claims to (never vacuous)", () => {
    expect(
      lightLabelsOnLightFills(
        `const a = <Box onPress={() => go()} bg="$success" color="$text" />;`,
      ),
    ).toEqual(["$text on $success"]);
    expect(
      lightLabelsOnLightFills(
        `const a = <Box bg={hard ? "$error" : "$surface"} color="$white">x</Box>;`,
      ),
    ).toEqual(["$white on $error"]);
    expect(lightLabelsOnLightFills(`const a = <Box bg="$success" color="$bgDark" />;`)).toEqual([]);
  });

  it("no element puts a light label on a state or gold fill", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles().filter((f) => f.endsWith(".tsx"))) {
      for (const hit of lightLabelsOnLightFills(fs.readFileSync(file, "utf8"))) {
        offenders.push(`${path.relative(process.cwd(), file)}: ${hit}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the magenta is gone", () => {
    const left = sourceFiles().filter((f) => /\$secondary\b/.test(fs.readFileSync(f, "utf8")));
    expect(left.map((f) => path.relative(process.cwd(), f))).toEqual([]);
  });
});
