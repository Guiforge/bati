import * as fs from "node:fs";
import * as path from "node:path";
import { LANGS, type Lang } from "./helpers/villageCopy";

// An exercise name is a label that may be plural ("Pompes", "Push-ups", "Liegestütze"), so no
// sentence may make a verb or an article agree with it: the name sits after a colon instead.

const read = (lang: Lang, key: string): string => {
  let node: unknown = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "..", "locales", `${lang}.json`), "utf8"),
  );
  for (const part of key.split(".")) node = (node as Record<string, unknown>)[part];
  return String(node);
};
const fill = (s: string, vars: Record<string, string>) =>
  s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");

// Real names from the seeds (drizzle/0032, 0059): a plural label for the ladder's next rung, and a
// singular one, because a sentence that is right for one number is often wrong for the other.
const PLURAL: Record<Lang, [string, string]> = {
  fr: ["Pompe sur les genoux", "Pompes"],
  en: ["Knee Push-Up", "Push-ups"],
  de: ["Knie-Liegestütz", "Liegestütze"],
  es: ["Flexiones con rodillas apoyadas", "Flexiones"],
};
const SINGULAR: Record<Lang, [string, string]> = {
  fr: ["Fente", "Fente bulgare"],
  en: ["Lunge", "Bulgarian Split Squat"],
  de: ["Ausfallschritt", "Bulgarische Kniebeuge"],
  es: ["Zancada", "Sentadilla búlgara"],
};

const earned = (names: Record<Lang, [string, string]>) =>
  Object.fromEntries(
    LANGS.map((l) => {
      const [movement, next] = names[l];
      return [l, fill(read(l, "journal.moved_rung_earned"), { movement, next })];
    }),
  );
const asideLines = (names: Record<Lang, [string, string]>) =>
  Object.fromEntries(
    LANGS.map((l) => [
      l,
      [read(l, "setAside.done"), read(l, "setAside.back")].map((s) =>
        fill(s, { name: names[l][0] }),
      ),
    ]),
  );

it("renders moved_rung_earned with a plural next movement in every language", () => {
  expect(earned(PLURAL)).toEqual({
    fr: "Maîtrise acquise : Pompe sur les genoux. À essayer ensuite : Pompes",
    en: "Mastered: Knee Push-Up. Next to try: Push-ups",
    de: "Gemeistert: Knie-Liegestütz. Als Nächstes: Liegestütze",
    es: "Ejercicio superado: Flexiones con rodillas apoyadas. A continuación: Flexiones",
  });
});

it("renders moved_rung_earned with singular names in every language", () => {
  expect(earned(SINGULAR)).toEqual({
    fr: "Maîtrise acquise : Fente. À essayer ensuite : Fente bulgare",
    en: "Mastered: Lunge. Next to try: Bulgarian Split Squat",
    de: "Gemeistert: Ausfallschritt. Als Nächstes: Bulgarische Kniebeuge",
    es: "Ejercicio superado: Zancada. A continuación: Sentadilla búlgara",
  });
});

it("renders the set-aside lines without agreeing with a plural name", () => {
  expect(
    asideLines({
      fr: ["Pompes", ""],
      en: ["Push-ups", ""],
      de: ["Liegestütze", ""],
      es: ["Flexiones", ""],
    }),
  ).toEqual({
    fr: ["Exercice écarté : Pompes.", "De retour : Pompes."],
    en: ["Set aside: Push-ups.", "Suggested again: Push-ups."],
    de: ["Beiseitegelegt: Liegestütze.", "Wieder da: Liegestütze."],
    es: ["Ejercicio apartado: Flexiones.", "De vuelta: Flexiones."],
  });
});

it("renders the set-aside lines with a singular name", () => {
  expect(asideLines(SINGULAR)).toEqual({
    fr: ["Exercice écarté : Fente.", "De retour : Fente."],
    en: ["Set aside: Lunge.", "Suggested again: Lunge."],
    de: ["Beiseitegelegt: Ausfallschritt.", "Wieder da: Ausfallschritt."],
    es: ["Ejercicio apartado: Zancada.", "De vuelta: Zancada."],
  });
});
