"""Planche de la sonde 00: sprite actuel | nuit a3 detouree | jour a3 detouree. Run: python3 -I scripts/iso/sonde00_planche.py"""
import pathlib
from PIL import Image

D = pathlib.Path.home() / ".cache/bati-art-loop/iso/heroes_hall_grand"
files = [pathlib.Path("assets/images/village/iso/heroes_hall/grand.nuit.webp"), D / "p0na3_c0.adaptive.cut.png", D / "p0ja3_c0.adaptive.cut.png"]
tiles = []
for f in files:
    im = Image.open(f).convert("RGBA")
    bg = Image.new("RGBA", im.size, (58, 58, 58, 255)); bg.alpha_composite(im)
    tiles.append(bg.convert("RGB").resize((720, 900)))
out = Image.new("RGB", (720 * 3, 900), (58, 58, 58))
for i, t in enumerate(tiles):
    out.paste(t, (720 * i, 0))
out.save("docs/designs/village-loop/evidence/probe-00/planche.png")
print(out.size)
