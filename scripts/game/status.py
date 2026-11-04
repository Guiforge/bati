#!/usr/bin/env python3
"""Writes docs/designs/village/game/status.json from features.json, so the dashboard has one source.

Same row format as scripts/life/status.py, which belongs to the LIFE track.
"""
import json
from pathlib import Path

GAME = Path(__file__).resolve().parents[2] / "docs/designs/village/game"
STATUTS = {
    "todo": "à faire",
    "doing": "en cours",
    "done": "fait",
    "blocked": "attend Guillaume",
    "dropped": "abandonné",
}


def main() -> None:
    features = json.loads((GAME / "features.json").read_text())
    rows = []
    for ordre, item in enumerate(features["items"], start=1):
        fini = item["status"] in ("done", "dropped")
        lo, hi = (0, 0) if fini else item["estimate_h"]
        rows.append(
            {
                "id": item["id"],
                "piste": features["piste"],
                "piste_ordre": features["piste_ordre"],
                "etape": item["name"],
                "ordre": ordre,
                "statut": STATUTS[item["status"]],
                "debut": item.get("debut"),
                "fin": item.get("fin"),
                "heures": item.get("heures"),
                "restant_min": lo,
                "restant_max": hi,
                "reste": "fini" if fini else f"{lo} à {hi} h",
                "avancement": item.get("avancement"),
                "total": item.get("total"),
                "note": item.get("note", ""),
            }
        )
    (GAME / "status.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()
