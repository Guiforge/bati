import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MIB = 1048576;
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-apk-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/** Runs the script the release workflow calls on a sparse file of `bytes`. */
function check(bytes: number, budget = "55") {
  const apk = path.join(dir, "bati.apk");
  fs.writeFileSync(apk, "");
  fs.truncateSync(apk, bytes);
  return spawnSync("node", ["scripts/check-apk-size.mjs", apk, budget], { encoding: "utf8" });
}

test("an APK of 55.5 MiB fails a 55 MiB budget, rounded down it would have passed", () => {
  const r = check(Math.round(55.5 * MIB));
  expect(r.status).toBe(1);
  expect(r.stdout + r.stderr).toContain("over the 55 MiB budget");
});

test("an APK of 54.9 MiB passes", () => {
  expect(check(Math.round(54.9 * MIB)).status).toBe(0);
});

test("exactly the budget passes and one byte more fails", () => {
  expect(check(55 * MIB).status).toBe(0);
  expect(check(55 * MIB + 1).status).toBe(1);
});

test("a missing file or a bad budget fails loudly", () => {
  expect(
    spawnSync("node", ["scripts/check-apk-size.mjs", path.join(dir, "no.apk"), "55"]).status,
  ).toBe(1);
  expect(check(1, "abc").status).toBe(1);
});
