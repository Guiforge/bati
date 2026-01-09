# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "mistralai",
#     "python-dotenv",
#     "tenacity",
# ]
# ///

import argparse
import os
import re
import shutil
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    from tenacity import retry, stop_after_attempt, wait_exponential
except Exception:  # pragma: no cover

    def retry(*_a, **_k):
        def deco(fn):
            return fn

        return deco

    def stop_after_attempt(_n):
        return None

    def wait_exponential(*_a, **_k):
        return None


ASSET_RE = re.compile(
    r"assets/images/(exercises|quests|bosses|adventures)/[a-zA-Z0-9_\-]+\.(png|jpe?g|webp)"
)


def prompt_for(path: str) -> str:
    p = Path(path)

    # Village assets
    if path.startswith("assets/images/village/buildings/"):
        building = p.parts[4]
        variant = p.stem  # locked | lvl_1..lvl_5
        if variant == "locked":
            return (
                "Dark fantasy village building concept. "
                f"Building type: {building}. State: LOCKED. "
                "Show a mysterious silhouette / blueprint-like outline with faint runes and chains. "
                "Deep obsidian / blue HUD lighting. No text. Square 1:1."
            )
        return (
            "Dark fantasy village building concept art, franco-belgian comic vibe. "
            f"Building type: {building}. Upgrade stage: {variant}. "
            "Each higher level should look larger, more refined, more magical/armored, with subtle glow accents. "
            "No characters. No text. Square 1:1."
        )

    if path.startswith("assets/images/village/backgrounds/"):
        tier = p.stem.replace("tier_", "")
        return (
            "Epic dark fantasy village environment background. "
            f"Village tier: {tier}. "
            "Cinematic lighting, highly detailed, atmospheric. Deep blue-black shadows with electric blue accents. "
            "Wide 16:9. No text."
        )

    # Non-village assets
    category = p.parts[2]  # assets/images/<category>/...
    key = p.stem.replace("_", " ")

    if category == "exercises":
        return (
            "A dynamic comic-book style illustration of the fitness exercise: "
            f"{key}. Cel-shaded, thick contours, high contrast. "
            "Show correct body position with a subtle ghost-outline for start/end range. "
            "Character wearing dark tactical sportswear. Minimalist deep blue background. "
            "Square 1:1. No text."
        )

    if category == "bosses":
        return (
            "A dynamic comic-book style illustration of a dark fantasy boss: "
            f"{key}. Cel-shaded, thick contours, high contrast. "
            "Glowing accents (electric blue/purple). Deep obsidian background. "
            "Square 1:1. No text."
        )

    # quests + adventures
    return (
        "Epic dark fantasy concept art illustrating: "
        f"{key}. Cinematic lighting, highly detailed, atmospheric. "
        "Deep blue-black shadows with strong accent lights. "
        "Wide 16:9. No characters. No text."
    )


def find_referenced_assets(repo_root: Path) -> list[str]:
    paths: set[str] = set()

    sql_roots = [repo_root / "drizzle", repo_root / "src" / "drizzle"]
    for root in sql_roots:
        if not root.exists():
            continue
        for sql in sorted(root.glob("*.sql")):
            try:
                txt = sql.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            for m in ASSET_RE.finditer(txt):
                paths.add(m.group(0))
    return sorted(paths)


def extract_building_codes(repo_root: Path) -> list[str]:
    s = (repo_root / "src/db/schema.ts").read_text(encoding="utf-8")
    m = re.search(r"export const buildingCodes = \[(.*?)\] as const;", s, re.S)
    if not m:
        return []
    return re.findall(r"\"([^\"]+)\"", m.group(1))


def village_expected_assets(building_codes: list[str]) -> list[str]:
    expected: list[str] = []
    for c in building_codes:
        expected.append(f"assets/images/village/buildings/{c}/locked.png")
        for lvl in [1, 2, 3, 4, 5]:
            expected.append(f"assets/images/village/buildings/{c}/lvl_{lvl}.png")
    for tier in [1, 2, 3, 4]:
        expected.append(f"assets/images/village/backgrounds/tier_{tier}.jpg")
    return expected


def should_skip(path: Path) -> bool:
    try:
        return path.exists() and path.stat().st_size > 0
    except Exception:
        return False


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def run_generator(generator: Path, prompt: str, out_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    style_file = repo_root / "docs" / "prompt.image.md"

    cmd: list[str]
    if shutil.which("uv"):
        cmd = [
            "uv",
            "run",
            str(generator),
            prompt,
            "--output",
            str(out_path),
        ]
    else:
        cmd = [
            "python3",
            str(generator),
            prompt,
            "--output",
            str(out_path),
        ]

    if style_file.exists():
        cmd.extend(["--style-file", str(style_file)])

    subprocess.check_call(cmd)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate missing images (drizzle-referenced + village matrix) using scripts/generate_image_mistral.py",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Only print missing files"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max number of images to generate (0 = no limit)",
    )
    parser.add_argument("--threads", type=int, default=5, help="Parallel workers")
    parser.add_argument(
        "--max-errors", type=int, default=10, help="Stop if errors exceed this count"
    )
    parser.add_argument(
        "--include-village",
        action="store_true",
        help="Include village buildings + tier backgrounds",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]

    expected = find_referenced_assets(repo_root)

    if args.include_village:
        building_codes = extract_building_codes(repo_root)
        expected.extend(village_expected_assets(building_codes))

    expected = sorted(set(expected))
    missing = [p for p in expected if not should_skip(repo_root / p)]

    if not missing:
        print("✅ No missing images.")
        return

    print(f"Missing images: {len(missing)}")
    for p in missing[:50]:
        print(" -", p)
    if len(missing) > 50:
        print(f"... (+{len(missing) - 50} more)")

    if args.dry_run:
        return

    to_generate = missing
    if args.limit and args.limit > 0:
        to_generate = missing[: args.limit]

    generator = repo_root / "scripts" / "generate_image_mistral.py"
    if not generator.exists():
        raise SystemExit(f"Generator not found: {generator}")

    lock = threading.Lock()
    errors = 0

    def job(p: str) -> tuple[str, str | None]:
        out_path = repo_root / p
        if should_skip(out_path):
            return (p, None)
        os.makedirs(out_path.parent, exist_ok=True)
        prompt = prompt_for(p)
        try:
            run_generator(generator, prompt, out_path)
            return (p, None)
        except Exception as e:
            return (p, str(e))

    with ThreadPoolExecutor(max_workers=max(1, args.threads)) as ex:
        futures = [ex.submit(job, p) for p in to_generate]
        for fut in as_completed(futures):
            p, err = fut.result()
            if err:
                with lock:
                    errors += 1
                    print(f"❌ FAILED: {p} ({errors}/{args.max_errors})")
                    if errors >= args.max_errors:
                        print("🛑 Too many errors, stopping.")
                        break
            else:
                print(f"✅ OK: {p}")

    if errors:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
