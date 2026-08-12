-- Tutoiement, partout.
--
-- The seeded FR narrative mixed registers: quest and adventure copy written early used the
-- formal « vous » while the whole UI — onboarding, buttons, toasts — and the rest of the
-- content says « tu ». Seed migrations are immutable once shipped, so the fix is this UPDATE
-- pass keyed on the exact old text: rows a hero somehow edited are left alone, and fresh
-- installs get seeded in vous by 0014/0016/0017 then corrected here, same as existing devices.
-- Exercise instructions (0001/0006/0010/0015/0023/0024) still say vous; they are a separate,
-- form-cue-sensitive pass.

-- 0014_seed_spec_quests.sql:31
UPDATE `quests`
SET `frDescription` = 'Le tunnel gronde. Des rochers tombent. Tu as quelques minutes pour atteindre la lumière du jour. Bouge vite, bouge maintenant, ou sois enterré à jamais !'
WHERE `frDescription` = 'Le tunnel gronde. Des rochers tombent. Vous avez quelques minutes pour atteindre la lumière du jour. Bougez vite, bougez maintenant, ou soyez enterré à jamais !';
--> statement-breakpoint
-- 0014_seed_spec_quests.sql:137
UPDATE `quests`
SET `frDescription` = 'L''ennemi charge. Tu tiens la ligne. Ton corps est le mur. Ne faiblis pas. Ne casse pas.'
WHERE `frDescription` = 'L''ennemi charge. Vous tenez la ligne. Votre corps est le mur. Ne faiblissez pas. Ne cassez pas.';
--> statement-breakpoint
-- 0014_seed_spec_quests.sql:243
UPDATE `quests`
SET `frDescription` = 'L''épreuve du sorcier commence. Canalise le mana brut par un contrôle corporel parfait. Seuls ceux qui ont des abdos de fer réussissent.'
WHERE `frDescription` = 'L''épreuve du sorcier commence. Canalisez le mana brut par un contrôle corporel parfait. Seuls ceux qui ont des abdos de fer réussissent.';
--> statement-breakpoint
-- 0014_seed_spec_quests.sql:349
UPDATE `quests`
SET `frDescription` = 'Parcours le sentier forestier. Connecte-toi à l''énergie de la terre. Étire-toi, respire, récupère. La nature guérit le corps fatigué du guerrier.'
WHERE `frDescription` = 'Parcourez le sentier forestier. Connectez-vous à l''énergie de la terre. Étirez-vous, respirez, restaurez. La nature guérit le corps fatigué du guerrier.';
--> statement-breakpoint
-- 0014_seed_spec_quests.sql:435
UPDATE `quests`
SET `frDescription` = 'Les ténèbres te chassent. Cours. Ne regarde pas en arrière. Vitesse et endurance sont tes seules armes dans ce royaume maudit.'
WHERE `frDescription` = 'Les ténèbres vous chassent. Courez. Ne regardez pas en arrière. Vitesse et endurance sont vos seules armes dans ce royaume maudit.';
--> statement-breakpoint
-- 0014_seed_spec_quests.sql:541
UPDATE `quests`
SET `frDescription` = 'Salue l''aube comme un guerrier. Réveille chaque muscle, allume ton esprit. C''est ainsi que les héros commencent leur journée.'
WHERE `frDescription` = 'Saluez l''aube comme un guerrier. Réveillez chaque muscle, allumez votre esprit. C''est ainsi que les héros commencent leur journée.';
--> statement-breakpoint
-- 0016_seed_new_quests.sql:32
UPDATE `quests`
SET `frDescription` = 'Tu n''es pas encore un héros. Tu es celui qui porte le bouclier, et aujourd''hui, cela suffit.'
WHERE `frDescription` = 'Vous n''êtes pas encore un héros. Vous êtes celui qui porte le bouclier, et aujourd''hui, cela suffit.';
--> statement-breakpoint
-- 0016_seed_new_quests.sql:136
UPDATE `quests`
SET `frDescription` = 'Le donjon est à une demi-journée de marche à travers les pins. Fais-la sur deux jambes ou sur quatre, mais arrive avant que la lumière ne tombe.'
WHERE `frDescription` = 'Le donjon est à une demi-journée de marche à travers les pins. Faites-la sur deux jambes ou sur quatre, mais arrivez avant que la lumière ne tombe.';
--> statement-breakpoint
-- 0016_seed_new_quests.sql:240
UPDATE `quests`
SET `frDescription` = 'La trappe du cellier est coincée et l''orage est déjà sur la crête. Tire, ou dors sous la pluie.'
WHERE `frDescription` = 'La trappe du cellier est coincée et l''orage est déjà sur la crête. Tirez, ou dormez sous la pluie.';
--> statement-breakpoint
-- 0016_seed_new_quests.sql:344
UPDATE `quests`
SET `frDescription` = 'Aucun village ne se nourrit de la seule lame d''un guerrier. Courbe le dos sur le champ et gagnes-y ta place.'
WHERE `frDescription` = 'Aucun village ne se nourrit de la seule lame d''un guerrier. Courbez le dos sur le champ et gagnez-y votre place.';
--> statement-breakpoint
-- 0016_seed_new_quests.sql:448
UPDATE `quests`
SET `frDescription` = 'Les corbeaux nichent là où aucune échelle ne monte. Prends le mur à mains nues et reste suspendu jusqu''à ce qu''il te laisse passer.'
WHERE `frDescription` = 'Les corbeaux nichent là où aucune échelle ne monte. Prenez le mur à mains nues et restez suspendu jusqu''à ce qu''il vous laisse passer.';
--> statement-breakpoint
-- 0016_seed_new_quests.sql:552
UPDATE `quests`
SET `frDescription` = 'Le colosse se tient sur ses mains et le monde pend sous lui. Tiens. Ne tombe pas.'
WHERE `frDescription` = 'Le colosse se tient sur ses mains et le monde pend sous lui. Tenez. Ne tombez pas.';
--> statement-breakpoint
-- 0016_seed_new_quests.sql:636
UPDATE `quests`
SET `frDescription` = 'Les pillards franchissent les dunes en une ligne d''acier. Affronte-les en mouvement, ou sois piétiné sur place.'
WHERE `frDescription` = 'Les pillards franchissent les dunes en une ligne d''acier. Affrontez-les en mouvement, ou soyez piétiné sur place.';
--> statement-breakpoint
-- 0016_seed_new_quests.sql:740
UPDATE `quests`
SET `frDescription` = 'Le serpent ne frappe pas. Il enserre, et attend que ton centre cède. Ne cède pas.'
WHERE `frDescription` = 'Le serpent ne frappe pas. Il enserre, et attend que votre centre cède. Ne cédez pas.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:74
UPDATE `adventure_steps`
SET `frNarrative` = 'On t''a confié un bouclier que tu soulèves à peine. Commence par là.'
WHERE `frNarrative` = 'On vous a confié un bouclier que vous soulevez à peine. Commencez par là.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:100
UPDATE `adventure_steps`
SET `frNarrative` = 'Les pins avalent le sentier. Avance sur deux jambes, ou sur quatre s''il le faut.'
WHERE `frNarrative` = 'Les pins avalent le sentier. Avancez sur deux jambes, ou sur quatre s''il le faut.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:126
UPDATE `adventure_steps`
SET `frNarrative` = 'Quelque chose est lové dans les fourrés. Tiens ton centre et il te laissera passer.'
WHERE `frNarrative` = 'Quelque chose est lové dans les fourrés. Tenez votre centre et il vous laissera passer.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:152
UPDATE `adventure_steps`
SET `frNarrative` = 'Le village nourrit ceux qui travaillent ses champs. Courbe le dos et gagne ton lit.'
WHERE `frNarrative` = 'Le village nourrit ceux qui travaillent ses champs. Courbez le dos et gagnez votre lit.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:189
UPDATE `adventures`
SET `frDescription` = 'Parcours le chemin de l''équilibre. Maîtrise ton corps, maîtrise ton esprit. Tronc d''acier, esprit calme, mouvement pur.'
WHERE `frDescription` = 'Parcourez le chemin de l''équilibre. Maîtrisez votre corps, maîtrisez votre esprit. Tronc d''acier, esprit calme, mouvement pur.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:218
UPDATE `adventure_steps`
SET `frNarrative` = 'La route du monastère est longue et lente à dessein. Respire avec elle.'
WHERE `frNarrative` = 'La route du monastère est longue et lente à dessein. Respirez avec elle.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:244
UPDATE `adventure_steps`
SET `frNarrative` = 'La première porte n''est pas une porte. C''est le temps que tu tiens immobile.'
WHERE `frNarrative` = 'La première porte n''est pas une porte. C''est le temps que vous tenez immobile.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:270
UPDATE `adventure_steps`
SET `frNarrative` = 'Le serpent éprouve ton centre, pas ta force. Ne le lui donne pas.'
WHERE `frNarrative` = 'Le serpent éprouve votre centre, pas votre force. Ne le lui donnez pas.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:296
UPDATE `adventure_steps`
SET `frNarrative` = 'Redescends la montagne. L''ascension ne compte que si tu respires encore.'
WHERE `frNarrative` = 'Redescendez la montagne. L''ascension ne compte que si vous respirez encore.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:333
UPDATE `adventures`
SET `frDescription` = 'Le royaume a besoin d''éclaireurs qui ne se fatiguent jamais. Cours plus vite, dure plus longtemps. Tes jambes deviennent foudre, tes poumons infinis.'
WHERE `frDescription` = 'Le royaume a besoin d''éclaireurs qui ne se fatiguent jamais. Courez plus vite, durez plus longtemps. Vos jambes deviennent foudre, vos poumons infinis.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:362
UPDATE `adventure_steps`
SET `frNarrative` = 'Les éclaireurs partent à l''aube. Réveille chaque muscle avant le cor.'
WHERE `frNarrative` = 'Les éclaireurs partent à l''aube. Réveillez chaque muscle avant le cor.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:388
UPDATE `adventure_steps`
SET `frNarrative` = 'Le spectre est le vent. Tu ne le vaincras pas — dépasse-le.'
WHERE `frNarrative` = 'Le spectre est le vent. Vous ne le vaincrez pas — dépassez-le.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:414
UPDATE `adventure_steps`
SET `frNarrative` = 'Les dunes s''animent d''acier. Garde les pieds en mouvement ou perds-les.'
WHERE `frNarrative` = 'Les dunes s''animent d''acier. Gardez les pieds en mouvement ou perdez-les.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:440
UPDATE `adventure_steps`
SET `frNarrative` = 'Le tunnel cède derrière toi. Il n''y a qu''une allure : vite.'
WHERE `frNarrative` = 'Le tunnel cède derrière vous. Il n''y a qu''une allure : vite.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:466
UPDATE `adventure_steps`
SET `frNarrative` = 'Dernière course. Le spectre s''effiloche — coupe-lui le vent.'
WHERE `frNarrative` = 'Dernière course. Le spectre s''effiloche — coupez-lui le vent.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:503
UPDATE `adventures`
SET `frDescription` = 'La longue route attend. Des kilomètres à parcourir, des batailles à affronter, ne jamais s''arrêter. Développe l''endurance pour surpasser tout ennemi, toute épreuve.'
WHERE `frDescription` = 'La longue route attend. Des kilomètres à parcourir, des batailles à affronter, ne jamais s''arrêter. Développez l''endurance pour surpasser tout ennemi, toute épreuve.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:558
UPDATE `adventure_steps`
SET `frNarrative` = 'Les rangers gagnent leur pain avant de bander un arc. Travaille le champ.'
WHERE `frNarrative` = 'Les rangers gagnent leur pain avant de bander un arc. Travaillez le champ.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:584
UPDATE `adventure_steps`
SET `frNarrative` = 'Quelque chose t''a suivi hors des arbres. Ne le laisse pas choisir l''allure.'
WHERE `frNarrative` = 'Quelque chose vous a suivi hors des arbres. Ne le laissez pas choisir l''allure.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:610
UPDATE `adventure_steps`
SET `frNarrative` = 'À mi-chemin. Bâtis un camp qui tiendra encore à ton retour.'
WHERE `frNarrative` = 'À mi-chemin. Bâtissez un camp qui tiendra encore à votre retour.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:662
UPDATE `adventure_steps`
SET `frNarrative` = 'Les jambes ne répondent plus. Rampe la fin des pins s''il ne te reste que ça.'
WHERE `frNarrative` = 'Les jambes ne répondent plus. Rampez la fin des pins s''il ne vous reste que ça.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:688
UPDATE `adventure_steps`
SET `frNarrative` = 'Dernière aube. Le titan n''est qu''écorce et mousse — et tu marches encore.'
WHERE `frNarrative` = 'Dernière aube. Le titan n''est qu''écorce et mousse — et vous marchez encore.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:725
UPDATE `adventures`
SET `frDescription` = 'Jure de protéger. Ton dos devient armure. Ton tronc devient un bouclier incassable. Tiens ferme, garde le royaume.'
WHERE `frDescription` = 'Jurez de protéger. Votre dos devient armure. Votre tronc devient un bouclier incassable. Tenez ferme, gardez le royaume.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:754
UPDATE `adventure_steps`
SET `frNarrative` = 'Tu as juré de tenir cette porte. Rien dans ce serment n''est rapide.'
WHERE `frNarrative` = 'Vous avez juré de tenir cette porte. Rien dans ce serment n''est rapide.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:780
UPDATE `adventure_steps`
SET `frNarrative` = 'L''armurerie est sous le plancher et la trappe a gonflé. Tire.'
WHERE `frNarrative` = 'L''armurerie est sous le plancher et la trappe a gonflé. Tirez.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:806
UPDATE `adventure_steps`
SET `frNarrative` = 'La pierre répond à la pierre. Monte le mur avant que le golem ne l''éprouve.'
WHERE `frNarrative` = 'La pierre répond à la pierre. Montez le mur avant que le golem ne l''éprouve.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:832
UPDATE `adventure_steps`
SET `frNarrative` = 'Une armure ne sert à rien si le corps dedans plie. Gaine.'
WHERE `frNarrative` = 'Une armure ne sert à rien si le corps dedans plie. Gainez.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:858
UPDATE `adventure_steps`
SET `frNarrative` = 'Prends la tour à mains nues. Le golem ne peut pas t''y suivre.'
WHERE `frNarrative` = 'Prenez la tour à mains nues. Le golem ne peut pas vous y suivre.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:918
UPDATE `adventure_steps`
SET `frNarrative` = 'On n''entre pas désarmé dans la salle du Seigneur de Fer. Forge d''abord.'
WHERE `frNarrative` = 'On n''entre pas désarmé dans la salle du Seigneur de Fer. Forgez d''abord.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:970
UPDATE `adventure_steps`
SET `frNarrative` = 'Ses gardes se tiennent sur les mains pour te narguer. Réponds-leur.'
WHERE `frNarrative` = 'Ses gardes se tiennent sur les mains pour vous narguer. Répondez-leur.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:996
UPDATE `adventure_steps`
SET `frNarrative` = 'Prends le donjon, puis fais-le tien. Il te faudra un repli.'
WHERE `frNarrative` = 'Prenez le donjon, puis faites-le vôtre. Il vous faudra un repli.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:1074
UPDATE `adventure_steps`
SET `frNarrative` = 'Le Seigneur de Fer combat à l''envers. Tu feras de même.'
WHERE `frNarrative` = 'Le Seigneur de Fer combat à l''envers. Vous ferez de même.';
--> statement-breakpoint
-- 0017_seed_adventures.sql:1100
UPDATE `adventure_steps`
SET `frNarrative` = 'Plus rien d''astucieux. Survis-lui.'
WHERE `frNarrative` = 'Plus rien d''astucieux. Survivez-lui.';
--> statement-breakpoint
-- quest descriptions seeded by 0002/0006/0013/0024
UPDATE `quests`
SET `frDescription` = 'La forge brûle. Chaque coup de marteau façonne l''acier légendaire. Ta poitrine et tes bras deviennent l''enclume.'
WHERE `frDescription` = 'La forge brûle. Chaque coup de marteau façonne l''acier légendaire. Votre poitrine et vos bras deviennent l''enclume.';
--> statement-breakpoint
UPDATE `quests`
SET `frDescription` = 'Une tour antique atteint les nuages. Chaque étage exige que tu te tires plus haut. Atteins le sommet ou tombe en essayant.'
WHERE `frDescription` = 'Une tour antique atteint les nuages. Chaque étage exige que vous vous tiriez plus haut. Atteignez le sommet ou tombez en essayant.';
--> statement-breakpoint
UPDATE `quests`
SET `frDescription` = 'Pierre par pierre, tu élèves de puissants murs. Chaque muscle contribue. Une forteresse équilibrée nécessite un héros équilibré.'
WHERE `frDescription` = 'Pierre par pierre, vous élevez de puissants murs. Chaque muscle contribue. Une forteresse équilibrée nécessite un héros équilibré.';
--> statement-breakpoint
UPDATE `quests`
SET `frDescription` = 'Seuls les plus forts osent entrer. Cette épreuve brise les faibles, forge des légendes des résilients. Prouve ta volonté de fer.'
WHERE `frDescription` = 'Seuls les plus forts osent entrer. Cette épreuve brise les faibles, forge des légendes des résilients. Prouvez votre volonté de fer.';
--> statement-breakpoint
UPDATE `quests`
SET `frDescription` = 'La marche est finie, le feu est allumé. Défais ce que la route a noué — les hanches d''abord, ce sont elles qui t''ont porté le plus loin.'
WHERE `frDescription` = 'La marche est finie, le feu est allumé. Défaites ce que la route a noué — les hanches d''abord, ce sont elles qui vous ont porté le plus loin.';
--> statement-breakpoint
UPDATE `quests`
SET `frDescription` = 'Tout équilibriste l''apprend à ses dépens : les poignets lâchent bien avant les épaules. Occupe-t''en la veille, pas le lendemain.'
WHERE `frDescription` = 'Tout équilibriste l''apprend à ses dépens : les poignets lâchent bien avant les épaules. Occupez-vous-en la veille, pas le lendemain.';
