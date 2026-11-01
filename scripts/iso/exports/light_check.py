#!/usr/bin/env python3
"""L2-T07: every stage keeps one material with enough lit and shaded face for iso_audit.light.

    python3 scripts/iso/exports/light_check.py [slug ...]

Same rule as iso_audit.light on the blockout's own `.classes.png`: per material, the face zones
(80 lit, 140 shaded, minus the cast shadow, eroded by light_erode_px) must both reach
light_min_px, and at least one material must. The audit also drops emissive and warm pixels of the
painted image; a blockout has none worth subtracting, so they are not here.
"""

import sys

from PIL import Image, ImageChops

import stage_exports as X

import iso_audit as A  # noqa: E402  (stage_exports put scripts/iso on the path)

T = A.T
# Known short, painted in a later quarter (L2-T07): drop a slug here once its blockout is fixed.
# Props, villagers and the mill's sails are not buildings the audit judges; they stay out of the sweep.
LATER = {"armory_rough", "training_dummy_rough", "training_dummy_solid", "training_dummy_grand"}


def required(slug):
    return not slug.startswith("pieces/") and slug != "windmill_sails" and slug not in LATER


def zones(slug):
    """{material code: (lit px, shaded px)}."""
    r, g, shaded = Image.open(X.L.RENDERS / f"{slug}.classes.png").convert("RGB").split()
    out = {}
    for code in sorted(set(r.get_flattened_data()) - {0}):
        same = r.point(lambda v, c=code: 255 if v == c else 0)
        n = []
        for cls in (80, 140):
            zone = ImageChops.subtract(ImageChops.darker(same, g.point(lambda v, c=cls: 255 if v == c else 0)), shaded)
            n.append(A.count(A.erode(zone, T["light_erode_px"])))
        out[code] = tuple(n)
    return out


def main(argv=None):
    slugs = argv or [s for s in X.all_slugs() if required(s)]
    bad = 0
    for slug in slugs:
        z = zones(slug)
        if not any(min(n) >= T["light_min_px"] for n in z.values()):
            bad += 1
            best = sorted(z.items(), key=lambda kv: -min(kv[1]))[:2]
            print(f"light: {slug}: no material with {T['light_min_px']} lit and shaded px, best {best}")
    print(f"light: {len(slugs) - bad}/{len(slugs)} stages judgeable")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
