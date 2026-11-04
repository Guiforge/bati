// The atelier's `clip` (a few seconds of real motion) and `check` (measures of a state).
// Both run the page on Playwright's fake clock (avecPage faux), so a result depends on the tree and
// the options, never on the machine's speed. Commands and examples: PIPELINE.md, section 6.

const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

/** The state's link without `fige=1`: the animation clock (horloge.ts) starts by itself at the focus. */
const lienVivant = (tier, lumiere, o) =>
  `palier=${tier}&ambiance=${lumiere}&nu=1${o.query ? `&${o.query}` : ""}`;

const sha1 = (fichier) => crypto.createHash("sha1").update(fs.readFileSync(fichier)).digest("hex");

// ---------------------------------------------------------------------------------------------
// clip

async function clip(o, sortie, v, A) {
  const [tier, lumiere] = [o.tier ?? "6", o.light ?? "jour"];
  const secondes = Number(o.seconds ?? 6);
  const fps = Number(o.fps ?? 10);
  const n = Math.round(secondes * fps) + 1;
  const dossier = path.join(sortie, `clip-t${tier}-${lumiere}-${v}`);
  fs.rmSync(dossier, { recursive: true, force: true });
  fs.mkdirSync(dossier, { recursive: true });
  const t = Date.now();
  const frames = [];
  let feuille = "";
  await A.avecPage(
    async (ouvrir, page) => {
      await ouvrir(lienVivant(tier, lumiere, o));
      for (let i = 0; i < n; i++) {
        if (i > 0) await page.clock.runFor(1000 / fps);
        const f = path.join(dossier, `f${String(i).padStart(3, "0")}.png`);
        await A.capture(page, f);
        frames.push(f);
      }
      const pas = Math.max(1, Math.floor((n - 1) / 7));
      const choix = frames.filter((_, i) => i % pas === 0).slice(0, 8);
      feuille = path.join(sortie, `clip-t${tier}-${lumiere}-${v}-sheet.jpg`);
      await A.planche(page, choix, feuille, {
        largeur: 240,
        colonnes: 4,
        legendes: choix.map((f) => `${(frames.indexOf(f) / fps).toFixed(1)} s`),
      });
    },
    { faux: true },
  );
  const hashes = frames.map(sha1);
  console.log(
    `${n} frames, ${new Set(hashes).size} distinct, first = last: ${hashes[0] === hashes.at(-1)}`,
  );
  const mp4 = path.join(sortie, `clip-t${tier}-${lumiere}-${v}.mp4`);
  const ff = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      String(fps),
      "-i",
      path.join(dossier, "f%03d.png"),
      "-vf",
      "scale=540:-2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "20",
      mp4,
    ],
    { encoding: "utf8" },
  );
  const video = ff.status === 0 ? mp4 : `no mp4 (${ff.error?.code ?? ff.stderr.slice(0, 200)})`;
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
  return `${dossier}\n${feuille}\n${video}`;
}

// ---------------------------------------------------------------------------------------------
// check: the code that runs in the page

