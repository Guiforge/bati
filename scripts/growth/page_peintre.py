#!/usr/bin/env python3
"""The bake-off's checkpoint page, one file with its boards inlined: scratch/page-peintre.html."""
import base64
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
D = ROOT / "docs/designs/village/growth"
FILES = {"maison": "bakeoff-maison", "souches": "bakeoff-souches", "chemins": "bakeoff-chemins", "maison2": "bakeoff2-maison", "chemins2": "bakeoff2-chemins"}
images = {k: "data:image/jpeg;base64," + base64.b64encode((D / f"img/{f}.jpg").read_bytes()).decode() for k, f in FILES.items()}
page = (ROOT / "scripts/growth/page-peintre.html").read_text()
html = page.replace("/*IMAGES*/{}", json.dumps(images))
assert html != page
(D / "scratch/page-peintre.html").write_text(html)
print(round(len(html) / 1e6, 1), "MB")
