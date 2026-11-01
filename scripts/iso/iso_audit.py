"""Audit (A) of the iso POC: the cut, the registration, and every measure a painting must pass.

    python3 scripts/iso/iso_loop.py audit <slug> <attempt>     # how it is normally run
    python3 scripts/iso/test_audit.py                          # proves it rejects what it should

The cut and the checks live in one file on purpose: both are frozen after the probe (STATE.md
holds this file's sha256), and a cut that could change while the checks stay frozen would let a
candidate through by the side door.

The cut is a global key on the magenta, not a flood from the corners like cutout.py: a flood
cannot reach the closed gaps of a frame (the watchtower's), and those must empty too. Distance is
ΔE76 in Lab. Under `key_de` is background. The one-pixel ring that touches the background takes
a soft alpha between `key_de` and `soft_de` and loses its magenta spill; anything further in is
left as painted, so a real magenta fringe two pixels wide survives the cut and is caught below
rather than quietly sanded off.

Then registration: translation and one uniform scale, searched on the hole-filled masks at a
quarter and then half resolution (the only place resolution drops), within `reg_max_scale` and
`reg_max_shift_px`. A best fit on the edge of that box is a fit that wanted to go further, and is
refused.

Every measure is at full resolution, on the registered cut, with Pillow's C filters: MinFilter /
MaxFilter for rings, ImageChops for set algebra, `point()` tables for thresholds.
"""

import json
import math
import pathlib

from PIL import Image, ImageChops, ImageCms, ImageDraw, ImageFilter, ImageStat

import isolib as L

THRESHOLDS_FILE = pathlib.Path(__file__).with_name("audit-thresholds.json")
T = json.loads(THRESHOLDS_FILE.read_text(encoding="utf-8"))

_LAB = ImageCms.buildTransform(ImageCms.createProfile("sRGB"), ImageCms.createProfile("LAB"), "RGB", "LAB")


def _lab(rgb: Image.Image) -> bytes:
    """Pillow LAB bytes: L* = v * 100 / 255; a* and b* are signed bytes (SIGNED below).

    Not an offset of 128, whatever getdata() seems to show: until 2026-10-28 this module read
    them as offsets, which made any ΔE across a* = 0 or b* = 0 wrong. The key was unaffected
    (magenta and green sit far from both zeros); the palette measures would not have been.
    """
    return ImageCms.applyTransform(rgb, _LAB).tobytes()


SIGNED = [v - 256 if v > 127 else v for v in range(256)]
KEY = L.ISO["background"]["key"]


def delta_e(rgb: Image.Image, colour: str = KEY) -> Image.Image:
    """ΔE76 to `colour`, per pixel, clamped to 255."""
    kl, ka, kb = _lab(Image.new("RGB", (1, 1), L.hex_rgb(colour)))
    dl2 = [((v - kl) * 100 / 255) ** 2 for v in range(256)]
    da2 = [(SIGNED[v] - SIGNED[ka]) ** 2 for v in range(256)]
    db2 = [(SIGNED[v] - SIGNED[kb]) ** 2 for v in range(256)]
    lab = _lab(rgb)
    out = bytes(min(255, math.isqrt(round(dl2[l] + da2[a] + db2[b])))
                for l, a, b in zip(lab[0::3], lab[1::3], lab[2::3]))
    return Image.frombytes("L", rgb.size, out)


def binary(image: Image.Image, at: int = 128) -> Image.Image:
    return image.point(lambda v: 255 if v >= at else 0)


def count(mask: Image.Image) -> int:
    return mask.histogram()[255]


def erode(mask: Image.Image, px: int) -> Image.Image:
    for _ in range(px):
        mask = mask.filter(ImageFilter.MinFilter(3))
    return mask


def dilate(mask: Image.Image, px: int) -> Image.Image:
    for _ in range(px):
        mask = mask.filter(ImageFilter.MaxFilter(3))
    return mask


def spill(bands, colour: str) -> Image.Image:
    """How much a pixel leans toward the key: its weakest key channel over its strongest other one.

    Magenta: min(R, B) - G. Green: G - max(R, B). One formula, so the second probe's green key
    (Guillaume, 2026-10-28) is measured exactly the way the magenta one was.
    """
    # A channel is "hot" at half the key's strongest one or more: the same split as >= 128 for pure
    # magenta and green, and still one for a measured navy backdrop (Guillaume's adaptive cut).
    rgb = L.hex_rgb(colour)
    hot = [band for band, c in zip(bands, rgb) if c >= max(rgb) / 2]
    cold = [band for band, c in zip(bands, rgb) if c < max(rgb) / 2]
    if not cold:  # a grey backdrop has no hue to lean toward
        return Image.new("L", bands[0].size, 0)
    low = hot[0] if len(hot) == 1 else ImageChops.darker(*hot[:2])
    high = cold[0] if len(cold) == 1 else ImageChops.lighter(*cold[:2])
    return ImageChops.subtract(low, high)


