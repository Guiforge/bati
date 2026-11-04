#!/usr/bin/env node
// The atelier: the village as images, drawn by the app's own components in a headless browser.
// No emulator, no Metro server. Commands and examples: docs/designs/village/PIPELINE.md, section 6.
//
//   node scripts/atelier/atelier.js render --tier 6 --light nuit
//   node scripts/atelier/atelier.js strip --light jour
//   node scripts/atelier/atelier.js sheet forge --light jour
//   node scripts/atelier/atelier.js clip --tier 6 --seconds 6 --fps 10
//   node scripts/atelier/atelier.js check --tier 1,6,12
//
// Common options: --out DIR, --no-build (reuse the last build), --query 'a=1&b=2' (any dev-iso param).

const { execFileSync, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const BUILD = path.join(ROOT, "node_modules/.cache/atelier-web");
// shortcut: Playwright comes from the gstack install every session here must have (CLAUDE.md), not a
// devDependency; if the atelier ever runs in CI, add playwright-core to the repo.
const PLAYWRIGHT =
  process.env.ATELIER_PLAYWRIGHT ??
  path.join(os.homedir(), ".claude/skills/gstack/node_modules/playwright-core");

/** The calibration phone: 1080x2400 at 420 dpi. PIPELINE.md section 6 has the numbers. */
const DPR = 2.625;
const VIEW = { width: 412, height: 915 };
const CLIP = { x: 0, y: 0, width: 1080 / DPR, height: 2400 / DPR };
/** A fixed day: `useJour` and the wave number read the clock, so the same state gives the same image. */
const JOUR_FIXE = "2026-11-04T15:00:00Z";
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
};

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

/** `abc1234` or `abc1234-dirty`: what an output's name says about the tree that drew it. */
function versionArbre() {
  const dirty = git("status", "--porcelain") !== "";
  return `${git("rev-parse", "--short", "HEAD")}${dirty ? "-dirty" : ""}`;
}

/** Changes whenever the tree does: the last build is good while this has not moved. */
function empreinteArbre() {
  return crypto
    .createHash("sha1")
    .update(git("rev-parse", "HEAD"))
    .update(git("diff", "HEAD"))
    .update(git("status", "--porcelain"))
    .digest("hex");
}

function construire() {
  const temoin = path.join(BUILD, ".empreinte");
  const empreinte = empreinteArbre();
  if (fs.existsSync(temoin) && fs.readFileSync(temoin, "utf8") === empreinte) return;
  const t = Date.now();
  const r = spawnSync(
    "npx",
    ["expo", "export", "--platform", "web", "--dev", "--output-dir", BUILD],
    {
      cwd: ROOT,
      env: { ...process.env, ATELIER_WEB: "1" },
      encoding: "utf8",
    },
  );
  if (r.status !== 0) {
    console.error(`${r.stdout}\n${r.stderr}`.slice(-3000));
    throw new Error("atelier: the web export failed");
  }
  fs.writeFileSync(temoin, empreinte);
  console.log(`build ${Math.round((Date.now() - t) / 1000)} s`);
}

function serveur() {
  const srv = http.createServer((q, r) => {
    let f = path.join(BUILD, decodeURIComponent(q.url.split("?")[0]));
    if (!f.startsWith(BUILD) || !fs.existsSync(f) || fs.statSync(f).isDirectory())
      f = path.join(BUILD, "index.html");
    r.writeHead(200, { "content-type": MIME[path.extname(f)] ?? "application/octet-stream" });
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

const imagesPretes = () =>
  [...document.images].every((i) => i.complete) && document.images.length > 0;

/**
 * Runs `corps(ouvrir, page)` with a phone-sized page; `ouvrir(query)` opens one dev-iso state and waits for it.
 * `faux`: the page runs on Playwright's fake clock, paused, and only moves when `page.clock.runFor`
 * says so (the `clip` and `check` commands). Time then depends on the calls, not on the machine.
 */
async function avecPage(corps, { faux = false } = {}) {
  const { chromium } = require(PLAYWRIGHT);
  const srv = await serveur();
  const nav = await chromium.launch();
  try {
    const ctx = await nav.newContext({ viewport: VIEW, deviceScaleFactor: DPR });
    const page = await ctx.newPage();
    if (faux) {
      await page.clock.install({ time: new Date(JOUR_FIXE) });
      await page.clock.pauseAt(new Date(Date.parse(JOUR_FIXE) + 1000));
    } else await page.clock.setFixedTime(new Date(JOUR_FIXE));
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e.stack ?? e).slice(0, 600)));
    const ouvrir = async (query) => {
      erreurs.length = 0;
      await page.goto(`http://127.0.0.1:${srv.address().port}/?${query}`);
      await page.waitForLoadState("networkidle", { timeout: 60000 });
      // Sprites decoded, the opening fade over (ouverture.ts, FONDU_OUVERTURE_MS).
      if (faux) {
        // Real time first: the fake clock must not advance by a number of steps that depends on the machine.
        for (let i = 0; i < 400 && !(await page.evaluate(imagesPretes)); i++) {
          if (i < 100) await page.waitForTimeout(50);
          else await page.clock.runFor(100);
        }
        await page.clock.runFor(3000);
      } else {
        await page.waitForFunction(imagesPretes, null, { timeout: 30000 });
        await page.waitForTimeout(800);
      }
      if (erreurs.length) throw new Error(`atelier: the page failed on ${query}\n${erreurs[0]}`);
    };
    return await corps(ouvrir, page);
  } finally {
    await nav.close();
    srv.close();
  }
}

