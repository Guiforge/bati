/**
 * A vault unlock opens copies to adopt a key and never swaps them in, so it has no business with the
 * file a restore has staged.
 */
import fs from "node:fs";
import path from "node:path";

import { type Device, newDevice, reports } from "../harness/device";
import { at, useDeviceClocks } from "../harness/world";

beforeAll(() => useDeviceClocks());

let a: Device;
beforeEach(async () => {
  a = await newDevice("A");
});
afterEach(() => a.close());

test("a vault unlock never touches a staged restore", async () => {
  const dbDir = path.dirname(a.sqlite.name);
  const staged = path.join(dbDir, "bati-import.tmp.db");
  fs.writeFileSync(staged, "the hero's staged restore");

  const folder = path.join(a.dir, "backups");
  fs.mkdirSync(folder);
  for (const day of ["2026-01-01", "2026-01-02"]) {
    fs.writeFileSync(path.join(folder, `bati-${day}-v1.batb`), "not really sealed");
  }
  a.sqlite
    .prepare("INSERT INTO user_preferences (key, value) VALUES ('backupFolderUri', ?)")
    .run(`file://${folder}/`);

  reports.length = 0;
  const stage = jest.spyOn(a.app.files, "stageBackupFrom");
  const result = await at(a, () => a.app.unlock.unlockWith("folder", "any secret"));

  expect(result).toBe("nothingToTry");
  expect(reports).toEqual([]);
  // Once per copy, so the folder was read and each copy went to the unlock slot.
  expect(stage).toHaveBeenCalledTimes(2);
  for (const call of stage.mock.calls) expect(call[1]).toBe(a.app.files.UNLOCK_SLOT);
  expect(fs.readFileSync(staged, "utf8")).toBe("the hero's staged restore");
  const left = fs.readdirSync(dbDir).filter((n) => n.includes("unlock"));
  expect(left).toEqual([]);
});
