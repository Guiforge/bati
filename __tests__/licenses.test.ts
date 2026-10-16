import fs from "node:fs";

import licenses from "@/src/licenses.json";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  dependencies: Record<string, string>;
};

test("the licences file names exactly the production dependencies, each with a licence", () => {
  // Fails after a dependency is added or removed: `npm run licenses` regenerates the file.
  expect(licenses.map((d) => d.name).sort()).toEqual(Object.keys(pkg.dependencies).sort());
  for (const d of licenses) {
    expect(d.version).toMatch(/^\d/);
    expect(d.license).not.toMatch(/^(UNKNOWN|UNLICENSED)?$/);
  }
});
