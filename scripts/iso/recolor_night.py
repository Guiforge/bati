"""T36 lot B: one shared hue-selective recolour of the current night sprites. No FLUX, 0 $.
Usage: python3 -I scripts/iso/recolor_night.py [slug ...]   (default: the 15 sprites of lot B)
Writes evidence/T36/lotB-recolor/<slug>.recolor.png, runs the frozen audit A, builds the boards. Writes nothing to assets/."""
import colorsys
import json
import pathlib
import sys


sys.path.insert(0, str(pathlib.Path(__file__).parent))
import iso_audit as A
import iso_loop as I
import isolib as L
from PIL import Image

ISO = L.ROOT / "assets/images/village/iso"
OUT = L.ROOT / "docs/designs/village-iso-v1/evidence/T36/lotB-recolor"
WORK = L.WORK / "recolor"
LOT_B = ["armory_rough", "armory_solid", "heroes_hall_rough", "heroes_hall_solid", "heroes_hall_grand", "tent_rough", "tent_solid",
         "tent_grand", "watchtower_rough", "watchtower_solid", "wizard_tower_rough", "wizard_tower_solid", "wizard_tower_grand",
         "druid_grove_solid", "druid_grove_grand"]

# The one mapping (tuned on heroes_hall and armory). Hue in degrees, s and v in 0..1.
RED_TARGET_HUE, RED_S_MAX, RED_V_MAX = 22.0, 0.42, 0.50      # bright red -> dark brick brown
BLUE_TARGET_HUE, BLUE_S_MAX, BLUE_V_MAX = 205.0, 0.16, 0.60  # light blue and violet -> cold grey


def ramp(x, a, b):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# Round 2 (chef, 31/10): violet and mauve down to the pinks, a floor on the blue's saturation so it stays cold blue-grey, a lower value cap,
# and the shadow side (V < 0.5) pushed toward obsidian. Round 1 stays the default so what passed is reproduced bit for bit.
ROUND2 = False


def map_rgb(rgb):
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in rgb))
    h *= 360
    k = ramp(v, 0.16, 0.30)  # ink and the deepest shadows stay as they are
    k *= 1 - ramp(v, 0.55, 0.75) * ramp(s, 0.05, 0.2) * ramp(h, 25, 40) * (1 - ramp(h, 70, 85))  # lit windows
    if k <= 0:
        return rgb
    w_red = (1 - ramp(min(h, 360 - h), 12, 26)) * ramp(s, 0.30, 0.50) * k
    if ROUND2:
        sat = ramp(s, 0.08, 0.20) if h >= 250 else ramp(s, 0.14, 0.30)
        w_blue = ramp(h, 190, 205) * (1 - ramp(h, 350, 359)) * sat * k
    else:
        w_blue = ramp(h, 190, 205) * (1 - ramp(h, 320, 345)) * ramp(s, 0.14, 0.30) * k
    if w_red:
        hs = h - 360 if h > 180 else h
        h = hs * (1 - w_red) + RED_TARGET_HUE * w_red
        s = s * (1 - w_red) + min(s * 0.6, RED_S_MAX) * w_red
        v = v * (1 - w_red) + min(v, RED_V_MAX) * w_red
    if w_blue:
        if ROUND2:
            shadow = 1 - ramp(v, 0.30, 0.50)
            hs = h - 360 if h > 300 else h
            h = hs * (1 - w_blue) + (BLUE_TARGET_HUE + 8 * shadow) * w_blue
            s = s * (1 - w_blue) + max(0.20, min(s * 0.45, 0.28 + 0.06 * shadow)) * w_blue
            v = v * (1 - w_blue) + min(v, 0.55) * (1 - 0.40 * shadow) * w_blue
        else:
            h = h * (1 - w_blue) + BLUE_TARGET_HUE * w_blue
            s = s * (1 - w_blue) + min(s * 0.45, BLUE_S_MAX) * w_blue
            v = v * (1 - w_blue) + min(v, BLUE_V_MAX) * w_blue
    return tuple(round(c * 255) for c in colorsys.hsv_to_rgb((h % 360) / 360, s, v))


