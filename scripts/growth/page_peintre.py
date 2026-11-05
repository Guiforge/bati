#!/usr/bin/env python3
"""The bake-off's checkpoint page, one file with its boards inlined: scratch/page-peintre.html."""
import base64
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
D = ROOT / "docs/designs/village/growth"
images = {k: "data:image/jpeg;base64," + base64.b64encode((D / f"img/bakeoff-{k}.jpg").read_bytes()).decode() for k in ("maison", "souches", "chemins")}
page = (ROOT / "scripts/growth/page-peintre.html").read_text()
html = page.replace("/*IMAGES*/{}", json.dumps(images))
assert html != page
(D / "scratch/page-peintre.html").write_text(html)
print(round(len(html) / 1e6, 1), "MB")
