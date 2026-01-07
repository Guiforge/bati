---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: "Audit contenu Quêtes/Aventures + couverture images Village"
session_goals: "(1) Lister exhaustivement les images Village à produire (bâtiment x niveau), (2) définir conventions de nommage stables, (3) produire un script de détection + génération des images manquantes (Mistral), (4) cadrer l'audit contenu Quêtes/Aventures vs docs/knowledge"
selected_approach: "AI-Recommended Techniques"
techniques_used: ["Constraint Mapping", "Morphological Analysis", "Failure Analysis"]
ideas_generated: []
context_file: "_bmad/bmm/data/project-context-template.md"
---

# Brainstorming Session Results

**Facilitator:** Guiforge
**Date:** 2026-01-07T10:52:23.191Z

## Session Overview

**Topic:** Audit contenu Quêtes/Aventures + couverture images Village

**Goals:**
- Lister exhaustivement les images Village à produire (bâtiment × niveau)
- Définir des conventions de nommage stables (compat Metro + DB)
- Script: détecter les images manquantes et générer via `scripts/generate_image_mistral.py`
- Cadrer l’audit contenu Quêtes/Aventures vs `docs/knowledge`

### Observations “existant” (clés)
- Village: `BuildingCode` = 20 bâtiments (Tier 1→4) dans `src/db/schema.ts`.
- Niveaux bâtiments: 1→5 (`buildingLevelThresholds` va jusqu’à 1000 XP).
- Assets images: pas de dossier `assets/images/village/*` actuellement ⇒ 100% des visuels Village sont à créer.

## Technique Selection

**Approach:** AI-Recommended Techniques

**Recommended Techniques:**
- **Constraint Mapping:** verrouiller contraintes (DB `imagePath`, Metro bundler, fallback, formats, conventions) et garantir qu’un **script** peut ensuite générer toutes les images manquantes.
- **Morphological Analysis:** construire la liste exhaustive (BuildingCode 20 × Level 1–5) + variations (locked/unlocked si nécessaire) ⇒ backlog d’images + nomenclature.
- **Failure Analysis:** audit Quêtes/Aventures vs `docs/knowledge` (écarts, contenu manquant, sport-pertinence, cohérence images).

## Technique Execution

### 1) Constraint Mapping — décisions et contraintes

**Décision (C / Hybride):**
- **Référence canonique = string path** (ex: `assets/images/village/buildings/<buildingCode>/lvl_<n>.png`).
- **UI = résolution via mapping statique** (Metro) : `resolveVillageAsset(buildingCode, level) -> require(...)`.
- **Script** doit pouvoir (1) lister toutes les images attendues, (2) détecter les manquantes, (3) générer via Mistral, (4) produire un rapport.

**Contraintes à respecter:**
- Metro: pas de `require(dynamicPath)` → mapping `require()` statique ou fichier généré.
- Niveaux bâtiments: 1..5.
- Variantes: **`locked` + niveaux** (1 fichier `locked` par bâtiment + `lvl_1..lvl_5`).
- Volume minimal bâtiments: **20 bâtiments × (1 locked + 5 niveaux) = 120 images**.
- + Backgrounds: **4** (Tier 1→4) ⇒ **124 images** attendues.
- Format: extension choisie côté output (Mistral peut renvoyer autre type → warning ok).

**Convention de nommage (proposée, stable et scriptable):**
**Bâtiments**
- `assets/images/village/buildings/<buildingCode>/locked.png`
- `assets/images/village/buildings/<buildingCode>/lvl_1.png`
- …
- `assets/images/village/buildings/<buildingCode>/lvl_5.png`

**Backgrounds (tiers)**
- `assets/images/village/backgrounds/tier_1.jpg`
- `assets/images/village/backgrounds/tier_2.jpg`
- `assets/images/village/backgrounds/tier_3.jpg`
- `assets/images/village/backgrounds/tier_4.jpg`

**Règle DB/UI (hybride):**
- DB (ou modèle UI) stocke le path canonique ci-dessus.
- UI résout via mapping statique: `resolveVillageAsset(buildingCode, variant)`.

### 2) Morphological Analysis — matrice exhaustive à produire

**Bâtiments (20 BuildingCode):**
campfire, tent, training_dummy,
archery_range, quarry, forge, well, windmill, farm,
wizard_tower, druid_grove,
watchtower, castle_wall, armory, fountain, observatory, barn,
dragon_lair, heroes_hall, champion_arena.

**Variants par bâtiment (6):** `locked` + `lvl_1..lvl_5`.

**Backgrounds (4):** `tier_1..tier_4`.

✅ Total attendu = **124 images** (et actuellement: **124 manquantes**).

**Décision script (exécution):**
- **Un seul script**.
- Skip si le fichier existe déjà (et taille > 0).
- Génération en **parallèle (5 threads)**.
- Tolérance erreurs: continuer, et arrêter si on dépasse un seuil global (`--max-errors`).

