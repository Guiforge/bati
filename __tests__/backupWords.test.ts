import { wordlist as english } from "@scure/bip39/wordlists/english.js";
import { wordlist as french } from "@scure/bip39/wordlists/french.js";
import { wordlist as spanish } from "@scure/bip39/wordlists/spanish.js";

import { entropyToWords, wordCandidates, wordLanguageFor, wordMatches } from "@/src/backupWords";

/**
 * The twelve words a hero writes down. Words, not hex, because a person copying sixty-four hex
 * digits by hand makes a mistake the app can only report as "wrong", and twelve words from a list
 * where four letters are enough, accents are optional and the last word checks the others turn a
 * mistake into a message.
 *
 * Expected values are from python-mnemonic and the BIP-39 test vectors, not from this code or from
 * the library it is built on.
 */
const entropy = (hex: string) => Uint8Array.from(Buffer.from(hex, "hex"));
const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

const ONE_TO_SIXTEEN = "0102030405060708090a0b0c0d0e0f10";

const PHRASES = {
  en: "absurd avoid scissors anxiety gather lottery category door army half long camera",
  fr: "abrasif appuyer prétexte alléger exister intrigue brousse dégrafer amour flamme intense bonifier",
  es: "abrir aprender rama altar gaita lucha bufanda derrota amistad guía lonja bonito",
} as const;

/** Twelve words that are a valid phrase in two lists at once, each reading to a different key. */
const AMBIGUOUS =
  "humble amateur question digital sentence danger stable image loyal fruit orange science";

describe("entropyToWords", () => {
  test.each(Object.entries(PHRASES))(
    "%s: the same sixteen bytes give python-mnemonic's words",
    (language, phrase) => {
      expect(
        entropyToWords(entropy(ONE_TO_SIXTEEN), language as "en" | "fr" | "es").join(" "),
      ).toBe(phrase);
    },
  );

  test("the BIP-39 test vectors, in English", () => {
    expect(entropyToWords(entropy("00000000000000000000000000000000"), "en").join(" ")).toBe(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    );
    expect(entropyToWords(entropy("7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f"), "en").join(" ")).toBe(
      "legal winner thank year wave sausage worth useful legal winner thank yellow",
    );
    expect(entropyToWords(entropy("ffffffffffffffffffffffffffffffff"), "en").join(" ")).toBe(
      "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong",
    );
  });

  test("always twelve, and nothing but sixteen bytes", () => {
    expect(entropyToWords(entropy(ONE_TO_SIXTEEN), "fr")).toHaveLength(12);
    expect(() => entropyToWords(new Uint8Array(15), "en")).toThrow();
    expect(() => entropyToWords(new Uint8Array(32), "en")).toThrow();
  });
});

