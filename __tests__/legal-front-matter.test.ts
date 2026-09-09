import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LEGAL = join(__dirname, "..", "docs", "legal");

/**
 * Jekyll runs with `strict_front_matter: false`, so a page whose YAML does not parse is not a
 * build error: the block is stripped, `page` comes back empty, and the page renders anyway with
 * no title and no permalink. `/bati/privacy/` 404'd for a month that way, because an unquoted
 * description said "off by default: the map" and a colon opens a mapping.
 */
test.each(readdirSync(LEGAL).filter((f) => /\.(md|html)$/.test(f)))(
  "%s has front matter YAML that parses",
  (file) => {
    const source = readFileSync(join(LEGAL, file), "utf8");
    const frontMatter = /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1];
    expect(frontMatter).toBeDefined();

    for (const line of (frontMatter ?? "").split("\n")) {
      const value = /^[\w-]+: (?!["'[{])(.+)$/.exec(line)?.[1];
      // A bare scalar holding ": " is read as a nested mapping, and the whole block dies with it.
      expect(value ?? "").not.toMatch(/: /);
    }
  },
);