/** Everything that needs the page's images and a canvas. Serialised by Playwright: no outer names. */
function mesurerPage({ dump, ancres, piedProp, dpr }) {
  const COUCHES_PIED = ["building", "decor", "prop", "animal", "scaffold"];
  // Not occluders: shadows, light and weather layers, water glints.
  const PAS_OCCLUSION = /ombre|assombri|voile|rais|reflet|nuage|lumiere|halo|lueur|brume|fumee/;
  const cv = document.createElement("canvas");
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const cv2 = document.createElement("canvas");
  const cx2 = cv2.getContext("2d", { willReadFrequently: true });
  const imgs = [...document.images]
    .filter((i) => i.naturalWidth > 0)
    .map((img, idx) => {
      const r = img.getBoundingClientRect();
      let flip = false;
      let rot = false;
      let op = 1;
      for (let e = img; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        op *= Number.parseFloat(cs.opacity);
        if (cs.transform && cs.transform !== "none") {
          const m = new DOMMatrix(cs.transform);
          if (m.a < 0) flip = !flip;
          if (Math.abs(m.b) > 1e-3) rot = true;
        }
      }
      const tid = img.closest("[data-testid]")?.getAttribute("data-testid") ?? "";
      return { img, idx, r, flip, rot, op, tid };
    });
  const dessiner = (ctx, e, ox, oy) => {
    const w = Math.max(1, Math.round(e.r.width));
    const h = Math.max(1, Math.round(e.r.height));
    ctx.save();
    if (e.flip) {
      ctx.translate(e.r.x - ox + w, e.r.y - oy);
      ctx.scale(-1, 1);
      ctx.drawImage(e.img, 0, 0, w, h);
    } else ctx.drawImage(e.img, e.r.x - ox, e.r.y - oy, w, h);
    ctx.restore();
  };
  const dim = (c, ctx, w, h) => {
    c.width = w;
    c.height = h;
    ctx.clearRect(0, 0, w, h);
  };

  // --- Occlusion: the share of each building's opaque pixels that later images do not cover.
  const batiments = imgs.filter((e) => e.tid.startsWith("iso-maquette-"));
  const occlusion = batiments.map((b) => {
    const code = b.tid.replace("iso-maquette-", "");
    const [ox, oy] = [Math.floor(b.r.x), Math.floor(b.r.y)];
    const [W, H] = [Math.ceil(b.r.right) - ox, Math.ceil(b.r.bottom) - oy];
    dim(cv, cx, W, H);
    dessiner(cx, b, ox, oy);
    const base = cx.getImageData(0, 0, W, H).data;
    const couvert = new Uint8Array(W * H);
    const par = {};
    for (const l of imgs) {
      if (l.idx <= b.idx || l.rot || l.op < 0.5 || PAS_OCCLUSION.test(l.tid)) continue;
      if (l.tid === `iso-ailes-${code}`) continue;
      if (l.r.right <= ox || l.r.left >= ox + W || l.r.bottom <= oy || l.r.top >= oy + H) continue;
      dim(cv2, cx2, W, H);
      dessiner(cx2, l, ox, oy);
      const d = cx2.getImageData(0, 0, W, H).data;
      for (let k = 0; k < W * H; k++)
        if (!couvert[k] && d[k * 4 + 3] >= 128 && base[k * 4 + 3] >= 128) {
          couvert[k] = 1;
          const nom = l.tid.replace(/-[\d-]+$/, "");
          par[nom] = (par[nom] ?? 0) + 1;
        }
    }
    let opaque = 0;
    let cache = 0;
    for (let k = 0; k < W * H; k++) {
      if (base[k * 4 + 3] >= 128) opaque++;
      cache += couvert[k];
    }
    const pire = Object.entries(par)
      .sort((a, c) => c[1] - a[1])
      .slice(0, 3);
    return { code, opaque, visible: opaque ? 1 - cache / opaque : 1, pire };
  });

  // --- Ground anchors: the foot the dump promises against the painting's lowest opaque row.
  const pris = new Set();
  const ancrages = [];
  const parCouche = {};
  const sansDom = [];
  const sansAncre = [];
  for (const s of dump?.sprites ?? []) {
    parCouche[s.layer] = (parCouche[s.layer] ?? 0) + 1;
    if (!COUCHES_PIED.includes(s.layer)) continue;
    const [x, y, w, h] = [s.x / dpr, s.y / dpr, s.w / dpr, s.h / dpr];
    let meilleur = null;
    for (const e of imgs) {
      if (pris.has(e.idx) || e.tid.startsWith("iso-ailes")) continue;
      const ecart =
        Math.abs(e.r.x - x) +
        Math.abs(e.r.y - y) +
        Math.abs(e.r.width - w) +
        Math.abs(e.r.height - h);
      if (ecart < 2 && (!meilleur || ecart < meilleur.ecart)) meilleur = { e, ecart };
    }
    if (!meilleur) {
      sansDom.push(s.id);
      continue;
    }
    const { e } = meilleur;
    pris.add(e.idx);
    // The foot as a share of the box height: the painted sprite's anchor, or a prop's fixed canvas.
    const a = ancres[e.img.currentSrc.split(/[?#]/)[0].split("/").pop()];
    const koef = e.tid.startsWith("iso-accessoire-")
      ? piedProp
      : a
        ? a.anchor[1] / a.size[1]
        : null;
    if (koef === null) {
      sansAncre.push(`${s.id} (${e.img.currentSrc.split("/").pop().slice(0, 24)})`);
      continue;
    }
    const [nw, nh] = [e.img.naturalWidth, e.img.naturalHeight];
    if (nw * nh > 4096 * 4096) continue;
    cv.width = nw;
    cv.height = nh;
    cx.clearRect(0, 0, nw, nh);
    cx.drawImage(e.img, 0, 0);
    const d = cx.getImageData(0, 0, nw, nh).data;
    let bas = -1;
    for (let row = nh - 1; row >= 0 && bas < 0; row--)
      for (let col = 0; col < nw; col++)
        if (d[(row * nw + col) * 4 + 3] >= 128) {
          bas = row;
          break;
        }
    if (bas < 0) continue;
    // Device pixels, the phone's: the sprite's lowest opaque row against the foot its anchor gives.
    const basEcran = (e.r.y + ((bas + 1) * e.r.height) / nh) * dpr;
    const pied = s.y + koef * s.h;
    ancrages.push({
      id: s.id,
      layer: s.layer,
      tid: e.tid,
      ecart: Math.round((basEcran - pied) * 10) / 10,
    });
  }

  // --- Image sizes against the screen.
  const parSrc = new Map();
  const tailles = [];
  for (const e of imgs) {
    const [nw, nh] = [e.img.naturalWidth, e.img.naturalHeight];
    parSrc.set(e.img.currentSrc, nw * nh);
    const ecran = e.r.width * dpr * (e.r.height * dpr);
    if (ecran >= 100)
      tailles.push({
        src: e.img.currentSrc.split("/").pop().slice(0, 40),
        tid: e.tid,
        nat: [nw, nh],
        ecran: [Math.round(e.r.width * dpr), Math.round(e.r.height * dpr)],
        ratio: (nw * nh) / ecran,
      });
  }
  tailles.sort((a, c) => c.ratio - a.ratio);

  const centres = batiments.map((b) => [(b.r.left + b.r.right) / 2, (b.r.top + b.r.bottom) / 2]);
  return {
    occlusion,
    ancrages,
    parCouche,
    sansDom,
    sansAncre,
    nbImages: imgs.length,
    tailles: tailles.slice(0, 10),
    pixelsUniques: [...parSrc.values()].reduce((s, n) => s + n, 0),
    pixelsInstances: imgs.reduce((s, e) => s + e.img.naturalWidth * e.img.naturalHeight, 0),
    centres,
  };
}

/** A 1/8 blurred image, and the mean luminance of the core against the periphery. */
async function valeurPage({ png, centres, cote }) {
  const img = new Image();
  img.src = `data:image/png;base64,${png}`;
  await img.decode();
  const [w, h] = [Math.round(img.width / 8), Math.round(img.height / 8)];
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.filter = "blur(1px)";
  cx.drawImage(img, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;
  const k = w / cote.w;
  const [mx, my] = centres.length
    ? [
        centres.reduce((s, c) => s + c[0], 0) / centres.length,
        centres.reduce((s, c) => s + c[1], 0) / centres.length,
      ]
    : [cote.w / 2, cote.h / 2];
  const [cxm, cym] = [mx * k, my * k];
  const rCoeur = 0.3 * cote.w * k;
  const rPeriph = 0.55 * cote.w * k;
  let [sc, nc, sp, np] = [0, 0, 0, 0];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      const dist = Math.hypot(x - cxm, y - cym);
      if (dist <= rCoeur) {
        sc += lum;
        nc++;
      } else if (dist >= rPeriph) {
        sp += lum;
        np++;
      }
    }
  return {
    coeur: nc ? sc / nc : 0,
    peripherie: np ? sp / np : 0,
    miniature: cv.toDataURL("image/png"),
  };
}

/** Distinct elements whose `style` changes while the page runs `ms` of fake time. */
async function mouvementPage(page, ms) {
  await page.evaluate(() => {
    const vus = new Map();
    window.__vus = vus;
    new MutationObserver((l) => {
      for (const r of l) vus.set(r.target, (vus.get(r.target) ?? 0) + 1);
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["style"] });
  });
  for (let t = 0; t < ms; t += 100) await page.clock.runFor(100);
  return page.evaluate(() => {
    const familles = {};
    for (const e of window.__vus.keys()) {
      const f = (e.closest("[data-testid]")?.getAttribute("data-testid") ?? e.tagName)
        .replace(/-[\d-]+$/, "")
        .replace(/^iso-/, "");
      familles[f] = (familles[f] ?? 0) + 1;
    }
    return { noeuds: window.__vus.size, familles };
  });
}

// ---------------------------------------------------------------------------------------------
// check: the command

const BUDGET_NOEUDS = 68;
const SEUIL_VISIBLE = 0.85;
const SEUIL_PIED_PX = 2;

function captureDump(page) {
  const morceaux = {};
  page.on("console", (m) => {
    const r = /^ISO_DUMP (\S+) (\d+)\/(\d+) (\S*)$/.exec(m.text());
    if (!r) return;
    morceaux[r[1]] ??= {};
    morceaux[r[1]][`${r[3]}:${r[2]}`] = r[4];
  });
  return () => {
    const j = morceaux.atelier ?? {};
    const n = Number(Object.keys(j)[0]?.split(":")[0] ?? 0);
    if (!n || Object.keys(j).filter((k) => k.startsWith(`${n}:`)).length < n) return null;
    return JSON.parse(Array.from({ length: n }, (_, k) => j[`${n}:${k + 1}`]).join(""));
  };
}

async function mesurerPalier(tier, lumiere, o, sortie, v, A) {
  const res = { tier: Number(tier), lumiere };
  await A.avecPage(
    async (ouvrir, page) => {
      const dumpe = captureDump(page);
      // The sprite dump, the camera and the opening settled: a static state (fige=1) with the dump asked for.
      await ouvrir(`${A.lienCarte(tier, lumiere, o)}&dump=atelier`);
      for (let i = 0; i < 100 && !dumpe(); i++) await page.clock.runFor(100);
      const dump = dumpe();
      const ancres = await page.evaluate(() => globalThis.__atelierAncres);
      const piedProp = await page.evaluate(() => globalThis.__atelierPiedProp);
      const m = await page.evaluate(mesurerPage, { dump, ancres, piedProp, dpr: A.DPR });
      const png = (
        await page.screenshot({ clip: { x: 0, y: 0, width: A.VIEW.width, height: 2400 / A.DPR } })
      ).toString("base64");
      const val = await page.evaluate(valeurPage, {
        png,
        centres: m.centres,
        cote: { w: A.VIEW.width, h: 2400 / A.DPR },
      });
      const miniature = path.join(sortie, `check-value-t${tier}-${lumiere}-${v}.png`);
      fs.writeFileSync(miniature, Buffer.from(val.miniature.split(",")[1], "base64"));
      Object.assign(res, m, {
        valeur: { coeur: val.coeur, peripherie: val.peripherie, miniature },
        dumpLu: Boolean(dump),
      });
      // The living state: no fige, the clock runs from the focus.
      await ouvrir(lienVivant(tier, lumiere, o));
      res.mouvement = await mouvementPage(page, Number(o.seconds ?? 6) * 1000);
    },
    { faux: true },
  );
  return res;
}

const pct = (x) => `${(x * 100).toFixed(1)} %`;

async function check(o, sortie, v, A) {
  const paliers = (o.tier ?? "1,6,12").split(",");
  const lumiere = o.light ?? "jour";
  const crochets = path.join(A.ROOT, "docs/designs/village/layout/hooks.json");
  const t = Date.now();
  const resultats = [];
  for (const tier of paliers) resultats.push(await mesurerPalier(tier, lumiere, o, sortie, v, A));

  let dur = false;
  const lignes = [`check ${v}, ${lumiere}, paliers ${paliers.join(", ")}`];
  lignes.push(
    fs.existsSync(crochets)
      ? `hooks.json: present (${crochets}), not read yet`
      : "hooks.json: absent (docs/designs/village/layout/hooks.json, LAYOUT makes it later): no hook boxes checked",
  );
  for (const r of resultats) {
    const occ = [...r.occlusion].sort((a, b) => a.visible - b.visible);
    const bas = occ.filter((b) => b.visible < SEUIL_VISIBLE);
    const pieds = r.ancrages
      .filter((a) => Math.abs(a.ecart) > SEUIL_PIED_PX)
      .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
    const flottants = r.ancrages.filter((a) => a.ecart < -SEUIL_PIED_PX).length;
    const [coeur, peri] = [r.valeur.coeur, r.valeur.peripherie];
    const budget = r.mouvement.noeuds > BUDGET_NOEUDS;
    if (budget) dur = true;
    lignes.push(
      "",
      `== palier ${r.tier} ==`,
      `occlusion (report only, today's layout is known to fail): ${bas.length} of ${occ.length} buildings under ${pct(SEUIL_VISIBLE)} visible; worst first:`,
      ...occ
        .slice(0, 8)
        .map(
          (b) =>
            `  ${b.code.padEnd(16)} ${pct(b.visible).padStart(7)}  ${b.pire.map(([n, k]) => `${n} ${k}px`).join(", ")}`,
        ),
      `ground anchors (report only): ${pieds.length} of ${r.ancrages.length} sprites more than ${SEUIL_PIED_PX} device px off (${flottants} float above their foot); dump ${r.dumpLu ? "read" : "MISSING"}, layers ${JSON.stringify(r.parCouche)}, ${r.sansDom.length} dump entries without a DOM image, ${r.sansAncre.length} without an anchor in the index (${[...new Set(r.sansAncre)].slice(0, 6).join(", ")}); worst 20 (device px, + = painting ends below the foot):`,
      ...pieds
        .slice(0, 20)
        .map(
          (a) =>
            `  ${a.id.padEnd(28)} ${a.layer.padEnd(9)} ${String(a.ecart).padStart(7)}  ${a.tid}`,
        ),
      `value: core ${coeur.toFixed(1)}, periphery ${peri.toFixed(1)} (0-255), the core is ${coeur > peri ? "brighter: ok" : "NOT brighter: rule broken"}; thumbnail ${r.valeur.miniature}`,
      `image sizes (web decodes the source, not the Android decode size): ${r.nbImages} images, ${(r.pixelsUniques / 1e6).toFixed(1)} MP decoded (distinct files), ${(r.pixelsInstances / 1e6).toFixed(1)} MP counting every use; worst source/screen ratios:`,
      ...r.tailles.map(
        (s) =>
          `  ${s.ratio.toFixed(1).padStart(6)}x  ${s.nat.join("x")} -> ${s.ecran.join("x")}  ${s.tid} ${s.src}`,
      ),
      `motion: ${r.mouvement.noeuds} distinct animated nodes in ${o.seconds ?? 6} s, budget ${BUDGET_NOEUDS}: ${budget ? "OVER (hard failure)" : "ok"}`,
      `  families: ${Object.entries(r.mouvement.familles)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([f, n]) => `${f} ${n}`)
        .join(", ")}`,
    );
  }
  const json = path.join(sortie, `check-${v}.json`);
  fs.writeFileSync(json, JSON.stringify({ version: v, lumiere, paliers: resultats }, null, 1));
  lignes.push(
    "",
    `${Math.round((Date.now() - t) / 1000)} s, ${json}`,
    dur ? "HARD RULE FAILED: motion budget" : "hard rules: ok",
  );
  if (dur) process.exitCode = 1;
  return lignes.join("\n");
}

module.exports = { clip, check };
