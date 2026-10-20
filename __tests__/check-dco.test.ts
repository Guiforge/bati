import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isolatedGitEnv } from "./helpers/isolatedGit";

// The DCO script runs in CI only, so this builds a throwaway repository and runs it for real.
const script = path.resolve("scripts/check-dco.sh");
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", env: isolatedGitEnv() }).trim();

function commit(cwd: string, email: string, message: string) {
  fs.writeFileSync(path.join(cwd, "f"), message);
  git(cwd, "add", "f");
  git(cwd, "-c", `user.email=${email}`, "-c", "user.name=T", "commit", "-q", "-m", message);
  return git(cwd, "rev-parse", "HEAD");
}

function check(cwd: string, base: string, head: string) {
  try {
    execFileSync(script, [base, head], {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      env: isolatedGitEnv(),
    });
    return true;
  } catch {
    return false;
  }
}

test("an outside commit needs a Signed-off-by, the maintainer and bots do not (B3)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dco-"));
  try {
    git(dir, "init", "-q");
    // Proof the repository is this folder, not whatever an inherited GIT_DIR names.
    expect(fs.existsSync(path.join(dir, ".git"))).toBe(true);
    fs.mkdirSync(path.join(dir, ".github"));
    fs.copyFileSync(".github/dco-maintainers.txt", path.join(dir, ".github/dco-maintainers.txt"));
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.symlinkSync(script, path.join(dir, "scripts/check-dco.sh"));
    const base = commit(dir, "guiforge@gmail.com", "root");
    const maintainer = commit(dir, "guiforge@gmail.com", "mine");
    const bot = commit(dir, "1+dependabot[bot]@users.noreply.github.com", "bump");
    expect(check(dir, base, bot)).toBe(true);
    expect(maintainer).not.toBe(base);
    const unsigned = commit(dir, "someone@example.org", "outside");
    expect(check(dir, base, unsigned)).toBe(false);
    const signed = commit(
      dir,
      "someone@example.org",
      "outside\n\nSigned-off-by: T <someone@example.org>",
    );
    expect(check(dir, unsigned, signed)).toBe(true);
    expect(check(dir, base, signed)).toBe(false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
