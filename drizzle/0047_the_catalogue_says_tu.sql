-- The catalogue says tu.
--
-- 0029 moved the quests to `tu` and left `exercises` alone, so for a year the sixty-two seeded
-- movement descriptions were the one body of prose a hero reads that still said `vous`. 0041 then
-- shipped three outings written in `tu`, which put "Suspendez-vous à une barre" and "Marche à une
-- allure où tu pourrais tenir une conversation" in the same gallery. AGENTS.md says the app
-- tutoies; the three were right and the other sixty-two were the debt. This is the debt.
--
-- Every French description is rewritten, one UPDATE per row rather than a global REPLACE, because
-- a blind replacement rewrites strings nobody reread. Eight rows carried an em dash in both
-- languages, so those eight get their English rewritten too; everything else in English is left
-- as it was. 0041's three outings are rewritten as well, to the catalogue's own rhythm (one
-- sentence carried by commas, "ce qui compte, c'est" the way it is said aloud): editing 0041
-- itself would change nothing for a database that has already run it.
--
-- Every statement scopes itself to `creator = 'Admin'` (rule 2 of 0035): a hero may have named a
-- movement after one of these, and that row is theirs.

UPDATE `exercises` SET
    `frDescription` = 'Tiens-toi debout, pieds écartés à largeur d''épaules, et descends comme pour t''asseoir, jusqu''à ce que le pli de la hanche passe sous le genou : c''est la profondeur qui fait progresser. Remonte en poussant dans tout le pied.',
    `enDescription` = 'Stand with feet shoulder-width apart and lower as if sitting into a chair, until the hip crease drops below the knee: depth is the progression. Drive back up through the whole foot.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Commence en planche et descends jusqu''à ce que la poitrine touche le sol, coudes vers l''arrière plutôt qu''écartés. Remonte bras complètement tendus : une demi-répétition n''entraîne que la moitié de l''amplitude.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Push-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre bras complètement tendus et épaules relâchées, puis tire jusqu''à ce que le menton dépasse la barre. Reviens en suspension complète à chaque répétition : la suspension fait partie du mouvement, pas de la pause.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pull-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Glisse le dos contre un mur jusqu''à ce que tes cuisses soient parallèles au sol et maintiens.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Maintiens une position de pompe avec le corps en ligne droite.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos et soulève les épaules vers le bassin.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Avance d''un pas et descends jusqu''à ce que le genou arrière frôle le sol, les deux genoux proches de 90 degrés, genou avant à l''aplomb de la cheville. Prends toute la profondeur : un pas court n''entraîne qu''une amplitude courte.',
    `enDescription` = 'Step forward and lower until the back knee grazes the floor and both knees are near 90 degrees, front knee over the ankle. Take the full depth: a short step trains a short range.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Lunge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Depuis la position debout, descends en squat, projette les jambes en arrière en position de pompe, ramène-les sous toi et termine par un saut, bras au-dessus de la tête.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Burpee' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Tiens une position de pompe, mains sous les épaules, et ramène alternativement un genou vers la poitrine à rythme rapide, sans laisser monter les hanches.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Mountain Climber' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En appui sur deux barres parallèles ou un rebord stable, descends jusqu''à ce que les épaules arrivent à hauteur des coudes, puis remonte bras complètement verrouillés. Arrête-toi avant la douleur à l''épaule, jamais avant le verrouillage.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dip' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Depuis la position de pompe, rapproche les pieds et lève les hanches en V inversé, puis fléchis les coudes pour amener le sommet du crâne vers le sol avant de repousser.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pike Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Saute en écartant les pieds tout en levant les bras au-dessus de la tête, puis reviens pieds joints, bras le long du corps, à rythme régulier.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jumping Jack' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Cours sur place en montant chaque genou à hauteur de hanche, en amortissant sur l''avant du pied et en gardant le buste droit.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'High Knees' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allongé sur le dos, mains près de la tête, amène un coude vers le genou opposé pendant que l''autre jambe s''étend, en alternant sans tirer sur la nuque.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bicycle Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Fais une pompe mains rapprochées sous la poitrine, pouces et index formant un losange, coudes frôlant les côtes.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Diamond Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En appui sur une jambe, bascule à la hanche et tends les mains vers le sol pendant que la jambe libre s''étend derrière toi, puis redresse-toi dos plat.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Deadlift' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allongé sur le ventre, mains sous les épaules, pousse la poitrine vers le haut en étendant la colonne, hanches au sol, et continue de respirer.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cobra Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Adopte une position large, pointe du pied avant tournée vers l''extérieur et genou fléchi à l''aplomb de la cheville, bras tendus à hauteur d''épaules, et tiens.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warrior Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Bondis latéralement d''un pied sur l''autre, en amortissant genou légèrement fléchi, la jambe libre passant derrière toi.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Skater Hop' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allongé sur le dos, plaque le bas du dos au sol et décolle les épaules et les jambes de quelques centimètres, bras dans le prolongement, en tenant cette position en banane.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hollow Body Hold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre paumes tournées vers toi et tire la poitrine vers le haut jusqu''à ce que le menton dépasse la barre, puis redescends avec contrôle.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Chin-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le ventre bras et jambes tendus, puis soulève ensemble la poitrine, les bras et les jambes avant de redescendre.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Superman' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Avance à quatre pattes, hanches basses et sangle abdominale gainée, en faisant avancer la main et le pied opposés ensemble.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bear Crawl' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Assieds-toi genoux fléchis et pieds levés, penche-toi légèrement en arrière et fais pivoter le torse d''un côté à l''autre en touchant le sol à chaque fois.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Russian Twist' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le côté en appui sur un avant-bras et soulève les hanches jusqu''à former une ligne droite, puis maintiens la position.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Side Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos genoux fléchis, puis contracte les fessiers pour lever les hanches en ligne droite des genoux aux épaules.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Tiens-toi debout et monte lentement sur la pointe des pieds, marque une pause, puis redescends les talons.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Calf Raise' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Monte en équilibre sur les mains contre un mur, plie les coudes pour abaisser la tête vers le sol, puis repousse pour remonter.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Handstand Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Tiens-toi à une longueur de bras d''un mur, mains à hauteur d''épaules, plie les coudes pour amener la poitrine vers le mur puis repousse.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos jambes tendues à quelques centimètres du sol et alterne de petits battements de jambes.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Flutter Kicks' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi sous une barre basse le corps droit, tire la poitrine vers la barre en rapprochant les omoplates, puis redescends avec contrôle.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Inverted Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos bras tendus vers le plafond et genoux à 90 degrés, puis abaisse un bras et la jambe opposée vers le sol avant de revenir et de changer de côté.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Bug' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre bras tendus et lève les jambes tendues devant toi jusqu''à l''horizontale, puis redescends avec contrôle.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hanging Leg Raise' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Descends en squat, puis explose vers le haut en sautant, et atterris en douceur pour enchaîner le squat suivant.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jump Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos genoux fléchis, puis enroule les hanches en les décollant du sol pour ramener les genoux vers la poitrine.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Reverse Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Fais un pas en diagonale vers l''arrière comme une révérence, fléchis les deux genoux, puis pousse sur le pied avant pour te relever.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Curtsy Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre bras tendus et, sans plier les coudes, tire les omoplates vers le bas et l''une vers l''autre pour soulever légèrement le corps.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Scapular Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Assis jambes tendues, pousse sur les mains posées à côté des hanches et lève les jambes pour former un L, puis maintiens la position.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Saute de façon explosive en écartant bras et jambes pour former une étoile, puis atterris en douceur et recommence.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Star Jump' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos bras écartés et jambes levées jointes, puis fais pivoter les jambes d''un côté à l''autre comme des essuie-glaces en utilisant la sangle abdominale.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Windshield Wipers' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sous une table solide, saisis le bord à deux mains, garde le corps droit des talons aux épaules, puis tire la poitrine vers la table et redescends avec contrôle.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Table Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Passe une serviette autour d''une poignée de porte, saisis les deux extrémités et penche-toi en arrière bras tendus, puis redresse-toi en tirant les coudes vers l''arrière. Rapproche les pieds de la porte pour alléger l''exercice.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Towel Door Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'À quatre pattes, fais tourner lentement les poignets sur toute leur amplitude, puis bascule doucement d''avant en arrière sur les paumes à plat. Chaque degré doit rester indolore : c''est une préparation, et rien ne s''y force.',
    `enDescription` = 'On hands and knees, slowly circle your wrists through their full range, then rock gently forward and back over flat palms. Keep every degree pain-free: this is preparation, and nothing gets forced.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wrist Circles' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'À quatre pattes, alterne entre arrondir le dos vers le plafond et le laisser creuser en ouvrant la poitrine. Déroule vertèbre par vertèbre et laisse la respiration donner le rythme.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cat-Cow' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'À quatre pattes, glisse un bras sous l''autre et pose l''épaule au sol en ouvrant le haut du dos. Garde les hanches au-dessus des genoux pour que la rotation vienne des côtes et non du bassin.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Thread the Needle' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Bascule depuis les hanches et laisse le buste pendre, genoux légèrement fléchis. Laisse la gravité travailler l''arrière des jambes, sans jamais donner d''à-coups.',
    `enDescription` = 'Hinge from the hips and let the torso hang, knees softly bent. Let gravity do the work down the back of the legs, and never bounce.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Forward Fold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En appui sur les mains et les pieds, pousse les hanches haut et les talons vers le sol, bras tendus et oreilles entre les biceps. Pédale avec les pieds pour atteindre tour à tour mollets et ischio-jambiers.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Downward Dog' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Amène un tibia vers l''avant en travers du tapis et tends l''autre jambe derrière, puis penche-toi sur la jambe avant. La hanche s''ouvre à mesure que le souffle ralentit, et relâche dès que le genou proteste.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pigeon Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Entre dans une fente profonde, pose la main opposée, puis amène le coude intérieur vers le sol et fais tourner l''autre bras vers le plafond. Fléchisseur de hanche, adducteur et haut du dos en un seul mouvement.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'World''s Greatest Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Prends une position de pompe genoux au sol, corps aligné de la tête aux genoux, puis descends la poitrine jusqu''à un poing du sol avant de repousser.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Knee Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Monte les pieds le long d''un mur ou lance-toi en équilibre face à lui, bras verrouillés et côtes fermées, et tiens en respirant normalement.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Handstand' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre bras tendus, prise pleine, épaules relâchées loin des oreilles, et tiens simplement : c''est la poigne qui limite toutes tes tractions.',
    `enDescription` = 'Hang from a bar with straight arms and a full grip, shoulders relaxed away from the ears, and simply stay there: this builds the grip every pull is limited by.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Hang' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Saute ou monte sur un appui pour atteindre le haut de la traction, menton au-dessus de la barre, puis descends aussi lentement que possible, vise cinq secondes, et remonte pour la répétition suivante.',
    `enDescription` = 'Jump or step to the top of a pull-up, chin over the bar, then lower yourself as slowly as you can, aim for five seconds, and step back up for the next rep.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Negative Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Assis, mains à plat de chaque côté des hanches, pousse pour décoller le bassin du sol et ramène les deux genoux contre la poitrine, coudes verrouillés.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allongé sur le dos, un pied au sol et l''autre jambe tendue, pousse dans le talon en appui pour lever les hanches sans les laisser basculer d''un côté.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Pose le dessus du pied arrière sur une chaise derrière toi, puis descends à la verticale jusqu''à ce que la cuisse avant soit parallèle au sol, et remonte en gardant le buste droit.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bulgarian Split Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Tire explosivement jusqu''à dégager la poitrine au-dessus de la barre, bascule les épaules par-dessus et repousse bras tendus au-dessus d''elle, en un seul mouvement continu de la suspension à l''appui.',
    `enDescription` = 'Pull explosively until the chest clears the bar, roll the shoulders over it and press out to straight arms above, in one continuous movement from hang to support.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Muscle-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre et monte les jambes tendues jusqu''à toucher la barre entre les mains avec les pointes de pieds, puis redescends avec contrôle, sans balancer.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Toes to Bar' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Place les mains plus larges qu''en pompe et descends vers une main pendant que le bras opposé reste tendu, puis repousse et change de côté : l''essentiel de la charge est sur le bras qui plie.',
    `enDescription` = 'Set the hands wider than a push-up and lower towards one hand while the opposite arm stays straight, then press back up and alternate sides: most of the load sits on the bending arm.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Archer Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En appui sur une jambe, l''autre tendue devant toi, descends jusqu''au bas du squat et remonte sans que le talon libre ne touche jamais le sol.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pistol Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allongé sur un banc ou au sol, agrippe un point fixe derrière la tête et soulève tout le corps en appui sur les épaules, d''une seule ligne rigide, puis redescends lentement sans laisser les hanches se plier.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dragon Flag' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Mains à plat au sol, porte les épaules bien en avant des poignets, coudes verrouillés, et monte les genoux contre la poitrine jusqu''à ce que les pieds quittent complètement le sol.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck Planche' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Marche à une allure où tu pourrais tenir une conversation et garde-la : ce qui compte, c''est le terrain parcouru et le temps de marche.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warden''s Walk' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Cours à une allure que tu peux tenir jusqu''au bout, marche quand il le faut, puis repars : ce qui compte, c''est d''arriver.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Messenger''s Run' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Roule régulièrement plutôt que par à-coups : en une heure, une monture couvre quatre fois le terrain d''un marcheur, et c''est bien pour ça qu''on en prend une.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Outrider''s Ride' AND `creator` = 'Admin';
