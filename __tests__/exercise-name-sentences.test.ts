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

const NAMES: Record<Lang, [string, string]> = {
  fr: ["Pompe sur les genoux", "Pompes"],
  en: ["Knee push-ups", "Push-ups"],
  de: ["Kniebeugen-Liegestütze", "Liegestütze"],
  es: ["Flexiones de rodillas", "Flexiones"],
};

it("renders moved_rung_earned with a plural next movement in every language", () => {
  const out = Object.fromEntries(
    LANGS.map((l) => {
      const [movement, next] = NAMES[l];
      return [l, fill(read(l, "journal.moved_rung_earned"), { movement, next })];
    }),
  );
  expect(out).toEqual({
    fr: "Maîtrise acquise : Pompe sur les genoux. À essayer ensuite : Pompes",
    en: "Mastered: Knee push-ups. Next to try: Push-ups",
    de: "Gemeistert: Kniebeugen-Liegestütze. Als Nächstes: Liegestütze",
    es: "Ejercicio superado: Flexiones de rodillas. Lo siguiente: Flexiones",
  });
});

it("renders the set-aside lines without agreeing with a plural name", () => {
  const out = Object.fromEntries(
    LANGS.map((l) => [
      l,
      [read(l, "setAside.done"), read(l, "setAside.back")].map((s) =>
        fill(s, { name: NAMES[l][1] }),
      ),
    ]),
  );
  expect(out).toEqual({
    fr: ["On ne te proposera plus Pompes.", "De retour : Pompes."],
    en: ["Push-ups won't be suggested again.", "Back: Push-ups."],
    de: ["Du bekommst Liegestütze nicht mehr vorgeschlagen.", "Wieder da: Liegestütze."],
    es: ["Ya no te propondremos Flexiones.", "De vuelta: Flexiones."],
  });
});
