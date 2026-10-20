/**
 * The environment for a test that runs git in a throwaway repository: the parent's without a
 * single `GIT_*` variable. A hook (pre-push runs `npm test`) exports `GIT_DIR` and friends, and
 * git obeys them over `cwd`, so on 2026-10-19 `git init` and `git config` in a temp folder wrote
 * `core.bare`, `core.hooksPath=/dev/null`, a fake identity, a tag and five commits into the real
 * repository, which every worktree shares.
 */
export function isolatedGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  // Undefined, not deleted: child_process leaves an undefined variable out of the child's env.
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) env[key] = undefined;
  return env;
}
