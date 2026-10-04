import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * `scripts/upgrade-check.sh` needs an emulator and two release builds, so it is run by hand. Its
 * verdict does not: `compare` is what turns two sets of figures into pass or fail, and a script
 * that cannot fail is worse than no script. These run it on files, with no device.
 */
const SCRIPT = path.join(process.cwd(), "scripts", "upgrade-check.sh");

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-upgrade-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function compare(before: string, after: string) {
  fs.writeFileSync(path.join(dir, "before.txt"), before);
  fs.writeFileSync(path.join(dir, "after.txt"), after);
  const run = spawnSync(
    "bash",
    ["-c", `UPGRADE_CHECK_SOURCE_ONLY=1 source "${SCRIPT}"; compare before.txt after.txt`],
    { cwd: dir, encoding: "utf8" },
  );
  return { code: run.status, out: run.stderr };
}

const hero = 'sessions=546\nexercises=5177\nxp=48945\nlevel=Level 34\nflame=text="1,092d"\n';

describe("upgrade-check.sh compare", () => {
  test("passes when every figure is what it was", () => {
    expect(compare(hero, hero).code).toBe(0);
  });

  test("fails, naming the figure, when a count drops", () => {
    const result = compare(hero, hero.replace("sessions=546", "sessions=500"));
    expect(result.code).toBe(1);
    expect(result.out).toContain("sessions: 546 -> 500");
  });

  test("fails when the level or the flame on screen moved", () => {
    const result = compare(hero, hero.replace("Level 34", "Level 33").replace("1,092d", "4d"));
    expect(result.code).toBe(1);
    expect(result.out).toContain("level: Level 34 -> Level 33");
    expect(result.out).toContain("flame:");
  });

  test("fails when a figure disappears, which is what a blank screen looks like", () => {
    const result = compare(hero, "sessions=546\nexercises=5177\nxp=48945\n");
    expect(result.code).toBe(1);
    expect(result.out).toContain("level: Level 34 -> <missing>");
  });

  test("lists every figure that moved, not just the first", () => {
    const result = compare(
      hero,
      'sessions=1\nexercises=2\nxp=3\nlevel=Level 34\nflame=text="1,092d"\n',
    );
    expect(result.out).toContain("sessions");
    expect(result.out).toContain("exercises");
    expect(result.out).toContain("xp");
  });
});

describe("upgrade-check.sh guards", () => {
  const run = (...args: string[]) =>
    spawnSync("bash", [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });

  test("refuses without two APKs, and says how to call it", () => {
    const result = run();
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("upgrade-check.sh OLD.apk NEW.apk");
  });

  test("refuses a device that is not an emulator, before touching anything", () => {
    fs.writeFileSync(path.join(dir, "a.apk"), "");
    fs.writeFileSync(path.join(dir, "b.apk"), "");
    const result = run("a.apk", "b.apk", "--device", "0c7eca63");
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("only an emulator is allowed");
  });
});
