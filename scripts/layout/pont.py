#!/usr/bin/env python3
"""Ships bridge B (the proposal's pick) as the repo's `eau/canal_pont` piece: night `.nuit` key on the old file name, day `.jour`.

    python3 scripts/layout/pont.py SRC_DIR     # SRC_DIR holds pont_B.jour.webp and pont_B.nuit.webp (layout/scratch/pont, gitignored)

Copies them to assets/images/village/iso/pieces/eau_canal_pont.webp (night) and eau_canal_pont.jour.webp (day), adds the day key
to components/village/iso/maquettes3.ts as a copy of the night entry (same canvas 512x768, anchor [256, 704], same shadow), and
writes both files' provenance to scripts/provenance.json (derived from the signed candidate a2_c1, cut by cut.py).
"""
import json
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
src = pathlib.Path(sys.argv[1])
DST = ROOT / "assets/images/village/iso/pieces"
shutil.copy(src / "pont_B.nuit.webp", DST / "eau_canal_pont.webp")
shutil.copy(src / "pont_B.jour.webp", DST / "eau_canal_pont.jour.webp")

ts = ROOT / "components/village/iso/maquettes3.ts"
s = ts.read_text()
if '"eau/canal_pont.jour.webp"' not in s:
    i = s.index('  "eau/canal_pont.nuit.webp": {')
    j = s.index("\n  },\n", i) + len("\n  },\n")
    bloc = s[i:j]
    jour = bloc.replace("canal_pont.nuit.webp", "canal_pont.jour.webp").replace("eau_canal_pont.webp", "eau_canal_pont.jour.webp")
    s = s[:j] + jour + s[j:]
    ts.write_text(s)

pj = ROOT / "scripts/provenance.json"
d = json.loads(pj.read_text())
cand = d["docs/designs/village/layout/scratch/pont/a2_c1.png"]
for nom, lum in (("eau_canal_pont.webp", "nuit"), ("eau_canal_pont.jour.webp", "jour")):
    d[f"assets/images/village/iso/pieces/{nom}"] = {
        "derived_from": "docs/designs/village/layout/scratch/pont/a2_c1.png",
        "how": f"bridge B of the layout proposal: green key, despill and a 512x768 canvas (anchor [256, 704]) by docs/designs/village/layout/scratch/pont/cut.py, {lum} grade; replaces the Blender mock-up of the same file name",
        "licence": cand.get("licence", "same as the source render; see that entry"),
    }
pj.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print("done")
