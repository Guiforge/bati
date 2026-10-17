// Writes src/licenses.json: the third-party notices the Credits "Open source licences" screen
// shows. One entry per package of the production tree (package-lock.json, see licenses-lib.ts),
// with its licence, its copyright lines and its licence text, plus the game-icons.net authors the
// app actually uses. Texts are stored once and referenced by index, because 900 MIT files differ
// only by their copyright line. Run after changing dependencies or icons: `npm run licenses`.
// __tests__/licenses.test.ts fails when the file and the lockfile or the icon hook disagree.
import * as fs from "node:fs";

import { gameIconAuthors, productionPackages } from "./licenses-lib.ts";

// A3: five @tamagui/* packages ship without a `license` field or a LICENSE file in 2.7.7, so
// license-checker reports UNKNOWN. Their repository (github.com/tamagui/tamagui) is MIT, the
// licence @tamagui/core carries, read on 2026-10-17. Recorded here rather than guessed per run:
// the licence is MIT and the notice is @tamagui/core's.
const LICENSE_OVERRIDES = Object.fromEntries(
  ["context-menu", "focus-guard", "menu", "native", "toast"].map((n) => [
    `@tamagui/${n}`,
    { license: "MIT", noticeFrom: "@tamagui/core" },
  ]),
);

const LICENSE_FILE = /^(licen[cs]e|unlicense|copying|notice)(?![a-z])/i;
const COPYRIGHT = /^\s*(copyright|\(c\)|©)/i;

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const texts = [];
const textIndex = new Map();

function normalise(file) {
  const lines = fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n").split("\n");
  const copyright = [];
  let seen = 0;
  const body = lines.filter((line) => {
    if (line.trim()) seen++;
    // Only the head of the file: Apache-2.0 ends with a "Copyright [yyyy] [name]" template.
    if (seen <= 15 && COPYRIGHT.test(line)) {
      copyright.push(line.trim());
      return false;
    }
    return true;
  });
  const text = body
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!textIndex.has(text)) {
    textIndex.set(text, texts.length);
    texts.push(text);
  }
  return { copyright, text: textIndex.get(text) };
}

// A package with no `license` field but a licence file (most of @tamagui/*): read the text.
const SIGNATURES = [
  ["MIT", /Permission is hereby granted, free of charge/],
  ["ISC", /Permission to use, copy, modify, and\/or distribute/],
  ["Apache-2.0", /Apache License\s+Version 2\.0/],
];

function licenseField(pj) {
  const l = pj.license ?? pj.licenses;
  if (Array.isArray(l)) return l.map((x) => x.type ?? x).join(" OR ");
  return typeof l === "object" && l ? l.type : (l ?? "UNKNOWN");
}

const packages = productionPackages(lock).map(({ dir, name, version }) => {
  const pj = JSON.parse(fs.readFileSync(`${dir}/package.json`, "utf8"));
  const files = fs
    .readdirSync(dir)
    .filter((f) => LICENSE_FILE.test(f))
    .sort();
  const notices = files.map((f) => normalise(`${dir}/${f}`));
  return {
    name,
    version,
    license: LICENSE_OVERRIDES[name]?.license ?? licenseField(pj),
    author: String(pj.author?.name ?? pj.author ?? "")
      .replace(/\s*[<(].*$/, "")
      .trim(),
    repository: typeof pj.repository === "string" ? pj.repository : (pj.repository?.url ?? ""),
    notices,
  };
});

for (const p of packages) {
  if (p.license !== "UNKNOWN") continue;
  const found = SIGNATURES.find(([, re]) => p.notices.some((n) => re.test(texts[n.text] ?? "")));
  if (found) p.license = `${found[0]} (read from the licence file)`;
}

for (const p of packages) {
  const from = LICENSE_OVERRIDES[p.name]?.noticeFrom;
  if (from) p.notices = packages.find((q) => q.name === from)?.notices ?? [];
}

// A package without its own licence file (a Metro sub-package, a Tamagui one) takes the notice of
// another package from the same repository, which is the licence of the whole monorepo.
const norm = (u) =>
  u
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/^git:/, "https:");
for (const p of packages) {
  if (p.notices.length || !p.repository) continue;
  const sib = packages.find((q) => q.notices.length && norm(q.repository) === norm(p.repository));
  if (sib) p.notices = sib.notices;
}

// Still nothing: the package declares a licence but ships no file (drizzle-orm, Metro, ...). The
// notice is then the commonest text of that licence among the other packages, with the author
// from package.json as the copyright holder, marked as declared rather than quoted.
function modalText(license) {
  const count = new Map();
  for (const q of packages)
    for (const n of q.notices)
      if (q.license === license) count.set(n.text, (count.get(n.text) ?? 0) + 1);
  return [...count.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
}
for (const p of packages) {
  if (p.notices.length) continue;
  const text = modalText(p.license.split(/ OR | AND |[()]/).find(Boolean) ?? p.license);
  if (text === undefined) continue;
  p.notices = [{ copyright: [`${p.author || p.name} (declared in package.json)`], text }];
}

const out = {
  texts,
  packages: packages.map(({ repository: _r, author: _a, ...p }) => p),
  gameIcons: gameIconAuthors(fs.readFileSync("hooks/useGameIcon.ts", "utf8")),
};
fs.writeFileSync("src/licenses.json", `${JSON.stringify(out)}\n`);
const bare = out.packages.filter((p) => !p.notices.length).map((p) => `${p.name}@${p.version}`);
process.stdout.write(
  `${out.packages.length} packages, ${texts.length} texts written to src/licenses.json\n`,
);
if (bare.length) process.stdout.write(`no licence file: ${bare.join(", ")}\n`);
