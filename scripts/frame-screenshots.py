#!/usr/bin/env python3
"""Turn raw device captures into store screenshots, each one a page of the book.

    python3 scripts/frame-screenshots.py --locale fr-FR --src fastlane/raw [--out DIR]

The app's identity is an inked dark-fantasy bande dessinee, so a store shot is a planche, not a
phone mock-up. Ink ground (#0C0D11). Behind everything, one game illustration per shot (the
BACKDROPS map: a quest cover, the boss, the village), covered, lightly blurred, darkened to about
28% luminance, vignetted and faded to ink over the bottom 45%, so each shot carries its world. A recitatif cartouche at the margin holds the
eyebrow (gold, tracked) and the headline (Alegreya ExtraBold, bone) over one short braise bar.
The capture itself is a panel: ink stroke, bone hairline, soft ink shadow, running off the bottom
edge like a panel that continues on the next page. The sigil and the name sit at the top right.
Nothing here invents UI: the panel is exactly what the device displayed.

Fonts come from node_modules/@expo-google-fonts, not from the system. Without --out the shots go
to fastlane/metadata/... and the web copies to docs/legal; with --out only the shots are written.
"""

import argparse
import pathlib
import re
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = ROOT / "node_modules" / "@expo-google-fonts"
ALEGREYA = FONTS / "alegreya" / "800ExtraBold" / "Alegreya_800ExtraBold.ttf"
NOTO = FONTS / "noto-sans" / "700Bold" / "NotoSans_700Bold.ttf"
SIGIL = ROOT / "assets" / "icon.png"

# Palette: DESIGN.md's own, so a screenshot and the app it shows belong to one world.
INK = (12, 13, 17)  # #0C0D11
BONE = (236, 228, 212)  # #ECE4D4
GOLD = (226, 181, 74)  # #E2B54A, the eyebrow only
BRAISE = (194, 65, 12)  # #C2410C, one accent per image
RULE = (54, 58, 68)  # #363A44

CANVAS = (1242, 2688)  # Play's tallest phone slot; F-Droid takes the same file
MARGIN = 64

# ---------------------------------------------------------------------------------------------
# Copy. Each shot gets an eyebrow (what feature), a headline (the promise) and the panel below.
# Written to be read in the half second a thumbnail gets, so the headline carries the meaning on
# its own and the eyebrow is only there to orient.
# ---------------------------------------------------------------------------------------------
#
# Backdrops: the game's own art, one image per shot and none twice, chosen to match the world the
# shot shows (path under assets/images, then why). The capture is never the source: blurred UI
# reads as grey mush.
# ---------------------------------------------------------------------------------------------
BACKDROPS = {
    "0-onboarding": ("village/tier_1.webp", "the hamlet where every hero starts"),
    "1-home": ("quests/long_reach.webp", "the quest art of the stage the home capture shows"),
    "2-quests": ("quests/shield_wall.webp", "a quest cover with a wall of torches: many quests, one line"),
    "3-quest-detail": ("quests/chop_wood.webp", "the quest the detail capture is about"),
    "4-session": ("quests/dawn_ritual.webp", "an open training ground in morning mist"),
    "5-boss": ("bosses/shadow_serpent.webp", "the boss in the capture"),
    "6-victory": ("quests/morning_champion.webp", "sunlit terrace: the work is done, the light is back"),
    "7-village": ("village/tier_12.webp", "the max-tier village, what the reps built"),
    "8-journal": ("quests/hearthside_unbinding.webp", "a hearth, a calm interior to read the years by"),
    "9-recap": ("quests/word_must_travel.webp", "a road out of the walls"),
}

