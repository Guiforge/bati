// The release workflow's size budget, in bytes: `node scripts/check-apk-size.mjs <apk> <max MiB>`.
// Rounding the size down to whole MiB let a 55.9 MiB APK pass a 55 MiB budget. Exits 1 over
// budget. Never raise the budget to make a build pass; see the ratchet note in release.yml.
import * as fs from "node:fs";

const [apk, maxMib] = process.argv.slice(2);
const max = Number(maxMib);
if (!apk || !(max > 0)) {
  console.error("::error::usage: check-apk-size.mjs <apk> <max MiB>");
  process.exit(1);
}
let bytes;
try {
  bytes = fs.statSync(apk).size;
} catch (e) {
  console.error(`::error::cannot read ${apk}: ${e.message}`);
  process.exit(1);
}
const mib = (bytes / 1048576).toFixed(2);
const line = `APK: ${mib} MiB (budget ${max} MiB)`;
process.stdout.write(`${line}\n`);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
if (bytes > max * 1048576) {
  console.error(`::error::APK is ${mib} MiB, over the ${max} MiB budget`);
  process.exit(1);
}
