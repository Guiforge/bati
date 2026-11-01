# Regenerates iso-tap-alpha.json for __tests__/iso-tap-precision.test.ts: the full-resolution alpha
# of every building sprite (alpha >= 128, as iso_audit.binary and the sidecar masks), run-length
# coded per sprite, row-major, alternating clear/opaque runs starting with clear. Jest cannot
# decode WebP. Keys are the MAQUETTES keys (blockout/ dropped).
#   python3 -I __tests__/data/iso-tap-alpha.py
import json
import pathlib

from PIL import Image

root = pathlib.Path(__file__).resolve().parents[2]
iso = root / "assets/images/village/iso"
out = {}
for f in sorted(iso.rglob("*.nuit.webp")):
    rel = f.relative_to(iso).as_posix()
    key = rel.removeprefix("blockout/")
    # The wall pieces (F4) carry their own masks (components/village/iso/rempartMasques.ts); fields are no target.
    if key.split("/")[0] in ("pieces", "decor", "eau", "villageois", "echafaudage", "rempart", "champs"):
        continue
    # The painted sprite wins, as in the index: blockout/ sorts after it and used to overwrite it (F2).
    if rel != key and (iso / key).exists():
        continue
    img = Image.open(f).convert("RGBA")
    runs, cur, n = [], 0, 0
    for a in img.getchannel("A").getdata():
        v = 1 if a >= 128 else 0
        if v == cur:
            n += 1
        else:
            runs.append(n)
            cur, n = v, 1
    runs.append(n)
    out[key] = {"w": img.width, "h": img.height, "runs": runs}
(root / "__tests__/data/iso-tap-alpha.json").write_text(json.dumps(out, separators=(",", ":")))
print(len(out), "sprites")
