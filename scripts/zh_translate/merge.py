#!/usr/bin/env python3
"""Assemble locales/zh.json from the part files, mirroring en.json's structure.

Rules enforced here (they mirror __tests__/i18n-keys.test.ts):
- Same keys and same order as en.json, minus the plural forms Chinese has no use for
  (a family keeps only its `_other`: Intl.PluralRules("zh") has exactly ["other"]).
- Every {{placeholder}} of the English string survives in the translation.
- No em dash, no three dots, no curly apostrophe, no empty string.
- Arrays keep their length.
"""
import json
import re
import sys

PLURAL = re.compile(r"_(zero|one|two|few|many|other)$")
PLACEHOLDER = re.compile(r"\{\{\s*(\w+)\s*(?:,[^}]*)?\}\}")


def leaves(node, path=""):
    """Yield (path, value) for every string leaf, in file order."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, list):
        for i, item in enumerate(node):
            yield from leaves(item, f"{path}[{i}]")
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from leaves(v, f"{path}.{k}" if path else k)


def build(node, path, translations, skipped):
    """Rebuild the node with translations, dropping plural forms zh does not need."""
    if isinstance(node, str):
        return translations[path]
    if isinstance(node, list):
        return [build(item, f"{path}[{i}]", translations, skipped) for i, item in enumerate(node)]
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            child = f"{path}.{k}" if path else k
            m = PLURAL.search(k)
            if m and m.group(1) != "other":
                base = k[: m.start()]
                if f"{base}_other" in node:
                    skipped.append(child)  # a family form Chinese never selects
                    continue
            out[k] = build(v, child, translations, skipped)
        return out
    raise TypeError(f"unexpected node at {path}: {type(node)}")


def main() -> int:
    sys.path.insert(0, "scripts/zh_translate")
    from part1 import PART1
    from part2 import PART2
    from part3 import PART3
    from part4 import PART4
    from part5 import PART5
    from part6 import PART6

    translations = {}
    for part in (PART1, PART2, PART3, PART4, PART5, PART6):
        for key, value in part.items():
            if key in translations:
                print(f"DUPLICATE key in parts: {key}")
                return 1
            translations[key] = value

    en = json.load(open("locales/en.json", encoding="utf-8"))
    en_leaves = dict(leaves(en))

    skipped: list[str] = []
    zh = build(en, "", translations, skipped)

    # Every English leaf is either translated or a skipped plural form.
    wanted = {p for p, _ in leaves(en)}
    for key in sorted(wanted):
        if key in skipped:
            continue
        if key not in translations:
            print(f"MISSING translation: {key}  ->  {en_leaves[key]!r}")
    missing = [k for k in wanted if k not in skipped and k not in translations]
    if missing:
        print(f"{len(missing)} missing")
        return 1

    unused = sorted(set(translations) - wanted)
    if unused:
        print("UNUSED translation keys (typo?):")
        for key in unused:
            print(f"  {key}: {translations[key]!r}")
        return 1

    # Structural checks.
    zh_leaves = dict(leaves(zh))
    en_families = {k[:-6] for k in en_leaves if k.endswith("_other")}
    zh_families = {k[:-6] for k in zh_leaves if k.endswith("_other")}
    if en_families != zh_families:
        print("family mismatch:", en_families ^ zh_families)
        return 1

    problems = []
    for key, value in zh_leaves.items():
        en_value = en_leaves.get(key)
        if en_value is None:
            problems.append(f"{key}: no English counterpart")
            continue
        if sorted(PLACEHOLDER.findall(value)) != sorted(PLACEHOLDER.findall(en_value)):
            problems.append(f"{key}: placeholders differ\n  en: {en_value}\n  zh: {value}")
        for banned, label in (("—", "em dash"), ("...", "three dots"), ("’", "curly apostrophe")):
            if banned in value:
                problems.append(f"{key}: {label} -> {value!r}")
        if not value.strip():
            problems.append(f"{key}: empty")
    if problems:
        print("\n".join(problems))
        return 1

    with open("locales/zh.json", "w", encoding="utf-8", newline="\r\n") as f:
        json.dump(zh, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"zh.json written: {len(zh_leaves)} strings, {len(skipped)} plural forms dropped")
    print(f"standalone _one keys kept: "
          f"{sorted(k for k in en_leaves if k.endswith('_one') and k[:-4] + '_other' not in en_leaves)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
