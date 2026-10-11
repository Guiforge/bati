---
title: Adding a language
type: technical
status: active
updated: 2026-10-11
related: [../product/writing.md, ../product/glossary.md, data-safety.md, ../../AGENTS.md]
---

# Adding a language

Everything a new language touches, in the order to do it. The design goal is that you only have to
remember step 1: adding the code to `APP_LANGUAGES` turns `tsc` and three test files red, and they
stay red until every surface below has the language. This was proven on 2026-10-11 by wiring
Russian in and reading what failed, then taking it back out.

## 1. Declare it

Add the code to `APP_LANGUAGES` in [`src/i18n/deviceLanguage.ts`](../../src/i18n/deviceLanguage.ts).
Nothing else in the code names a language code, and nothing should: a `language === "de"` is a
branch the next language silently falls out of.

## 2. Follow `tsc`

`npx tsc --noEmit` now lists every table that has no entry. They are of four kinds.

| What | Where | What to write |
| :--- | :--- | :--- |
| The locale file | `LOCALES` in [`src/i18n/copy.ts`](../../src/i18n/copy.ts) | `locales/<code>.json`, a translation of `en.json`, then its import and its entry |
| The plural rule | `RULES` in [`src/i18n/pluralRules.ts`](../../src/i18n/pluralRules.ts) | The CLDR rule for whole numbers. Hermes has no `Intl.PluralRules`, so this is the one the phone runs |
| Facts about the language | `LANGUAGE_NAMES`, `MACHINE_TRANSLATED`, `WEEK_START`, `CAPITALISED_NOUNS`, the unit words in `db/targets.ts`, the widget's four words in `src/widget.tsx` | One entry each |
| Seeded content | every `Multilingual` row and every `{ en, fr, … }` built from one | Columns for the language: see step 4 |

The last kind is the long list (about 110 errors for one cause). It disappears with the migration.

## 3. Write the locale file

- **Same keys as `en.json`.** `__tests__/i18n-keys.test.ts` compares the files, including the
  length of every pool.
- **Plural forms are the language's own.** A counted key is a family: `x_one` and `x_other` in
  English, plus `x_many` in French and Spanish, plus `x_few` and `x_many` in Russian. The test asks
  `Intl.PluralRules` which forms the language has and wants exactly those on every counted key, no
  more and no fewer. A missing form is not a cosmetic bug: i18next prints the key's name.
- **Every `{{placeholder}}` survives**, in every plural form.
- **Read [`writing.md`](../product/writing.md) and [`glossary.md`](../product/glossary.md) first.**
  The rules that a machine holds (`locale-style.test.ts`) are written for the languages that exist.
  A new one gets the universal ones (no em dash, one apostrophe, one ellipsis) and none of the
  per-language ones (`tu` in French, no gendered hero in Spanish) until someone writes its own.

If English counts a noun with a single string, the language has nowhere to put its forms. That is
a bug in `en.json`, held by the test *a string that counts a noun has plural forms*: give the key
`_one` and `_other`, do not work around it in the translation.

That test only sees a number named `{{count}}`, because that is the only one i18next pluralises
on. These strings put a number under another name beside a noun, and a language that inflects it
(Russian, Polish) cannot write them correctly until the number is renamed to `count` and the key
split: `journal.work_meta` and `journal.pull_deficit_body` (reps), `village.detail_recent_units`,
`village.detail_muscle_driver` and `village.detail_style_driver` (reps), `village.rep_unit`
(seconds), the `journal.moved_rung_left_*` family (a second count of sessions), and the reminder
lines that say "{{total}} leagues". A string with two numbers needs one of them written so that it
never agrees. Not done yet: it is copy work for the first such language.

## 4. Seeded content: a migration

Quests, adventures, movements, bosses and achievements carry one column per language
(`enTitle`, `frTitle`, …). A language is a migration that adds its columns, then one that fills
them, exactly as [`0058`](../../drizzle/0058_german_and_spanish_columns.sql) and `0059` did for
German and Spanish. Use the `drizzle-migration` skill, and read
[`data-safety.md`](data-safety.md): two migrations in one release need `-- multi-migration-ok:`.

The columns are `NOT NULL DEFAULT ''`, and `localizedText` reads an empty column as English, so the
language can ship with its interface translated and its catalogue still in English. Then add the
columns to `db/schema.ts` and to each query `tsc` points at.

## 5. The surfaces no compiler sees

[`__tests__/language-surfaces.test.ts`](../../__tests__/language-surfaces.test.ts) fails on each of
these until it has the language.

| Surface | File |
| :--- | :--- |
| System language picker (Android 13+, iOS) | `supportedLocales` under `expo-localization` and `CFBundleLocalizations`, in `app.json` |
| iOS permission prompts, Android widget picker | `locales/native/<code>.json`, and its line under `locales` in `app.json` |
| Notification of an interrupted outing | `modules/bati-location/android/src/main/res/values-<code>/strings.xml` |
| Store listing | `fastlane/metadata/android/<locale>/` : title, short and full description |

`app.json` changed, so regenerate `android/` (`npx expo prebuild -p android --clean`) and commit
the result: CI diffs it, and `android-manifest.test.ts` reads the generated `locales_config.xml`.

## 6. What only a person can check

- **The recovery words.** BIP-39 has no list for most languages
  ([`src/backupWords.ts`](../../src/backupWords.ts)). Without one the words are English and the
  screen says so on its own; with one, add it to `LISTS` and the four-letter test holds it.
- **Fonts.** Alegreya, Inter and Noto Sans cover Latin, Cyrillic and Greek. A script outside those
  falls back to the system face: check with `fc-query <file.ttf>` before promising the language.
- **Width.** German is the longest of the four today. Walk the tab bar, the chips and the session
  screen at 130 % font scale in the new language.
- **`MACHINE_TRANSLATED`.** `true` until a fluent speaker has read the file; Settings says so
  under the language row.
- **Release notes.** `fastlane/metadata/android/<locale>/changelogs/` is written per release, by
  the `release` skill.

## Check

```bash
npx tsc --noEmit
npx jest i18n-keys i18n-plural-shim language-surfaces android-manifest locale-style
```
