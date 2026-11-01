"""T41 point 1: one board per building, rough | solid | grand as the app draws them (night sprites, or the blockout). Run: python3 -I scripts/iso/t41_stades.py"""
import os
from PIL import Image, ImageDraw, ImageFont

B = "assets/images/village/iso"
OUT = "docs/designs/village-iso-v1/evidence/T41/stades"
SCALE, BG, FG, PAD = 0.5, (28, 28, 32), (230, 230, 230), 16  # one scale for every sprite: buildings share the grid px (isoSpec canvases)
FONT = ImageFont.load_default(size=20)
os.makedirs(OUT, exist_ok=True)
codes = sorted(d for d in os.listdir(B) if d not in ("blockout", "motifs", "pieces", "repos") and os.path.isdir(f"{B}/{d}"))
rows = ["| bâtiment | planche | maquettes |", "|---|---|---|"]
for code in codes:
    cells, maq = [], []
    for st in ("rough", "solid", "grand"):
        p, kind = f"{B}/{code}/{st}.nuit.webp", ""
        if not os.path.exists(p):
            p, kind = f"{B}/blockout/{code}/{st}.nuit.webp", "maquette"
            maq.append(st)
        if not os.path.exists(p):
            maq[-1] += " (aucun)"
            continue
        im = Image.open(p).convert("RGBA")
        cells.append((f"{code} / {st}" + (" / maquette" if kind else ""), im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)))
    W, H = sum(c.width for _, c in cells) + PAD * 4, max(c.height for _, c in cells) + 40 + PAD * 2
    sheet = Image.new("RGB", (W, H), BG)
    d, x = ImageDraw.Draw(sheet), PAD
    for cap, im in cells:
        d.text((x, PAD), cap, fill=FG, font=FONT)
        sheet.paste(im, (x, PAD + 36), im)
        x += im.width + PAD
    sheet.save(f"{OUT}/{code}.png")
    rows.append(f"| {code} | `{OUT}/{code}.png` | {', '.join(maq) or '-'} |")
head = ("# T41 point 1: planches des stades\n\nUne planche par bâtiment, rough | solid | grand, à l'échelle 0,5 commune (tous les bâtiments partagent le pixel de grille). "
        "Nuit seulement : `lumiere.ts` ne teinte pas les sprites, le jour n'est qu'un lavis sous le terrain (T15). "
        "Un stade non peint montre sa maquette, légendée. Script : `scripts/iso/t41_stades.py`.\n\n"
        "**Planche « croissance du village » (paliers 1, 6, 12) : non produite.** Le rendu de la carte et dev-iso ne se capturent que sur l'appareil ; pas d'émulateur dans cette préparation.\n\n")
open("docs/designs/village-iso-v1/reports/T41-planches.md", "w").write(head + "\n".join(rows) + "\n")
print(len(codes))
