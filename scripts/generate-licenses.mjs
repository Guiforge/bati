// Writes src/licenses.json: each direct production dependency with the version installed and its
// licence, read by the Credits "Open source licences" screen. Same tool and version as the CI
// licence gate. Run after changing package.json dependencies: `npm run licenses`.
// __tests__/licenses.test.ts fails when the file and package.json disagree.
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const out = execFileSync(
  "npx",
  [
    "--yes",
    "license-checker-rseidelsohn@4.4.2",
    "--production",
    "--excludePrivatePackages",
    "--json",
  ],
  { encoding: "utf8", maxBuffer: 1 << 26 },
);
const found = JSON.parse(out);
const rows = Object.keys(pkg.dependencies)
  .sort()
  .map((name) => {
    const key = Object.keys(found).find((k) => k.slice(0, k.lastIndexOf("@")) === name);
    if (!key) throw new Error(`license-checker did not report ${name}`);
    const licenses = found[key].licenses;
    return {
      name,
      version: key.slice(key.lastIndexOf("@") + 1),
      license: Array.isArray(licenses) ? licenses.join(" OR ") : String(licenses),
    };
  });
fs.writeFileSync("src/licenses.json", `${JSON.stringify(rows, null, 2)}\n`);
process.stdout.write(`${rows.length} dependencies written to src/licenses.json\n`);
