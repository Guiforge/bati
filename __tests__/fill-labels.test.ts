import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "@babel/parser";
import config from "@/tamagui.config";

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
const LIGHT_FILLS = ["success", "error", "warning", "resourceGold"];
const LIGHT_LABELS = ["text", "white", "onPrimary", "textSecondary"];
// The braise takes `onPrimary` alone: bone on it is 4.10:1, under AA for body text.
const PRIMARY_BANNED = ["text", "textSecondary", "white"];

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

/**
 * First token of `wanted` in a string literal anywhere under `node`, ternaries included. A literal
 * is a Tamagui 3 value program, so each of its clauses counts: `"surface press:warning"` holds
 * both `surface` and `warning`.
 */
function tokenIn(node: unknown, wanted: string[]): string | undefined {
  for (const n of nodes(node)) {
    if (n.type !== "StringLiteral") continue;
    for (const word of (n.value as string).split(/\s+/)) {
      const token = word.replace(/^[a-z-]+:/, "");
      if (wanted.includes(token)) return token;
    }
  }
  return undefined;
}

/** "label on fill" for each offending JSX element in `source`. */
function lightLabelsOnLightFills(source: string): string[] {
  const ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  const out: string[] = [];
  for (const n of nodes(ast.program)) {
    if (n.type !== "JSXOpeningElement") continue;
    const attr = (names: string[]) =>
      (n.attributes as Node[]).find(
        (a) => a.type === "JSXAttribute" && names.includes((a.name as Node).name as string),
      )?.value;
    const fillAttr = attr(["bg", "backgroundColor"]);
    const fill = tokenIn(fillAttr, LIGHT_FILLS);
    const label = tokenIn(attr(["color"]), LIGHT_LABELS);
    if (fill && label) out.push(`${label} on ${fill}`);
    const primaryLabel = tokenIn(attr(["color"]), PRIMARY_BANNED);
    if (!fill && primaryLabel && tokenIn(fillAttr, ["primary"])) {
      out.push(`${primaryLabel} on primary`);
    }
  }
  return out;
}

/**
 * Whether `source` names `secondary` as a colour: in a colour attribute or property (`color`,
 * `bg`, `borderColor`, ...), or anywhere in a table whose name says it holds colours
 * (`DIFFICULTY_COLORS`, `..._TOKENS`), the shape a `.ts` constant map takes.
 */
function magentaIn(source: string, jsx = true): boolean {
  const plugins: ("jsx" | "typescript")[] = jsx ? ["jsx", "typescript"] : ["typescript"];
  const ast = parse(source, { sourceType: "module", plugins });
  const colourKey = /^bg$|color$|Color$|colour$|Colour$/;
  for (const n of nodes(ast.program)) {
    const key =
      n.type === "JSXAttribute"
        ? (n.name as Node).name
        : n.type === "ObjectProperty"
          ? (n.key as Node).name
          : undefined;
    if (typeof key === "string" && colourKey.test(key) && tokenIn(n.value, ["secondary"]))
      return true;
    const table = n.type === "VariableDeclarator" ? (n.id as Node).name : undefined;
    if (
      typeof table === "string" &&
      /colou?rs?\b|COLOU?RS?|TOKENS/.test(table) &&
      tokenIn(n.init, ["secondary"])
    )
      return true;
  }
  return false;
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
      lightLabelsOnLightFills(`const a = <Box onPress={() => go()} bg="success" color="text" />;`),
    ).toEqual(["text on success"]);
    expect(
      lightLabelsOnLightFills(
        `const a = <Box bg={hard ? "error" : "surface"} color="white">x</Box>;`,
      ),
    ).toEqual(["white on error"]);
    // A clause of a value program counts, and so does a ternary the codemod wrapped in a template.
    expect(
      lightLabelsOnLightFills(
        `const a = <Box bg="surface press:warning" color={\`\${a ? "bgDark" : "white"}\`} />;`,
      ),
    ).toEqual(["white on warning"]);
    expect(lightLabelsOnLightFills(`const a = <Box bg="success" color="bgDark" />;`)).toEqual([]);
    // HomeStage's old CTA.
    expect(
      lightLabelsOnLightFills(`const a = <Button bg="primary" color="text" fontSize={17} />;`),
    ).toEqual(["text on primary"]);
    expect(lightLabelsOnLightFills(`const a = <Button bg="primary" color="onPrimary" />;`)).toEqual(
      [],
    );
  });

  it("no element puts a light label on a state or gold fill, or bone on the braise", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles().filter((f) => f.endsWith(".tsx"))) {
      for (const hit of lightLabelsOnLightFills(fs.readFileSync(file, "utf8"))) {
        offenders.push(`${path.relative(process.cwd(), file)}: ${hit}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the magenta is gone", () => {
    // Bare, `secondary` is also a button variant and a road class: only a colour attribute counts,
    // and the theme must not carry it either.
    expect(Object.keys(config.themes.dark)).not.toContain("secondary");
    expect(magentaIn(`const a = <Box bg="surface press:secondary" />;`)).toBe(true);
    expect(magentaIn(`const a = <NButton variant="secondary" />;`)).toBe(false);
    expect(magentaIn(`export const DIFFICULTY_COLORS = { hard: "secondary" };`, false)).toBe(true);
    expect(magentaIn(`const look = { bg: "secondary" };`, false)).toBe(true);
    expect(magentaIn(`const ROADS = ["primary", "secondary"];`, false)).toBe(false);
    const left = sourceFiles().filter((f) =>
      magentaIn(fs.readFileSync(f, "utf8"), f.endsWith(".tsx")),
    );
    expect(left.map((f) => path.relative(process.cwd(), f))).toEqual([]);
  });
});
