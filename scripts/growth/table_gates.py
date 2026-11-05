#!/usr/bin/env python3
"""The gate lines per tier out of scratch/fixe4/chk/default.txt and haut.txt (passer_gates.py): one row a tier, the counts the 12-tier summary adds up.

    table_gates.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CHK = ROOT / "docs/designs/village/growth/scratch/fixe4/chk"
GATES = ("occlusion", "anchors", "props", "depth", "hooks", "tap")


def main():
    for nom in ("default", "haut"):
        print(f"## {nom}: occlusion / anchors / props / depth / hooks / tap")
        txt = (CHK / f"{nom}.txt").read_text()
        for sec in re.split(r"^== palier ", txt, flags=re.M)[1:]:
            tier = sec.split(" ==")[0]
            row = []
            for g in GATES:
                m = re.search(rf"^GATE {g}: (\d+)", sec, flags=re.M)
                row.append(m.group(1) if m else "?")
            print(f"tier {tier:>2}: " + " / ".join(row))


if __name__ == "__main__":
    main()
