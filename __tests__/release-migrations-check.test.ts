import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * `scripts/check-release-migrations.sh` against a real, throwaway git history: tags are what it
 * reads, and a mock of `git describe` would test the mock.
 */
const SCRIPT = path.join(process.cwd(), "scripts", "check-release-migrations.sh");

let repo: string;
let n = 0;

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, stdio: "pipe", encoding: "utf8" });

function commit(files: Record<string, string>, message: string) {
  fs.mkdirSync(path.join(repo, "drizzle"), { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(repo, "drizzle", name), body);
  }
  git("add", "-A");
  git("commit", "-q", "-m", message);
}

function check(ref: string) {
  const run = spawnSync("bash", [SCRIPT, ref], { cwd: repo, encoding: "utf8" });
  return { code: run.status, out: `${run.stdout}${run.stderr}` };
}

const migration = (body = "SELECT 1;") => {
  n += 1;
  return { [`000${n}_m.sql`]: body };
};

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "bati-release-"));
  n = 0;
  git("init", "-q", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  git("config", "commit.gpgsign", "false");
  git("config", "tag.gpgsign", "false");
  commit({ "0000_schema.sql": "CREATE TABLE a (x);" }, "first");
});

afterEach(() => {
  fs.rmSync(repo, { recursive: true, force: true });
});

describe("check-release-migrations.sh", () => {
  test("the first release has nothing to compare and passes", () => {
    git("tag", "v1.0.0");
    expect(check("v1.0.0").code).toBe(0);
  });

  test("zero or one new migration since the previous tag passes", () => {
    git("tag", "v1.0.0");
    commit(migration(), "one");
    git("tag", "v1.1.0");
    expect(check("v1.1.0").code).toBe(0);

    commit({ "README.md": "x" }, "none");
    git("tag", "v1.1.1");
    expect(check("v1.1.1").code).toBe(0);
  });

  test("two new migrations fail, and name them", () => {
    git("tag", "v1.0.0");
    commit({ ...migration(), ...migration() }, "two");
    git("tag", "v1.1.0");
    const result = check("v1.1.0");
    expect(result.code).toBe(1);
    expect(result.out).toContain("0001_m.sql");
    expect(result.out).toContain("0002_m.sql");
  });

  test("two across separate commits fail the same", () => {
    git("tag", "v1.0.0");
    commit(migration(), "a");
    commit(migration(), "b");
    git("tag", "v1.1.0");
    expect(check("v1.1.0").code).toBe(1);
  });

  test("a deliberate exception is one annotated line away", () => {
    git("tag", "v1.0.0");
    const annotated = migration(
      "-- multi-migration-ok: the second only seeds what the first adds\nSELECT 1;",
    );
    commit({ ...annotated, ...migration() }, "two, on purpose");
    git("tag", "v1.1.0");
    expect(check("v1.1.0").code).toBe(0);
  });

  test("migrations already shipped in the previous tag do not count again", () => {
    commit({ ...migration(), ...migration() }, "two");
    git("tag", "v1.0.0");
    commit(migration(), "one more");
    git("tag", "v1.1.0");
    expect(check("v1.1.0").code).toBe(0);
  });
});
