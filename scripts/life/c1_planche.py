"""C1 comparison board: Blender vs FLUX vs "peinture et code" (one painted frame + cheap transforms).
No FLUX call. Run: python3 scripts/life/c1_planche.py [creature ...]
Writes mp4 loops, one contact sheet per creature and planche.json in docs/designs/village/life/scratch/c1/planche/.
Panels are in device px (density 2.625 is already in the sprite sizes: mouse 48, cat 64, bird 56, dragon 240).
Night: the real night ground tile + the night veil rgba(15,42,107,0.42) of constants/rawColors.ts isoNuitVoile.
"""
import glob
import json
import math
import pathlib
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
C1 = ROOT / "docs/designs/village/life/scratch/c1"
OUT = C1 / "planche"
SOL = ROOT / "assets/images/village/iso/sol"
FPS, N, X3 = 24, 72, 3
STEAD = json.loads((C1 / "flux/steadiness.json").read_text())
# t: target px; frame names (rest, A, B) per source; path: slide in px; panel: real-scale canvas
SPEC = {
    "mouse": dict(t=48, blender=("sit", "runA", "runB"), flux=("sit", "run_a", "run_b"), path=70, panel=(220, 120)),
    "cat": dict(t=64, blender=("sit", "walkA", "walkB"), flux=("sit", "walk_a", "walk_b"), path=70, panel=(240, 130)),
    "bird": dict(t=56, blender=("perch", "up", "down"), flux=("perched", "wings_up", "wings_down"), path=20, panel=(160, 120)),
    "dragon": dict(t=240, blender=("breatheIn", "breatheIn", "breatheOut"), flux=("breathe_in", "breathe_in", "breathe_out"), path=0, panel=(320, 270)),
}
FR = {"blender": "Blender", "flux": "FLUX (images multiples)", "code": "Peinture et code"}


def trim(im):
    return im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())


def steadiest(c):
    return min("ab", key=lambda v: STEAD[f"{c}_{v}"]["whole_silhouette_mismatch"])


def scaled(c, ims):
    """One factor for the whole set, from its first frame: long side = target (dragon: width)."""
    ims = [trim(i.convert("RGBA")) for i in ims]
    r = ims[0]
    k = SPEC[c]["t"] / (r.width if c == "dragon" else max(r.size))
    return [i.resize((max(1, round(i.width * k)), max(1, round(i.height * k))), Image.LANCZOS) for i in ims]


def load_set(c, method):
    s = SPEC[c]
    if method == "blender":
        paths = [C1 / f"blender/{c}_{n}.png" for n in s["blender"]]
    else:
        paths = [C1 / f"flux/{c}_{steadiest(c)}_{n}.png" for n in s["flux"]]
    return scaled(c, [Image.open(p) for p in paths])


def first_frame(c):
    p = sorted(glob.glob(str(C1 / f"flux/{c}_{steadiest(c)}_*.png")))[0]
    return scaled(c, [Image.open(p)])[0], pathlib.Path(p).name


_g = {}


def ground(night, size):
    if night not in _g:
        g = Image.open(SOL / ("terrain_00.nuit.webp" if night else "terrain_00.webp")).convert("RGBA")
        _g[night] = g.resize((round(g.width * .4), round(g.height * .4)), Image.LANCZOS)
    return _g[night].crop((160, 160, 160 + size[0], 160 + size[1]))


def veil(im, night):
    if not night:
        return im
    a = im.getchannel("A")
    o = Image.alpha_composite(im, Image.new("RGBA", im.size, (15, 42, 107, round(255 * .42))))
    o.putalpha(a)
    return o


def compose(c, spr, cx, feet, night=False, flip=False, dy=0, size=None):
    """Sprite bottom-centre on (cx, feet); soft slate contact shadow under it, no painted shadow."""
    size = size or SPEC[c]["panel"]
    p = ground(night, size).copy()
    if flip:
        spr = spr.transpose(Image.FLIP_LEFT_RIGHT)
    w = spr.width
    sh = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((cx - .38 * w, feet - .08 * w, cx + .38 * w, feet + .08 * w), fill=(46, 53, 82, 120))
    p.alpha_composite(sh.filter(ImageFilter.GaussianBlur(max(1.5, w * .03))))
    p.alpha_composite(veil(spr, night), (round(cx - w / 2), round(feet - spr.height + dy)))
    return p


def x3(p, c):
    if c == "dragon":  # head detail: 3x of a 120x80 window at the lower right of the panel
        w, h = p.size
        p = p.crop((w - 140, h - 130, w - 20, h - 50))
    return p.resize((p.width * X3, p.height * X3), Image.NEAREST)


# --- peinture et code: transforms a phone does cheaply ------------------------------------------
def squash(s, d):  # d px wider and d px flatter (negative: stretch)
    return s.resize((s.width + d, s.height - d), Image.BICUBIC)


def wing(s, deg):
    """Split of the folded wing along a blurred ellipse, rotated about its root; the body keeps the old wing underneath."""
    w, h = s.size
    m = Image.new("L", s.size, 0)
    ImageDraw.Draw(m).ellipse((.03 * w, .22 * h, .50 * w, .62 * h), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1))
    layer = s.copy()
    layer.putalpha(ImageChops.multiply(s.getchannel("A"), m))
    layer = layer.rotate(deg, resample=Image.BICUBIC, center=(.5 * w, .4 * h))
    o = s.copy()
    o.alpha_composite(layer)
    return o


def flank(s, k):
    """Vertical stretch k of the flank region only (blurred mask), bottom anchored."""
    w, h = s.size
    st = s.resize((w, round(h * (1 + k))), Image.BICUBIC)
    big = st.crop((0, st.height - h, w, st.height))
    m = Image.new("L", s.size, 0)
    ImageDraw.Draw(m).rectangle((.04 * w, .35 * h, .62 * w, .92 * h), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(max(2, w * .04)))
    return Image.composite(big, s, m)


