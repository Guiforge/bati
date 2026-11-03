#!/usr/bin/env python3
"""C1 concept test, FLUX half: creature frames on Klein (base frame, then edits of it), keyed and cut, plus a steadiness number.

    c1_flux.py gen      # 8 base frames + 16 edits (2 variants x 4 creatures), reserved/settled through iso_loop
    c1_flux.py cut      # chroma-key every raw into a transparent PNG
    c1_flux.py measure  # per-creature change outside the moving part, after aligning on the feet

Output: docs/designs/village/life/scratch/c1/flux/ (raw/ holds the green originals, cost.json the model and cost per image).
"""
import concurrent.futures
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts"))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = ROOT / "docs/designs/village/life/scratch/c1/flux"
RAW = OUT / "raw"
GREEN = (0, 177, 64)
LOOK = ("hand-painted with a dark ink outline (#0F1518), stocky and slightly exaggerated shapes, warm light from the upper left, "
        "cool slate shadows on the right side of the body, two or three flat values per colour, soft brush strokes, matte fur or "
        "scales or feathers, no gloss, no fine noise, no cast shadow, no ground. ")
VIEW = ("Seen from above at three-quarters, camera looking down about 35 degrees, the animal facing the lower right, whole body in "
        "frame, centred, filling about 60 percent of the picture, on a flat pure green background (#00B140) with no other element. ")
EDIT = ("Image 1 is the {n}. Paint the very same {n}: same colours, same markings, same size, same position in the frame, same camera "
        "angle, same ink line, same flat green background. Change only this: {c} Keep every other part pixel for pixel. ")
STYLE_NOTE = "Image 1 is a style reference only, for ink line, light and brushwork: copy none of its shapes or objects. "
NAME = {"mouse": "mouse", "cat": "cat", "bird": "bird", "dragon": "sleeping dragon"}
# creature -> (size, {variant: description}, [(frame, pose or change)]); the first frame is the base, the others edit it
C = {
    "mouse": (768, {"a": "a small grey-brown field mouse with a pink tail and round ears",
                    "b": "a small russet harvest mouse with a cream belly and a long thin tail"}, [
        ("run_a", "running at full stretch, body low and long, front paws reaching forward, back legs pushed behind, tail trailing."),
        ("run_b", "the legs go to the opposite phase of the stride: front paws tucked under the chest, back paws reaching forward under the belly, body slightly arched."),
        ("sit", "it sits up on its haunches, back straight, front paws held together at the chest, tail curled on the ground, head raised.")]),
    "cat": (768, {"a": "a stocky ginger tabby cat with a white chest and a thick tail",
                  "b": "a stocky black and white cat with white paws and a thick tail"}, [
        ("walk_a", "walking, the near front paw and the far back paw lifted, tail up in a gentle curve."),
        ("walk_b", "the legs go to the opposite phase of the stride: the far front paw and the near back paw lifted, tail slightly lower."),
        ("sit", "it sits upright on its haunches, front paws straight together, tail wrapped around the feet, head raised.")]),
    "bird": (768, {"a": "a plump little robin with an orange-red breast, a brown back and thin dark legs",
                   "b": "a plump little blue-grey songbird with a pale belly, a dark cap and thin dark legs"}, [
        ("wings_up", "flying, both wings raised high above the back, tail fanned, legs tucked, no ground."),
        ("wings_down", "both wings swept down below the body, tail fanned, legs tucked."),
        ("perched", "it stands on the ground with the wings folded against the body, on its two thin legs.")]),
    "dragon": (1024, {"a": "a big dragon curled up asleep on itself in a ring, head resting on its front claws, grey-green stone-coloured scales "
                           "with a paler belly, small folded wings, a row of back spikes, a thick tail wrapped along its flank, closed eyes",
                      "b": "a big dragon curled up asleep on itself in a ring, head resting on its front claws, rust-red scales with an "
                           "ochre belly, small folded wings, a row of back spikes, a thick tail wrapped along its flank, closed eyes"}, [
        ("breathe_in", "its ribs and flank gently swollen with a full breath."),
        ("breathe_out", "the flank and chest sink a little, about five percent flatter, as after a slow breath out. The head, eyes, claws, wings, spikes, tail and every outline stay exactly where they are.")]),
}
# the dragon is painted like the lair's own, the others like the druid grove: style references only
STYLE_REF = {"dragon": "peints/dragon_lair/mythic.jour"}
DEFAULT_REF = "druid_grove/grand.jour"
# steadiness: the part that must NOT move, (x0, y0, x1, y1) as fractions of the aligned bounding box
STATIC = {"mouse": (0.0, 0.0, 1.0, 0.45), "cat": (0.0, 0.0, 0.6, 0.5), "bird": (0.0, 0.55, 1.0, 1.0), "dragon": (0.0, 0.0, 0.4, 1.0)}


