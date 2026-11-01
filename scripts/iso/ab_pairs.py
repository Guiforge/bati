#!/usr/bin/env python3
"""Blind A/B pairs for a loupe round (PROMPT.md 10.3 step 4).

    ab_pairs.py <loupe> <round> [--swap]        build the batch (or, with --swap, the same batch, sides swapped)
    ab_pairs.py score <loupe> <round> <answers_as_made.json> <answers_swapped.json>

Baseline crops: docs/designs/village-loop/loupes/baseline/*.png, round crops:
loupes/<loupe>/r<round>/*.png (matched by file name). One canary pair is added: a crop of the target
screen (loupes/targets/, same name as a baseline crop when there is one) against a baseline crop;
the target must win. Each pair is ONE png (left | right, no label), pair-NN.png in a fresh temp folder
(NN is shuffled, so it tells nothing). The key (which side is round / baseline / target) goes to
~/.cache/bati-loupes/<loupe>/key-<round>.json (swapped batch: key-<round>.swap.json), never in the repo.
The --swap batch reuses the saved key, so pair numbers and crops are the same, only the sides change.

Answers are {"pair-03": "left" | "right" | "tie", ...}. Score: a crop is won only if BOTH contexts pick
the new round; a context that misses the canary is void (rerun it once) and wins nothing.
"""

import json
import os
import pathlib
import random
import sys
import tempfile

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOUPES = ROOT / "docs/designs/village-loop/loupes"
CACHE = pathlib.Path(os.environ.get("BATI_LOUPES_CACHE", pathlib.Path.home() / ".cache/bati-loupes"))
GAP = 8


def key_path(loupe, rnd, swap=False):
    return CACHE / loupe / f"key-{rnd}{'.swap' if swap else ''}.json"


def side_by_side(left, right, out):
    a, b = Image.open(left).convert("RGB"), Image.open(right).convert("RGB")
    im = Image.new("RGB", (a.width + GAP + b.width, max(a.height, b.height)), (128, 128, 128))
    im.paste(a, (0, 0))
    im.paste(b, (a.width + GAP, 0))
    im.save(out)


def build(loupe, rnd, swap=False, loupes=LOUPES, seed=None):
    base_dir, new_dir, tgt_dir = loupes / "baseline", loupes / loupe / f"r{rnd}", loupes / "targets"
    kp = key_path(loupe, rnd)
    if swap:
        if not kp.exists():
            raise SystemExit(f"{kp} missing: build the batch without --swap first")
        pairs = [dict(p, left=p["right"], right=p["left"]) for p in json.loads(kp.read_text())["pairs"]]
    else:
        names = sorted(p.name for p in new_dir.glob("*.png") if (base_dir / p.name).exists())
        if not names:
            raise SystemExit(f"no crop in {new_dir} matches a baseline crop in {base_dir}")
        targets = sorted(tgt_dir.glob("*.png"))
        if not targets:
            raise SystemExit(f"no target screen crop in {tgt_dir}, the canary needs one")
        rng = random.Random(seed)
        tgt = next((t for t in targets if t.name in names), targets[0])
        old = base_dir / (tgt.name if (base_dir / tgt.name).exists() else names[0])
        items = [{"crop": n, "kind": "crop", "new": str(new_dir / n), "old": str(base_dir / n)} for n in names]
        items.append({"crop": tgt.name, "kind": "canary", "new": str(tgt), "old": str(old)})
        rng.shuffle(items)
        pairs = []
        for n, it in enumerate(items, 1):
            sides = ["new", "old"]
            rng.shuffle(sides)
            pairs.append({"pair": f"pair-{n:02d}", "crop": it["crop"], "kind": it["kind"],
                          "left": sides[0], "right": sides[1], "files": {"new": it["new"], "old": it["old"]}})
    out = pathlib.Path(tempfile.mkdtemp(prefix="pairs-"))
    for p in pairs:
        side_by_side(p["files"][p["left"]], p["files"][p["right"]], out / f"{p['pair']}.png")
    kp2 = key_path(loupe, rnd, swap)
    kp2.parent.mkdir(parents=True, exist_ok=True)
    kp2.write_text(json.dumps({"loupe": loupe, "round": rnd, "swap": swap, "pairs": pairs}, indent=1))
    return out, kp2


def score(loupe, rnd, ans_a, ans_b):
    """'new' wins a crop only when both contexts picked it; a context missing the canary is void."""
    result = {"wins": [], "losses": [], "void": []}
    picks = []
    for swap, ans in ((False, ans_a), (True, ans_b)):
        pairs = json.loads(key_path(loupe, rnd, swap).read_text())["pairs"]
        by = {p["pair"]: (None if ans.get(p["pair"], "tie") == "tie" else p[ans[p["pair"]]]) for p in pairs}
        canary = next(p["pair"] for p in pairs if p["kind"] == "canary")
        if by[canary] != "new":
            result["void"].append("swapped" if swap else "as made")
            picks.append(None)
        else:
            picks.append({p["crop"]: by[p["pair"]] for p in pairs if p["kind"] == "crop"})
    crops = [p["crop"] for p in json.loads(key_path(loupe, rnd).read_text())["pairs"] if p["kind"] == "crop"]
    for c in crops:
        both = all(pk is not None and pk[c] == "new" for pk in picks)
        result["wins" if both else "losses"].append(c)
    return result


def main(argv):
    if argv and argv[0] == "score":
        _, loupe, rnd, fa, fb = argv
        r = score(loupe, rnd, json.load(open(fa)), json.load(open(fb)))
        print(json.dumps(r, indent=1))
        return 1 if r["void"] else 0
    swap = "--swap" in argv
    args = [a for a in argv if a != "--swap"]
    if len(args) != 2:
        print(__doc__)
        return 2
    out, kp = build(args[0], args[1], swap)
    print(f"{len(list(out.glob('pair-*.png')))} pairs in {out}\nkey {kp}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
