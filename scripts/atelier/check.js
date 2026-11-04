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
function mesurerPage({ dump, ancres, piedProp, dpr, crochets }) {
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
      let cache = false;
      for (let e = img; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        op *= Number.parseFloat(cs.opacity);
        if (cs.visibility === "hidden" || cs.display === "none") cache = true;
        if (cs.transform && cs.transform !== "none") {
          const m = new DOMMatrix(cs.transform);
          if (m.a < 0) flip = !flip;
          if (Math.abs(m.b) > 1e-3) rot = true;
        }
      }
      const tid = img.closest("[data-testid]")?.getAttribute("data-testid") ?? "";
      return { img, idx, r, flip, rot, op, cache, tid };
    });
  // Everything is measured in device pixels (k = dpr): a CSS-pixel canvas rounded each sprite's size
  // and counted 2.6 times too coarsely. A box is [x, y, w, h] in CSS px, the canvas its own origin.
  const k = dpr;
  const dessiner = (ctx, e, ox, oy) => {
    ctx.save();
    if (e.flip) {
      ctx.translate((e.r.x - ox + e.r.width) * k, (e.r.y - oy) * k);
      ctx.scale(-1, 1);
      ctx.drawImage(e.img, 0, 0, e.r.width * k, e.r.height * k);
    } else ctx.drawImage(e.img, (e.r.x - ox) * k, (e.r.y - oy) * k, e.r.width * k, e.r.height * k);
    ctx.restore();
  };
  const dim = (c, ctx, w, h) => {
    c.width = w;
    c.height = h;
    ctx.clearRect(0, 0, w, h);
  };
  /** The stage a building image is drawn at: the file name's first word (solid.jour.<hash>.webp). */
  const stadeDe = (img) => img.currentSrc.split(/[?#]/)[0].split("/").pop().split(".")[0];
  // A tap lands on a building or a wall section (tapBatiment.ts): those cover another building's taps.
  const tappable = (tid) => /^iso-(maquette-|pan-)/.test(tid);

  // --- Occlusion: the share of each building's opaque pixels that later images do not cover.
  // Also the tap zone (covered by a later tappable image only) and the hook boxes (fractions of the image).
  const batiments = imgs.filter((e) => e.tid.startsWith("iso-maquette-"));
  const occlusion = batiments.map((b) => {
    const code = b.tid.replace("iso-maquette-", "");
    const [ox, oy] = [Math.floor(b.r.x), Math.floor(b.r.y)];
    const [W, H] = [Math.ceil((b.r.right - ox) * k), Math.ceil((b.r.bottom - oy) * k)];
    dim(cv, cx, W, H);
    dessiner(cx, b, ox, oy);
    const base = cx.getImageData(0, 0, W, H).data;
    const couvert = new Uint8Array(W * H);
    const couvertTap = new Uint8Array(W * H);
    const stade = stadeDe(b.img);
    const hook = crochets?.[code]?.[stade];
    // The hook box in canvas px; its covered/opaque counts.
    const hb = hook
      ? [
          Math.floor((hook.box[0] * b.r.width + b.r.x - ox) * k),
          Math.floor((hook.box[1] * b.r.height + b.r.y - oy) * k),
          Math.ceil((hook.box[2] * b.r.width + b.r.x - ox) * k),
          Math.ceil((hook.box[3] * b.r.height + b.r.y - oy) * k),
        ]
      : null;
    let hookOpaque = 0;
    let hookCouvert = 0;
    const dansHook = (x, y) => hb && x >= hb[0] && x < hb[2] && y >= hb[1] && y < hb[3];
    const par = {};
    for (const l of imgs) {
      if (l.idx <= b.idx || l.rot || l.op < 0.5 || l.cache || PAS_OCCLUSION.test(l.tid)) continue;
      if (l.tid === `iso-ailes-${code}`) continue;
      // Intersection of the layer's box and the building's, in canvas px.
      const x0 = Math.max(0, Math.floor((l.r.left - ox) * k));
      const y0 = Math.max(0, Math.floor((l.r.top - oy) * k));
      const x1 = Math.min(W, Math.ceil((l.r.right - ox) * k));
      const y1 = Math.min(H, Math.ceil((l.r.bottom - oy) * k));
      if (x1 <= x0 || y1 <= y0) continue;
      dim(cv2, cx2, W, H);
      dessiner(cx2, l, ox, oy);
      const d = cx2.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      const tap = tappable(l.tid) && !(l.tid.startsWith("iso-pan-") && code === "castle_wall");
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const kk = y * W + x;
          if (base[kk * 4 + 3] < 128 || d[((y - y0) * (x1 - x0) + (x - x0)) * 4 + 3] < 128)
            continue;
          if (!couvert[kk]) {
            couvert[kk] = 1;
            const nom = l.tid.replace(/-[\d-]+$/, "");
            par[nom] = (par[nom] ?? 0) + 1;
          }
          if (tap) couvertTap[kk] = 1;
        }
    }
    let opaque = 0;
    let cache = 0;
    let tapLibre = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const kk = y * W + x;
        if (base[kk * 4 + 3] < 128) continue;
        opaque++;
        cache += couvert[kk];
        if (!couvertTap[kk]) tapLibre++;
        if (dansHook(x, y)) {
          hookOpaque++;
          hookCouvert += couvert[kk];
        }
      }
    const pire = Object.entries(par)
      .sort((a, c) => c[1] - a[1])
      .slice(0, 3);
    return {
      code,
      idx: b.idx,
      stade,
      src: b.img.currentSrc.split("/").pop(),
      opaque,
      visible: opaque ? 1 - cache / opaque : 1,
      tapLibre,
      hook: hook ? { what: hook.what, opaque: hookOpaque, couvert: hookCouvert } : null,
      pire,
    };
  });

  // --- Ground anchors: the foot the dump promises against the painting's lowest opaque row.
  const pris = new Set();
  const ancrages = [];
  const parCouche = {};
  const sansDom = [];
  const sansAncre = [];
  const rangs = [];
  const invisibles = [];
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
    // Not drawn (faded out, hidden): the file's pixels say nothing about what the screen shows.
    if (e.cache || e.op < 0.5) {
      invisibles.push(`${s.id} (opacity ${e.op.toFixed(2)}${e.cache ? ", hidden" : ""})`);
      continue;
    }
    // Depth gate input: where the DOM draws this thing, and the tile its foot stands on.
    rangs.push({ id: s.id, layer: s.layer, tid: e.tid, idx: e.idx, tuile: [s.tileI, s.tileJ] });
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
    const plusBas = (c0, c1) => {
      for (let row = nh - 1; row >= 0; row--)
        for (let col = c0; col < c1; col++) if (d[(row * nw + col) * 4 + 3] >= 128) return row;
      return -1;
    };
    // The foot is the footprint's front corner, which sits at the anchor's column: the lowest opaque
    // row within 15 % of the width of that column. The lowest row anywhere can be a pebble or a flag
    // at the side, and a plot's rounded edge, neither of which is the corner (`basTout`, kept).
    const a0 = a ? a.anchor[0] / a.size[0] : 0.5;
    const cc = (e.flip ? 1 - a0 : a0) * nw;
    const basTout = plusBas(0, nw);
    // Only a building's foot is one corner; a prop (a washing line on two posts) stands on its whole width.
    const bas = e.tid.startsWith("iso-maquette-")
      ? plusBas(Math.max(0, Math.floor(cc - 0.15 * nw)), Math.min(nw, Math.ceil(cc + 0.15 * nw)))
      : basTout;
    // A waterfall falls below its anchor (the lip): it does not stand on it.
    if (bas < 0 || e.tid.startsWith("iso-chute-")) continue;
    // Device pixels, the phone's: the sprite's lowest opaque row against the foot its anchor gives.
    const basEcran = (e.r.y + ((bas + 1) * e.r.height) / nh) * dpr;
    const pied = s.y + koef * s.h;
    ancrages.push({
      id: s.id,
      layer: s.layer,
      tid: e.tid,
      // Device px: the box, the foot the anchor gives, the lowest opaque row (for the crops).
      boite: [e.r.x * dpr, e.r.y * dpr, e.r.width * dpr, e.r.height * dpr],
      pied,
      basEcran,
      ecartTout: Math.round(((e.r.y + ((basTout + 1) * e.r.height) / nh) * dpr - pied) * 10) / 10,
      ecart: Math.round((basEcran - pied) * 10) / 10,
    });
  }

  // --- Elements (teasers, gags, add-ons): drawn bottom-centre on their anchor (BatimentMoteur `Piece`), so
  // the foot is the box's bottom edge; the painting's lowest opaque row says where the thing really ends.
  for (const e of imgs) {
    if (!/^batiment-(teaser|gag|addon)/.test(e.tid) || e.cache || e.op < 0.5) continue;
    const [nw, nh] = [e.img.naturalWidth, e.img.naturalHeight];
    cv.width = nw;
    cv.height = nh;
    cx.clearRect(0, 0, nw, nh);
    cx.drawImage(e.img, 0, 0);
    const d = cx.getImageData(0, 0, nw, nh).data;
    let bas = -1;
    for (let row = nh - 1; row >= 0 && bas < 0; row--)
      for (let col = 0; col < nw; col++) if (d[(row * nw + col) * 4 + 3] >= 128) bas = row;
    if (bas < 0) continue;
    ancrages.push({
      id: `${e.tid} ${e.img.currentSrc.split("/").pop().split(".")[0]}`,
      layer: "element",
      tid: e.tid,
      boite: [e.r.x * dpr, e.r.y * dpr, e.r.width * dpr, e.r.height * dpr],
      pied: e.r.bottom * dpr,
      basEcran: (e.r.y + ((bas + 1) * e.r.height) / nh) * dpr,
      ecartTout: 0,
      ecart: Math.round(((bas + 1) / nh - 1) * e.r.height * dpr * 10) / 10,
    });
  }

  // --- Props: the share of each prop's opaque pixels that later images (buildings, walls, villagers) do not cover.
  const accessoires = imgs
    .filter((e) => e.tid.startsWith("iso-accessoire-") && !e.cache && e.op >= 0.5)
    .map((p) => {
      const [ox, oy] = [Math.floor(p.r.x), Math.floor(p.r.y)];
      const [W, H] = [Math.ceil((p.r.right - ox) * k), Math.ceil((p.r.bottom - oy) * k)];
      dim(cv, cx, W, H);
      dessiner(cx, p, ox, oy);
      const base = cx.getImageData(0, 0, W, H).data;
      const couvert = new Uint8Array(W * H);
      const par = {};
      for (const l of imgs) {
        if (l.idx <= p.idx || l.rot || l.op < 0.5 || l.cache || PAS_OCCLUSION.test(l.tid)) continue;
        const x0 = Math.max(0, Math.floor((l.r.left - ox) * k));
        const y0 = Math.max(0, Math.floor((l.r.top - oy) * k));
        const x1 = Math.min(W, Math.ceil((l.r.right - ox) * k));
        const y1 = Math.min(H, Math.ceil((l.r.bottom - oy) * k));
        if (x1 <= x0 || y1 <= y0) continue;
        dim(cv2, cx2, W, H);
        dessiner(cx2, l, ox, oy);
        const d = cx2.getImageData(x0, y0, x1 - x0, y1 - y0).data;
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            const kk = y * W + x;
            if (base[kk * 4 + 3] < 128 || d[((y - y0) * (x1 - x0) + (x - x0)) * 4 + 3] < 128)
              continue;
            if (!couvert[kk]) {
              couvert[kk] = 1;
              const nom = l.tid.replace(/-[\d-]+$/, "");
              par[nom] = (par[nom] ?? 0) + 1;
            }
          }
      }
      let opaque = 0;
      let cache = 0;
      for (let kk = 0; kk < W * H; kk++)
        if (base[kk * 4 + 3] >= 128) {
          opaque++;
          cache += couvert[kk];
        }
      const pire = Object.entries(par)
        .sort((a, c) => c[1] - a[1])
        .slice(0, 2);
      return {
        nom: p.tid.replace("iso-accessoire-", ""),
        opaque,
        visible: opaque ? 1 - cache / opaque : 1,
        pire,
      };
    });

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
    accessoires,
    rangs,
    invisibles,
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
/** A prop under this share visible is hidden behind what is drawn after it: it stands on nothing the hero sees. */
const SEUIL_PROP = 0.5;
/** A hook box counts as hidden when later images cover more than this share of its opaque pixels. */
const SEUIL_CROCHET = 0.01;
/** Unreached by a tap below this many opaque device px (about 7 dp square): a sliver is not a target. */
const MIN_TAP_PX = 400;

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

