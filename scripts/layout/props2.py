#!/usr/bin/env python3
"""Sets the cells of named props in alentours.ts: props2.py nom=gx,gy[:batiment] ... (L12 hand placement, measured with check)."""
import pathlib
import re
import sys

TS = pathlib.Path(__file__).resolve().parents[2] / "components/village/iso/alentours.ts"
s = TS.read_text()
for a in sys.argv[1:]:
    nom, rest = a.split("=")
    xy, _, bat = rest.partition(":")
    x, y = xy.split(",")
    motif = rf'(\{{ nom: "{nom}", case: \[)-?\d+, -?\d+(\]{(".*batiment: " + chr(34) + bat + chr(34)) if bat else ""})'
    s, n = re.subn(motif, rf"\g<1>{x}, {y}\g<2>", s, count=1)
    if n != 1:
        sys.exit(f"not found: {a}")
TS.write_text(s)
