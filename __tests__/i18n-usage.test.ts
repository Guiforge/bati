import fs from "node:fs";
import path from "node:path";

import en from "@/src/locales/en.json";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectLeafKeys(
  obj: JsonObject,
  prefix = "",
  out: Map<string, string> = new Map()
): Map<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;

    if (typeof v === "string") {
      out.set(keyPath, v);
      continue;
    }

    if (isObject(v)) {
      collectLeafKeys(v, keyPath, out);
      continue;
    }

    out.set(keyPath, String(v));
  }

  return out;
}

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip heavy/irrelevant dirs
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "android" ||
        entry.name === "ios" ||
        entry.name === "drizzle" ||
        entry.name === "assets" ||
        entry.name === "NEW_STYLE" ||
        entry.name.startsWith(".")
      ) {
        continue;
      }

      walkFiles(path.join(dir, entry.name), out);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name);
    if (ext !== ".ts" && ext !== ".tsx" && ext !== ".js" && ext !== ".jsx") continue;

    out.push(path.join(dir, entry.name));
  }

  return out;
}

describe("i18n key usage", () => {
  test('all literal t("...") keys exist in locales', () => {
    const enKeys = collectLeafKeys(en as unknown as JsonObject);
    // Parity between en/fr is tested elsewhere.

    const root = process.cwd();
    const roots = [
      path.join(root, "src", "components", "session"),
      path.join(root, "app", "session"),
    ];

    const files = roots.flatMap((d) => walkFiles(d));

    // Matches: t("some.key"), t('some.key'), t(`some.key`)
    // We intentionally ignore dynamic/template keys containing ${...}.
    const tCall = /\bt\(\s*(["'`])([^"'`]+?)\1/g;

    const missing: Array<{ key: string; file: string }> = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (;;) {
        const match = tCall.exec(content);
        if (match == null) break;

        const key = match[2];

        // Ignore template/dynamic keys.
        if (key.includes("${")) continue;

        // Ignore obvious non-i18n literal strings.
        if (/\s/.test(key)) continue;

        if (!enKeys.has(key)) {
          missing.push({ key, file: path.relative(root, file) });
        }
      }
    }

    const formatted = missing
      .sort((a, b) => (a.key === b.key ? a.file.localeCompare(b.file) : a.key.localeCompare(b.key)))
      .map((m) => `${m.key}  ←  ${m.file}`);

    expect(formatted).toEqual([]);
  });
});