async function mesurerPalier(tier, lumiere, o, sortie, v, A, crochets) {
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
      const m = await page.evaluate(mesurerPage, { dump, ancres, piedProp, dpr: A.DPR, crochets });
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

/** Footprint [corner, size] of each building, from the two files the app reads (isoLayout.ts). */
function emprises(A) {
  const coins = require(path.join(A.ROOT, "constants/isoLayout.json")).batiments;
  const spec = require(path.join(A.ROOT, "constants/isoSpec.json")).batiments;
  return (code) =>
    coins[code] && spec[code]?.emprise ? { coin: coins[code], emprise: spec[code].emprise } : null;
}

/**
 * Depth gate: for every pair of standing things whose footprints say a is behind b (`derriere`,
 * profondeur.ts itself, Node strips the types), a must be earlier in the DOM. Buildings use their
 * footprint, everything else the 1 x 1 tile its foot stands on.
 */
function profondeur(r, A) {
  const { derriere } = require(path.join(A.ROOT, "components/village/iso/profondeur.ts"));
  const emp = emprises(A);
  // shortcut: the roof props are read from alentours.ts's text (it imports images, Node cannot load it); a data file would be safer.
  const sur = Object.fromEntries(
    [
      ...fs
        .readFileSync(path.join(A.ROOT, "components/village/iso/alentours.ts"), "utf8")
        .matchAll(/nom: "(\w+)",[^}]*sur: "(\w+)"/g),
    ].map((m) => [m[1], m[2]]),
  );
  const choses = r.rangs.flatMap((c) => {
    const code = c.tid.startsWith("iso-maquette-") ? c.tid.slice("iso-maquette-".length) : null;
    const nomProp = c.tid.startsWith("iso-accessoire-")
      ? c.tid.slice("iso-accessoire-".length)
      : null;
    // A prop on a roof (alentours.ts `sur`) rides its building; a waterfall belongs to its piece's cell.
    const chute = /^iso-chute-(\d+)-(\d+)$/.exec(c.tid);
    const e = code
      ? emp(code)
      : nomProp && sur[nomProp]
        ? emp(sur[nomProp])
        : { coin: chute ? [Number(chute[1]), Number(chute[2])] : c.tuile, emprise: [1, 1] };
    return e ? [{ ...c, ...e }] : [];
  });
  const fautes = [];
  for (const a of choses)
    for (const b of choses) if (a !== b && a.idx > b.idx && derriere(a, b)) fautes.push([a, b]);
  return { fautes, n: choses.length };
}