def key(rgb: Image.Image, colour: str = KEY) -> Image.Image:
    """The cut: the key colour out, the touching ring soft and despilled, the rest as painted."""
    de = delta_e(rgb, colour)
    hard = de.point(lambda v: 255 if v >= T["key_de"] else 0)
    ring = ImageChops.subtract(hard, erode(hard, 1))
    span = T["soft_de"] - T["key_de"]
    soft = de.point(lambda v: 0 if v < T["key_de"] else 255 if v >= T["soft_de"] else int(255 * (v - T["key_de"]) / span))
    alpha = Image.composite(soft, hard, ring)
    bands = list(rgb.split())
    lean = spill(bands, colour)
    key_rgb = L.hex_rgb(colour)
    for i, c in enumerate(key_rgb):
        if c >= max(key_rgb) / 2:
            bands[i] = Image.composite(ImageChops.subtract(bands[i], lean), bands[i], ring)
    return Image.merge("RGBA", (*bands, alpha))


def measure_background(original: pathlib.Path, band: int = 16) -> str:
    """The background FLUX actually painted: the median of a `band` px border of the signed original.

    Guillaume, 2026-10-28: asked for night, FLUX darkens the key (magenta came back as far as
    #C517BA), and a key on pure magenta leaves it all. The key and the despill then work around
    this measured colour. A pink that soaked into the stone is not background and still fails the
    palette (its violet share): the border sees only the backdrop, never the building.
    """
    image = Image.open(original).convert("RGB")
    w, h = image.size
    boxes = [(0, 0, w, band), (0, h - band, w, h), (0, band, band, h - band), (w - band, band, w, h - band)]
    pixels = [p for box in boxes for p in image.crop(box).get_flattened_data()]
    median = [sorted(p[i] for p in pixels)[len(pixels) // 2] for i in range(3)]
    return "#{:02X}{:02X}{:02X}".format(*median)


def clip_to(image: Image.Image, ref: Image.Image) -> Image.Image:
    """Clear everything outside the blockout's silhouette grown by `clip_px` (second probe).

    A painted cast shadow, a spark or a stray tuft lies outside the shape we modelled; the app draws
    its own shadow (§5.6), so whatever is out there is by definition not part of the sprite. Applied
    after registration, so the grown silhouette sits where the painting now is.
    """
    keep = dilate(ref, T["clip_px"])
    alpha = ImageChops.darker(image.getchannel("A"), keep)
    out = image.copy()
    out.putalpha(alpha)
    return out


def fill_holes(mask: Image.Image) -> Image.Image:
    w, h = mask.size
    padded = Image.new("L", (w + 2, h + 2), 0)
    padded.paste(mask, (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128, thresh=0)
    return padded.crop((1, 1, w + 1, h + 1)).point(lambda v: 0 if v == 128 else 255)


def place(image: Image.Image, scale: float, dx: float, dy: float, anchor, size) -> Image.Image:
    """Scale `image` about `anchor`, then shift it: the registration transform."""
    if scale != 1:
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    out = Image.new(image.mode, size, 0)
    out.paste(image, (round(anchor[0] * (1 - scale) + dx), round(anchor[1] * (1 - scale) + dy)))
    return out


def iou(a: Image.Image, b: Image.Image) -> float:
    union = count(ImageChops.lighter(a, b))
    return count(ImageChops.darker(a, b)) / union if union else 0.0


def register(cand: Image.Image, ref: Image.Image, anchor) -> dict:
    """Best (scale, dx, dy) taking the filled candidate mask onto the filled blockout mask."""
    max_s, max_d = T["reg_max_scale"], T["reg_max_shift_px"]

    def search(factor, scales, shifts):
        size = (ref.width // factor, ref.height // factor)
        small_ref = binary(ref.resize(size, Image.BOX))
        small_cand = binary(cand.resize(size, Image.BOX))
        a = (anchor[0] / factor, anchor[1] / factor)
        best = (-1.0, 1.0, 0, 0)
        for s in scales:
            scaled = binary(small_cand.resize((round(size[0] * s), round(size[1] * s)), Image.BILINEAR)) if s != 1 else small_cand
            for dx in shifts:
                for dy in shifts:
                    moved = Image.new("L", size, 0)
                    moved.paste(scaled, (round(a[0] * (1 - s) + dx / factor), round(a[1] * (1 - s) + dy / factor)))
                    score = iou(moved, small_ref)
                    if score > best[0]:
                        best = (score, s, dx, dy)
        return best

    steps = round(max_s / 0.01)
    coarse = search(4, [1 + 0.01 * i for i in range(-steps, steps + 1)], range(-max_d, max_d + 1, 4))
    _, s0, x0, y0 = coarse
    fine_scales = [s for s in (s0 - 0.01, s0 - 0.005, s0, s0 + 0.005, s0 + 0.01) if abs(s - 1) <= max_s + 1e-9]
    fine_shifts = [d for d in range(-4, 5, 2)]
    best = (-1.0, 1.0, 0, 0)
    size = (ref.width // 2, ref.height // 2)
    small_ref = binary(ref.resize(size, Image.BOX))
    for s in fine_scales:
        for ddx in fine_shifts:
            for ddy in fine_shifts:
                dx, dy = x0 + ddx, y0 + ddy
                if abs(dx) > max_d or abs(dy) > max_d:
                    continue
                moved = binary(place(cand, s, dx, dy, anchor, cand.size).resize(size, Image.BOX))
                score = iou(moved, small_ref)
                if score > best[0]:
                    best = (score, s, dx, dy)
    score, s, dx, dy = best
    at_bound = abs(s - 1) >= max_s - 1e-9 or abs(dx) >= max_d or abs(dy) >= max_d
    return {"iou": round(score, 4), "scale": round(s, 4), "dx": dx, "dy": dy, "at_bound": at_bound}


def diamond(anchor, footprint, tol: float):
    """The footprint rhombus on the canvas, grown by `tol` px horizontally (tol/2 vertically)."""
    S = L.ISO["S"]
    w, h = footprint
    ax, ay = anchor
    return [(ax, ay + tol / 2), (ax - w * S / 2 - tol, ay - w * S / 4),
            (ax + (h - w) * S / 2, ay - (w + h) * S / 4 - tol / 2), (ax + h * S / 2 + tol, ay - h * S / 4)]


def audit(candidate: pathlib.Path, slug: str, original_size=None, registered_out: pathlib.Path | None = None,
          precut: pathlib.Path | None = None, background: str = KEY, clip: bool = False,
          openings: bool = True) -> dict:
    """Run the cut, the registration and every check on one candidate. Pure measure, no verdict text.

    `precut` and `background` exist for the probe's legacy variant only: a candidate painted on
    #0B0F19 and cut by cutout.py's corner flood, measured against its own background. Its halo is
    then the share of near-background pixels in the ring, since magenta-ness says nothing there.
    """
    info = json.loads((L.RENDERS / f"{slug}.anchor.json").read_text(encoding="utf-8"))
    canvas = L.ISO["canvases"][info["canvas"]]
    size = (canvas["w"], canvas["h"])
    anchor = info["anchor"]
    ref = Image.open(L.RENDERS / f"{slug}.mask.png").convert("L")
    rgb = Image.open(candidate).convert("RGB")
    checks = {}

    def check(name, value, ok):
        checks[name] = {"value": value, "pass": bool(ok)}

    sizes_ok = rgb.size == size and (original_size is None or tuple(original_size) == size)
    check("size", {"file": list(rgb.size), "original": original_size, "canvas": list(size)}, sizes_ok)
    if rgb.size != size:
        return {"pass": False, "checks": checks}

    cut = Image.open(precut).convert("RGBA") if precut else key(rgb, background)
    reg = register(fill_holes(binary(cut.getchannel("A"))), fill_holes(ref), anchor)
    image = place(cut, reg["scale"], reg["dx"], reg["dy"], anchor, size)
    if clip:
        image = clip_to(image, ref)
    if registered_out:
        image.save(registered_out)
    mask = binary(image.getchannel("A"))
    area = count(mask) or 1
    rgb_reg = image.convert("RGB")

    # Residual background: opaque pixels still close to the key, and four empty corners.
    near = binary(delta_e(rgb_reg, background).point(lambda v: 255 if v < T["residual_de"] else 0))
    residual = count(ImageChops.darker(near, mask)) / area
    corners = all(image.getpixel(c)[3] == 0 for c in ((0, 0), (size[0] - 1, 0), (0, size[1] - 1), (size[0] - 1, size[1] - 1)))
    check("residual", round(residual, 5), residual < T["residual_max_share"] and corners)

    # Halo: lean toward the key in the inner ring against the interior.
    legacy = background == L.ISO["background"]["legacy"]
    magenta = near if legacy else spill(list(rgb_reg.split()), background)
    inner = erode(mask, T["halo_ring_px"])
    ring = ImageChops.subtract(mask, inner)
    core = erode(inner, T["halo_ring_px"])
    ring_m = ImageStat.Stat(magenta, mask=ring).mean[0] if count(ring) else 0
    core_m = ImageStat.Stat(magenta, mask=core).mean[0] if count(core) else 0
    check("halo", round(ring_m - core_m, 2), ring_m - core_m < T["halo_max"])

    # Holes: every hole of the candidate sits inside a hole of the blockout, grown by 8 px.
    holes = ImageChops.subtract(fill_holes(mask), mask)
    ref_holes = dilate(ImageChops.subtract(fill_holes(ref), ref), T["holes_dilate_px"])
    stray = count(ImageChops.subtract(holes, ref_holes)) / area
    check("holes", round(stray, 5), stray <= T["holes_max_share_outside"])

    # Silhouette: IoU of the filled masks after registration, refused on the search box's edge.
    floor = T["iou_min_sails"] if info["canvas"] == "sails" else T["iou_min"]
    check("silhouette", {"iou": reg["iou"], "at_bound": reg["at_bound"]}, reg["iou"] >= floor and not reg["at_bound"])

    # Footprint: the lowest 8 % of the mask stays inside the footprint rhombus, ±4 % of its width.
    fw, fh = canvas["footprint"]
    if canvas["anchor"] == "footprintBottom" and fw and fh:
        box = mask.getbbox()
        band_top = box[3] - T["footprint_band"] * (box[3] - box[1])
        region = Image.new("L", size, 0)
        ImageDraw.Draw(region).polygon(diamond(anchor, (fw, fh), T["footprint_tol"] * L.ISO["S"] * (fw + fh) / 2), fill=255)
        band = Image.new("L", size, 0)
        ImageDraw.Draw(band).rectangle((0, math.ceil(band_top), size[0], size[1]), fill=255)
        in_band = ImageChops.darker(mask, band)
        outside = count(ImageChops.subtract(in_band, region))
        check("footprint", outside, outside == 0)
    else:
        check("footprint", "n/a", True)

    # Ink: the inner ring is mostly black line.
    ink_ring = ImageChops.subtract(mask, erode(mask, T["ink_ring_px"]))
    luma = rgb_reg.convert("L", (0.2126, 0.7152, 0.0722, 0))
    dark = luma.point(lambda v: 255 if v / 255 < T["ink_luma"] else 0)
    share = count(ImageChops.darker(dark, ink_ring)) / (count(ink_ring) or 1)
    check("ink", round(share, 4), share >= T["ink_min_share"])

    # Ink step (v5): on the night palette a dark shadow face makes any dark ring look like ink.
    # Next to the lit faces, the ring must be under half the luma of the paint just inside it.
    classes = Image.open(L.RENDERS / f"{slug}.classes.png").convert("RGB")
    _, tone_class, shaded = classes.split()
    lit_zone = ImageChops.subtract(tone_class.point(lambda v: 255 if v in (20, 80) else 0), shaded)
    near, far = T["ink_step_band"]  # past the ink line itself (8 px on the blockouts)
    band = ImageChops.subtract(erode(mask, near), erode(mask, far))
    lit_band = ImageChops.darker(band, lit_zone)
    lit_ring = ImageChops.darker(ink_ring, dilate(lit_band, near + 2))
    if count(lit_band) and count(lit_ring):
        ring_luma = ImageStat.Stat(luma, mask=lit_ring).median[0]
        band_luma = ImageStat.Stat(luma, mask=lit_band).median[0]
        step_ok = ring_luma < T["ink_step_ratio"] * band_luma
        check("ink_step", {"ring": ring_luma, "inside": band_luma}, step_ok)
    else:
        check("ink_step", "n/a", True)

    # "With openings" follows the blockout: the windmill's one small window gives its own blockout
    # 0.35 % of warm pixels, under the 0.5 % floor, so a sprite true to it could never pass. Below
    # the floor, the rule for a building without openings applies (under 1 %).
    blockout = Image.open(L.RENDERS / f"{slug}.rgba.png").convert("RGBA")
    openings = openings and palette(blockout)["values"]["warm"] >= T["palette_warm_share"][0]
    check("palette", (pal := palette(image, openings=openings))["values"], pal["pass"])

    det = detail(image, blockout, canvas)
    check("detail", det["values"], det["pass"])

    lit = light(image, blockout, classes)
    check("light", lit["values"], lit["pass"])

    return {"pass": all(c["pass"] for c in checks.values()), "checks": checks, "registration": reg,
            "area": count(mask)}


# --- prompt v5: the night palette, the detail, the light's side --------------------------------


def lab_pixels(rgba: Image.Image, step: int = 2) -> list[tuple[float, float, float, float, float]]:
    """(L*, a*, b*, C, hue) of the opaque pixels, on every `step`-th row and column."""
    small = rgba.resize((max(1, rgba.width // step), max(1, rgba.height // step)), Image.NEAREST)
    lab = _lab(small.convert("RGB"))
    alpha = small.getchannel("A").get_flattened_data()
    out = []
    for i, a in enumerate(alpha):
        if a < 128:
            continue
        lv, av, bv = lab[3 * i] * 100 / 255, SIGNED[lab[3 * i + 1]], SIGNED[lab[3 * i + 2]]
        out.append((lv, av, bv, math.hypot(av, bv), math.degrees(math.atan2(bv, av)) % 360))
    return out


def _warm(p):
    return T["palette_warm_hue"][0] <= p[4] <= T["palette_warm_hue"][1] and p[3] > T["palette_warm_c"]


def _violet(p):
    return T["palette_violet_hue"][0] <= p[4] <= T["palette_violet_hue"][1] and p[3] > T["palette_violet_c"]


def reference_crops():
    """The building rectangles of the tier paintings listed in audit-thresholds.json."""
    crops = []
    for ref in T["palette_refs"]:
        image = Image.open(L.ROOT / f"assets/images/village/tier_{ref['tier']}.webp").convert("RGBA")
        s = image.width / 800
        crops.append(image.crop(tuple(round(v * s) for v in ref["box"])))
    return crops


_REF_STATS = None


def reference_stats() -> dict:
    """Percentile bounds of the cold pixels of the references, per channel L, a, b, C."""
    global _REF_STATS
    if _REF_STATS is None:
        cold = [p for crop in reference_crops() for p in lab_pixels(crop, 1) if not _warm(p)]
        lo, hi = T["palette_pct"]
        _REF_STATS = {}
        for i, name in enumerate(("L", "a", "b", "C")):
            values = sorted(p[i] for p in cold)
            _REF_STATS[name] = [round(values[int(len(values) * lo / 100)], 2), round(values[int(len(values) * hi / 100) - 1], 2)]
    return _REF_STATS


def palette(rgba: Image.Image, openings: bool = True) -> dict:
    """The three night-palette measures: cold means inside the references, warm share, violet share."""
    pixels = lab_pixels(rgba)
    if not pixels:
        return {"pass": False, "values": "empty"}
    warm = sum(1 for p in pixels if _warm(p)) / len(pixels)
    violet = sum(1 for p in pixels if _violet(p)) / len(pixels)
    cold = [p for p in pixels if not _warm(p)]
    bounds = reference_stats()
    means = {name: round(sum(p[i] for p in cold) / len(cold), 2) for i, name in enumerate(("L", "a", "b", "C"))}
    inside = all(bounds[k][0] <= means[k] <= bounds[k][1] for k in means)
    warm_ok = (T["palette_warm_share"][0] <= warm <= T["palette_warm_share"][1]) if openings else warm < T["palette_warm_share_closed"]
    ok = inside and warm_ok and violet < T["palette_violet_max"]
    return {"pass": ok, "values": {"means": means, "bounds": bounds, "warm": round(warm, 4), "violet": round(violet, 4)}}


def edge_density(rgba: Image.Image) -> float:
    """Share of opaque pixels on a luma edge: how much drawing there is per unit of surface."""
    luma = rgba.convert("RGB").convert("L", (0.2126, 0.7152, 0.0722, 0))
    edges = luma.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v >= T["detail_edge_threshold"] else 0)
    inner = erode(binary(rgba.getchannel("A")), 2)
    return count(ImageChops.darker(edges, inner)) / (count(inner) or 1)


def detail(image: Image.Image, blockout: Image.Image, canvas: dict) -> dict:
    """The painting must move away from its blockout: ΔE to it, and edges at the tier's scale.

    The blockout itself fails here by construction (ΔE 0), which is what keeps a barely repainted
    blockout, flat as a vector asset, from passing. The edge density is taken with the footprint
    brought to `detail_edge_px` wide, about a building of tier_6, so it compares with the crops.
    """
    mask = ImageChops.darker(binary(image.getchannel("A")), binary(blockout.getchannel("A")))
    a = _lab(image.convert("RGB").resize((image.width // 2, image.height // 2), Image.NEAREST))
    b = _lab(blockout.convert("RGB").resize((image.width // 2, image.height // 2), Image.NEAREST))
    m = mask.resize((image.width // 2, image.height // 2), Image.NEAREST).get_flattened_data()
    total = n = 0.0
    for i, v in enumerate(m):
        if v:
            dl = (a[3 * i] - b[3 * i]) * 100 / 255
            da = SIGNED[a[3 * i + 1]] - SIGNED[b[3 * i + 1]]
            db = SIGNED[a[3 * i + 2]] - SIGNED[b[3 * i + 2]]
            total += math.sqrt(dl * dl + da * da + db * db)
            n += 1
    de = total / n if n else 0.0
    fw, fh = canvas["footprint"] or (1, 1)
    scale = T["detail_edge_px"] / (L.ISO["S"] * max(fw + fh, 1) / 2)
    small = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS)
    density = edge_density(small)
    lo, hi = T["detail_edge_range"]
    ok = de >= T["detail_de_min"] and lo <= density <= hi
    return {"pass": ok, "values": {"de": round(de, 2), "edges": round(density, 4), "range": [lo, hi]}}


def light(image: Image.Image, blockout: Image.Image, classes: Image.Image) -> dict:
    """Lit side brighter than shadow side, material by material, against the blockout's own gap.

    Zones come from the blockout's composed tone map (the image is registered onto it already),
    eroded so a stroke of ink or a misplaced edge never decides; emissive faces and warm pixels
    are left out, since a window is bright on either side. Comparing a roof to a wall would say
    nothing, hence material by material.
    """
    r, g, shaded = classes.split()
    luma_c = image.convert("RGB").convert("L", (0.2126, 0.7152, 0.0722, 0))
    luma_b = blockout.convert("RGB").convert("L", (0.2126, 0.7152, 0.0722, 0))
    warm = _warm_mask(image)
    results, ok, judged = {}, True, 0
    for code in sorted(set(r.get_flattened_data()) - {0}):
        same = r.point(lambda v, c=code: 255 if v == c else 0)
        zones = []
        for cls in (80, 140):
            # The face's own side only: a cast shadow inside the sprite is not the light's side.
            zone = ImageChops.subtract(ImageChops.darker(same, g.point(lambda v, c=cls: 255 if v == c else 0)), shaded)
            zone = ImageChops.subtract(erode(zone, T["light_erode_px"]), warm)
            zones.append(zone)
        if min(count(z) for z in zones) < T["light_min_px"]:
            continue
        gap_c = ImageStat.Stat(luma_c, mask=zones[0]).median[0] - ImageStat.Stat(luma_c, mask=zones[1]).median[0]
        gap_b = ImageStat.Stat(luma_b, mask=zones[0]).median[0] - ImageStat.Stat(luma_b, mask=zones[1]).median[0]
        passed = gap_c >= T["light_ratio"] * gap_b
        results[code] = {"candidate": gap_c, "blockout": gap_b, "pass": passed}
        ok = ok and passed
        judged += 1
    return {"pass": ok and judged > 0, "values": results}


def _warm_mask(image: Image.Image) -> Image.Image:
    lab = _lab(image.convert("RGB"))
    out = bytearray(image.width * image.height)
    lo, hi = T["palette_warm_hue"]
    for i in range(len(out)):
        av, bv = SIGNED[lab[3 * i + 1]], SIGNED[lab[3 * i + 2]]
        if math.hypot(av, bv) > T["palette_warm_c"] and lo <= math.degrees(math.atan2(bv, av)) % 360 <= hi:
            out[i] = 255
    return Image.frombytes("L", image.size, bytes(out))


def growth_ok(areas: list[int]) -> bool:
    """Rough < solid < grand, on the stages accepted so far, in that order."""
    return all(a < b for a, b in zip(areas, areas[1:]))