def recolor(rgba: Image.Image) -> Image.Image:
    cache = {}
    px = [(*cache.setdefault(p[:3], map_rgb(p[:3])), p[3]) for p in rgba.convert("RGBA").getdata()]
    out = Image.new("RGBA", rgba.size)
    out.putdata(px)
    return out


def split(slug):
    base, _, stage = slug.rpartition("_")
    return base, stage


def measure(slug, new):
    WORK.mkdir(parents=True, exist_ok=True)
    green = Image.new("RGBA", new.size, (0, 255, 0, 255))
    green.alpha_composite(new)
    orig = WORK / f"{slug}.green.png"
    green.convert("RGB").save(orig)
    pre = WORK / f"{slug}.precut.png"
    new.save(pre)
    r = A.audit(orig, slug, list(new.size), registered_out=WORK / f"{slug}.cut.png", precut=pre, background=A.measure_background(orig), clip=True)
    return r


def board(slug, old, new, res, label=None):
    label = label or slug
    grass = L.hex_rgb(L.raw_colour("isoGrass"))
    H = 480
    base, stage = split(slug)

    def tile(im, text, bgc=grass):
        b = im.getchannel("A").getbbox()
        im = im.crop((max(0, b[0] - 20), max(0, b[1] - 20), b[2] + 20, b[3] + 20)) if b else im
        return I.label(I.on(bgc, im.resize((max(1, round(im.width * H / im.height)), H), Image.LANCZOS)), text)

    failed = [k for k, c in res["checks"].items() if not c["pass"]]
    ts = [tile(old, f"{label} actuel"), tile(new, f"{label} recolore " + ("PASS" if res["pass"] else "fail " + ",".join(failed)))]
    others = [tile(Image.open(p).convert("RGBA"), f"autre stade {p.name.split('.')[0]}") for p in sorted((ISO / base).glob("*.nuit.webp")) if p.name.split(".")[0] != stage]
    page = I.grid([I.grid(ts, 2), I.grid(others, 3)] if others else [I.grid(ts, 2)], 1)
    page.save(OUT / f"{label}_planche.png")


def enter(slug, folder):
    """Ship a reviewed recolour (a PNG in `folder`) under the sprite's own name; its provenance entry keeps the FLUX original."""
    import time

    key = str(I.sprite_path(slug).relative_to(L.ROOT))
    entry = json.loads((L.ROOT / "scripts/provenance.json").read_text())[key]
    I.write_sprite(slug, Image.open(folder / f"{slug}.recolor.png").convert("RGBA"), "flux")
    entry["edited"] = "script"
    entry["recolour"] = {"script": "scripts/iso/recolor_night.py", "date": time.strftime("%Y-%m-%d"), "flux_calls": 0,
                         "how": "hue-selective HSV map: bright reds to brick brown, light blues and violets to cold grey, ink and lit windows kept, alpha unchanged"}
    I.flux.record(key, entry)
    print("entered", key)


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["--enter"]:
        for s in args[2:]:
            enter(s, pathlib.Path(args[1]))
        sys.exit()
    if "--r2" in args:
        ROUND2 = True
        args.remove("--r2")
    if args[:1] == ["--out"]:
        OUT = L.ROOT / args[1]
        args = args[2:]
    OUT.mkdir(parents=True, exist_ok=True)
    table = {}
    for name in args or LOT_B:  # `slug` recolours its current sprite, `slug:cN` the lotBC candidate's cut (lot C)
        slug, _, cand = name.partition(":")
        base, stage = split(slug)
        src = I.candidate_dir(slug) / f"lotBCf3a1_{cand}.adaptive.cut.png" if cand else ISO / base / f"{stage}.nuit.webp"
        old = Image.open(src).convert("RGBA")
        new = recolor(old)
        label = slug + (f"_{cand}" if cand else "")
        new.save(OUT / f"{label}.recolor.png")
        r = measure(slug, new)
        table[label] = [k for k, c in r["checks"].items() if not c["pass"]]
        print(label, "PASS" if r["pass"] else "fail", table[label], flush=True)
        board(slug, old, new, r, label)
    (OUT / "audit.json").write_text(json.dumps(table, indent=1))
