"""T27 point 1: one board per building, app image | iso sprite per stage, then the three sprites. Run: python3 -I scripts/iso/t27_paires.py"""
import os
from PIL import Image, ImageDraw, ImageFont

B = "assets/images/village"
OUT = "docs/designs/village-iso-v1/evidence/T27-paires"
STAGES = [("rough", "_rough"), ("solid", ""), ("grand", "_grand")]
BG, FG, H, PAD = (28, 28, 32), (230, 230, 230), 360, 16
FONT = ImageFont.load_default(size=18)

def load(p):
    return Image.open(p).convert("RGBA") if os.path.exists(p) else None

def fit(im):
    if im is None:
        im = Image.new("RGBA", (H, H), (60, 40, 40, 255))
        ImageDraw.Draw(im).text((20, H // 2), "absent", fill=FG, font=FONT)
    return im.resize((max(1, round(im.width * H / im.height)), H), Image.LANCZOS)

def sprite(code, st):
    p = f"{B}/iso/{code}/{st}.nuit.webp"
    if os.path.exists(p):
        return load(p), "peint"
    return load(f"{B}/iso/blockout/{code}/{st}.nuit.webp"), "maquette"

codes = sorted(d for d in os.listdir(f"{B}/iso") if d not in ("blockout", "motifs", "pieces") and os.path.isdir(f"{B}/iso/{d}"))
rows = ["| bâtiment | planche | stades sans sprite peint | image de l'app absente |", "|---|---|---|---|"]
for code in codes:
    lines, sprites, maq, noapp = [], [], [], []
    for st, suf in STAGES:
        app = load(f"{B}/buildings/{code}{suf}.webp")
        if app is None:
            noapp.append(st)
        sp, kind = sprite(code, st)
        if kind == "maquette":
            maq.append(st + (" (aucune maquette)" if sp is None else ""))
        a, s = fit(app), fit(sp)
        lines.append((f"{code} / {st}: image de l'app | sprite iso ({kind})", [a, s]))
        sprites.append(s)
    lines.append((f"{code}: rough, solid, grand (sprites iso)", sprites))
    W = max(sum(i.width for i in ims) + PAD * (len(ims) + 1) for _, ims in lines)
    sheet = Image.new("RGB", (W, len(lines) * (H + 40 + PAD) + PAD), BG)
    d, y = ImageDraw.Draw(sheet), PAD
    for cap, ims in lines:
        d.text((PAD, y), cap, fill=FG, font=FONT)
        x = PAD
        for im in ims:
            sheet.paste(im, (x, y + 30), im)
            x += im.width + PAD
        y += H + 40 + PAD
    sheet.save(f"{OUT}/{code}.png")
    rows.append(f"| {code} | `{OUT}/{code}.png` | {', '.join(maq) or '-'} | {', '.join(noapp) or '-'} |")

head = ("# T27 point 1: planches des paires\n\nUne planche par bâtiment (21), générée par `scripts/iso/t27_paires.py`. "
        "Par stade : image de l'app à gauche, sprite iso à droite, même hauteur ; en bas, les trois sprites côte à côte. "
        "Un stade sans sprite peint montre sa maquette (blockout), légendée « maquette ». Sans image de l'app, un cadre « absent » est tracé.\n\n")
open("docs/designs/village-iso-v1/reports/T27-paires.md", "w").write(head + "\n".join(rows) + "\n")
print(len(codes), "planches")
