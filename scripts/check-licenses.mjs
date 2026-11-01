// CI and pre-commit gate: fails on a shipped dependency whose licence is on the blocklist
// (scripts/license-lib.ts). A blocklist on purpose: an allowlist would turn main red every time
// somebody adds an MIT package, and it checks the npm tree only, which is what Metro bundles.
import { execFileSync } from "node:child_process";
import { blockedLicenses } from "./license-lib.ts";

const report = JSON.parse(
  execFileSync(
    "npx",
    [
      "--yes",
      "license-checker-rseidelsohn@4.4.2",
      "--production",
      "--excludePrivatePackages",
      "--json",
    ],
    { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "inherit"] },
  ),
);
const count = Object.keys(report).length;
// An empty report would pass every rule, and a missing node_modules produces one.
if (count === 0) {
  process.stderr.write("::error::license-checker read no packages; run npm ci\n");
  process.exit(1);
}
const bad = blockedLicenses(report);
for (const line of bad) process.stderr.write(`::error::blocked licence: ${line}\n`);
if (bad.length) process.exit(1);
process.stdout.write(`Licences: ${count} shipped packages, none blocked\n`);
