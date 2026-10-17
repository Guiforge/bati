// CI gate (audit G2): fails on a high or critical advisory in the production dependency tree
// that .github/audit-allowlist.json does not name. An entry is a decision with a reason, not a
// mute: delete it when the fix lands. `npm audit` needs the network, so this runs in CI only.
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import { unlistedAdvisories } from "./audit-lib.ts";

let stdout;
try {
  stdout = execFileSync("npm", ["audit", "--omit=dev", "--json"], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
} catch (e) {
  // npm audit exits 1 when it finds anything; the report is still on stdout.
  stdout = e.stdout;
  if (!stdout) throw e;
}
const allowed = JSON.parse(fs.readFileSync(".github/audit-allowlist.json", "utf8"));
const bad = unlistedAdvisories(JSON.parse(stdout), allowed);
for (const a of bad)
  process.stderr.write(`::error::${a.id} ${a.title} is not in .github/audit-allowlist.json\n`);
if (bad.length) process.exit(1);
process.stdout.write(
  `npm audit: no high or critical advisory outside the allowlist (${allowed.length} allowed)` +
    "\n",
);
