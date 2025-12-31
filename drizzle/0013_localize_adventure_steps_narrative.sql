-- Add localized narratives for adventure steps.
-- We keep the existing `narrative` column for backward compatibility.
ALTER TABLE `adventure_steps`
ADD COLUMN `enNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps`
ADD COLUMN `frNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- Backfill English from the legacy narrative.
UPDATE `adventure_steps`
SET `enNarrative` = `narrative`
WHERE (
        `enNarrative` = ''
        OR `enNarrative` IS NULL
    )
    AND `narrative` != '';
--> statement-breakpoint
-- Seed French narratives for built-in campaigns.
-- Lumber Route
UPDATE `adventure_steps`
SET `frNarrative` = 'La lisière de la forêt est proche. Coupe net, respire calmement.'
WHERE `adventureId` IN (
        SELECT `id`
        FROM `adventures`
        WHERE `frTitle` = 'La route du bûcheron'
    )
    AND `stepIndex` = 0;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `frNarrative` = 'Pierres et bois. Ton gainage est la charrette : garde-la stable.'
WHERE `adventureId` IN (
        SELECT `id`
        FROM `adventures`
        WHERE `frTitle` = 'La route du bûcheron'
    )
    AND `stepIndex` = 1;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `frNarrative` = 'Dresse l’abri. Un dernier effort maintenant, du confort ensuite.'
WHERE `adventureId` IN (
        SELECT `id`
        FROM `adventures`
        WHERE `frTitle` = 'La route du bûcheron'
    )
    AND `stepIndex` = 2;
--> statement-breakpoint
-- The Golem
UPDATE `adventure_steps`
SET `frNarrative` = 'Le sol tremble. Centre-toi.'
WHERE `adventureId` IN (
        SELECT `id`
        FROM `adventures`
        WHERE `frTitle` = 'Le golem'
    )
    AND `stepIndex` = 0;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `frNarrative` = 'Maintenant. Frappe plus fort qu’il ne te frappe.'
WHERE `adventureId` IN (
        SELECT `id`
        FROM `adventures`
        WHERE `frTitle` = 'Le golem'
    )
    AND `stepIndex` = 1;