describe("wordCandidates", () => {
  test.each(Object.entries(PHRASES))(
    "%s: reads its own phrase back to the same bytes",
    (language, phrase) => {
      const found = wordCandidates(phrase).find((c) => c.language === language);
      expect(found && hex(found.entropy)).toBe(ONE_TO_SIXTEEN);
    },
  );

  test("capitals, accents left out, and any spacing are all fine", () => {
    const typed =
      "  ABRASIF   appuyer\tPRETEXTE, alleger exister INTRIGUE brousse degrafer AMOUR flamme intense bonifier ";
    expect(wordCandidates(typed).map((c) => c.language)).toContain("fr");
  });

  test("the first four letters are enough, because no list shares four", () => {
    const short = PHRASES.fr
      .split(" ")
      .map((word) => word.normalize("NFD").replace(/\p{M}/gu, "").slice(0, 4))
      .join(" ");
    expect(wordCandidates(short).map((c) => c.language)).toContain("fr");
  });

  test("a token shorter than four letters has to be a whole word, even if only one word starts with it", () => {
    const strip = (w: string) => w.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
    const threeLetters = english.map((w) => strip(w).slice(0, 3));
    const lonely = new Set(
      english.filter(
        (w, i) => w.length > 3 && threeLetters.filter((p) => p === threeLetters[i]).length === 1,
      ),
    );
    expect(lonely.size).toBeGreaterThan(0);

    // A real phrase that contains such a word, found by trying keys until one does.
    let phrase: string[] = [];
    let word = "";
    for (let i = 1; i < 255 && word === ""; i++) {
      const candidate = entropyToWords(new Uint8Array(16).fill(i), "en");
      const hit = candidate.find((w) => lonely.has(w));
      if (hit) {
        phrase = candidate;
        word = hit;
      }
    }
    expect(word).not.toBe("");
    expect(wordCandidates(phrase.join(" ")).map((c) => c.language)).toContain("en");

    const cut = phrase.map((w) => (w === word ? w.slice(0, 3) : w));
    expect(wordCandidates(cut.join(" "))).toEqual([]);
  });

  test("a prefix that names two words is not guessed", () => {
    // "ab" is the start of many words; with fewer than four letters it must match exactly or not at all.
    const words = PHRASES.en.split(" ");
    words[0] = "ab";
    expect(wordCandidates(words.join(" "))).toEqual([]);
  });

  test("no list has two words that share four letters once accents are dropped", () => {
    const strip = (w: string) => w.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
    for (const list of [english, french, spanish]) {
      const prefixes = list.map((w) => strip(w).slice(0, 4));
      expect(new Set(prefixes).size).toBe(list.length);
    }
  });

  test("eleven or thirteen words, or none, is not a phrase", () => {
    const words = PHRASES.en.split(" ");
    expect(wordCandidates(words.slice(0, 11).join(" "))).toEqual([]);
    expect(wordCandidates([...words, "abandon"].join(" "))).toEqual([]);
    expect(wordCandidates("")).toEqual([]);
    expect(wordCandidates("   ")).toEqual([]);
  });

  test("a word that is in no list, or a last word that does not check, is not a phrase", () => {
    const words = PHRASES.en.split(" ");
    expect(wordCandidates([...words.slice(0, 11), "zzzzzz"].join(" "))).toEqual([]);
    expect(wordCandidates([...words.slice(0, 11), "abandon"].join(" "))).toEqual([]);
  });

  test("sixty-four hex digits are not words", () => {
    expect(wordCandidates("ab".repeat(32))).toEqual([]);
  });

  test("a phrase that is valid in two lists gives both, each with its own bytes", () => {
    const found = wordCandidates(AMBIGUOUS);

    expect(found.map((c) => c.language).sort()).toEqual(["en", "fr"]);
    expect(hex(found.find((c) => c.language === "en")?.entropy ?? new Uint8Array())).toBe(
      "6ee0f6be1efc3e6ef4f38a848bba6f60",
    );
    expect(hex(found.find((c) => c.language === "fr")?.entropy ?? new Uint8Array())).toBe(
      "7cc16316232da87cb88bf391adc2b5eb",
    );
  });

  test("an English phrase is not mistaken for a French one", () => {
    expect(wordCandidates(PHRASES.en).map((c) => c.language)).toEqual(["en"]);
  });
});

describe("wordMatches", () => {
  test("the word itself, however it is typed", () => {
    expect(wordMatches("abrasif", "abrasif")).toBe(true);
    expect(wordMatches("  ABRASIF ", "abrasif")).toBe(true);
  });

  test("accents are optional", () => {
    expect(wordMatches("allèger", "alléger")).toBe(true);
    expect(wordMatches("alleger", "alléger")).toBe(true);
    expect(wordMatches("pretexte", "prétexte")).toBe(true);
  });

  test("four letters are enough, because no list shares four", () => {
    expect(wordMatches("alle", "alléger")).toBe(true);
    expect(wordMatches("pret", "prétexte")).toBe(true);
  });

  test("fewer than four letters of a longer word is not the word", () => {
    expect(wordMatches("all", "alléger")).toBe(false);
    expect(wordMatches("", "alléger")).toBe(false);
  });

  test("another word is not it, even one that looks close", () => {
    expect(wordMatches("allier", "alléger")).toBe(false);
    expect(wordMatches("abrasifs", "abrasif")).toBe(false);
  });

  test("a short word has to be typed whole", () => {
    expect(wordMatches("act", "act")).toBe(true);
    expect(wordMatches("ac", "act")).toBe(false);
  });
});

describe("wordLanguageFor", () => {
  test("French and Spanish have a list; every other language uses English", () => {
    expect(wordLanguageFor("fr")).toBe("fr");
    expect(wordLanguageFor("es")).toBe("es");
    expect(wordLanguageFor("en")).toBe("en");
    expect(wordLanguageFor("de")).toBe("en");
    expect(wordLanguageFor("")).toBe("en");
  });
});
