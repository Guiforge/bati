---
story_id: "1.3"
story_key: "1-3-setup-i18n-english-french-with-i18next"
epic: "Epic 1: Project Foundation & Environment Setup"
title: "Setup i18n (English + French) with i18next"
status: "done"
created: "2026-01-06"
---

# Story 1.3: Setup i18n (English + French) with i18next

## User Story
As a **developer**, I want **internationalization configured for English and French**, So that **users can use the app in their preferred language**.

## Acceptance Criteria
✅ i18next configured with EN and FR translation files
✅ Translation keys organized in locales/ folder
✅ Runtime language switching works without restart
✅ t() function available throughout app
✅ Device locale detected on first launch
✅ User can manually change language in settings
✅ Database fields support dual-language (enName, frName)
✅ Test exists to validate translation keys

## Implementation Status
**DONE** - Pre-existing. Files exist: `locales/en.json`, `locales/fr.json`, i18n configured.