# ---------------------------------------------------------------------------------------------
COPY = {
    "en-US": {
        "0-onboarding": ("WELCOME", "Your training,\nas an adventure."),
        "1-home": ("TODAY", "Your next session,\none tap away."),
        "2-quests": ("QUESTS", "Every workout\nis a quest."),
        "3-quest-detail": ("BEFORE YOU LIFT", "See the whole session\nbefore you start it."),
        "4-session": ("MID-SESSION", "Beat your\nlast time."),
        "5-boss": ("BOSS FIGHTS", "Some sessions\nfight back."),
        "6-victory": ("VICTORY", "The loot drops\nwhen the work is done."),
        "7-village": ("YOUR VILLAGE", "Your reps\nbuilt all of this."),
        "8-journal": ("PROGRESS", "Years of training,\non one screen."),
        "9-recap": ("OUTINGS", "Take the quest\noutside."),
    },
    "fr-FR": {
        "0-onboarding": ("BIENVENUE", "Ton entraînement,\nen aventure."),
        "1-home": ("AUJOURD'HUI", "Ta prochaine séance,\nen un coup d'œil."),
        "2-quests": ("QUÊTES", "Chaque séance\nest une quête."),
        "3-quest-detail": ("AVANT DE COMMENCER", "Toute la séance,\navant de t'y mettre."),
        "4-session": ("EN PLEINE SÉANCE", "Fais mieux que\nla dernière fois."),
        "5-boss": ("COMBATS DE BOSS", "Certaines séances\nrendent les coups."),
        "6-victory": ("VICTOIRE", "Le butin tombe\nquand le travail est fait."),
        "7-village": ("TON VILLAGE", "Tes séances\nont bâti tout ça."),
        "8-journal": ("PROGRESSION", "Des années de sport,\nsur un seul écran."),
        "9-recap": ("SORTIES", "Emmène ta quête\ndehors."),
    },
    "de-DE": {
        "0-onboarding": ("WILLKOMMEN", "Dein Training\nals Abenteuer."),
        "1-home": ("HEUTE", "Deine nächste Einheit,\nein Tippen entfernt."),
        "2-quests": ("QUESTS", "Jedes Training\nist eine Quest."),
        "3-quest-detail": ("VOR DEM START", "Die ganze Einheit,\nbevor du loslegst."),
        "4-session": ("MITTEN IM TRAINING", "Besser als\nbeim letzten Mal."),
        "5-boss": ("BOSSKÄMPFE", "Manche Einheiten\nschlagen zurück."),
        "6-victory": ("SIEG", "Die Beute fällt,\nwenn die Arbeit getan ist."),
        "7-village": ("DEIN DORF", "Deine Wiederholungen\nhaben das gebaut."),
        "8-journal": ("FORTSCHRITT", "Jahre an Training\nauf einem Bildschirm."),
        "9-recap": ("TOUREN", "Nimm die Quest\nmit nach draußen."),
    },
    "es-ES": {
        "0-onboarding": ("BIENVENIDA", "Tu entrenamiento,\nhecho aventura."),
        "1-home": ("HOY", "Tu próxima sesión,\na un toque."),
        "2-quests": ("MISIONES", "Cada entrenamiento\nes una misión."),
        "3-quest-detail": ("ANTES DE EMPEZAR", "Toda la sesión,\nantes de empezarla."),
        "4-session": ("EN PLENA SESIÓN", "Supera\ntu última marca."),
        "5-boss": ("COMBATES CONTRA JEFES", "Algunas sesiones\ndevuelven el golpe."),
        "6-victory": ("VICTORIA", "El botín cae\ncuando acabas el trabajo."),
        "7-village": ("TU ALDEA", "Tus repeticiones\nlevantaron todo esto."),
        "8-journal": ("PROGRESO", "Años de entrenamiento\nen una sola pantalla."),
        "9-recap": ("SALIDAS", "Lleva la misión\na la calle."),
    },
}


# The eight store shots, in story order: the boss and the village sell the game, so they lead. Play
# caps phone screenshots at 8 and shows the first three without a scroll. Files are written as
# "<position>-<name>.png" so the listing's alphabetical order is this order. 0-onboarding and
# 3-quest-detail keep their raw stems (and COPY) but are not shipped.
STORE_ORDER = ["5-boss", "7-village", "4-session", "6-victory", "1-home", "2-quests", "8-journal", "9-recap"]


def font(path: pathlib.Path, size: int) -> ImageFont.FreeTypeFont:
    if not path.is_file():
        raise SystemExit(f"frame-screenshots: {path} is missing; run npm install first")
    return ImageFont.truetype(str(path), size)


