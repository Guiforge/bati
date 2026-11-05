#!/usr/bin/env python3
"""Reads the atelier's check JSON (scratch/fixe3/chk/check-*.json, the last), by tier: the painted pieces under 50 % visible with the tile their
foot stands on (what poser_drops.json is keyed by), the buildings under 85 % visible, and every building or hook box a piece covers.

    lire_gate.py [json]
"""
import glob
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CHK = ROOT / "docs/designs/village/growth/scratch/fixe3/chk"


def main():
    f = sys.argv[1] if len(sys.argv) > 1 else max(glob.glob(str(CHK / "check-*.json")), key=os.path.getmtime)
    d = json.load(open(f))
    for t in d["paliers"]:
        props = sorted((r for r in t["rangs"] if r["tid"].startswith("iso-accessoire-")), key=lambda r: r["idx"])
        out = []
        for r, a in zip(props, t["accessoires"], strict=False):
            if a["nom"].startswith("piece_") and a["visible"] < 0.5:
                out.append(f"{a['nom']} tile {r['tuile']} {a['visible'] * 100:.0f} % by {a['pire']}")
        occ = t["occlusion"]
        hooks = 0
        lines = []
        for o in occ:
            hook = o.get("hook") or {}
            hc = hook.get("couvert", 0) / hook["opaque"] if hook.get("opaque") else 0
            hooks += hc > 0.01
            pieces = [p for p in o.get("pire", []) if "piece_" in p[0]]
            if pieces or o["visible"] < 0.85:
                lines.append(f"{o['code']} visible {o['visible'] * 100:.1f} %, hook covered {hc * 100:.1f} %, by {o.get('pire')}")
        print(f"TIER {t['tier']}: {len(t['accessoires'])} props, {len(out)} pieces under 50 %, {hooks} hooks covered")
        for o in out + lines:
            print("   ", o)


if __name__ == "__main__":
    main()
