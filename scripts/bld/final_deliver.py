#!/usr/bin/env python3
"""Windmill r1 final: the delivery (0 $, no FLUX). Writes into windmill/r1/final/.

    python3 scripts/bld/final_deliver.py deliver    # sprites jour and nuit at the pipeline layout, manifest.json
    python3 scripts/bld/final_deliver.py strips     # bande_nuit.png and gags.png

Layout (pipeline.md section 1: assets/images/village/iso/<code>/<stade>.jour.webp, <stade>.nuit.webp and their .json):
  final/assets/images/village/iso/windmill/<stade>.jour.webp|.nuit.webp   the five tower paintings (canvas 896 x 1344, anchor 448, 1280)
  final/assets/images/village/iso/windmill/sails/<sheet>.jour|.nuit.webp  the six sail sheets (768 x 768, hub at the centre)
  final/assets/images/village/iso/windmill/rubans.behind|front.jour|.nuit.webp   the ribbons cut in two layers by the maquette's masks
  final/assets/images/village/iso/windmill/elements/<name>.jour|.nuit.webp  teasers, add-on, gags, keeper, clan marks (canvas 896 x 1344)
The night is a grade of the day (famille_jour.nuit, the same one every family uses), no FLUX; the mythic's sails and peak get a
blue lift on top of it (the card: they glow blue at night, the glow itself is code). Ground patch: not painted, see the report.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "iso"))
import final_bande as B  # noqa: E402
import final_elements as E  # noqa: E402
import final_paint as P  # noqa: E402
import numpy as np  # noqa: E402
from famille_jour import nuit  # noqa: E402
from iso_loop import BUDGET  # noqa: E402
from PIL import Image, ImageChops, ImageFilter  # noqa: E402

Q, S, OUT = P.Q, P.S, P.OUT
DEST = OUT / "assets/images/village/iso/windmill"
GLOW = (0x6F, 0xA0, 0xE0)


def night(im, blue=0.0, mask=None):
    n = nuit(im, Image.new("L", im.size, 0))
    if blue:
        m = (mask if mask is not None else im.getchannel("A")).filter(ImageFilter.GaussianBlur(1))
        tinted = Image.blend(n.convert("RGB"), Image.new("RGB", n.size, GLOW), blue)
        out = Image.composite(tinted, n.convert("RGB"), m).convert("RGBA")
        out.putalpha(im.getchannel("A"))
        return out
    return n


def save(im, path, meta):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=90, method=6)
    path.with_suffix(".json").write_text(json.dumps(meta) + "\n")


def cost_of(prefix):
    b = json.loads(BUDGET.read_text())["v1"]["batches"]
    mine = [x for x in b if x["label"].startswith(prefix)]
    return round(sum(x["cost"] for x in mine), 4), len(mine)


def rel(p):
    return str(pathlib.Path(p).relative_to(P.R1))


def deliver():
    man = {"model": "FLUX 3 Image (flux-3-image) through iso_loop's registry", "layout": str(DEST.relative_to(OUT)), "elements": []}
    bande = json.loads((OUT / "bande.json").read_text())
    for s in S.STAGES:
        tower, ctl = Q.cut_of(s, P.final_raw(s))
        base = {"canvas": [896, 1344], "anchor": [448, 1280]}
        save(tower, DEST / f"{s}.jour.webp", base)
        shard = None
        if s == "mythic":  # the peak glows blue at night (tint by script)
            from final_paint import Q as _Q
            shard = _Q.shard_mask(tower.convert("RGB"))
        save(night(tower, 0.25 if shard else 0.0, shard), DEST / f"{s}.nuit.webp", base)
        src = rel(P.final_raw(s))
        c = cost_of("final peak")[0] if s == "mythic" else 0.0
        man["elements"].append({"name": s, "paths": [f"{s}.jour.webp", f"{s}.nuit.webp"], "source": src,
                                "kept_from": "sondes3" if s in ("rough", "solid") else "sondes4 (breeches edit)"
                                + (" + final/peak (bbox edit, hue 212 sat 0.55 shift)" if s == "mythic" else ""),
                                "cost_usd": c, "controls": bande[s], "night": "grade of the day"
                                + ("; blue lift on the peak" if s == "mythic" else "")})
    for name, spec in E.ELEMENTS.items():
        d = OUT / "elements" / name
        if not (d / "controle.json").exists():
            man["elements"].append({"name": name, "status": "not painted"})
            continue
        ctl = json.loads((d / "controle.json").read_text())
        cut = Image.open(d / "coupe" / ctl["best"]).convert("RGBA")
        cost, n = cost_of(f"final {name} t")
        meta = {"canvas": list(cut.size), "source": rel(spec["maq"]), "brut": ctl["best"]}
        if name.startswith("sails"):
            save(cut, DEST / "sails" / f"{name}.jour.webp", meta)
            save(night(cut, 0.25 if name == "sails_legendary" else 0.0), DEST / "sails" / f"{name}.nuit.webp", meta)
            paths = [f"sails/{name}.jour.webp", f"sails/{name}.nuit.webp"]
        elif name == "rubans":
            behind, front = B.ribbon_layers()
            paths = []
            for lay, im in (("behind", behind), ("front", front)):
                save(im, DEST / f"rubans.{lay}.jour.webp", meta)
                save(night(im, 0.3), DEST / f"rubans.{lay}.nuit.webp", meta)
                paths += [f"rubans.{lay}.jour.webp", f"rubans.{lay}.nuit.webp"]
        else:
            save(cut, DEST / "elements" / f"{name}.jour.webp", meta)
            save(night(cut), DEST / "elements" / f"{name}.nuit.webp", meta)
            paths = [f"elements/{name}.jour.webp", f"elements/{name}.nuit.webp"]
        man["elements"].append({"name": name, "paths": paths, "source": meta["source"], "brut": rel(d / "brut" / ctl["best"]),
                                "cost_usd": cost, "batches": n, "attempts": ctl["attempts"], "failed": ctl["failed"],
                                "controls": ctl["images"][ctl["best"]], "prompt": ctl["prompt"]})
    peak = json.loads((OUT / "peak/peak.json").read_text())
    man["peak"] = {k: peak[k] for k in ("bbox", "cost", "choice", "before", "after_shift")}
    man["cost_total_usd"] = P.spent_job()
    (OUT / "manifest.json").write_text(json.dumps(man, indent=2, default=float))
    print("manifest", len(man["elements"]), "entries, cost", man["cost_total_usd"])


def strips():
    rib = B.ribbon_layers()
    sprites = []
    for s in S.STAGES:
        day, _ = B.stage_sprite(s, rib if s == "mythic" else None)
        glow = s == "mythic"
        sprites.append(night(day, 0.2 if glow else 0.0) if not glow else night_mythic(day))
    B.strip(sprites, OUT / "bande_nuit.png", bg=(24, 30, 52))
    # gags.png: the gags in rank order, r2 r4 r6 (horse, and the knight on the sails' blade) r8 r10, each cut to its box
    names = ["gag_r2", "gag_r4", "gag_r6", "sails_grand_chevalier", "gag_r8", "gag_r10"]
    tiles = []
    for n in names:
        ctl = json.loads((OUT / "elements" / n / "controle.json").read_text())
        im = Image.open(OUT / "elements" / n / "coupe" / ctl["best"]).convert("RGBA")
        if n.startswith("sails"):  # the knight on the outer third of blade 0 (up right): crop around him
            im = im.crop((470, 60, 700, 290))
        else:
            im = im.crop(im.getchannel("A").getbbox())
        tiles.append(im.resize((round(im.width * 1.0), round(im.height * 1.0)), Image.LANCZOS))
    h = max(t.height for t in tiles) + 20
    sheet = Image.new("RGB", (sum(t.width + 24 for t in tiles) + 24, h), P.Q.GREEN)
    x = 24
    for t in tiles:
        sheet.paste(t, (x, h - 10 - t.height), t)
        x += t.width + 24
    sheet.save(OUT / "gags.png")


def night_mythic(day):
    """The mythic's night: the grade, a blue lift on the sails and on the peak (the glow itself is code)."""
    n = nuit(day, Image.new("L", day.size, 0))
    shard = Q.shard_mask(day.convert("RGB"))
    px, py, k = B.pivot_px("mythic")
    sheet = B.best_cut("sails_legendary")
    m = Image.new("L", day.size, 0)
    sz = round(sheet.width * k)
    m.paste(sheet.getchannel("A").resize((sz, sz), Image.LANCZOS), (px - sz // 2, py - sz // 2))
    lift = ImageChops.lighter(m, shard)
    tinted = Image.blend(n.convert("RGB"), Image.new("RGB", n.size, GLOW), 0.22)
    out = Image.composite(tinted, n.convert("RGB"), lift.filter(ImageFilter.GaussianBlur(1))).convert("RGBA")
    out.putalpha(day.getchannel("A"))
    return out


if __name__ == "__main__":
    globals()[sys.argv[1]]()
