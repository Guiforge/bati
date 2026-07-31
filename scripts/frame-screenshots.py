#!/usr/bin/env python3
"""Dress raw device screenshots into store screenshots.

    python3 scripts/frame-screenshots.py                    # en-US, from fastlane/raw/
    python3 scripts/frame-screenshots.py --locale fr-FR --src fastlane/raw-fr

A raw screencap is honest but flat: it sells nothing next to a listing whose competitors all
have a headline and a bit of colour. This puts each shot on the app's own background, rounds
its corners, and writes one line above it — the promise that screen keeps.

Nothing here invents UI. The phone content is exactly what the device showed; the frame is the
only thing added, which is the line the stores draw too.
"""

import argparse
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# The app's own palette, so the frame belongs to the same world as the screen inside it.
BG_TOP = (11, 15, 25)  # $bgDark — "The Void"
BG_BOTTOM = (16, 19, 34)  # $surface
TEXT = (232, 236, 255)  # $text
ACCENT = (100, 124, 247)  # $primaryText — the AA-legible blue, not the fill blue

CANVAS = (1242, 2688)  # Play's tallest phone slot; F-Droid takes the same file
MARGIN = 72
HEADLINE_TOP = 96

# One line per shot. Deliberately about what the hero gets, not what the screen is called: a
# caption reading "Journal" tells nobody why they should care.
CAPTIONS = {
    "en-US": {
        "1-home": "One screen. One thing to do next.",
        "2-quests": "Every workout is a quest.",
        "3-quest-detail": "Know the session before you start it.",
        "4-session": "Your reps land as damage.",
        "5-victory": "Effort becomes progress you can see.",
        "6-village": "A village built out of what you lifted.",
        "7-journal": "Your history, and nobody else's.",
    },
    "fr-FR": {
        "1-home": "Un écran. Une seule chose à faire.",
        "2-quests": "Chaque séance est une quête.",
        "3-quest-detail": "Tu sais ce qui t'attend avant de commencer.",
        "4-session": "Tes répétitions deviennent des dégâts.",
        "5-victory": "L'effort devient un progrès visible.",
        "6-village": "Un village bâti avec ce que tu as soulevé.",
        "7-journal": "Ton historique, et celui de personne d'autre.",
    },
}

FONT_CANDIDATES = [
    "/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf",
    "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if pathlib.Path(path).exists():
            font = ImageFont.truetype(path, size)
            # Variable fonts default to Regular; a headline wants weight behind it.
            try:
                font.set_variation_by_name("Bold")
            except (AttributeError, OSError):
                pass
            return font
    raise SystemExit("frame-screenshots: no usable font found; install Noto Sans or DejaVu")


def gradient(size: tuple[int, int]) -> Image.Image:
    """Vertical wash from the void to the surface — the same move the app makes behind its art."""
    width, height = size
    base = Image.new("RGB", (1, height))
    pixels = base.load()
    for y in range(height):
        t = y / max(height - 1, 1)
        pixels[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM))
    return base.resize(size)


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), image.size], radius=radius, fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


# A phone body around the screen, rather than a bare rounded rectangle. It costs nothing and it
# tells the eye "this is an app" before the eye has read anything — which is the entire job of a
# store screenshot at thumbnail size.
BEZEL = 18  # the dark rim around the screen
BODY_RADIUS = 76
SCREEN_RADIUS = 58


def in_phone(shot: Image.Image) -> Image.Image:
    """Set the screenshot into a phone body, with a rim light and a drop shadow."""
    w, h = shot.size
    body_w, body_h = w + BEZEL * 2, h + BEZEL * 2
    pad = 40  # room for the shadow to fall into

    canvas = Image.new("RGBA", (body_w + pad * 2, body_h + pad * 2), (0, 0, 0, 0))

    # Shadow first: a blurred silhouette of the body, offset down.
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(pad, pad + 12), (pad + body_w, pad + body_h + 12)], radius=BODY_RADIUS, fill=(0, 0, 0, 150)
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)))

    # The body, a shade darker than the darkest thing on screen so the screen reads as lit.
    body = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(body)
    draw.rounded_rectangle(
        [(pad, pad), (pad + body_w, pad + body_h)], radius=BODY_RADIUS, fill=(6, 8, 18, 255)
    )
    # A single hairline of rim light along the edge: enough to separate body from background.
    draw.rounded_rectangle(
        [(pad, pad), (pad + body_w, pad + body_h)],
        radius=BODY_RADIUS,
        outline=(58, 66, 102, 255),
        width=2,
    )
    canvas.alpha_composite(body)
    canvas.alpha_composite(rounded(shot, SCREEN_RADIUS), (pad + BEZEL, pad + BEZEL))
    return canvas


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def compose(shot: pathlib.Path, caption: str, dest: pathlib.Path) -> None:
    canvas = gradient(CANVAS).convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    font = load_font(64)
    max_text_width = CANVAS[0] - 2 * MARGIN
    lines = wrap(draw, caption, font, max_text_width)

    y = HEADLINE_TOP
    for line in lines:
        width = draw.textlength(line, font=font)
        draw.text(((CANVAS[0] - width) / 2, y), line, font=font, fill=TEXT)
        y += 78

    # A short accent rule under the headline: enough to look composed, not enough to distract.
    rule_width = 120
    y += 24
    draw.rounded_rectangle(
        [((CANVAS[0] - rule_width) / 2, y), ((CANVAS[0] + rule_width) / 2, y + 8)],
        radius=4,
        fill=ACCENT,
    )
    y += 64

    phone = in_phone(Image.open(shot).convert("RGB"))
    available_h = CANVAS[1] - y - MARGIN // 2
    available_w = CANVAS[0] - MARGIN
    scale = min(available_w / phone.width, available_h / phone.height)
    phone = phone.resize((round(phone.width * scale), round(phone.height * scale)), Image.LANCZOS)

    canvas.alpha_composite(phone, (round((CANVAS[0] - phone.width) / 2), round(y)))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(dest, "PNG", optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", default="en-US")
    parser.add_argument("--src", default="fastlane/raw")
    args = parser.parse_args()

    captions = CAPTIONS.get(args.locale)
    if captions is None:
        print(f"no captions written for {args.locale}", file=sys.stderr)
        return 1

    src = pathlib.Path(args.src)
    shots = sorted(src.glob("*.png"))
    if not shots:
        print(f"no screenshots in {src} — run `npm run screenshots` first", file=sys.stderr)
        return 1

    out = pathlib.Path(f"fastlane/metadata/android/{args.locale}/images/phoneScreenshots")
    for shot in shots:
        caption = captions.get(shot.stem)
        if caption is None:
            print(f"  skipped {shot.name} (no caption)")
            continue
        dest = out / f"{shot.stem}.png"
        compose(shot, caption, dest)
        print(f"  {shot.name} -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
