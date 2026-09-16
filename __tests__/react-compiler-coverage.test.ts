/**
 * @jest-environment node
 */
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

// The React Compiler gives up on a component in silence. A release build runs it with
// `panicThreshold: "NONE"` (babel-preset-expo), so a construct it cannot lower (a `try ...
// finally`, a `?.` inside a `try`, a computed key in a destructuring, a `.value =` write on a
// shared value) leaves the *whole* component unmemoized, and nothing says so: no warning, no
// failed build. Fifteen screens and hooks were in that state at once (September 2026 perf audit),
// including Home, the quest details, the Village and the victory screen, while their comments
// still said "no manual memo, the compiler does it".
//
// This is a ratchet: every file under app/, components/ and hooks/ must compile. A deliberate
// bail-out goes in ALLOWED with the reason, and the entry must still be needed (a stale entry
// fails too, so the list only shrinks).
const ALLOWED: Record<string, string> = {
  // `++toastId` on a module-level counter. The provider is memoized by hand and renders once.
  "components/common/Toast.tsx": "UpdateExpression on a module global, memoized by hand",
};

const ROOT = path.resolve(__dirname, "..");

// Resolved from babel-preset-expo, so this checks the compiler and the Babel the build runs.
const fromPreset = createRequire(require.resolve("babel-preset-expo"));
const { transformSync } = fromPreset("@babel/core") as typeof import("@babel/core");
const reactCompiler: unknown = fromPreset("babel-plugin-react-compiler");

/** The logger's events, as far as this reads them. */
type LoggerEvent = {
  kind: string;
  fnLoc?: { start: { line: number } } | null;
  detail?: { reason?: string };
  data?: string;
};

const DIRS = ["app", "components", "hooks"];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(rel);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [rel] : [];
  });
}

function compileErrors(file: string): string[] {
  const errors: string[] = [];
  const filename = path.join(ROOT, file);
  transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ["typescript", "jsx"] },
    plugins: [
      [
        reactCompiler,
        {
          // What babel-preset-expo passes in a release build.
          target: "19",
          panicThreshold: "none",
          logger: {
            logEvent(_file: string | null, event: LoggerEvent) {
              if (event.kind !== "CompileError" && event.kind !== "PipelineError") return;
              const line = event.fnLoc?.start.line ?? "?";
              errors.push(`fn at L${line}: ${event.detail?.reason ?? event.data ?? "unknown"}`);
            },
          },
        },
      ],
    ],
  });
  return errors;
}

describe("React Compiler coverage", () => {
  const failures = new Map<string, string[]>();
  for (const dir of DIRS) {
    for (const file of sourceFiles(dir)) {
      const errors = compileErrors(file);
      if (errors.length > 0) failures.set(file, errors);
    }
  }

  it("compiles every component and hook, except the listed ones", () => {
    const unexpected = [...failures].filter(([file]) => !(file in ALLOWED));
    expect(Object.fromEntries(unexpected)).toEqual({});
  });

  it("keeps no stale exception", () => {
    expect(Object.keys(ALLOWED).filter((file) => !failures.has(file))).toEqual([]);
  });
});