def code_frame(c, spr, t, moving, step):
    if c == "dragon":
        return flank(spr, .03 * (1 - math.cos(2 * math.pi * t)) / 2), 0
    if c == "bird":
        return wing(spr, 8 * math.sin(2 * math.pi * t * 8)), round(-1.5 * abs(math.sin(2 * math.pi * t * 4)))
    if not moving:
        return spr, 0
    return squash(spr, 2 if step % 2 else -2), -1 if step % 2 else 0


def path(c, t):
    """x offset, facing right, moving: walk right, pause, walk back flipped, pause."""
    L = SPEC[c]["path"]
    if t < .4:
        return L * t / .4, True, True
    if t < .5:
        return L, True, False
    if t < .9:
        return L * (1 - (t - .5) / .4), False, True
    return 0, False, False


def pick(c, seq, t, moving, step):
    rest, a, b = seq
    if c == "dragon":
        return a if t < .5 else b
    if c == "bird":
        return rest if t < .25 else (a, a, b, b)[step % 4]
    return (a, b)[step % 2] if moving else rest


def video(c, method, seq, code=None):
    pw, ph = SPEC[c]["panel"]
    d = pathlib.Path(tempfile.mkdtemp(dir=OUT))
    for i in range(N):
        t = i / N
        x, right, moving = path(c, t)
        step = int(t * 18)
        if method == "code":
            spr, dy = code_frame(c, code, t, moving, step)
        else:
            spr, dy = pick(c, seq, t, moving, step), 0
        cx = pw / 2 if c == "dragon" else pw * .3 + x
        left = compose(c, spr, cx, ph - 22, flip=(not right and c in ("mouse", "cat")), dy=dy)
        rt = x3(left, c)
        f = Image.new("RGB", (pw + 8 + rt.width, max(ph, rt.height)), (20, 20, 24))
        f.paste(left.convert("RGB"), (0, 0))
        f.paste(rt.convert("RGB"), (pw + 8, 0))
        f.save(d / f"{i:03d}.png")
    out = OUT / f"{c}_{method}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(d / "%03d.png"), "-vf",
                    "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(out)], check=True)
    shutil.rmtree(d)
    return out.name


def cell(c, spr, night):
    pad = 14
    size = (spr.width + 2 * pad, spr.height + 2 * pad)
    p = compose(c, spr, size[0] / 2, size[1] - pad, night, size=size)
    return p.convert("RGB"), x3(p, c).convert("RGB")


def sheet(c, rows):
    font = ImageFont.truetype("/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf", 13)
    W = 1600
    lines = [(f"{FR[m]} ({n})", fr, False) for m, n, fr in rows] + [(f"{FR[m]}, nuit", [fr[0]], True) for m, n, fr in rows]
    built = []
    for lab, frames, nt in lines:
        cells = [cell(c, f, nt) for f in frames]
        assert sum(r.width + b.width + 24 for r, b in cells) + 8 <= W, (c, lab, "row too wide")
        built.append((lab, cells, max(b.height for _, b in cells)))
    img = Image.new("RGB", (W, 40 + sum(h + 26 for _, _, h in built)), (24, 24, 28))
    d = ImageDraw.Draw(img)
    d.text((8, 8), f"{c} : réel puis x3 sans lissage, pour chaque image", font=font, fill="white")
    y = 36
    for lab, cells, h in built:
        d.text((8, y), lab, font=font, fill=(255, 220, 140))
        y += 20
        x = 8
        for r, b in cells:
            img.paste(r, (x, y))
            img.paste(b, (x + r.width + 6, y))
            x += r.width + b.width + 24
        y += h + 6
    img.crop((0, 0, W, y + 4)).save(OUT / f"{c}.png")
    return f"{c}.png"


def main():
    OUT.mkdir(exist_ok=True)
    plan_f = OUT / "planche.json"
    plan = json.loads(plan_f.read_text()) if plan_f.exists() else {}
    for c in sys.argv[1:] or list(SPEC):
        v = steadiest(c)
        st = STEAD[f"{c}_{v}"]
        bl, fl = load_set(c, "blender"), load_set(c, "flux")
        base, src = first_frame(c)
        if c in ("mouse", "cat"):
            cf, cn = [base, squash(base, 2), squash(base, -2), base.transpose(Image.FLIP_LEFT_RIGHT)], "base, squash, stretch, flip"
        elif c == "bird":
            cf, cn = [wing(base, a) for a in (-8, 0, 8)], "aile -8, 0, +8 degrés"
        else:
            cf, cn = [flank(base, 0), flank(base, .03)], "flanc 0 %, +3 %"
        vids = {"blender": video(c, "blender", bl), "flux": video(c, "flux", fl), "code": video(c, "code", None, base)}
        keep = (lambda f: f[1:]) if c == "dragon" else (lambda f: f)  # dragon: blender/flux in+in+out, show in and out
        sh = sheet(c, [("blender", "toutes les images", keep(bl)), ("flux", f"variante {v}", keep(fl)), ("code", cn, cf)])
        steady = {"whole_silhouette_mismatch": st["whole_silhouette_mismatch"], "pixel_change_0_1": st["pixel_change_0_1"]}
        plan[c] = {"sheet": sh, "methods": {
            "blender": {"video": vids["blender"], "steadiness": None},
            "flux": {"video": vids["flux"], "variant": v, "steadiness": steady},
            "code": {"video": vids["code"], "source_frame": src, "steadiness": steady}}}
        print("ok", c)
    plan_f.write_text(json.dumps(plan, indent=1, ensure_ascii=False))


main()
