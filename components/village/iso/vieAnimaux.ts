// T31: the small animals' own lives. A pure module: a typed table of behaviours per animal (what
// may follow what, a weight, a varied duration) and a small state machine that plans a wave's
// behaviours from a seeded hash (day, wave, animal), so the same wave always plays the same life
// and two waves never play the same. It adds no node: a behaviour only picks which of the three
// poses the animal's existing nodes show (horloge.ts `poseAnimal` showed one fixed loop) and,
// for the one behaviour that moves (`marche`), when the walk of marcheurs.ts `planifierAnimaux`
// starts. At rest, with reduced motion or frozen, no plan exists: the animal holds its rest pose.
// shortcut: only the poses repos, a and b exist, so each `poses` below is a best use of them and
// `aPeindre` names the clip to paint when T31 point 3 is done.

/** Pose images per second of the animals' drawn sheets (performance.md); horloge.ts reads it from here. */
export const IMAGES_PAR_SECONDE = 8;

export type AnimalVie = "chat" | "poule" | "corbeau";
/** The images of an animal's sheet: 0 rest, 1 pose a, 2 pose b (carteDemo.ts `POSES_ANIMAL`). */
export type Pose = 0 | 1 | 2;

export type Comportement = {
  id: string;
  /** Relative weight when the previous behaviour allows it. */
  poids: number;
  /** Its duration is drawn in this range, ms. */
  duree: readonly [min: number, max: number];
  /** The images it plays, in a loop, at IMAGES_PAR_SECONDE. */
  poses: readonly Pose[];
  /** What may come after it (ids of the same animal). Never itself. */
  suit: readonly string[];
  /** May open a wave. */
  depart?: true;
  /** Only on a rare day (RARE_CHANCE of days). */
  rare?: true;
  /** The one real movement: a walk out and back (marcheurs.ts builds its segments from the step). */
  marche?: true;
  /** The clip to paint for it (T31 point 3), until then `poses` stand in. */
  aPeindre: string;
};

/** Share of days on which an animal's rare behaviour happens, in every wave of the day. */
export const RARE_CHANCE = 0.1;
/** A wave plans inside this window, ms: the shortest wave (VAGUE_MIN_MS) is 15 s, less a margin so a behaviour ends before the rest. */
export const TOTAL_MS = 14000;
export const FIN_MARGE_MS = 500;
/** Each animal starts at its own offset in 0 to this, ms. */
export const DECALAGE_MAX_MS = 3000;

// The wave lasts 15 to 20 s, so a nap is 6 to 11 s here (the card said 10 to 30): the rest pose
// of the cat is asleep, so it dozes on between waves.
export const VIES: Record<AnimalVie, readonly Comportement[]> = {
  chat: [
    {
      id: "dort",
      poids: 60,
      duree: [6000, 11000],
      poses: [0],
      suit: ["baille", "reveil"],
      depart: true,
      aPeindre: "chat roulé en boule, flancs qui montent",
    },
    {
      id: "baille",
      poids: 10,
      duree: [1500, 2500],
      poses: [0, 1, 1, 0],
      suit: ["dort", "reveil"],
      aPeindre: "chat qui bâille, 3 images",
    },
    {
      id: "reveil",
      poids: 10,
      duree: [1200, 2000],
      poses: [1],
      suit: ["etire", "assis"],
      aPeindre: "chat qui lève la tête",
    },
    {
      id: "etire",
      poids: 10,
      duree: [2000, 3000],
      poses: [1, 2, 2, 1],
      suit: ["marche", "assis", "leche"],
      aPeindre: "chat qui s'étire, dos creusé",
    },
    {
      id: "marche",
      poids: 12,
      duree: [4500, 6500],
      poses: [1, 2],
      suit: ["assis", "leche", "dort"],
      marche: true,
      aPeindre: "marche du chat, 4 images",
    },
    {
      id: "assis",
      poids: 25,
      duree: [2500, 4500],
      poses: [1],
      suit: ["leche", "dort", "marche", "chasse"],
      depart: true,
      aPeindre: "chat assis, queue enroulée",
    },
    {
      id: "leche",
      poids: 15,
      duree: [2000, 4000],
      poses: [2, 1, 2, 1],
      suit: ["assis", "dort", "marche"],
      depart: true,
      aPeindre: "chat qui se lèche la patte",
    },
    {
      id: "chasse",
      poids: 20,
      duree: [2500, 3500],
      poses: [2, 1, 2, 1, 2],
      suit: ["assis", "marche"],
      rare: true,
      aPeindre: "chat qui bondit sur un papillon",
    },
  ],
  poule: [
    {
      id: "picore",
      poids: 45,
      duree: [2000, 4500],
      poses: [1, 0, 1, 0],
      suit: ["gratte", "marche", "sursaute", "ailes"],
      depart: true,
      aPeindre: "poule qui picore, tête qui plonge",
    },
    {
      id: "gratte",
      poids: 25,
      duree: [1800, 3500],
      poses: [2, 0, 2, 0],
      suit: ["picore", "marche", "sursaute"],
      depart: true,
      aPeindre: "poule qui gratte la terre",
    },
    {
      id: "marche",
      poids: 20,
      duree: [4500, 6500],
      poses: [1, 2],
      suit: ["picore", "gratte"],
      marche: true,
      aPeindre: "marche de la poule, 4 images",
    },
    {
      id: "sursaute",
      poids: 6,
      duree: [800, 1500],
      poses: [2],
      suit: ["picore", "gratte", "marche"],
      aPeindre: "poule qui se redresse d'un coup",
    },
    {
      id: "ailes",
      poids: 20,
      duree: [1500, 2500],
      poses: [2, 1, 2, 1],
      suit: ["picore", "marche"],
      rare: true,
      aPeindre: "poule qui bat des ailes",
    },
  ],
  corbeau: [
    {
      id: "pose",
      poids: 50,
      duree: [3000, 6000],
      poses: [0],
      suit: ["lisse", "tourne", "sautille", "croasse"],
      depart: true,
      aPeindre: "corbeau posé, plumes qui frémissent",
    },
    {
      id: "lisse",
      poids: 25,
      duree: [2000, 3500],
      poses: [1, 0, 1, 0],
      suit: ["pose", "tourne"],
      depart: true,
      aPeindre: "corbeau qui se lisse les plumes",
    },
    {
      id: "tourne",
      poids: 20,
      duree: [1200, 2200],
      poses: [2],
      suit: ["pose", "lisse", "sautille"],
      aPeindre: "corbeau qui tourne la tête",
    },
    {
      id: "sautille",
      poids: 15,
      duree: [4500, 6500],
      poses: [1, 2],
      suit: ["pose", "lisse"],
      marche: true,
      aPeindre: "sautillements du corbeau, 3 images",
    },
    {
      id: "croasse",
      poids: 20,
      duree: [1500, 2500],
      poses: [2, 1, 2],
      suit: ["pose", "sautille"],
      rare: true,
      aPeindre: "corbeau bec ouvert qui croasse",
    },
  ],
};

