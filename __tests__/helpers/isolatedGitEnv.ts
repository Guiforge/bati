/**
 * The environment for a test that builds a throwaway git repository: this process's, minus every
 * `GIT_*` variable. The pre-push hook runs `npm test` with `GIT_DIR` set to the real repository,
 * and git obeys it over `cwd`, so on 2026-10-19 the fixtures' `init`, `config`, commits and a
 * `v1.0.0` tag landed in the shared `.git`: hooks switched off, every worktree committing as "t".
 */
export function isolatedGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_")) delete env[key];
  }
  return env;
}
