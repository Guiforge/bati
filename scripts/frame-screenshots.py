#!/usr/bin/env python3
"""Turn raw device captures into store screenshots.

    python3 scripts/frame-screenshots.py --locale fr-FR --src fastlane/raw

A raw screencap is honest and flat. On a store page it sits next to competitors who all have a
headline, a device frame and some colour, and it loses on sight before anyone reads a word.

This composes each capture into a phone, on a lit background, under a headline that names the
feature and a line that says why it matters. Nothing here invents UI: the screen inside the phone
is exactly what the device displayed. The frame is the only thing added, which is the line the
stores draw too.
"""

import argparse
import pathlib
import re
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------------------------------------
# Palette — the app's own, so a screenshot and the app it shows belong to one world.
# ---------------------------------------------------------------------------------------------
VOID = (11, 15, 25)  # $bgDark
SURFACE = (16, 19, 34)  # $surface
TEXT = (232, 236, 255)  # $text
DIM = (144, 154, 203)  # $textSecondary
ACCENT = (100, 124, 247)  # $primaryText — the AA-legible blue, not the fill blue
GOLD = (255, 215, 0)  # $resourceGold, for the one number worth shouting

CANVAS = (1242, 2688)  # Play's tallest phone slot; F-Droid takes the same file
MARGIN = 64

# ---------------------------------------------------------------------------------------------
# Copy. Each shot gets an eyebrow (what feature), a headline (the promise) and the phone below.
# Written to be read in the half second a thumbnail gets, so the headline carries the meaning on
# its own and the eyebrow is only there to orient.
# ---------------------------------------------------------------------------------------------
COPY = {
    "en-US": {
        "0-onboarding": ("WELCOME", "Your training,\nas an adventure."),
        "1-home": ("TODAY", "Your next session,\none tap away."),
        "2-quests": ("QUESTS", "Every workout\nis a quest."),
        "3-quest-detail": ("BEFORE YOU LIFT", "See the whole session\nbefore you start it."),
        "4-session": ("MID-SESSION", "Every rep\ndoes damage."),
        "5-boss": ("BOSS FIGHTS", "Some sessions\nfight back."),
        "6-victory": ("VICTORY", "The loot drops\nwhen the work is done."),
        "7-village": ("YOUR VILLAGE", "Your reps\nbuilt all of this."),
        "8-journal": ("PROGRESS", "Years of training,\non one screen."),
        "9-recap": ("EXPEDITIONS", "Some quests\nleave the walls."),
    },
    "fr-FR": {
        "0-onboarding": ("BIENVENUE", "Ton entraînement,\nen aventure."),
        "1-home": ("AUJOURD'HUI", "Ta prochaine séance,\nen un coup d'œil."),
        "2-quests": ("QUÊTES", "Chaque séance\nest une quête."),
        "3-quest-detail": ("AVANT DE COMMENCER", "Toute la séance,\navant de t'y mettre."),
        "4-session": ("EN PLEINE SÉANCE", "Chaque répétition\nfait des dégâts."),
        "5-boss": ("COMBATS DE BOSS", "Certaines séances\nse défendent."),
        "6-victory": ("VICTOIRE", "Le butin tombe\nquand le travail est fait."),
        "7-village": ("TON VILLAGE", "Tes séances\nont bâti tout ça."),
        "8-journal": ("PROGRESSION", "Des années de sport,\nsur un seul écran."),
        "9-recap": ("EXPÉDITIONS", "Certaines quêtes\nsortent des murs."),
    },
}

FONT_PATHS = [
    "/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf",
    "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf",
]


def font(size: int, weight: str = "Bold") -> ImageFont.FreeTypeFont:
    for path in FONT_PATHS:
        if pathlib.Path(path).exists():
            f = ImageFont.truetype(path, size)
            try:
                f.set_variation_by_name(weight)
            except (AttributeError, OSError):
                pass  # static font: the file already is the weight it is
            return f
    raise SystemExit("frame-screenshots: install Noto Sans or DejaVu")


def backdrop() -> Image.Image:
    """A lit background: the void, a vertical lift, and a soft accent glow behind the phone."""
    w, h = CANVAS
    base = Image.new("RGB", (1, h))
    px = base.load()
    for y in range(h):
        t = y / (h - 1)
        # Ease the wash so the top stays dark and the lift happens behind the device.
        e = t * t * (3 - 2 * t)
        px[0, y] = tuple(round(a + (b - a) * e) for a, b in zip(VOID, SURFACE))
    canvas = base.resize(CANVAS).convert("RGBA")

    glow = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [(-w * 0.35, h * 0.16), (w * 1.35, h * 0.92)], fill=(*ACCENT, 46)
    )
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(190)))
    return canvas


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), image.size], radius=radius, fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


