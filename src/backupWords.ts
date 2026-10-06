import { entropyToMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist as english } from "@scure/bip39/wordlists/english.js";
import { wordlist as french } from "@scure/bip39/wordlists/french.js";
import { wordlist as spanish } from "@scure/bip39/wordlists/spanish.js";

/**
 * The recovery key as twelve words (BIP-39), which is sixteen bytes and a four-bit check.
 *
 * Sixteen bytes is 128 bits, the strength of AES-128: a very good key against anyone who has to
 * guess it, and a quarter the length of the sixty-four hex digits it replaces. There is no
 * German list, so a German hero's words are the English ones and the screen says so.
 *
 * **Typing them.** Capitals, accents and spacing do not matter, and four letters are enough: in
 * all three lists no two words share their first four letters even with the accents dropped
 * (`__tests__/backupWords.test.ts` holds that, because the shortcut is only safe while it is
 * true). A shorter token has to be a whole word.
 *
 * **Which list.** Twelve words can be a valid phrase in more than one: a hundred words are in both
 * the English and the French list, and the check is only four bits. So this does not decide; it
 * returns every list the phrase is valid in, each with the bytes it reads to, and the caller tries
 * each against the key slot, which is the only thing that can say which was meant.
 */
export type WordLanguage = "en" | "fr" | "es";

const LISTS: Record<WordLanguage, string[]> = { en: english, fr: french, es: spanish };

/**
 * The list a hero's words are drawn from: their own language when there is a list, English when
 * there is not (German has none). The screen says which, so nobody wonders why the words are not
 * in their language.
 */
export function wordLanguageFor(appLanguage: string): WordLanguage {
  return appLanguage === "fr" || appLanguage === "es" ? appLanguage : "en";
}

export const RECOVERY_WORDS = 12;
export const RECOVERY_BYTES = 16;

const strip = (word: string) => word.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

/** Each list's words with the accents dropped, built once: this runs on every keystroke's worth. */
const stripped = new Map<WordLanguage, string[]>();

function strippedWords(language: WordLanguage): string[] {
  let words = stripped.get(language);
  if (!words) {
    words = LISTS[language].map(strip);
    stripped.set(language, words);
  }
  return words;
}

/**
 * Whether what a hero typed is the word they were shown, as the check of "did you write them
 * down" needs: the whole word, or its first four letters, accents and capitals ignored. A shorter
 * start of a longer word is not the word.
 */
export function wordMatches(typed: string, expected: string): boolean {
  const a = strip(typed).trim();
  const b = strip(expected);
  return a === b || (a.length >= 4 && b.startsWith(a));
}

/** The sixteen bytes as twelve words of `language`. */
export function entropyToWords(entropy: Uint8Array, language: WordLanguage): string[] {
  if (entropy.length !== RECOVERY_BYTES) throw new Error("A recovery key is sixteen bytes");
  // Composed (NFC), the way a keyboard types them: the lists ship decomposed, and a hero copying
  // a word with an accent should see the same letters they will type back.
  return entropyToMnemonic(entropy, LISTS[language]).normalize("NFC").split(" ");
}

/** The word of `language` a typed token stands for: the whole word, or the one it is the start of. */
function resolve(token: string, language: WordLanguage): string | null {
  const words = strippedWords(language);
  const exact = words.indexOf(token);
  if (exact >= 0) return LISTS[language][exact] ?? null;
  if (token.length < 4) return null;
  const starts = words.flatMap((word, i) => (word.startsWith(token) ? [i] : []));
  return starts.length === 1 ? (LISTS[language][starts[0] ?? 0] ?? null) : null;
}

/**
 * Every list in which `input` is twelve words that check out, with the sixteen bytes each reads
 * to. Empty when it is not a phrase at all: too few or too many words, a word in no list, a last
 * word that does not match the others.
 */
export function wordCandidates(input: string): { language: WordLanguage; entropy: Uint8Array }[] {
  const tokens = strip(input)
    .split(/[\s,;]+/)
    .filter((token) => token !== "");
  if (tokens.length !== RECOVERY_WORDS) return [];

  const found: { language: WordLanguage; entropy: Uint8Array }[] = [];
  for (const language of Object.keys(LISTS) as WordLanguage[]) {
    const words = tokens.map((token) => resolve(token, language));
    if (words.some((word) => word === null)) continue;
    try {
      found.push({ language, entropy: mnemonicToEntropy(words.join(" "), LISTS[language]) });
    } catch {
      // The check word does not match in this list: it is not this list's phrase, which is an
      // answer and not a failure. The other lists may still read it.
    }
  }
  return found;
}
