"""Strips of the LIFE creatures: frames side by side, day and night (famille_jour.nuit, as the mice's).

    python3 -I scripts/life/creatures_bandes.py

Reads the frames in docs/designs/village/life/creatures-sources/ (provenance-creatures.json says
which flux-3-image generation made each), writes <nom>_bande.webp and <nom>_bande.nuit.webp in
assets/images/village/iso/creatures/, plus dragon_sleep.nuit.webp from the kept dragon_sleep.webp.
Add a creature: drop its frames in creatures-sources/, add a line to BANDES, run, log provenance.
"""
import pathlib
import sys

R = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(R / "scripts/iso"))
from famille_jour import nuit
from PIL import Image

SRC = R / "docs/designs/village/life/creatures-sources"
D = R / "assets/images/village/iso/creatures"
BANDES = {
    "mouse": ["mouse_run_a", "mouse_run_b", "mouse_sit"],
    "cat": ["cat_walk_a", "cat_walk_b", "cat_sit"],
    "bird": ["bird_wings_up", "bird_wings_down", "bird_perched"],
}
for nom, frames in BANDES.items():
    ims = [Image.open(SRC / f"{f}.webp").convert("RGBA") for f in frames]
    w, h = ims[0].size
    assert all(i.size == (w, h) for i in ims)
    bande = Image.new("RGBA", (w * len(ims), h), (0, 0, 0, 0))
    for k, im in enumerate(ims):
        bande.paste(im, (k * w, 0))
    bande.save(D / f"{nom}_bande.webp", "WEBP", quality=90, method=6)
    nuit(bande, None).save(D / f"{nom}_bande.nuit.webp", "WEBP", quality=90, method=6)
    print(nom, bande.size)
dragon = Image.open(D / "dragon_sleep.webp").convert("RGBA")
nuit(dragon, None).save(D / "dragon_sleep.nuit.webp", "WEBP", quality=90, method=6)
