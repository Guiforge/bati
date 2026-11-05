#!/usr/bin/env python3
"""The painted pieces whose foot cell (`case`, the one the depth order reads) is a path or bridge cell of isoLayout.json: villagers walk there.
poser.py already leaves out the pieces whose plate cell is one; this lists the rest, where only the picture's bottom edge touches the path.

    pieces_sur_chemin.py
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
L = json.loads((ROOT / "constants/isoLayout.json").read_text())
D, SOL = L["debut"], L["sol"]
RUE = {tuple(c) for c in L["rue"]["cases"]}


def main():
    txt = (ROOT / "components/village/iso/piecesPosees.ts").read_text()
    n = 0
    for m in re.finditer(r'nom: "(piece_\w+)",\s*case: \[(-?\d+), (-?\d+)\],\s*pied: \[([-\d.]+), ([-\d.]+)\],\s*palier: (\d+)', txt):
        nom, cx, cy, _px, _py, pal = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4), m.group(5), m.group(6)
        s = SOL[cy - D][cx - D] if 0 <= cy - D < len(SOL) and 0 <= cx - D < len(SOL[0]) else None
        if s in ("#", "=") or (cx, cy) in RUE:
            n += 1
            print(f"{nom} case [{cx}, {cy}] tier {pal}: sol {s!r}{' (street)' if (cx, cy) in RUE else ''}")
    print(n, "pieces with their foot cell on a path")


if __name__ == "__main__":
    main()