/** The poses an animal can be left in between waves (drawn once a day), and the clips to paint for the others. */
export const REPOS: Record<AnimalVie, { poses: readonly Pose[]; aPeindre: string }> = {
  chat: { poses: [0], aPeindre: "chat assis, chat roulé en boule" },
  poule: { poses: [0], aPeindre: "poule accroupie sur ses pattes" },
  corbeau: { poses: [0], aPeindre: "corbeau tête rentrée" },
};

/** The seeds of an animal's plan for a wave, of its rare day and of its rest pose. */
export const graineVie = (jour: number, numero: number, nom: string) =>
  `${jour}:${numero}:${nom}:vie`;
export const graineJour = (jour: number, nom: string, quoi: "rare" | "repos") =>
  `${jour}:${nom}:${quoi}`;

/** The rest pose of an animal for the day, from `u` in [0, 1) (the first draw of `graineJour(…, "repos")`). */
export function poseRepos(nom: string, u: number): Pose {
  const poses = REPOS[nom as AnimalVie]?.poses ?? [0];
  return poses[Math.floor(u * poses.length)] ?? 0;
}

/** Whether today is a rare day for an animal, from `u` in [0, 1) (the first draw of `graineJour(…, "rare")`). */
export const rareDuJour = (u: number) => u < RARE_CHANCE;

/** One planned behaviour: when it starts in the wave, how long, which images. */
export type Etape = {
  id: string;
  t0: number;
  duree: number;
  poses: readonly Pose[];
  marche?: true;
};

/** The pick among `candidats` weighted by `poids`, with `u` in [0, 1). */
export function tirer(candidats: readonly Comportement[], u: number): Comportement | undefined {
  const somme = candidats.reduce((s, c) => s + c.poids, 0);
  let x = u * somme;
  for (const c of candidats) {
    x -= c.poids;
    if (x < 0) return c;
  }
  return candidats[candidats.length - 1];
}

/** Per animal: the least time, ms, from the end of a behaviour to the start of its walk (no rare detour). */
const DELAI_MARCHE: Record<string, Record<string, number>> = Object.fromEntries(
  Object.entries(VIES).map(([nom, table]) => {
    const d: Record<string, number> = Object.fromEntries(table.map((c) => [c.id, Infinity]));
    for (let k = 0; k < table.length; k++)
      for (const c of table) {
        const suivants = c.suit.flatMap((s) => {
          const x = table.find((y) => y.id === s);
          return x ? [x] : [];
        });
        const v = suivants.some((x) => x.marche)
          ? 0
          : Math.min(
              Infinity,
              ...suivants.filter((x) => !x.rare).map((x) => x.duree[0] + (d[x.id] ?? Infinity)),
            );
        d[c.id] = Math.min(d[c.id] ?? Infinity, v);
      }
    return [nom, d];
  }),
);

