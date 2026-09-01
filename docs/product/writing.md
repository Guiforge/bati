---
title: How Bati Writes
type: concept
status: active
updated: 2026-09-01
related: [positioning.md, ../gameplay/villagers.md, ../CONTRIBUTING.md, ../meta/wiki-protocol.md]
---

# How Bati Writes

> [positioning.md](positioning.md) owns the tone: dark, minimal, confident. This page owns the
> **sentence**: how it is punctuated, how it is built, and which of these rules a machine holds
> for you. None of them is a preference. Each is a finding from the copy audit of 31 August 2026,
> and each names where it is checked or admits that nothing checks it.

---

## Why this page exists

The note that started it was *"elles font trop AI, en français elles sonnent bizarre"*. That is
impossible to act on as an opinion, so the copy was counted instead of argued about. The counts,
over 1055 strings in each locale file plus the site, the policy and the README:

| Measured | Before |
| :--- | :--- |
| Villager lines that were exactly two sentences | **80 %** of 201, every character between 75 % and 84 % |
| The same figure in English | 76 % |
| Contrastive negations (*"ce n'est pas X, c'est Y"*) | 33 |
| Lone em dashes in French | 32 |
| Strings using `vous` outside the legal pages | 13 |
| English Title Case in French strings | 12 |
| Curly apostrophes against straight ones | 18 against 378 |
| Lone em dashes in the French privacy policy | 7 |
| Lone em dashes in a thousand words of README prose | 11 |

The point of the table is the shape of the problem, not its size. **Nothing here was a mistake
in a single string.** Every line was individually defensible; what read as machine-written was
the uniformity across all of them.

---

## The rules

### 1. No em dash, in either language, anywhere a person reads

The rule started narrower and was widened by decision. French uses the tiret cadratin for dialogue
and, in pairs, to isolate an incise; what French does not have is the single medial hinge
(*"X, not Y"* written with a dash), which is an English construction, and 30 had been translated
across word for word. So the first version of this rule counted rather than banned, and exempted
English, where the hinge is correct usage.

That exemption is gone. The objection was never that the construction is ungrammatical in English.
It is that eleven of them in a thousand words of README prose read as machine-written whatever any
individual dash is doing, and a reader who has learned to notice the tic does not stop noticing it
at the language boundary.

**A comma, a colon, a full stop or a pair of brackets says the same thing and never has to be
defended.** Where a dash separated a term from its gloss in a list, a colon does the same job:
`- **Jest**: ~1200 tests`.

### 2. One apostrophe, one ellipsis

`onboarding.save_error` wrote *"d’enregistrer"* while `exercise_editor.save_failed` wrote
*"d'enregistrer"*, in the same flow, with two different characters. *"Chargement..."* shipped
beside *"Lancement…"*.

Straight `'` and the real `…` are what both files use. The choice matters less than the fact that
there is one; flipping the project to curly apostrophes later is one `sed` plus one constant.

### 3. The contrastive negation, capped

*"This is not X, it is Y."* It has overtaken the em dash as the most-cited tell of machine
writing, and the reason is frequency, not the figure: one is rhetoric, thirty-three is a tic.

**Compressing it is not removing it.** This is the trap, and it is worth the space:

> Rejected: *"Ce que tu fais là est bien fait. Ça vaut mieux qu'héroïque."*

That rewrite is shorter, drops one clause, and is worse. It still runs the opposition
(bien fait / héroïque), and it invented a construction French does not have, comparing a thing to
an adjective. Five other rewrites in the same batch had the same defect, two of them hiding the
opposition inside a residual negation (*"Rien d'autre."*).

The question that fixes it is not *how do I say this in fewer words*. It is **what is this
sentence about once the opposition is gone**. The farmer was never talking about heroism; he was
talking about clean work, and *"C'est du travail propre, et ça se reconnaît de loin"* then wrote
itself.

### 4. A voice is a rhythm before it is a vocabulary

Seven villagers were given seven vocabularies (metal, seasons, remedies, songs) and still spoke
with one mouth, because all seven were built the same way: a statement, a full stop, a short
second sentence commenting on the first.

A reader hears rhythm before vocabulary. So each villager owns a **sentence shape**, and the table
lives in [`constants/villagers.ts`](../../constants/villagers.ts) beside the cast it describes.
The full account is in [gameplay/villagers.md](../gameplay/villagers.md) § The one that was found
by counting.

The rule generalises past the villagers: **when a screen's strings all have the same shape, fix
the shape before rewriting the words.**

### 5. The app says `tu`, the documents say `vous`

The game addresses a hero. The privacy policy and the safety notices address a user, and are
allowed the register a document is written in. Everything else is the game talking.

This was an accident of history until it was written down: thirteen strings had drifted across
the line and the GPS work added two more. It is now an allowlist of two key prefixes, and widening
it is a decision about which surface a screen belongs to.

### 6. Sentence case in French

Title Case is correct English and wrong French. Twelve French strings carried it, mostly on
buttons and headers where the English original had been capitalised word by word.

---

## Where each rule is checked

A rule nobody enforces is a rule that lasted one release. Most of these are held by
[`__tests__/locale-style.test.ts`](../../__tests__/locale-style.test.ts), which is a ratchet like
the permissions test: the fix is always to write the string correctly, never to widen the rule.

| Rule | Held by | Blind to |
| :--- | :--- | :--- |
| No em dash, either language | `locale-style.test.ts` | `locales/*.json`, the README, both legal pages, the whole store listing and its changelogs. Not `docs/`, and not code comments |
| One apostrophe, one ellipsis | `locale-style.test.ts` | anything outside `locales/*.json` |
| `tu` outside the legal pages | `locale-style.test.ts` | English, which has no such distinction |
| No sentence shape over three quarters of a pool | [`__tests__/villagers.test.ts`](../../__tests__/villagers.test.ts) | every string that is not a villager line |
| No participle agreed with the hero | `villagers.test.ts` | same |
| Ambient lines cite no data | `villagers.test.ts` | same |
| Contrastive negation | **nothing, and nothing ever will** | |
| Sentence case | **nothing** | |
| Dash *density* once the dash is gone | **nothing** | a page of nothing but short sentences reads as generated too |

### The blind spots are the point

The dash rule reaches every reader-facing file, the store listing and its published release notes
included. The others stop at `locales/*.json`, so **the apostrophe, the ellipsis and the register
are unchecked everywhere else**, and a new page that starts carrying prose is a blind spot until
someone adds it to `readerFacingFiles()` in the test.

And the rules at the bottom of the table are not oversights. A machine can count dashes; it cannot
tell an antithesis that earns its place from the thirty-fourth one in a row. That judgement is the
reason a person still reads the copy.

---

## Before shipping a batch of copy

1. **Count before you rewrite.** How many strings on this screen have the same shape? That number
   is usually the whole finding.
2. **Read the French out loud.** The lone hinge and the contrastive negation both survive silent
   reading and both die when spoken.
3. **For each negation, ask what the sentence is about without it.** If the answer is "nothing",
   the sentence was the figure.
4. **Run `npm test`.** The ratchets above catch what they can, and they fail loudly with the
   offending key and its first seventy characters.

---

## Related

- [positioning.md](positioning.md): the tone these rules serve
- [../gameplay/villagers.md](../gameplay/villagers.md): the seven sentence shapes, and the count that found them
- [../CONTRIBUTING.md](../CONTRIBUTING.md): conventions for the wiki itself