def ref_png(creature):
    name = STYLE_REF.get(creature, DEFAULT_REF)
    f = RAW / ("ref_" + name.replace("/", "_") + ".png")
    if not f.exists():
        im = Image.open(ROOT / f"assets/images/village/iso/{name}.webp").convert("RGBA")
        bg = Image.new("RGBA", im.size, GREEN + (255,))
        bg.alpha_composite(im)
        bg.convert("RGB").save(f)
    return f


def run(jobs, label):
    """jobs: (out, prompt, seed, size, refs). One reserve, one settle; cost recorded per image."""
    from iso_loop import KLEIN, klein_price, reserve, settle
    from lib import flux
    flux.PROVENANCE = RAW / "provenance.json"  # concept scratch: never the shared ledger
    batch = reserve(len(jobs), max(klein_price(j[3], j[3]) for j in jobs), label, None)  # V1 ceiling only: the Klein probe cap (7.5) is spent
    logs = {j[0].name: [] for j in jobs}

    def one(j):
        o, text, seed, size, refs = j
        return flux.generate(slug=o.stem, prompt=text, out=o, width=size, height=size, attempts=1, references=tuple(refs),
                             submitted_log=logs[o.name], endpoint=KLEIN, seed=seed)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            ok = list(pool.map(one, jobs))
    finally:
        entry = settle(batch, [r for v in logs.values() for r in v])
    f = OUT / "cost.json"
    old = json.loads(f.read_text()) if f.exists() else {}
    for j, k in zip(jobs, ok):
        old[j[0].stem] = {"model": "flux-3-image-klein", "ok": k, "cost_usd": sum(float(r.get("cost") or 0) for r in logs[j[0].name]) / 100}
    f.write_text(json.dumps(old, indent=1))
    print(label, "cost", entry["cost"], "failed", [j[0].name for j, k in zip(jobs, ok) if not k])


def gen():
    RAW.mkdir(parents=True, exist_ok=True)
    base = []
    for ci, (c, (size, vs, frames)) in enumerate(C.items()):
        for vi, (v, desc) in enumerate(vs.items()):
            what = f"A single {desc}" + (", " + frames[0][1] if c != "dragon" else ". It is " + frames[0][1])
            base.append((RAW / f"{c}_{v}_{frames[0][0]}.png", STYLE_NOTE + what + " " + LOOK + VIEW, 7000 + 100 * ci + 10 * vi, size, [ref_png(c)]))
    if not all(j[0].exists() for j in base):
        run(base, "c1 creatures base")
    edits = []
    for ci, (c, (size, vs, frames)) in enumerate(C.items()):
        for vi, v in enumerate(vs):
            b = RAW / f"{c}_{v}_{frames[0][0]}.png"
            if not b.exists():
                continue
            for fi, (fr, change) in enumerate(frames[1:], 1):
                edits.append((RAW / f"{c}_{v}_{fr}.png", EDIT.format(n=NAME[c], c=change) + LOOK, 8000 + 100 * ci + 10 * vi + fi, size, [b]))
    run(edits, "c1 creatures edits")


