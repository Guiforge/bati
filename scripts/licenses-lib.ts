// Shared by scripts/generate-licenses.mjs (the writer) and __tests__/licenses.test.ts (the check),
// so the set of packages the notices must cover is defined in exactly one place.
/**
 * The production tree as package-lock.json records it: everything not dev-only, not a workspace
 * link, and not an optional or platform-specific binary (`os`/`cpu`), because those are absent
 * from a given machine's node_modules and would make the asset differ per developer. A superset of
 * what Metro bundles, on purpose: a notice we did not need is harmless, a missing one is not.
 * Returns [{ dir, name, version }], sorted by name then version. `name` is the folder name, so an
 * npm alias (react-is-18) keeps the name it is installed under.
 */
export type Lock = {
  packages: Record<
    string,
    {
      version: string;
      dev?: boolean;
      link?: boolean;
      optional?: boolean;
      os?: string[];
      cpu?: string[];
    }
  >;
};

export function productionPackages(lock: Lock) {
  return Object.entries(lock.packages)
    .filter(([dir, p]) => dir && !p.dev && !p.link && !p.optional && !p.os && !p.cpu)
    .map(([dir, p]) => ({ dir, name: dir.split("node_modules/").pop() ?? dir, version: p.version }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

/**
 * CC BY 3.0 wants the author of every icon used. The folder in each require() path is the
 * author's folder in the game-icons.net archive; `AUTHOR_NAMES` turns it into the name its
 * license.txt gives. Returns [{ author, icons: [file names] }] sorted by author.
 */
const AUTHOR_NAMES: Record<string, string> = {
  lorc: "Lorc",
  delapouite: "Delapouite",
  "caro-asercion": "Caro Asercion",
  "various-artists": "Various artists",
};

export function gameIconAuthors(hookSource: string) {
  const byAuthor = new Map<string, string[]>();
  for (const m of hookSource.matchAll(/1x1\/([a-z-]+)\/([a-z0-9-]+)\.svg/g)) {
    const [, folder = "", icon = ""] = m;
    const author = AUTHOR_NAMES[folder];
    if (!author)
      throw new Error(`game-icons folder "${folder}" has no author name in licenses-lib`);
    byAuthor.set(author, [...(byAuthor.get(author) ?? []), icon]);
  }
  return [...byAuthor.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([author, icons]) => ({ author, icons: [...new Set(icons)].sort() }));
}
