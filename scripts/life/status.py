#!/usr/bin/env python3
"""Writes docs/designs/village/life/status.json from features.json, so the dashboard has one source.

Item fields read besides the required ones: debut, fin, heures, avancement, total, note.
"""
import json
import sys
from pathlib import Path

# Any track with the same features.json: `status.py atelier`.
LIFE = Path(__file__).resolve().parents[2] / "docs/designs/village" / (sys.argv[1] if len(sys.argv) > 1 else "life")
STATUTS = {
    "todo": "à faire",
    "doing": "en cours",
    "done": "fait",
    "blocked": "attend Guillaume",
    "waiting": "attend Guillaume",
    "dropped": "abandonné",
    "paused": "en pause",
}


def main() -> None:
    features = json.loads((LIFE / "features.json").read_text())
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
    (LIFE / "status.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()
