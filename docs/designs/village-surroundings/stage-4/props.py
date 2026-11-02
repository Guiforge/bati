"""Étape 4 : le kit d'accessoires (camp, ville, petites histoires) et les animaux peints (souris, oiseaux).
Lancer depuis la racine du dépôt :
  python3 -I docs/designs/village-surroundings/stage-4/props.py gen <boucle> [nom ...]   # FLUX 3 Image, via le registre
  python3 -I docs/designs/village-surroundings/stage-4/props.py pose <boucle> [source]    # découpe, trait, planches
  (source : la boucle dont on redécoupe les images, sans repayer ; boucle 2 = redécoupe de la boucle 1)

Une image par accessoire, avec ses variantes en rang sur fond magenta (une souris ou un oiseau : ses images
d'animation en rang). Découpe : détourage de l'étape 0, puis une variante par bande de colonnes séparée par du
vide. Trait extérieur porté à 6 px à S (accessoires, hiérarchie de la bible), 3 px pour les animaux, qui font
8 à 12 dp. Planche contact : tout à l'échelle du jeu au zoom 0,6, à côté de la forge."""
import concurrent.futures, importlib.util, json, pathlib, re, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
from PIL import Image, ImageDraw, ImageFilter

MODE, B = sys.argv[1], sys.argv[2]
SEULS = sys.argv[3:]
ICI = pathlib.Path("docs/designs/village-surroundings")
CAND = pathlib.Path.home() / ".cache/bati-art-loop/iso/surroundings/stage4" / f"loop-{SEULS[0] if MODE == 'pose' and SEULS else B}"
CAND.mkdir(parents=True, exist_ok=True)
OUT = ICI / f"stage-4/loop-{B}"; OUT.mkdir(parents=True, exist_ok=True)
GW, GH = 1344, 896
S_CASE = 384  # px à S par case
MOTS = {2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve",
        13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen"}

# nom : (groupe, variantes, largeur posée d'une variante en cases, trait à S, sujet)
KIT = {
    "tonneaux": ("camp", 3, 0.45, 6, "a wooden barrel with iron hoops; one standing, one with its lid off showing water, one lying on its side"),
    "caisses": ("camp", 3, 0.45, 6, "wooden crates of planks; a single crate, two stacked crates, an open crate full of apples"),
    "tas_de_bois": ("camp", 3, 0.8, 6, "a woodpile of split logs; a neat stacked pile, a low messy heap with an axe in a stump, a pile under a small plank roof"),
    "sacs_de_grain": ("camp", 3, 0.45, 6, "burlap grain sacks tied at the top; one sack, three sacks leaning together, a sack spilling grain"),
    "bottes_de_foin": ("camp", 3, 0.6, 6, "hay bales; one round bale, two square bales stacked, a loose haystack with a pitchfork"),
    "ratelier": ("camp", 2, 0.6, 6, "a wooden weapon rack; one with two spears and a round shield, one with training swords and a bow"),
    "lanterne": ("camp", 2, 0.3, 6, "a lantern hanging on a wooden post; one simple post, one post with a small crossbar and a hook"),
    "cloture": ("camp", 3, 1.0, 6, "a short segment of rustic wooden fence; split-rail fence, woven wattle fence, fence with a little gate"),
    "poteau_indicateur": ("camp", 3, 0.4, 6, "a wooden signpost with arrow boards without any letters; one with two arrows, one with three, one leaning and old"),
    "menhir": ("camp", 3, 0.5, 6, "a Breton standing stone, a tall rough grey menhir with lichen; a tall one, a short wide one, a leaning one with grass at its foot"),
    "etal": ("ville", 3, 1.2, 6, "a small market stall with a striped cloth awning; vegetables, bread loaves, pots and fabric rolls"),
    "linge": ("ville", 2, 1.2, 6, "a laundry line on two wooden posts with shirts, sheets and socks drying; a long one and a short one"),
    "charrette": ("ville", 2, 1.0, 6, "a wooden hand cart with two big wheels; one empty, one loaded with sacks"),
    "outils": ("ville", 3, 0.5, 6, "a wooden ladder leaning, a bucket with a rope, a wheelbarrow"),
    "potager": ("ville", 2, 1.0, 6, "a small vegetable garden patch in a low wooden border, cabbages, leeks and pumpkins in rows"),
    "epouvantail": ("ville", 2, 0.4, 6, "a scarecrow on a pole with a straw hat and a patched coat; one with arms out, one tilted with a crow on its arm"),
    "poulailler": ("ville", 2, 1.0, 6, "a small pen with a low wattle fence and three hens; one with a tiny wooden coop"),
    "chat": ("histoire", 3, 0.3, 6, "a ginger cat asleep curled in a ball, a grey cat asleep stretched out, a black cat asleep with its tail around it, each lying on nothing"),
    "pecheur": ("histoire", 2, 0.4, 6, "a fisherman in a brown hood sitting with his legs dangling over an edge, holding a long fishing rod with the line hanging down"),
    "charrette_cassee": ("histoire", 2, 1.0, 6, "a wooden hay cart tilted on a broken wheel, hay spilling, the carter standing beside it scratching his head"),
    "sieste": ("histoire", 2, 0.5, 6, "an old villager with a white beard asleep sitting against a barrel, his hat over his eyes"),
    "renard": ("histoire", 3, 0.35, 6, "a red fox; crouching and watching, sitting, sneaking low"),
    "souris_grise": ("animal", 4, 0.19, 3, "four animation frames of the same small grey mouse running to the right, seen from the game's isometric camera, legs in four running positions, tail behind"),
    "souris_brune": ("animal", 4, 0.19, 3, "four animation frames of the same small brown field mouse running to the right, seen from the game's isometric camera, legs in four running positions, tail behind"),
    "souris_noire": ("animal", 4, 0.19, 3, "four animation frames of the same small dark mouse with a pale belly running to the right, seen from the game's isometric camera, legs in four running positions, tail behind"),
    "oiseau": ("animal", 4, 0.25, 3, "four animation frames of the same dark bird in flight seen from above at the game's isometric angle, two tones only, wings up, level, down and folded, like a crow or a starling"),
    "oiseau_b": ("animal", 4, 0.22, 3, "four animation frames of the same small dark swallow in flight seen from above at the game's isometric angle, two tones only, wings up, level, down and swept back"),
}

BLOC = (ICI / "bible.md").read_text(encoding="utf-8")
BLOC = re.search(r"## Bloc de prompt FLUX.*?```\n(.*?)\n```", BLOC, re.S).group(1)
BLOC = BLOC.replace("One object alone, centred, on", "The objects on")  # une rangée de variantes, pas un objet seul


def prompt(nom):
    g, n, cases, trait, sujet = KIT[nom]
    var_px = GW * 0.8 / n  # largeur d'une variante sur la toile
    t = max(2, min(16, round(trait * var_px / (cases * S_CASE))))
    rang = (f"A row of {MOTS[n]} separate pictures side by side, evenly spaced with wide empty gaps, never touching, same scale: {sujet}. "
            "Each one stands alone on the backdrop with nothing under it: no ground, no grass tile, no shadow, no base. ")
    return ("Image 1 gives only the mood and the brushwork, very low weight: never copy its building. " + rang
            + BLOC.replace("{TRAIT}", MOTS[t]))


if MODE == "gen":
    import iso_loop as I
    from lib import flux
    ref = CAND / "ref_ancre_640.png"
    if not ref.exists():
        Image.open("docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp").convert("RGB").resize((640, 800), Image.LANCZOS).save(ref)
    noms = SEULS or list(KIT)
    I.guard_endpoint(I.FLUX3)
    outs = {k: CAND / f"{k}.png" for k in noms}
    if any(o.exists() for o in outs.values()):
        sys.exit("déjà peint : une boucle ne se rejoue jamais en place")
    batch = I.reserve(len(noms), 0.10, f"surroundings s4 loop{B} props x{len(noms)}", None)
    responses = []

    def peindre(k):
        flux.generate(slug=f"surroundings_prop_{k}", prompt=prompt(k), out=outs[k], width=GW, height=GH, attempts=1,
                      references=(ref,), extra={"width": GW, "height": GH}, submitted_log=responses, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(peindre, noms))
    finally:
        print(I.settle(batch, responses))
    (OUT / "prompts.json").write_text(json.dumps({k: prompt(k) for k in noms}, indent=1, ensure_ascii=False))
    sys.exit(0)

# --- pose -----------------------------------------------------------------------------------------
spec = importlib.util.spec_from_file_location("planches", ICI / "stage-0/loop-2/planches.py")
pl = importlib.util.module_from_spec(spec); spec.loader.exec_module(pl)


def bandes(cut, vide=8):
    """Les variantes d'une rangée : des bandes de colonnes opaques séparées par au moins `vide` colonnes vides."""
    a = cut.getchannel("A").point(lambda v: 255 if v > 128 else 0)
    w, h = cut.size; col = [a.crop((x, 0, x + 1, h)).getbbox() is not None for x in range(w)]
    out, x = [], 0
    while x < w:
        if not col[x]: x += 1; continue
        x0 = x
        while x < w and (col[x] or any(col[x:x + vide])): x += 1
        part = cut.crop((x0, 0, x, h)); bb = part.getbbox()
        if bb and (bb[2] - bb[0]) * (bb[3] - bb[1]) > 1500:
            out.append(part.crop(bb))
    return out


def trait_porte(v, cible):
    brut = pl.trait(v)[0] if v.width > 30 else 0
    r = max(0, round(cible - brut))
    if r:
        pad = Image.new("RGBA", (v.width + 2 * r, v.height + 2 * r)); pad.alpha_composite(v, (r, r))
        a = pad.getchannel("A").point(lambda q: 255 if q > 128 else 0).filter(ImageFilter.MaxFilter(2 * r + 1))
        ink = Image.new("RGBA", pad.size, (15, 21, 24, 0)); ink.putalpha(a)
        v = Image.alpha_composite(ink, pad)
    return v, brut, r


mes, KITS = {}, {}
for nom, (g, n, cases, trait, _) in KIT.items():
    f = CAND / f"{nom}.png"
    if not f.exists():
        mes[nom] = {"absent": True}; continue
    cut, det = pl.detoure(Image.open(f))
    # Les images d'une animation se touchent presque (1 à 7 px de vide en boucle 1) : on coupe au premier vide.
    vs = bandes(cut, vide=1 if g == "animal" else 8)
    larg = max(v.width for v in vs) if vs else 1
    k = cases * S_CASE / larg  # px à S par px de toile, réglé sur la plus large variante
    cible = trait / k  # le trait visé, en px de toile
    poses = []
    for i, v in enumerate(vs):
        v2, brut, r = trait_porte(v, cible)
        v2.save(OUT / f"{nom}_{i + 1}.webp", quality=90)
        poses.append(v2)
    KITS[nom] = (poses, k)
    mes[nom] = {"groupe": g, "variantes_demandees": n, "variantes_obtenues": len(vs),
                "trait_brut_S": [round(pl.trait(v)[0] * k, 1) if v.width > 30 else None for v in vs], "trait_vise_S": trait}

# Planche contact : échelle du jeu au zoom 0,6 (0,525 px d'écran par px de S), la forge solid à gauche de chaque rang.
ECRAN = 128 * 0.6 * 2.625 / S_CASE


def planche(facteur, chemin):
    forge = Image.open("assets/images/village/iso/forge/solid.nuit.webp").convert("RGBA"); forge = forge.crop(forge.getbbox())
    fz = forge.resize((round(forge.width * ECRAN * facteur), round(forge.height * ECRAN * facteur)), Image.LANCZOS)
    rangs, cur, lw = [], [], 0
    for nom, (poses, k) in KITS.items():
        ims = [p.resize((max(1, round(p.width * k * ECRAN * facteur)), max(1, round(p.height * k * ECRAN * facteur))), Image.LANCZOS) for p in poses]
        cur.append((nom, ims)); lw += sum(i.width + 6 for i in ims) + 30
        if lw > 1400 * facteur: rangs.append(cur); cur, lw = [], 0
    if cur: rangs.append(cur)
    hr = max(fz.height, max((i.height for r in rangs for _, ims in r for i in ims), default=0)) + 24
    W = fz.width + 40 + max(sum(sum(i.width + 6 for i in ims) + 30 for _, ims in r) for r in rangs)
    pc = Image.new("RGBA", (W, hr * len(rangs) + 10), (0x6A, 0x74, 0x42, 255)); d = ImageDraw.Draw(pc)
    for j, r in enumerate(rangs):
        y0 = j * hr + 10; pc.alpha_composite(fz, (10, y0 + hr - 14 - fz.height)); x = fz.width + 30
        for nom, ims in r:
            d.text((x, y0), nom, fill=(15, 21, 24))
            for i in ims:
                pc.alpha_composite(i, (x, y0 + hr - 14 - i.height)); x += i.width + 6
            x += 30
    pc.convert("RGB").save(chemin, quality=90)


if KITS:
    planche(1, OUT / "contact_zoom06.webp")
    planche(3, OUT / "contact_x3.webp")
(OUT / "mesures.json").write_text(json.dumps(mes, indent=1, ensure_ascii=False))
print(json.dumps(mes, indent=1, ensure_ascii=False))
