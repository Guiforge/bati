#!/usr/bin/env python3
"""Rewrites the track's status.json from features.json, after applying any `ID=status` arguments.
    status.py T1=done T4=doing"""
import json
import pathlib
import sys

D = pathlib.Path(__file__).resolve().parent.parent.parent / "docs/designs/village/traces"
LABEL = {"todo": "à faire", "doing": "en cours", "waiting": "attend Guillaume", "done": "fait", "paused": "en pause", "dropped": "abandonné"}

f = json.loads((D / "features.json").read_text())
for arg in sys.argv[1:]:
    item_id, status = arg.split("=")
    assert status in LABEL, status
    next(i for i in f["items"] if i["id"] == item_id)["status"] = status
(D / "features.json").write_text(json.dumps(f, ensure_ascii=False, indent=2) + "\n")

rows = []
for rank, it in enumerate(f["items"], 1):
    lo, hi = (0, 0) if it["status"] == "done" else it["estimate_h"]
    rows.append({"id": it["id"], "piste": f["piste"], "piste_ordre": f["piste_ordre"], "etape": it["name"], "ordre": rank,
                 "statut": LABEL[it["status"]], "debut": None, "fin": None, "heures": None, "restant_min": lo, "restant_max": hi,
                 "reste": "fini" if it["status"] == "done" else f"{lo} à {hi} h", "avancement": None, "total": None, "note": it["note"]})
(D / "status.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
