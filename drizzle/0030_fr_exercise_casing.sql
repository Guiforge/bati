-- French casing for exercise names: only the first word takes a capital.
--
-- The seeded frName values came in with English Title Case (« Montées de Genoux »,
-- « Rowing sous la Table »), which reads as untranslated software everywhere a name is
-- printed — session, quest cards, oaths (« 15 × Rowing sous la Table d'affilée »).
-- Same mechanism as 0029: seed migrations are immutable once shipped, so this is an
-- UPDATE pass keyed on the exact old text. « Extension Superman » keeps its proper noun;
-- single-word names and « L-Sit » were already fine.

UPDATE `exercises` SET `frName` = 'Battements de jambes' WHERE `frName` = 'Battements de Jambes';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Cercles de poignets' WHERE `frName` = 'Cercles de Poignets';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Chat-vache' WHERE `frName` = 'Chat-Vache';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Chien tête en bas' WHERE `frName` = 'Chien Tête en Bas';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Crunch inversé' WHERE `frName` = 'Crunch Inversé';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Crunch vélo' WHERE `frName` = 'Crunch Vélo';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Essuie-glaces' WHERE `frName` = 'Essuie-Glaces';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Extension mollets debout' WHERE `frName` = 'Extension Mollets Debout';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Flexion avant debout' WHERE `frName` = 'Flexion Avant Debout';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Grimpeur de montagne' WHERE `frName` = 'Grimpeur de Montagne';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Insecte mort' WHERE `frName` = 'Insecte Mort';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Jumping jack' WHERE `frName` = 'Jumping Jack';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Le grand étirement' WHERE `frName` = 'Le Grand Étirement';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Maintien corps creux' WHERE `frName` = 'Maintien Corps Creux';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Marche de l''ours' WHERE `frName` = 'Marche de l''Ours';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Montées de genoux' WHERE `frName` = 'Montées de Genoux';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Passage du bras' WHERE `frName` = 'Passage du Bras';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Planche latérale' WHERE `frName` = 'Planche Latérale';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Pompe diamant' WHERE `frName` = 'Pompe Diamant';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Pompe pike' WHERE `frName` = 'Pompe Pike';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Pompe au mur' WHERE `frName` = 'Pompe au Mur';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Pompe en équilibre sur les mains' WHERE `frName` = 'Pompe en Équilibre sur les Mains';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Pont fessier' WHERE `frName` = 'Pont Fessier';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Posture du guerrier' WHERE `frName` = 'Posture du Guerrier';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Posture du pigeon' WHERE `frName` = 'Posture du Pigeon';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Relevé de jambes suspendu' WHERE `frName` = 'Relevé de Jambes Suspendu';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Rotation russe' WHERE `frName` = 'Rotation Russe';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Rowing inversé' WHERE `frName` = 'Rowing Inversé';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Rowing sous la table' WHERE `frName` = 'Rowing sous la Table';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Rowing à la serviette' WHERE `frName` = 'Rowing à la Serviette';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Saut du patineur' WHERE `frName` = 'Saut du Patineur';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Saut en étoile' WHERE `frName` = 'Saut en Étoile';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Soulevé de terre unijambiste' WHERE `frName` = 'Soulevé de Terre Unijambiste';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Squat révérence' WHERE `frName` = 'Squat Révérence';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Squat sauté' WHERE `frName` = 'Squat Sauté';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Traction scapulaire' WHERE `frName` = 'Traction Scapulaire';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Traction en supination' WHERE `frName` = 'Traction en Supination';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Étirement du cobra' WHERE `frName` = 'Étirement du Cobra';
