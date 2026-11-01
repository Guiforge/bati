// The data of Retouches.tsx: warm-stone polygons laid over a painted block (AUDIT-DA 39).

export type Teinte = "isoPierreChaudeClair" | "isoPierreChaudeMoyen" | "isoPierreChaudeSombre";

/** Per `<code>_<stade>`: the polygons, in sprite px, and their warm tone. */
export const RETOUCHES: Readonly<Record<string, readonly { points: string; teinte: Teinte }[]>> = {
  // The standing stone beside the first campfire: top, lit face, shaded face.
  campfire_rough: [
    { points: "369,514 394,509.5 411,525.5 386,532", teinte: "isoPierreChaudeClair" },
    { points: "368,518 383,533 383,611 367,597", teinte: "isoPierreChaudeMoyen" },
    { points: "387,534 414,528 414,605 387,611", teinte: "isoPierreChaudeSombre" },
  ],
};