/** The longest `c` may last in `reste` ms and still leave `apres` ms for the walk to come (not for the walk itself). */
const dureeMax = (c: Comportement, reste: number, apres: number) =>
  Math.min(c.duree[1], reste - (c.marche ? 0 : apres));

/** What may come next: after `prec`, else what opens a wave; no rare one off a rare day, no walk if none is wanted. */
function candidats(
  table: readonly Comportement[],
  prec: Comportement | undefined,
  options: { marche: boolean; rare: boolean },
) {
  return table.filter(
    (c) =>
      (prec ? prec.suit.includes(c.id) : c.depart) &&
      (options.rare || !c.rare) &&
      (options.marche || !c.marche),
  );
}

/**
 * An animal's behaviours in a wave. `h` is the seeded stream (`hasard(graineVie(...))`). With
 * `marche`, the plan holds exactly one walk, and every earlier choice leaves room for it; without,
 * none. A behaviour is never cut: the last one ends before TOTAL_MS less a margin, and what is
 * left is the rest pose (`poseVie` returns it outside every step). Two durations in a row differ.
 */
/** Never the same length twice in a row, and never outside [lo, hi]: when lo === hi the repeat stays. */
function autreDuree(tire: number, derniere: number | undefined, lo: number, hi: number): number {
  if (tire !== derniere) return tire;
  if (tire < hi) return tire + 1;
  return tire > lo ? tire - 1 : tire;
}

/**
 * On a rare day, before the rare act is placed: what to draw from (the rare candidates, else those
 * that lead straight to one, else the pool) and whether the step drawn must be the shortest.
 */
function viseRare(
  table: readonly Comportement[],
  pool: readonly Comportement[],
  etapes: readonly Etape[],
  rare: boolean,
) {
  const fait = !rare || etapes.some((e) => table.find((x) => x.id === e.id)?.rare);
  const rares = pool.filter((x) => x.rare);
  const mene = pool.filter((x) => table.some((y) => y.rare && x.suit.includes(y.id)));
  if (fait) return { tirage: pool, mene: [] };
  if (rares.length) return { tirage: rares, mene: [] };
  return { tirage: mene.length ? mene : pool, mene };
}

export function planVie(
  nom: string,
  h: () => number,
  options: { marche: boolean; rare: boolean },
): Etape[] {
  const table = VIES[nom as AnimalVie] ?? [];
  const delai = DELAI_MARCHE[nom] ?? {};
  const marcheMin = table.find((c) => c.marche)?.duree[0] ?? 0;
  const fin = TOTAL_MS - FIN_MARGE_MS;
  let t = Math.round(h() * DECALAGE_MAX_MS);
  const etapes: Etape[] = [];
  let prec: Comportement | undefined;
  let derniere = -1;
  let marche = false;
  for (let tour = 0; tour < 20; tour++) {
    const exige = options.marche && !marche;
    const place = (c: Comportement) =>
      dureeMax(c, fin - t, exige ? (delai[c.id] ?? Infinity) + marcheMin : 0);
    const pool = candidats(table, prec, options).filter(
      (c) => !(c.marche && marche) && place(c) >= c.duree[0],
    );
    // A rare day plays its rare behaviour in every wave: the rare one when it may follow, else
    // what leads straight to it (a draw by weight alone left it in under one session in ten).
    const { tirage, mene } = viseRare(table, pool, etapes, options.rare);
    const c = tirer(tirage, h());
    if (!c) break;
    const lo = c.duree[0];
    // The step before a forced rare one is the shortest, so the rare one and the walk still fit.
    const hi = mene.includes(c) ? lo : place(c);
    const tire = Math.round(lo + h() * (hi - lo));
    const duree = autreDuree(tire, derniere, lo, hi);
    etapes.push({
      id: c.id,
      t0: t,
      duree,
      poses: c.poses,
      marche: c.marche,
    });
    t += duree;
    prec = c;
    derniere = duree;
    if (c.marche) marche = true;
  }
  return etapes;
}

/** The image an animal shows `t` ms into the wave: that of the step it is in, else its rest pose. */
export function poseVie(etapes: readonly Etape[], t: number, repos: Pose): Pose {
  "worklet";
  for (let i = 0; i < etapes.length; i++) {
    const e = etapes[i];
    if (e && t >= e.t0 && t < e.t0 + e.duree)
      return (
        e.poses[Math.floor(((t - e.t0) * IMAGES_PAR_SECONDE) / 1000) % e.poses.length] ?? repos
      );
  }
  return repos;
}