BEZEL = 16
BODY_RADIUS = 84
SCREEN_RADIUS = 68
SHADOW_PAD = 70


def in_phone(shot: Image.Image) -> Image.Image:
    """Set the capture into a phone body: shadow, rim light, bezel, and a notch cut for realism."""
    w, h = shot.size
    body = (w + BEZEL * 2, h + BEZEL * 2)
    size = (body[0] + SHADOW_PAD * 2, body[1] + SHADOW_PAD * 2)
    x0, y0 = SHADOW_PAD, SHADOW_PAD

    canvas = Image.new("RGBA", size, (0, 0, 0, 0))

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(x0, y0 + 26), (x0 + body[0], y0 + body[1] + 26)], radius=BODY_RADIUS, fill=(0, 0, 0, 170)
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(34)))

    frame = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle(
        [(x0, y0), (x0 + body[0], y0 + body[1])], radius=BODY_RADIUS, fill=(4, 6, 14, 255)
    )
    # Two hairlines: a brighter one on top where light would fall, a dim one all round.
    d.rounded_rectangle(
        [(x0, y0), (x0 + body[0], y0 + body[1])],
        radius=BODY_RADIUS,
        outline=(52, 60, 96, 255),
        width=3,
    )
    canvas.alpha_composite(frame)
    canvas.alpha_composite(rounded(shot, SCREEN_RADIUS), (x0 + BEZEL, y0 + BEZEL))

    # A pill notch, drawn over the screen: it is what makes the eye read "phone" instantly.
    notch_w, notch_h = round(w * 0.30), 34
    nx = x0 + BEZEL + (w - notch_w) // 2
    ImageDraw.Draw(canvas).rounded_rectangle(
        [(nx, y0 + BEZEL + 12), (nx + notch_w, y0 + BEZEL + 12 + notch_h)],
        radius=notch_h // 2,
        fill=(4, 6, 14, 255),
    )
    return canvas


def draw_centred(draw, text: str, f, y: int, fill, tracking: int = 0) -> int:
    if tracking:
        width = sum(draw.textlength(c, font=f) + tracking for c in text) - tracking
        x = (CANVAS[0] - width) / 2
        for c in text:
            draw.text((x, y), c, font=f, fill=fill)
            x += draw.textlength(c, font=f) + tracking
    else:
        draw.text(((CANVAS[0] - draw.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)
    return y


def compose(shot: pathlib.Path, eyebrow: str, headline: str, dest: pathlib.Path) -> None:
    canvas = backdrop()
    draw = ImageDraw.Draw(canvas)

    y = 104
    draw_centred(draw, eyebrow, font(34, "Bold"), y, ACCENT, tracking=7)
    y += 76

    head_font = font(78, "Bold")
    for line in headline.split("\n"):
        draw_centred(draw, line, head_font, y, TEXT)
        y += 92
    y += 44

    phone = in_phone(Image.open(shot).convert("RGB"))
    room_h = CANVAS[1] - y + SHADOW_PAD  # the shadow may run off the bottom edge
    room_w = CANVAS[0] - MARGIN
    scale = min(room_w / phone.width, room_h / phone.height)
    phone = phone.resize((round(phone.width * scale), round(phone.height * scale)), Image.LANCZOS)

    canvas.alpha_composite(phone, (round((CANVAS[0] - phone.width) / 2), round(y - SHADOW_PAD * scale)))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(dest, "PNG", optimize=True)


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

    out = pathlib.Path(f"fastlane/metadata/android/{args.locale}/images/phoneScreenshots")
    for old in out.glob("*.png"):
        old.unlink()  # a renamed shot must not leave its predecessor behind on the listing

    for shot in shots:
        entry = copy.get(shot.stem)
        if entry is None:
            print(f"  skipped {shot.name} (no copy)")
            continue
        compose(shot, entry[0], entry[1], out / f"{shot.stem}.png")
        print(f"  {shot.name} -> {out / f'{shot.stem}.png'}")

    web_shots(shots, args.locale.split("-")[0])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