def backdrop(stem: str) -> Image.Image:
    """The shot's own world: game art covering the canvas, darkened, vignetted, fading to ink."""
    w, h = CANVAS
    art = Image.open(ROOT / "assets" / "images" / BACKDROPS[stem][0]).convert("RGB")
    # Some art is letterboxed: trim flat near-black rows top and bottom, or a hard band shows.
    rows = [ImageStat.Stat(art.crop((0, y, art.width, y + 1)).convert("L")).mean[0] for y in range(art.height)]
    lit = [y for y, m in enumerate(rows) if m > 25]
    if lit:
        art = art.crop((0, lit[0], art.width, lit[-1] + 1))
    scale = max(w / art.width, h / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    left, top = (art.width - w) // 2, (art.height - h) // 2
    art = art.crop((left, top, left + w, top + h)).filter(ImageFilter.GaussianBlur(4))
    # Aim at ~28% luminance whatever the art; lift a dark one at most 3x.
    lum = ImageStat.Stat(art.convert("L")).mean[0] / 255
    gain = min(3.0, 0.28 / max(lum, 0.01))
    art = art.point(lambda v: min(255, round(v * gain)))
    # Vignette: ink creeps in from the corners.
    vig = Image.radial_gradient("L").resize(CANVAS)  # black centre -> white edge
    vig = vig.point(lambda v: max(0, v - 90) * 3 // 4)
    art = Image.composite(Image.new("RGB", CANVAS, INK), art, vig)
    # Ink takes over below: none until 55% of the height, total at the bottom.
    ramp = Image.linear_gradient("L").resize((1, h))  # black at top -> white at bottom
    ramp = ramp.point(lambda v: max(0, min(255, round((v - 140) / 115 * 255))))
    return Image.composite(Image.new("RGB", CANVAS, INK), art, ramp.resize(CANVAS)).convert("RGBA")


def tracked(draw: ImageDraw.ImageDraw, xy, text: str, f, fill, tracking: int) -> None:
    """Draw text letter by letter with extra spacing."""
    x, y = xy
    for c in text:
        draw.text((x, y), c, font=f, fill=fill, anchor="ls")
        x += draw.textlength(c, font=f) + tracking


def tracked_width(draw, text: str, f, tracking: int) -> float:
    return sum(draw.textlength(c, font=f) + tracking for c in text) - tracking


def cartouche(canvas: Image.Image, xy: tuple[int, int], eyebrow: str, headline: str, max_w: int) -> int:
    """The recitatif box. Returns its bottom edge. The headline shrinks until it fits max_w."""
    pad_x, pad_y = 36, 28
    d = ImageDraw.Draw(canvas)
    lines = headline.split("\n")
    size = 104
    while size > 56:
        head = font(ALEGREYA, size)
        if max(d.textlength(line, font=head) for line in lines) <= max_w - 2 * pad_x:
            break
        size -= 2
    eye = font(NOTO, 34)
    inner_w = max(max(d.textlength(line, font=head) for line in lines), tracked_width(d, eyebrow, eye, 4))
    pitch = round(size * 1.05)
    cap = round(size * 0.72)
    height = pad_y + 25 + 22 + 6 + 34 + cap + pitch * (len(lines) - 1) + round(size * 0.3) + pad_y
    box = [xy, (xy[0] + round(inner_w) + 2 * pad_x, xy[1] + height)]

    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(box, radius=4, fill=(*INK, 235), outline=RULE, width=2)
    canvas.alpha_composite(layer)

    x, y = xy[0] + pad_x, xy[1] + pad_y + 25  # y is the eyebrow baseline (cap height ~25)
    tracked(d, (x, y), eyebrow, eye, GOLD, 4)
    y += 22
    d.rectangle([x, y, x + 71, y + 5], fill=BRAISE)  # 72 x 6
    y += 6 + 34 + cap  # first headline baseline
    for line in lines:
        d.text((x, y), line, font=head, fill=BONE, anchor="ls")
        y += pitch
    return box[1][1]


def wordmark(canvas: Image.Image) -> None:
    """The sigil and the name, top right at the margin."""
    sigil = Image.open(SIGIL).convert("RGBA").resize((96, 96), Image.LANCZOS)
    mask = Image.new("L", (96, 96), 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (95, 95)], radius=14, fill=255)
    sigil.putalpha(ImageChops.multiply(sigil.getchannel("A"), mask))
    d = ImageDraw.Draw(canvas)
    name = font(ALEGREYA, 40)
    x = CANVAS[0] - MARGIN - 96 - 16 - d.textlength("Bati", font=name)
    canvas.alpha_composite(sigil, (round(x), MARGIN))
    d.text((x + 96 + 16, MARGIN + 48), "Bati", font=name, fill=BONE, anchor="lm")


def panel(shot: Image.Image, top: int) -> tuple[Image.Image, int, int]:
    """The capture as a BD panel: ink stroke, bone hairline, soft ink shadow. Returns it and its x, y."""
    width = round(CANVAS[0] * 0.88)
    inner = shot.resize((width, round(width * shot.height / shot.width)), Image.LANCZOS)
    stroke, pad = 10, 60
    box = (inner.width + 2 * stroke, inner.height + 2 * stroke)
    out = Image.new("RGBA", (box[0] + 2 * pad, box[1] + 2 * pad), (0, 0, 0, 0))

    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(pad, pad + 10), (pad + box[0], pad + box[1] + 10)], radius=14 + stroke, fill=(*INK, 153)
    )
    out.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(40)))

    ImageDraw.Draw(out).rounded_rectangle(
        [(pad, pad), (pad + box[0], pad + box[1])], radius=14 + stroke, fill=(*INK, 255)
    )
    mask = Image.new("L", inner.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), inner.size], radius=14, fill=255)
    screen = inner.convert("RGBA")
    screen.putalpha(mask)
    out.alpha_composite(screen, (pad + stroke, pad + stroke))
    # Hairline on the screen's edge, bone at 85%.
    hair = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(hair).rounded_rectangle(
        [(pad + stroke, pad + stroke), (pad + stroke + inner.width, pad + stroke + inner.height)],
        radius=14, outline=(*BONE, 217), width=2,
    )
    out.alpha_composite(hair)
    return out, CANVAS[0] - MARGIN - box[0] - pad, top - pad


