// The walkers' state on the map (L5-T04): when a wave starts, plan it once in JS (marcheurs.ts);
// while it runs, tell React the one thing it needs, the index of each walker's current segment,
// which changes a few times a wave (that is when a walker's depth rank and side are redrawn). The
// position itself is never in React: the walker reads it from the clock.

import { useIsFocused } from "expo-router";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { type SharedValue, useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { BuildingCode } from "@/db/schema";
import { effetsDeVague } from "./effets";
import { useMouvementReduit } from "./fige";
import { feteDue, garderPoses, type Habitant, rassembler } from "./habitants";
import { cibleVague, DepartContext, VAGUE_MIN_MS } from "./horloge";
import type { Case } from "./isoLayout";
import {
  type Bete,
  type Carte,
  empriseSegment,
  HORIZON_MS,
  indiceSegment,
  jourDe,
  planifierAnimaux,
  planifierVague,
  type Role,
  reposInitial,
  rolesPresents,
  type Segment,
  type Vague,
  viesSansMarche,
} from "./marcheurs";
import { mouvementDeVague } from "./mouvement";
import type { Emprise } from "./profondeur";
import { type Veille, veilleDeVague } from "./veilleuses";

type Etat = {
  c0: number;
  vague: Vague;
  indices: readonly number[];
  /** The night lights of the wave, planned once at its start; null once the wave is over. */
  veille: Veille | null;
  /** The small animals' walks of the wave (marcheurs.ts `planifierAnimaux`); empty once it is over. */
  betes: readonly Bete[];
};

/** The day the map was mounted on, read once, never at render (a map kept mounted past midnight plans the new day's waves; its rest poses wait for the next mount). */
export function useJour(): number {
  return useState(() => jourDe(Date.now(), new Date().getTimezoneOffset()))[0];
}

/** The walks of the animals in the wave on now (null at rest): read by each `Animal`, by its name. */
export const AnimauxContext = createContext<{ c0: number; betes: readonly Bete[] } | null>(null);

/** Which buildings have windows and a door, for the night lights. */
export type Lumieres = {
  fenetres: (code: BuildingCode) => boolean;
  porte: (code: BuildingCode) => boolean;
};

/** The lights stay this long after the wave's last rest pose, ms. */
const FIN_VEILLE_MARGE_MS = 200;

/** One shown role: where it stands, or the plan it walks. */
export type MarcheurVu = {
  role: Role;
  /** Where it stands, or where its wave starts. */
  cellule: Case;
  /** Its wave's segments when it walks in it, else null: it stands, with no animated node. */
  segments: readonly Segment[] | null;
  /** The segment it is in. */
  indice: number;
  /** The clock value its wave started at. */
  c0: number;
  /** The footprint its depth rank is measured on: the cells of its segment. */
  emprise: Emprise;
};

/** The reduced-motion party lasts this long, ms: they stand on the square, then go back to their places. */
export const FETE_REDUITE_MS = 20000;

/** What lives on the map besides the trades (T26). */
export type Vie = {
  /** The standing inhabitants of the tier (habitants.ts). */
  habitants: readonly Habitant[];
  /** The session's key (the route's `grown`): the first wave after a new one is a party. */
  fete?: string;
  /** The trade of the dominant practice: it is picked more often to walk. */
  favori?: Role;
};

export function useMarcheurs(
  carteBase: Carte,
  horloge: SharedValue<number> | null,
  lumieres: Lumieres,
  vie: Vie = { habitants: [] },
): {
  marcheurs: readonly MarcheurVu[];
  /** The inhabitants, each where it stands now (on the square during a reduced-motion party). */
  habitants: readonly Habitant[];
  veille: Veille | null;
  /** The animals that walk in the wave on now, with the clock value it started at; null at rest. */
  animaux: { c0: number; betes: readonly Bete[] } | null;
} {
  const [etat, setEtat] = useState<Etat | null>(null);
  // Read again at each wave: a map kept mounted past midnight plans the new day's.
  const [jour, setJour] = useState(() => jourDe(Date.now(), new Date().getTimezoneOffset()));
  const depart = useContext(DepartContext);
  const focus = useIsFocused();
  const reduit = useMouvementReduit();
  // Waves planned since this map was mounted: the rare acts fall in the first few.
  const rangRef = useRef(0);
  const actif = focus && !reduit;
  // No villager stops or crosses on an inhabitant's cell: they close it like a standing figurine.
  const carte: Carte = {
    ...carteBase,
    occupees: [...(carteBase.occupees ?? []), ...vie.habitants.map((h) => h.cellule)],
  };
  // The session whose party has played (once per key), and the reduced-motion party on now.
  const celebree = useRef<string | undefined>(undefined);
  const [feteReduite, setFeteReduite] = useState(false);
  const vieRef = useRef(vie);
  const reduitRef = useRef(reduit);

  // The reactions below must not close over this render's `carte` (a new object each time) or
  // `etat`: Reanimated would attach them again every render, and each attach reads as a change.
  // They read refs and shared values instead, and the handlers they call are stable.
  const carteRef = useRef(carte);
  const lumieresRef = useRef(lumieres);
  const finVeille = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    carteRef.current = carte;
    lumieresRef.current = lumieres;
    vieRef.current = vie;
    reduitRef.current = reduit;
  });
  useEffect(() => {
    if (!reduit || !feteDue(vie.fete, celebree.current)) return;
    celebree.current = vie.fete;
    setFeteReduite(true);
    const fin = setTimeout(() => setFeteReduite(false), FETE_REDUITE_MS);
    return () => clearTimeout(fin);
  }, [reduit, vie.fete]);
  useEffect(
    () => () => {
      if (finVeille.current) clearTimeout(finVeille.current);
    },
    [],
  );
  const etatRef = useRef<Etat | null>(null);
  // Where every role stood at the last render: the next wave starts there.
  const finsRef = useRef<Partial<Record<Role, Case>>>({});
  // The plan the UI thread follows, and the indices it last told React about.
  const plan = useSharedValue<{ c0: number; segments: (readonly Segment[])[] } | null>(null);
  const courants = useSharedValue("");

  const lancer = (c0: number) => {
    // The wave number is the quarter-minute it starts in: it differs from one wave to the next (a wave lasts 15 s at least) and survives the map being mounted again.
    const numero = Math.floor(Date.now() / VAGUE_MIN_MS);
    const jour = jourDe(Date.now(), new Date().getTimezoneOffset());
    // The first wave after a new session is the party; once per key, and never in reduced motion (its own party).
    const fete = !reduitRef.current && feteDue(vieRef.current.fete, celebree.current);
    if (fete) celebree.current = vieRef.current.fete;
    const vague = planifierVague(carteRef.current, finsRef.current, jour, numero, {
      fete,
      favori: vieRef.current.favori,
    });
    setJour(jour);
    const veille: Veille = {
      ...veilleDeVague(
        c0,
        jour,
        numero,
        carteRef.current,
        vague.marcheurs.map((m) => m.segments),
        lumieresRef.current.fenetres,
        lumieresRef.current.porte,
      ),
      effets: effetsDeVague(carteRef.current.montres, jour, numero),
      mouvement: mouvementDeVague(carteRef.current.montres, jour, numero),
    };
    const marcheuses = planifierAnimaux(carteRef.current, vague, jour, numero, rangRef.current);
    const betes = [
      ...marcheuses,
      ...viesSansMarche(carteRef.current, marcheuses, jour, numero, rangRef.current),
    ];
    rangRef.current++;
    const suivant: Etat = { c0, vague, indices: [], veille, betes };
    etatRef.current = suivant;
    // The lights and the animals end with the wave: unmounted, so nothing animates on the rest map.
    // They end at the `cibleVague(c0)` the wave had at its start, even if a touch has since
    // extended it: a touch mid-wave plans nothing new (shortcut: the extra seconds are plain rest).
    if (finVeille.current) clearTimeout(finVeille.current);
    finVeille.current = setTimeout(
      () => {
        const courant = etatRef.current;
        if (!courant || courant.c0 !== c0) return;
        etatRef.current = { ...courant, veille: null, betes: [] };
        setEtat(etatRef.current);
      },
      Math.max(0, cibleVague(c0) - (horloge?.get() ?? c0)) + FIN_VEILLE_MARGE_MS,
    );
    courants.set(vague.marcheurs.map(() => 0).join(","));
    plan.set({ c0, segments: vague.marcheurs.map((m) => m.segments) });
    setEtat(suivant);
  };
  const poser = (c0: number, indices: string) => {
    const avant = etatRef.current;
    const lus = indices.split(",").map(Number);
    if (!avant || avant.c0 !== c0 || lus.join(",") === avant.indices.join(",")) return;
    const suivant = { ...avant, indices: lus };
    etatRef.current = suivant;
    setEtat(suivant);
  };

  // A wave starts when the clock's owner says so (a touch of the map, the focus: horloge.ts), and
  // for no other reason: a late frame or a return to the tab never plans anything. The first
  // reading can already hold a start (the focus sets it before the reaction first runs), so it
  // counts from 0; a signal left from before this mount is told by the clock being past its
  // horizon.
  useAnimatedReaction(
    () => depart?.get().n ?? 0,
    (n, avant) => {
      if (!depart || !horloge || n === (avant ?? 0)) return;
      const { c0 } = depart.get();
      if (horloge.get() - c0 <= HORIZON_MS) scheduleOnRN(lancer, c0);
    },
  );
  useAnimatedReaction(
    () => {
      const p = plan.get();
      if (!p || !horloge) return "";
      const t = horloge.get() - p.c0;
      return p.segments.map((s) => indiceSegment(s, t)).join(",");
    },
    (indices) => {
      const p = plan.get();
      if (!p || indices === "" || indices === courants.get()) return;
      courants.set(indices);
      scheduleOnRN(poser, p.c0, indices);
    },
  );

  const roles = rolesPresents(carte.montres);
  const repos = reposInitial(roles, carte, jour, etat?.vague.fins ?? {});
  const fins = reposInitial(roles, carte, jour, repos);
  useEffect(() => {
    finsRef.current = fins;
  });
  // The reduced-motion party: everyone present stands on the square, nobody walks there (T26).
  const fete = feteReduite
    ? rassembler(
        [
          ...roles.flatMap((r) => (fins[r] ? [{ id: r, cellule: fins[r] }] : [])),
          ...vie.habitants.map((h) => ({ id: h.id, cellule: h.cellule })),
        ],
        carteBase,
      )
    : null;
  const posees: Partial<Record<string, Case>> = { ...fins, ...fete };
  const marcheurs = roles.flatMap((role): MarcheurVu[] => {
    const cellule = posees[role];
    if (!cellule) return [];
    const k = etat?.vague.marcheurs.findIndex((m) => m.role === role) ?? -1;
    const marcheur = actif && etat && k >= 0 ? etat.vague.marcheurs[k] : undefined;
    const debout = { coin: cellule, emprise: [1, 1] } as const;
    if (!etat || !marcheur)
      return [{ role, cellule, segments: null, indice: 0, c0: 0, emprise: debout }];
    const indice = etat.indices[k] ?? 0;
    const segment = marcheur.segments[indice];
    return [
      {
        role,
        cellule: marcheur.segments[0]?.de ?? cellule,
        segments: marcheur.segments,
        indice,
        c0: etat.c0,
        emprise: segment ? empriseSegment(segment) : debout,
      },
    ];
  });
  // An inhabitant on a cell a trade strikes or stands on steps aside while it does (never two on one cell).
  const prises = new Set(marcheurs.map((m) => m.cellule.join(",")));
  // Whoever the party moved stands up from its resting pose, and resumes it when back.
  const enPlace = garderPoses(
    vie.habitants
      .map((h) => ({ ...h, cellule: fete?.[h.id] ?? h.cellule }))
      .filter((h) => !prises.has(h.cellule.join(","))),
    vie.habitants,
  );
  return {
    marcheurs,
    habitants: enPlace,
    veille: actif ? (etat?.veille ?? null) : null,
    animaux: actif && etat && etat.betes.length > 0 ? { c0: etat.c0, betes: etat.betes } : null,
  };
}