const pct = (x) => `${(x * 100).toFixed(1)} %`;

async function check(o, sortie, v, A) {
  const paliers = (o.tier ?? "1,6,12").split(",");
  const lumiere = o.light ?? "jour";
  const crochetsFichier = path.join(A.ROOT, "docs/designs/village/layout/hooks.json");
  const crochets = fs.existsSync(crochetsFichier)
    ? JSON.parse(fs.readFileSync(crochetsFichier, "utf8"))
    : null;
  const t = Date.now();
  const resultats = [];
  for (const tier of paliers)
    resultats.push(await mesurerPalier(tier, lumiere, o, sortie, v, A, crochets));

  const lignes = [`check ${v}, ${lumiere}, paliers ${paliers.join(", ")}`];
  lignes.push(
    crochets
      ? `hooks.json: present (${crochetsFichier})`
      : "hooks.json: absent (docs/designs/village/layout/hooks.json): no hook boxes checked, no failure",
  );
  const portes = { occlusion: 0, anchors: 0, props: 0, depth: 0, hooks: 0, tap: 0, motion: 0 };
  for (const r of resultats) {
    const occ = [...r.occlusion].sort((a, b) => a.visible - b.visible);
    const bas = occ.filter((b) => b.visible < SEUIL_VISIBLE);
    const pieds = r.ancrages
      .filter((a) => Math.abs(a.ecart) > SEUIL_PIED_PX)
      .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
    const flottants = r.ancrages.filter((a) => a.ecart < -SEUIL_PIED_PX).length;
    const [coeur, peri] = [r.valeur.coeur, r.valeur.peripherie];
    const budget = r.mouvement.noeuds > BUDGET_NOEUDS;
    const prof = profondeur(r, A);
    const crochetsVus = occ.filter((b) => b.hook);
    const crochetsKO = crochetsVus.filter(
      (b) => b.hook.opaque > 0 && b.hook.couvert / b.hook.opaque > SEUIL_CROCHET,
    );
    const injoignables = occ.filter((b) => b.tapLibre < MIN_TAP_PX);
    portes.occlusion += bas.length;
    const cachesProps = r.accessoires.filter((a) => a.visible < SEUIL_PROP);
    portes.anchors += pieds.length;
    portes.props += cachesProps.length;
    portes.depth += prof.fautes.length;
    portes.hooks += crochetsKO.length;
    portes.tap += injoignables.length;
    if (budget) portes.motion += 1;
    lignes.push(
      "",
      `== palier ${r.tier} ==`,
      `GATE occlusion: ${bas.length} of ${occ.length} buildings under ${pct(SEUIL_VISIBLE)} visible; worst first (px = device px covered):`,
      ...occ
        .slice(0, 8)
        .map(
          (b) =>
            `  ${b.code.padEnd(16)} ${pct(b.visible).padStart(7)}  ${b.pire.map(([n, k]) => `${n} ${k}px`).join(", ")}`,
        ),
      `GATE anchors: ${pieds.length} of ${r.ancrages.length} sprites more than ${SEUIL_PIED_PX} device px off (${flottants} float above their foot); dump ${r.dumpLu ? "read" : "MISSING"}, layers ${JSON.stringify(r.parCouche)}, ${r.sansDom.length} dump entries without a DOM image, ${r.invisibles.length} not drawn (opacity under 0.5 or hidden: ${r.invisibles.slice(0, 4).join("; ")}), ${r.sansAncre.length} without an anchor in the index (${[...new Set(r.sansAncre)].slice(0, 6).join(", ")}); worst 20 (device px, + = painting ends below the foot):`,
      ...pieds
        .slice(0, 20)
        .map(
          (a) =>
            `  ${a.id.padEnd(28)} ${a.layer.padEnd(9)} ${String(a.ecart).padStart(7)}  ${a.tid}`,
        ),
      `GATE props: ${cachesProps.length} of ${r.accessoires.length} props under ${pct(SEUIL_PROP)} visible${cachesProps.length ? ":" : ""}`,
      ...cachesProps.map(
        (a) =>
          `  ${a.nom.padEnd(20)} ${pct(a.visible).padStart(7)}  ${a.pire.map(([n, c]) => `${n} ${c}px`).join(", ")}`,
      ),
      `GATE depth: ${prof.fautes.length} violated pairs among ${prof.n} standing things (a is behind b by footprint, but drawn after it)${prof.fautes.length ? ":" : ""}`,
      ...prof.fautes
        .slice(0, 20)
        .map(
          ([x, y]) =>
            `  ${x.tid} ${JSON.stringify(x.coin)}+${JSON.stringify(x.emprise)} (DOM ${x.idx}) is behind ${y.tid} ${JSON.stringify(y.coin)}+${JSON.stringify(y.emprise)} (DOM ${y.idx})`,
        ),
      crochets
        ? `GATE hooks: ${crochetsKO.length} of ${crochetsVus.length} drawn hook boxes covered (over ${pct(SEUIL_CROCHET)} of their opaque pixels)${crochetsKO.length ? ":" : ""}`
        : "GATE hooks: no hooks.json, nothing checked",
      ...crochetsKO.map(
        (b) =>
          `  ${b.code} ${b.stade}: ${pct(b.hook.couvert / b.hook.opaque)} covered, "${b.hook.what}", by ${b.pire.map(([n, k]) => `${n} ${k}px`).join(", ")}`,
      ),
      `GATE tap: ${injoignables.length} buildings no tap reaches (under ${MIN_TAP_PX} opaque device px free of a later tappable building)${injoignables.length ? ":" : ""}`,
      ...injoignables.map((b) => `  ${b.code} ${b.tapLibre} px of ${b.opaque} reachable`),
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
  const echecs = Object.values(portes).some((n) => n > 0);
  lignes.push(
    "",
    `${Math.round((Date.now() - t) / 1000)} s, ${json}`,
    echecs
      ? `GATE FAILED: ${Object.entries(portes)
          .map(([g, n]) => `${g} ${n}`)
          .join(", ")}`
      : "GATES OK: occlusion 0, anchors 0, props 0, depth 0, hooks 0, tap 0, motion 0",
  );
  if (echecs) process.exitCode = 1;
  return lignes.join("\n");
}

module.exports = { clip, check };