def compose(shot: pathlib.Path, eyebrow: str, headline: str, dest: pathlib.Path) -> None:
    raw = Image.open(shot).convert("RGB")
    canvas = backdrop(shot.stem)
    wordmark(canvas)
    bottom = cartouche(canvas, (MARGIN, 200), eyebrow, headline, CANVAS[0] - 2 * MARGIN)
    # The panel goes on last, 48 px under the cartouche; the canvas bottom edge crops it (the bleed).
    pn, x, y = panel(raw, bottom + 48)
    canvas.alpha_composite(pn.crop((0, 0, pn.width, CANVAS[1] - y)), (x, y))
    dest.parent.mkdir(parents=True, exist_ok=True)
    # JPEG at 92: indistinguishable on a phone, and the grained night art made the boss PNG 2.2 MB,
    # over the repo's 2 MB large-file gate. Play and F-Droid both take JPEG.
    canvas.convert("RGB").save(dest, "JPEG", quality=92, optimize=True, progressive=True)


# ---------------------------------------------------------------------------------------------
# The public page shows the same screens, undressed: no frame, no headline, 440 px wide and webp,
# because a 1.3 MB store PNG has no business on a landing page. Nothing regenerated that copy
# until now, so it sat three weeks behind the listing and showed an app that no longer existed.
# The page's own <img> tags say which shots it wants, so adding one there is the whole change.
# ---------------------------------------------------------------------------------------------
WEB_PAGE = pathlib.Path("docs/legal/index.html")
WEB_DIR = pathlib.Path("docs/legal/assets/shots")
WEB_WIDTH = 440
WEB_QUALITY = 75


def web_shots(shots: list[pathlib.Path], lang: str) -> None:
    if not WEB_PAGE.exists():
        return
    wanted = set(re.findall(r"shots/[a-z]{2}/([\w-]+)\.webp", WEB_PAGE.read_text()))
    out = WEB_DIR / lang
    out.mkdir(parents=True, exist_ok=True)
    for shot in shots:
        if shot.stem not in wanted:
            continue
        im = Image.open(shot).convert("RGB")
        im = im.resize((WEB_WIDTH, round(WEB_WIDTH * im.height / im.width)), Image.LANCZOS)
        im.save(out / f"{shot.stem}.webp", "WEBP", quality=WEB_QUALITY, method=6)
        print(f"  {shot.name} -> {out / f'{shot.stem}.webp'}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--locale", default="en-US")
    ap.add_argument("--src", default="fastlane/raw")
    ap.add_argument("--out", help="write shots here instead of fastlane/metadata (previews; skips web copies)")
    args = ap.parse_args()

    copy = COPY.get(args.locale)
    if copy is None:
        print(f"no copy written for {args.locale}", file=sys.stderr)
        return 1

    src = pathlib.Path(args.src)
    shots = sorted(src.glob("*.png"))
    if not shots:
        print(f"no captures in {src} — run `npm run screenshots` first", file=sys.stderr)
        return 1

    out = pathlib.Path(
        args.out or f"fastlane/metadata/android/{args.locale}/images/phoneScreenshots"
    )
    for old in [*out.glob("*.png"), *out.glob("*.jpg")]:
        old.unlink()  # a renamed shot must not leave its predecessor behind on the listing

    by_stem = {x.stem: x for x in shots}
    for pos, stem in enumerate(STORE_ORDER, 1):
        shot = by_stem.get(stem)
        if shot is None:
            print(f"  missing {stem} in {src}", file=sys.stderr)
            return 1
        dest = out / f"{pos}-{stem.split('-', 1)[1]}.jpg"
        compose(shot, copy[stem][0], copy[stem][1], dest)
        print(f"  {shot.name} -> {dest}")

    if not args.out:
        web_shots(shots, args.locale.split("-")[0])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
