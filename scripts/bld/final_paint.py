#!/usr/bin/env python3
"""Windmill r1, final paint. Outputs in windmill/r1/final/, never overwritten. One command at a time, FLUX only through
iso_loop's registry (sondes3.run_batch: reserve, generate, settle). Budget of this job: 6 $ in batches labelled "final ...",
no single run above 1 $.

    python3 scripts/bld/final_paint.py peak      # FLUX 3 bbox edit of the mythic's peak under a local mask, then hue/sat shift
    (more commands below, one per family of elements)

Kept tower paintings, never repainted whole: rough and solid from sondes3, grand, legendary and mythic from sondes4 (with the
breeches edit). FLUX only receives the maquettes, the approved style references and our own earlier paintings: no game,
studio, film or artist name in any prompt.
"""
import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import sondes4 as Q  # noqa: E402
from iso_loop import BUDGET, FLUX3, guard_endpoint  # noqa: E402
from PIL import Image, ImageChops, ImageFilter  # noqa: E402
from sondes3 import _above, run_batch, tint  # noqa: E402

S = Q.S
X = Q.X
R1 = S.R1
OUT = R1 / "final"
SIZE = S.SIZE
JOB_BUDGET = 6.0  # dollars, batches labelled "final ..."
RUN_MAX = 1.0
PER_IMAGE = 0.07


def spent_job():
    batches = json.loads(BUDGET.read_text())["v1"]["batches"]
    return round(sum(b["cost"] for b in batches if b["label"].startswith("final")), 4)


def batch(label, n, slug, prompt_text, outs, refs, seed0, size=SIZE):
    """One registry batch of n images. Refuses above 1 $ for the run, or above the job's 6 $ with the reservation."""
    if n * PER_IMAGE > RUN_MAX:
        sys.exit(f"single run above {RUN_MAX} $: {n} images")
    if spent_job() + n * PER_IMAGE > JOB_BUDGET:
        sys.exit(f"job budget: {spent_job()} spent + {n * PER_IMAGE:.2f} > {JOB_BUDGET}")
    entry = run_batch("final " + label, n, slug, prompt_text, outs, refs, seed0, size)
    return entry


# ---------------------------------------------------------------- peak

PEAK_TXT = ("Image 1 is a finished painting of a windmill on a flat magenta background. Edit image 1 inside the box only: the "
            "blue shard on the roof tip, its collar and the roof tiles around the collar. Repaint the shard with two flat matte "
            "values only, one lit plane and one shaded plane, with no light strokes and no thin parallel lines of any kind: "
            "its right edge is NOT a straight line, it is broken in two places by a chip and a step, like fractured raw "
            "mineral; its tip is an irregular jagged broken point, not square and not flat. Keep its height, its position and "
            "its cold blue. Under the dark iron collar paint a soft matte shadow falling on the roof, and tie the shard to the "
            "roof: a few roof tiles around the collar are displaced and slightly lifted, barely tinted blue. Matte painted "
            "brushwork, daylight from the upper left, the same heavy ink outline as the tower. Everything else stays exactly "
            "as it is, same position to the pixel, same ink, materials, light and flat magenta background; no object is "
            "added; no text, no letters. Edits: ")


def final_raw(stage):
    """Path of the kept finished painting of a stage (RGB 896 x 1344): sondes3 rough and solid, sondes4 grand, legendary, mythic
    with their breeches edit. The mythic's peak is the final one when final/peak/mythic_peak.png exists."""
    if stage == "mythic" and (OUT / "peak/mythic_peak.png").exists():
        return OUT / "peak/mythic_peak.png"
    return Q.final_raw(stage)


def peak():
    guard_endpoint(FLUX3)
    base = Q.final_raw("mythic")  # sondes4's mythic with its breeches and its peak_055
    d = OUT / "peak"
    (d / "brut").mkdir(parents=True, exist_ok=True)
    outs = [d / "brut" / f"t1_v{i}.png" for i in range(2)]
    body = Image.open(base).convert("RGB").resize(SIZE, Image.LANCZOS)
    new = S.sil(Image.open(Q.MQ / "mythic.peinture.png"))
    shard = ImageChops.multiply(new, _above(330))
    edit = ImageChops.lighter(shard, ImageChops.multiply(S.sil(body), _above(330))).filter(ImageFilter.MaxFilter(13))
    sl, _, sr, _ = shard.getbbox()
    ring = Image.new("L", new.size, 0)
    ring.paste(255, (sl - 70, 330, sr + 70, 450))  # the collar, the shadow under it and the roof tiles around it
    edit = ImageChops.lighter(edit, ImageChops.multiply(S.sil(body), ring))
    l, t, r, b = edit.getbbox()
    w, h = SIZE
    box = [round(1000 * t / h), round(1000 * l / w), round(1000 * min(b + 12, h) / h), round(1000 * r / w)]
    p = PEAK_TXT + json.dumps([{"id": "peak", "desc": "the blue shard in two flat values, right edge broken in two places, "
                                "irregular jagged broken tip, no parallel lines, dark iron collar with a soft shadow under it, a few "
                                "displaced roof tiles tied to it", "from": "ref_image_0", "src_bbox": box, "tgt_bbox": box}])
    done = all(o.exists() for o in outs)
    entry = {"cost": 0.14} if done else batch("peak t1", 2, "final_peak", p, outs, (base,), 91100)
    soft = edit.filter(ImageFilter.GaussianBlur(2))
    res = {"prompt": p, "bbox": box, "cost": entry["cost"], "base": str(base.relative_to(R1)), "before": Q.shard_stats(body),
           "images": {}}
    for o in outs:
        gen = Image.open(o).convert("RGB").resize(SIZE, Image.LANCZOS)
        comp = Image.composite(gen, body, soft)
        comp.save(d / f"edit_{o.stem}.png")
        res["images"][o.name] = {"edit": Q.shard_stats(comp)}
    (d / "peak.json").write_text(json.dumps(res, indent=2))
    print(json.dumps({k: v for k, v in res.items() if k != "prompt"}, indent=1))


def peak_shift(choice):
    """Hue 212 and saturation 0.55 under the shard's own blue mask, 0 $, on the chosen edit."""
    d = OUT / "peak"
    res = json.loads((d / "peak.json").read_text())
    comp = Image.open(d / f"edit_{choice}.png").convert("RGB")
    m = Q.shard_mask(comp).filter(ImageFilter.MinFilter(3))
    out = tint(comp, m, 212, 0.55)
    out.save(d / "mythic_peak.png")
    res["choice"] = choice
    res["shift_mask_pixels"] = int((np.asarray(m) > 0).sum())
    res["after_shift"] = Q.shard_stats(out)
    (d / "peak.json").write_text(json.dumps(res, indent=2))
    print(json.dumps({"choice": choice, "before": res["before"], "after_shift": res["after_shift"]}, indent=1))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("arg", nargs="?")
    a = ap.parse_args()
    f = globals()[a.cmd]
    f(a.arg) if a.arg else f()