def key(path):
    """Border-connected flood of the studio green (key measured on the image's own corners), soft edge, green spill removed."""
    a = np.asarray(Image.open(path).convert("RGB")).astype(float)
    corners = [a[:6, :6], a[:6, -6:], a[-6:, :6], a[-6:, -6:]]
    k = np.median(np.concatenate([x.reshape(-1, 3) for x in corners]), axis=0)
    m = Image.fromarray(((np.linalg.norm(a - k, axis=2) < 70) * 255).astype("uint8")).copy()  # copy: floodfill cannot write a buffer-backed image
    for pt in [(0, 0), (m.width - 1, 0), (0, m.height - 1), (m.width - 1, m.height - 1)]:
        if m.getpixel(pt) == 255:
            ImageDraw.floodfill(m, pt, 128)
    bgm = np.asarray(m) == 128
    alpha = Image.fromarray(((~bgm) * 255).astype("uint8")).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    a[..., 1] = np.minimum(a[..., 1], np.maximum(a[..., 0], a[..., 2]) + 12)  # despill
    out = Image.fromarray(a.clip(0, 255).astype("uint8")).convert("RGBA")
    out.putalpha(alpha)
    return out.crop(alpha.point(lambda v: 255 if v > 8 else 0).getbbox())


def cut():
    for f in sorted(RAW.glob("*_*_*.png")):
        if not f.name.startswith("ref_"):
            key(f).save(OUT / f.name)


def aligned(files):
    """RGBA arrays on one canvas: feet (lowest opaque row) on one line, centre of the bottom 15 percent on one column."""
    ims = [Image.open(f) for f in files]
    W, H = max(i.width for i in ims) * 2, max(i.height for i in ims) * 2
    out = []
    for im in ims:
        al = np.asarray(im.getchannel("A")) > 128
        cx = int(np.nonzero(al[int(al.shape[0] * 0.85):].any(axis=0))[0].mean())
        c = Image.new("RGBA", (W, H))
        c.paste(im, (W // 2 - cx, H - 4 - im.height))
        out.append(np.asarray(c))
    return out


def measure():
    res = {}
    for c, (_, vs, frames) in C.items():
        for v in vs:
            fs = [OUT / f"{c}_{v}_{fr}.png" for fr, _ in frames]
            if not all(f.exists() for f in fs):
                continue
            arr = aligned(fs)
            ys, xs = np.nonzero(np.any([x[..., 3] > 128 for x in arr], axis=0))
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            zx0, zy0, zx1, zy1 = STATIC[c]
            z = np.zeros(arr[0].shape[:2], bool)
            z[int(y0 + zy0 * (y1 - y0)):int(y0 + zy1 * (y1 - y0)), int(x0 + zx0 * (x1 - x0)):int(x0 + zx1 * (x1 - x0))] = True
            rgb, sil = [], []
            for j in (1,):  # the animated pair only (frame 2 against frame 1); the sit/perch pose is a different pose
                A, B = arr[0], arr[j]
                both = (A[..., 3] > 128) & (B[..., 3] > 128) & z
                rgb.append(np.abs(A[..., :3].astype(float) - B[..., :3])[both].mean() / 255 if both.any() else 1.0)
                a, b = (A[..., 3] > 128) & z, (B[..., 3] > 128) & z
                sil.append((a ^ b).sum() / max(1, (a | b).sum()))
            whole = (arr[0][..., 3] > 128) ^ (arr[1][..., 3] > 128)
            res[f"{c}_{v}"] = {"whole_silhouette_mismatch": round(float(whole.sum() / ((arr[0][..., 3] > 128) | (arr[1][..., 3] > 128)).sum()), 3), "static_zone": STATIC[c], "pixel_change_0_1": round(float(np.mean(rgb)), 3),
                               "silhouette_mismatch_0_1": round(float(np.mean(sil)), 3)}
    (OUT / "steadiness.json").write_text(json.dumps(res, indent=1))
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    {"gen": gen, "cut": cut, "measure": measure}[sys.argv[1]]()