const capture = (page, fichier) => page.screenshot({ path: fichier, clip: CLIP });

/** One image from several: drawn by the browser, so no image library is needed. */
async function planche(page, images, fichier, { largeur, colonnes, legendes = [] }) {
  const cases = images
    .map((f, i) => {
      const data = fs.readFileSync(f).toString("base64");
      const leg = legendes[i] ?? "";
      return `<figure><img src="data:image/png;base64,${data}"><figcaption>${leg}</figcaption></figure>`;
    })
    .join("");
  await page.setViewportSize({ width: colonnes * largeur, height: 600 });
  await page.setContent(
    `<style>body{margin:0;background:#0F1518;display:grid;grid-template-columns:repeat(${colonnes},${largeur}px)}
     figure{margin:0;position:relative}img{width:${largeur}px;display:block}
     figcaption{position:absolute;left:6px;top:6px;font:bold 13px sans-serif;color:#fff;background:#0F1518cc;padding:2px 6px}</style>${cases}`,
  );
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: fichier, fullPage: true, type: "jpeg", quality: 88 });
  await page.setViewportSize(VIEW);
}

function options(argv) {
  const o = { positionnels: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-build") o.noBuild = true;
    else if (a.startsWith("--")) o[a.slice(2)] = argv[++i];
    else o.positionnels.push(a);
  }
  return o;
}

/** docs/designs/village/<track>/scratch/atelier, the track read from the branch's name. */
function dossierSortie(o) {
  const piste = git("rev-parse", "--abbrev-ref", "HEAD").replace(/^track-/, "");
  const d = path.resolve(o.out ?? path.join(ROOT, `docs/designs/village/${piste}/scratch/atelier`));
  fs.mkdirSync(d, { recursive: true });
  return d;
}

const lienCarte = (tier, lumiere, o) =>
  `palier=${tier}&ambiance=${lumiere}&nu=1&fige=1${o.query ? `&${o.query}` : ""}`;

const COMMANDES = {
  async render(o, sortie, v) {
    const [tier, lumiere] = [o.tier ?? "12", o.light ?? "jour"];
    const f = path.join(sortie, `render-t${tier}-${lumiere}-${v}.png`);
    await avecPage(async (ouvrir, page) => {
      const t = Date.now();
      await ouvrir(lienCarte(tier, lumiere, o));
      await capture(page, f);
      console.log(`${Date.now() - t} ms`);
    });
    return f;
  },

  async strip(o, sortie, v) {
    const lumiere = o.light ?? "jour";
    const tiers = Array.from({ length: 12 }, (_, i) => i + 1);
    const f = path.join(sortie, `strip-${lumiere}-${v}.jpg`);
    await avecPage(async (ouvrir, page) => {
      const t = Date.now();
      const images = [];
      for (const tier of tiers) {
        const png = path.join(sortie, `strip-${lumiere}-t${tier}-${v}.png`);
        await ouvrir(lienCarte(tier, lumiere, o));
        await capture(page, png);
        images.push(png);
      }
      await planche(page, images, f, {
        largeur: 270,
        colonnes: 6,
        legendes: tiers.map((n) => `palier ${n}`),
      });
      console.log(`${Date.now() - t} ms`);
    });
    return f;
  },

  async sheet(o, sortie, v) {
    const code = o.positionnels[0];
    if (!code) throw new Error("atelier: sheet <building code>");
    const lumiere = o.light ?? "jour";
    const f = path.join(sortie, `sheet-${code}-${lumiere}-${v}.jpg`);
    await avecPage(async (ouvrir, page) => {
      await ouvrir(lienCarte(12, lumiere, o));
      const rangs = await page.evaluate((c) => globalThis.__atelierStades(c), code);
      const images = [];
      for (const { rang } of rangs) {
        const png = path.join(sortie, `sheet-${code}-r${rang}-${lumiere}-${v}.png`);
        await ouvrir(`bld=${code}&rang=${rang}&ambiance=${lumiere}&nu=1&fige=1`);
        await capture(page, png);
        images.push(png);
      }
      await planche(page, images, f, {
        largeur: 360,
        colonnes: Math.min(5, images.length),
        legendes: rangs.map((r) => `${code} rang ${r.rang}, ${r.stade}`),
      });
    });
    return f;
  },
};

// clip and check live in check.js; they take the helpers they share with the commands above.
const AIDES = { avecPage, capture, planche, lienCarte, git, ROOT, DPR, VIEW };
COMMANDES.clip = (o, sortie, v) => require("./check").clip(o, sortie, v, AIDES);
COMMANDES.check = (o, sortie, v) => require("./check").check(o, sortie, v, AIDES);

async function main() {
  const [commande, ...reste] = process.argv.slice(2);
  const f = COMMANDES[commande];
  if (!f) {
    console.error(`atelier: ${Object.keys(COMMANDES).join(" | ")} (see PIPELINE.md, section 6)`);
    process.exit(2);
  }
  const o = options(reste);
  if (!o.noBuild) construire();
  console.log(await f(o, dossierSortie(o), versionArbre()));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
