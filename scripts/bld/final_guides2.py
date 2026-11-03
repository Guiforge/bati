#!/usr/bin/env python3
"""Windmill final round: the painting maquettes of the keeper and the clan marks (0 $), into windmill/r1/final/maquettes/.

    python3 scripts/bld/final_guides2.py      # needs gen_final_specs.py run first
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import final_guides as F  # noqa: E402
import maquette_peinture as M  # noqa: E402

if __name__ == "__main__":
    M.LOCAL_LIGHT = True
    F.OUT.mkdir(parents=True, exist_ok=True)
    for n in ("keeper_1", "keeper_2", "keeper_3", "clan_fanion", "clan_banniere", "clan_blason"):
        f = F.OUT / f"{n}.peinture.png"
        if not f.exists():
            M.render(f"pilote/windmill_{n}", f)
