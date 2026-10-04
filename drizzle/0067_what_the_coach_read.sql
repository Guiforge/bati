-- A coach read every seeded exercise against its picture (review of 2.4.0), and these are the
-- descriptions that failed or half-failed the reading.
--
-- Most say what the picture already shows: Flutter Kicks on the forearms, the L-sits on two
-- supports. Some were ambiguous: which hand goes down in the World's Greatest Stretch, whether the
-- Tuck Planche and Superman are held (both are timed, so both are held now), a knee that
-- "complains". Two change the movement on purpose: Lunge becomes the reverse lunge, which spares the
-- front knee, and Russian Twist starts with the feet down. The pictures the same review rejected
-- are listed in docs/content/missing-image.md §11, text cannot fix them.
--
-- A second pass then read the whole catalogue as a coach would, in all four languages. Towel Door
-- Row had its progression backwards (feet nearer the door is harder) and no word on which side of
-- the door to pull from. Wall Handstand mixed its two entries, Warrior Pose is Warrior II, Cobra
-- now keeps the pelvis down, Dead Bug gained its lower-back cue. Nine texts ended on a maxim after
-- a colon ("half a rep trains half the range"), which read as generated: each now ends on a cue.
-- French openings that agreed in the masculine ("Allongé", "Assis") are imperatives now.
--
-- Scoped to `creator = 'Admin'` (0035). No semicolon inside any string: the guard test splits on it.
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos, en appui sur les avant-bras, jambes tendues à quelques centimètres du sol, et alterne de petits battements de haut en bas sans creuser le bas du dos.',
    `enDescription` = 'Lie on your back propped on your forearms, legs extended a few inches off the ground, and alternate small up-and-down kicks without arching your lower back.',
    `deDescription` = 'Leg dich auf den Rücken, auf die Unterarme gestützt, die Beine ein paar Zentimeter über dem Boden gestreckt, und mach abwechselnd kleine Auf-und-ab-Schläge, ohne ins Hohlkreuz zu gehen.',
    `esDescription` = 'Túmbate boca arriba con los antebrazos apoyados, las piernas estiradas a unos centímetros del suelo, y alterna pequeñas patadas arriba y abajo sin arquear la zona lumbar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Flutter Kicks' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Roule à vélo en pédalant de façon régulière et souple, sans à-coups, sur un braquet qui laisse tourner les jambes facilement.',
    `enDescription` = 'Ride with a smooth, steady pedal stroke, no surges, in a gear that lets your legs spin easily.',
    `deDescription` = 'Fahr Rad mit gleichmäßigem, rundem Tritt, ohne Antritte, in einem leichten Gang, in dem die Beine locker drehen.',
    `esDescription` = 'Pedalea en bicicleta de forma regular y fluida, sin tirones, con un desarrollo que deje girar las piernas con facilidad.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Outrider''s Ride' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En appui sur les mains et les pieds, pousse les hanches haut et les talons vers le sol, bras tendus et oreilles entre les biceps. Pédale avec les pieds pour étirer tour à tour mollets et ischio-jambiers.',
    `enDescription` = 'From hands and feet, push the hips high and the heels down, arms straight and ears between the biceps. Pedal the feet to stretch the calves and hamstrings in turn.',
    `deDescription` = 'Aus dem Stütz auf Händen und Füßen schiebst du die Hüfte hoch und die Fersen nach unten, Arme gestreckt, Ohren zwischen den Oberarmen. Beug abwechselnd die Knie, um Waden und hintere Oberschenkel zu dehnen.',
    `esDescription` = 'Apoyando manos y pies, sube la cadera y lleva los talones hacia el suelo, brazos estirados y orejas entre los bíceps. Pedalea con los pies para estirar gemelos e isquiotibiales por turnos.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Downward Dog' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos, genoux fléchis et pieds à plat, et enroule le haut du dos pour monter les épaules vers le plafond, sans tirer sur la nuque, puis redescends avec contrôle.',
    `enDescription` = 'Lie on your back, knees bent and feet flat, and curl your upper back to lift your shoulders toward the ceiling without pulling on your neck, then lower with control.',
    `deDescription` = 'Leg dich auf den Rücken, Knie gebeugt und Füße flach, und roll den oberen Rücken ein, um die Schultern Richtung Decke zu heben, ohne am Nacken zu ziehen, dann senk dich kontrolliert ab.',
    `esDescription` = 'Túmbate boca arriba con las rodillas flexionadas y los pies apoyados, y enrolla la parte alta de la espalda para subir los hombros hacia el techo sin tirar del cuello, y luego baja con control.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos, bras écartés en croix et plaqués au sol, jambes jointes levées à la verticale, puis fais-les basculer d''un côté à l''autre comme des essuie-glaces, sans décoller les épaules.',
    `enDescription` = 'Lie on your back with arms spread wide and pressed to the floor, legs together and raised straight up, then lower them side to side like windshield wipers without lifting your shoulders.',
    `deDescription` = 'Leg dich auf den Rücken, die Arme weit zur Seite ausgebreitet und auf den Boden gedrückt, die Beine geschlossen senkrecht nach oben, und kipp sie wie Scheibenwischer von Seite zu Seite, ohne die Schultern abzuheben.',
    `esDescription` = 'Túmbate boca arriba con los brazos abiertos en cruz y pegados al suelo y las piernas juntas en vertical, y llévalas de lado a lado como un limpiaparabrisas sin despegar los hombros.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Windshield Wipers' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Recule d''un grand pas et descends jusqu''à ce que le genou arrière frôle le sol, les deux genoux proches de 90 degrés, genou avant au-dessus de la cheville. Pousse dans le talon avant pour revenir debout, puis change de jambe.',
    `enDescription` = 'Take a long step back and lower until the back knee grazes the floor, both knees near 90 degrees, front knee over the ankle. Push through the front heel to stand back up, then switch legs.',
    `deDescription` = 'Mach einen großen Schritt nach hinten und senk dich ab, bis das hintere Knie den Boden streift, beide Knie etwa im 90-Grad-Winkel, das vordere Knie über dem Knöchel. Drück dich über die vordere Ferse wieder hoch und wechsle das Bein.',
    `esDescription` = 'Da un paso largo hacia atrás y baja hasta que la rodilla de atrás roce el suelo, con ambas rodillas cerca de 90 grados y la rodilla delantera sobre el tobillo. Empuja con el talón delantero para volver arriba y cambia de pierna.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Lunge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Pose le dessus du pied arrière sur une chaise derrière toi, puis descends à la verticale jusqu''à ce que la cuisse avant soit parallèle au sol, genou avant à 90 degrés, et remonte en gardant le buste droit.',
    `enDescription` = 'Rest the top of the back foot on a chair behind you, then lower straight down until the front thigh is parallel to the floor and the front knee at 90 degrees, and press back up, keeping the torso tall.',
    `deDescription` = 'Leg den Rist des hinteren Fußes auf einen Stuhl hinter dir, senk dich senkrecht ab, bis der vordere Oberschenkel parallel zum Boden ist und das vordere Knie 90 Grad hat, und drück dich mit aufrechtem Oberkörper wieder hoch.',
    `esDescription` = 'Apoya el empeine del pie trasero en una silla detrás de ti, baja en vertical hasta que el muslo delantero quede paralelo al suelo y la rodilla delantera a 90 grados, y vuelve a subir con el tronco erguido.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bulgarian Split Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Assieds-toi jambes tendues, pousse sur les mains posées à côté des hanches, au sol ou sur deux appuis stables, et lève les jambes pour former un L, puis maintiens la position.',
    `enDescription` = 'Sit with legs extended, press your hands down beside your hips, on the floor or on two sturdy supports, and lift your legs to form an L shape, then hold.',
    `deDescription` = 'Setz dich mit gestreckten Beinen hin, drück die Hände neben der Hüfte nach unten, auf den Boden oder auf zwei stabile Stützen, und heb die Beine zu einem L an, dann halte.',
    `esDescription` = 'Siéntate con las piernas estiradas, apoya las manos junto a la cadera, en el suelo o sobre dos apoyos firmes, empuja para levantar las piernas en forma de L, y luego mantén.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Assieds-toi, mains à plat de chaque côté des hanches, au sol ou sur deux appuis stables, pousse pour décoller le bassin et ramène les deux genoux contre la poitrine, coudes verrouillés, puis tiens la position sans bouger.',
    `enDescription` = 'Sit with the hands flat beside the hips, on the floor or on two sturdy supports, press down to lift the seat and pull both knees up to the chest, elbows locked, then hold still.',
    `deDescription` = 'Setz dich hin, die Hände flach neben der Hüfte, auf dem Boden oder auf zwei stabilen Stützen, drück nach unten, um das Gesäß anzuheben, und zieh beide Knie zur Brust, Ellbogen durchgestreckt, dann halte die Position.',
    `esDescription` = 'Siéntate con las manos planas junto a la cadera, en el suelo o sobre dos apoyos firmes, empuja para despegar el trasero y lleva las dos rodillas al pecho con los codos bloqueados, y mantén la posición.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Entre dans une fente profonde et pose au sol la main opposée au pied avant. Amène l''autre coude vers l''intérieur du pied avant, puis tourne le buste et tends ce bras vers le plafond. Tu étires à la fois le fléchisseur de la hanche arrière, l''adducteur et le haut du dos.',
    `enDescription` = 'Step into a deep lunge and plant the hand opposite the front foot. Drive the other elbow toward the inside of the front foot, then turn your chest and reach that arm to the ceiling. This stretches the back hip flexor, the adductor and the upper back at once.',
    `deDescription` = 'Geh in einen tiefen Ausfallschritt und setz die Hand, die dem vorderen Fuß gegenüberliegt, auf den Boden. Führ den anderen Ellbogen zur Innenseite des vorderen Fußes, dann dreh den Oberkörper auf und streck diesen Arm zur Decke. Das dehnt gleichzeitig den Hüftbeuger des hinteren Beins, die Adduktoren und den oberen Rücken.',
    `esDescription` = 'Da una zancada profunda y apoya en el suelo la mano contraria al pie delantero. Lleva el otro codo hacia el interior del pie delantero, luego gira el tronco y estira ese brazo hacia el techo. Así estiras a la vez el flexor de la cadera de atrás, el aductor y la parte alta de la espalda.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'World''s Greatest Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Avance à quatre pattes, genoux juste au-dessus du sol, hanches basses et sangle abdominale gainée, en faisant avancer la main et le pied opposés ensemble. Si la place manque, recule de la même façon et repars.',
    `enDescription` = 'Move forward on hands and feet, knees just off the floor, hips low and core tight, advancing the opposite hand and foot together. If you run out of space, crawl back the same way and go again.',
    `deDescription` = 'Beweg dich auf Händen und Füßen vorwärts, Knie knapp über dem Boden, Hüfte tief und Rumpf angespannt, und setz jeweils die gegenüberliegende Hand und den Fuß gleichzeitig vor. Fehlt der Platz, krabbel genauso rückwärts und starte neu.',
    `esDescription` = 'Avanza a cuatro patas con las rodillas justo por encima del suelo, la cadera baja y el core firme, moviendo a la vez la mano y el pie contrarios. Si falta espacio, retrocede igual y vuelve a empezar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bear Crawl' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Bascule depuis les hanches et laisse pendre le buste, genoux légèrement fléchis, pour que la gravité étire l''arrière des jambes. Ne donne jamais d''à-coups.',
    `enDescription` = 'Hinge from the hips and let the torso hang, knees softly bent. Let gravity stretch the back of the legs, and never bounce.',
    `deDescription` = 'Klapp aus der Hüfte nach vorn und lass den Oberkörper hängen, die Knie locker gebeugt. Lass die Schwerkraft die Rückseite der Beine dehnen, und wipp niemals.',
    `esDescription` = 'Flexiona desde la cadera y deja colgar el tronco, con las rodillas un poco dobladas. Deja que la gravedad estire la parte de atrás de las piernas, y nunca rebotes.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Forward Fold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Accroupis-toi et pose les mains à plat au sol à largeur d''épaules. Penche les épaules bien en avant des poignets, coudes verrouillés, jusqu''à ce que les pieds décollent, genoux serrés contre la poitrine, et tiens cet équilibre sans bouger.',
    `enDescription` = 'Crouch and place your hands flat on the floor, shoulder-width apart. Lean the shoulders well past the wrists, elbows locked, until the feet leave the ground with the knees tucked to the chest, and hold that balance still.',
    `deDescription` = 'Geh in die Hocke und setz die Hände schulterbreit flach auf den Boden. Lehn die Schultern weit vor die Handgelenke, Ellbogen durchgestreckt, bis die Füße abheben und die Knie an der Brust liegen, und halte dieses Gleichgewicht ruhig.',
    `esDescription` = 'En cuclillas, apoya las manos planas en el suelo a la anchura de los hombros. Adelanta bien los hombros respecto a las muñecas con los codos bloqueados hasta que los pies se despeguen, con las rodillas pegadas al pecho, y mantén ese equilibrio sin moverte.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck Planche' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Plie une jambe devant toi, tibia en travers du tapis et pied vers la hanche opposée, tends l''autre jambe loin derrière, puis penche le buste sur la jambe avant et respire lentement. Si le genou avant fait mal, sors de la posture.',
    `enDescription` = 'Bend one leg in front of you, shin across the mat and foot toward the opposite hip, extend the other leg long behind, then fold your chest over the front leg and breathe slowly. If the front knee hurts, come out of the pose.',
    `deDescription` = 'Beug ein Bein vor dir, das Schienbein quer auf der Matte und den Fuß Richtung gegenüberliegender Hüfte, streck das andere Bein lang nach hinten und beug den Oberkörper über das vordere Bein, langsam atmend. Wenn das vordere Knie schmerzt, löse die Haltung.',
    `esDescription` = 'Dobla una pierna delante de ti, con la espinilla cruzada sobre la esterilla y el pie hacia la cadera contraria, estira la otra pierna bien atrás e inclina el pecho sobre la pierna delantera respirando despacio. Si la rodilla delantera duele, sal de la postura.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pigeon Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Bras tendus devant toi, fais d''abord tourner lentement les poignets dans les deux sens sur toute leur amplitude. Puis mets-toi à quatre pattes, paumes à plat, et bascule doucement d''avant en arrière. Reste dans une amplitude sans douleur.',
    `enDescription` = 'Arms out in front, first circle your wrists slowly both ways through their full range. Then get on hands and knees, palms flat, and rock gently forward and back. Stay within a pain-free range.',
    `deDescription` = 'Streck die Arme vor dir aus und kreis die Handgelenke zuerst langsam in beide Richtungen durch ihren ganzen Bewegungsumfang. Dann geh in den Vierfüßlerstand, Handflächen flach, und wieg dich sanft vor und zurück. Bleib in einem schmerzfreien Bereich.',
    `esDescription` = 'Con los brazos estirados al frente, gira primero despacio las muñecas en ambos sentidos en todo su recorrido. Luego ponte a cuatro patas con las palmas planas y balancéate con suavidad adelante y atrás. Quédate en un recorrido sin dolor.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wrist Circles' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Assieds-toi genoux fléchis, penche-toi légèrement en arrière et fais pivoter le torse d''un côté à l''autre en touchant le sol à chaque fois. Pieds posés au sol pour commencer, levés quand ça devient facile.',
    `enDescription` = 'Sit with knees bent, lean back slightly and rotate your torso side to side, tapping the floor each time. Keep the feet down to start, lift them once it gets easy.',
    `deDescription` = 'Setz dich mit gebeugten Knien hin, lehn dich leicht zurück und dreh den Oberkörper von Seite zu Seite, tipp dabei jedes Mal auf den Boden. Lass die Füße anfangs am Boden und heb sie an, sobald es leicht wird.',
    `esDescription` = 'Siéntate con las rodillas flexionadas, inclínate un poco hacia atrás y gira el tronco de lado a lado tocando el suelo cada vez. Empieza con los pies en el suelo y levántalos cuando resulte fácil.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Russian Twist' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En appui sur une jambe, bascule le buste vers l''avant et tends les mains vers le sol pendant que la jambe libre s''étend derrière toi, puis redresse-toi dos plat.',
    `enDescription` = 'Standing on one leg, tip your torso forward and reach toward the floor while the free leg extends behind you, then return upright with a flat back.',
    `deDescription` = 'Auf einem Bein stehend, kipp den Oberkörper nach vorn und greif Richtung Boden, während das freie Bein nach hinten gestreckt wird, dann komm mit geradem Rücken wieder hoch.',
    `esDescription` = 'Sobre una pierna, inclina el tronco hacia delante y lleva las manos hacia el suelo mientras la pierna libre se estira hacia atrás, y luego vuelve arriba con la espalda recta.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Deadlift' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le ventre bras et jambes tendus, soulève ensemble la poitrine, les bras et les jambes, et tiens la position en respirant.',
    `enDescription` = 'Lie face down with arms and legs extended, lift your chest, arms and legs off the ground together, and hold while you breathe.',
    `deDescription` = 'Leg dich mit gestreckten Armen und Beinen auf den Bauch, heb Brust, Arme und Beine gleichzeitig vom Boden und halte die Position, während du weiteratmest.',
    `esDescription` = 'Túmbate boca abajo con brazos y piernas estirados, levanta a la vez el pecho, los brazos y las piernas del suelo, y mantén la posición respirando.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Superman' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre bras tendus, pouces refermés autour de la barre, et laisse le corps pendre sans balancer. Tire légèrement les épaules vers le bas pour qu''elles ne remontent pas vers les oreilles, et tiens.',
    `enDescription` = 'Hang from a bar with straight arms, thumbs wrapped around it, and let the body hang without swinging. Draw the shoulders slightly down so they do not creep up to your ears, and hold.',
    `deDescription` = 'Häng dich mit gestreckten Armen an eine Stange, die Daumen um die Stange gelegt, und lass den Körper ruhig hängen, ohne zu schwingen. Zieh die Schultern leicht nach unten, damit sie nicht zu den Ohren rutschen, und halte.',
    `esDescription` = 'Cuélgate de una barra con los brazos estirados y los pulgares rodeándola, y deja colgar el cuerpo sin balancearte. Baja un poco los hombros para que no suban hacia las orejas, y mantén.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Hang' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Pieds à largeur d''épaules, descends comme pour t''asseoir, dos droit et talons au sol, jusqu''à ce que le pli de la hanche passe sous les genoux. Remonte en poussant dans tout le pied, genoux dans l''axe des orteils.',
    `enDescription` = 'Feet shoulder-width apart, sit down and back as if into a chair, back straight and heels down, until the hip crease drops below the knees. Drive back up through the whole foot, knees tracking over the toes.',
    `deDescription` = 'Füße schulterbreit, geh runter, als würdest du dich auf einen Stuhl setzen, Rücken gerade und Fersen am Boden, bis die Hüftfalte unter den Knien ist. Drück dich über den ganzen Fuß hoch, die Knie in Richtung der Zehen.',
    `esDescription` = 'Con los pies a la anchura de los hombros, baja como si fueras a sentarte, espalda recta y talones en el suelo, hasta que el pliegue de la cadera quede por debajo de las rodillas. Sube empujando con todo el pie, con las rodillas en la línea de los dedos.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Commence en planche, mains un peu plus larges que les épaules, et descends jusqu''à ce que la poitrine frôle le sol, coudes à environ 45 degrés du corps. Remonte jusqu''à tendre complètement les bras, le corps gainé d''un bloc.',
    `enDescription` = 'Start in a plank, hands slightly wider than the shoulders, and lower until the chest nearly touches the floor, elbows about 45 degrees from the body. Press back up to fully straight arms, the body braced in one piece.',
    `deDescription` = 'Beginne im Stütz, Hände etwas breiter als die Schultern, und senk dich ab, bis die Brust fast den Boden berührt, die Ellbogen etwa 45 Grad vom Körper. Drück dich bis zu ganz gestreckten Armen hoch, der Körper fest wie ein Brett.',
    `esDescription` = 'Empieza en plancha, con las manos algo más abiertas que los hombros, y baja hasta que el pecho casi roce el suelo, con los codos a unos 45 grados del cuerpo. Sube hasta estirar del todo los brazos, con el cuerpo firme como una tabla.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Push-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre, paumes vers l''avant, bras tendus. Tire jusqu''à ce que le menton passe au-dessus de la barre, puis redescends jusqu''à tendre complètement les bras avant la répétition suivante.',
    `enDescription` = 'Hang from a bar, palms facing away, arms straight. Pull until your chin passes over the bar, then lower all the way to straight arms before the next rep.',
    `deDescription` = 'Häng dich an eine Stange, Handflächen nach vorne, Arme gestreckt. Zieh dich hoch, bis das Kinn über der Stange ist, und senk dich bis zu ganz gestreckten Armen ab, bevor die nächste Wiederholung beginnt.',
    `esDescription` = 'Cuélgate de una barra con las palmas hacia delante y los brazos estirados. Tira hasta que la barbilla pase por encima de la barra y baja hasta estirar del todo los brazos antes de la siguiente repetición.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pull-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En position de pompe, mains sous les épaules, aligne talons, bassin et épaules, et tiens. Serre fessiers et abdos pour que le bassin ne s''affaisse pas.',
    `enDescription` = 'In a push-up position, hands under the shoulders, line up heels, hips and shoulders, and hold. Squeeze your glutes and abs so the hips do not sag.',
    `deDescription` = 'In der Liegestützposition, Hände unter den Schultern, bring Fersen, Becken und Schultern in eine Linie und halte. Spann Gesäß und Bauch an, damit das Becken nicht durchhängt.',
    `esDescription` = 'En posición de flexión, con las manos bajo los hombros, alinea talones, cadera y hombros, y mantén. Aprieta glúteos y abdomen para que la cadera no se hunda.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En appui sur un rebord stable ou deux barres parallèles, bras tendus, descends en pliant les coudes vers l''arrière jusqu''à ce que les épaules arrivent à hauteur des coudes. Remonte jusqu''à verrouiller les bras. Si l''avant de l''épaule tire, réduis la descente.',
    `enDescription` = 'Support yourself on a sturdy edge or two parallel bars, arms straight, and lower by bending the elbows back until the shoulders reach elbow height. Press back up to locked arms. If the front of the shoulder pulls, shorten the descent.',
    `deDescription` = 'Stütz dich mit gestreckten Armen auf eine stabile Kante oder einen Barren und senk dich ab, die Ellbogen nach hinten gebeugt, bis die Schultern auf Ellbogenhöhe sind. Drück dich bis zu durchgestreckten Armen hoch. Zieht es vorne in der Schulter, geh weniger tief.',
    `esDescription` = 'Apóyate con los brazos estirados en un borde firme o en dos barras paralelas y baja doblando los codos hacia atrás hasta que los hombros lleguen a la altura de los codos. Sube hasta bloquear los brazos. Si tira la parte delantera del hombro, baja menos.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dip' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos, mains près de la tête, et amène un coude vers le genou opposé pendant que l''autre jambe s''étend, en alternant sans tirer sur la nuque.',
    `enDescription` = 'Lie on your back, hands beside the head, and bring one elbow toward the opposite knee while the other leg extends, alternating without pulling on the neck.',
    `deDescription` = 'Leg dich auf den Rücken, Hände neben dem Kopf, und führ einen Ellbogen zum gegenüberliegenden Knie, während das andere Bein sich streckt. Wechsle ab, ohne am Nacken zu ziehen.',
    `esDescription` = 'Túmbate boca arriba, manos junto a la cabeza, y lleva un codo hacia la rodilla contraria mientras estiras la otra pierna, alternando sin tirar del cuello.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bicycle Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le ventre, mains sous les épaules, coudes près du corps. Pousse doucement pour décoller la poitrine en gardant le bassin et le haut des cuisses au sol, coudes légèrement fléchis et épaules loin des oreilles.',
    `enDescription` = 'Lie face down, hands under the shoulders, elbows close to the body. Press gently to lift the chest while the pelvis and upper thighs stay on the floor, elbows slightly bent and shoulders away from the ears.',
    `deDescription` = 'Leg dich auf den Bauch, Hände unter den Schultern, Ellbogen nah am Körper. Drück dich sanft hoch, um die Brust anzuheben, Becken und Oberschenkel bleiben am Boden, die Ellbogen leicht gebeugt und die Schultern weg von den Ohren.',
    `esDescription` = 'Túmbate boca abajo, con las manos bajo los hombros y los codos pegados al cuerpo. Empuja con suavidad para despegar el pecho mientras la pelvis y la parte alta de los muslos siguen en el suelo, con los codos algo flexionados y los hombros lejos de las orejas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cobra Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En guerrier II, écarte largement les pieds, pied avant pointé droit devant et pied arrière tourné vers l''extérieur. Fléchis le genou avant au-dessus de la cheville, ouvre les bras à l''horizontale dans l''axe des jambes et regarde au-delà de la main avant.',
    `enDescription` = 'In Warrior II, take a wide stance, front foot pointing straight ahead and back foot turned out. Bend the front knee over the ankle, open the arms level with the floor in line with the legs, and look past the front hand.',
    `deDescription` = 'Stell dich für den Krieger II breit hin, der vordere Fuß zeigt nach vorne, der hintere ist nach außen gedreht. Beug das vordere Knie über den Knöchel, öffne die Arme waagerecht in einer Linie mit den Beinen und schau über die vordere Hand hinaus.',
    `esDescription` = 'En el guerrero II, abre bien las piernas, con el pie delantero hacia delante y el de atrás girado hacia fuera. Dobla la rodilla delantera sobre el tobillo, abre los brazos en horizontal en la línea de las piernas y mira más allá de la mano delantera.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warrior Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos, plaque le bas du dos au sol et décolle les épaules et les jambes de quelques centimètres, bras dans le prolongement, et tiens cette position en banane.',
    `enDescription` = 'Lie on your back, press the lower back into the floor and lift the shoulders and legs a few inches, arms overhead, holding that banana shape.',
    `deDescription` = 'Leg dich auf den Rücken, drück den unteren Rücken in den Boden und heb Schultern und Beine ein paar Zentimeter an, Arme über dem Kopf, und halte diese Bananenform.',
    `esDescription` = 'Túmbate boca arriba, pega la zona lumbar al suelo y levanta hombros y piernas unos centímetros, brazos por encima de la cabeza, sosteniendo esa forma de plátano.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hollow Body Hold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos bras tendus vers le plafond et genoux à 90 degrés, puis abaisse un bras et la jambe opposée vers le sol avant de revenir et de changer de côté. Garde le bas du dos plaqué au sol pendant tout le mouvement.',
    `enDescription` = 'Lie on your back with arms up and knees bent at 90 degrees, then lower one arm and the opposite leg toward the floor before returning and switching sides. Keep your lower back pressed into the floor throughout.',
    `deDescription` = 'Leg dich auf den Rücken, Arme nach oben und Knie im 90-Grad-Winkel, dann senk einen Arm und das gegenüberliegende Bein Richtung Boden, bevor du zurückkommst und die Seite wechselst. Halte den unteren Rücken die ganze Zeit am Boden.',
    `esDescription` = 'Túmbate boca arriba con los brazos hacia el techo y las rodillas a 90 grados. Baja un brazo y la pierna contraria hacia el suelo antes de volver y cambiar de lado. Mantén la zona lumbar pegada al suelo todo el tiempo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Bug' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre bras tendus et, sans plier les coudes, tire les omoplates vers le bas et l''une vers l''autre pour soulever légèrement le corps. C''est le premier temps de chaque traction.',
    `enDescription` = 'Hang from a bar with arms straight and, without bending your elbows, pull your shoulder blades down and together to lift your body slightly. It is the first part of every pull-up.',
    `deDescription` = 'Häng dich mit gestreckten Armen an eine Stange und zieh, ohne die Ellbogen zu beugen, die Schulterblätter nach unten und zusammen, um den Körper leicht anzuheben. Das ist der erste Teil jedes Klimmzugs.',
    `esDescription` = 'Cuélgate de una barra con los brazos estirados y, sin doblar los codos, lleva las escápulas hacia abajo y hacia dentro para subir un poco el cuerpo. Es el primer tiempo de cada dominada.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Scapular Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi au sol ou sur un banc, agrippe un point fixe derrière la tête et soulève tout le corps en appui sur les épaules, d''une seule ligne rigide, puis redescends lentement sans laisser les hanches se plier.',
    `enDescription` = 'Lying on the floor or a bench, grip something solid behind your head and lift the whole body onto the shoulders in one rigid line, then lower it slowly without letting the hips fold.',
    `deDescription` = 'Auf dem Boden oder einer Bank liegend greifst du hinter dem Kopf etwas Festes und hebst den ganzen Körper in einer starren Linie auf die Schultern, dann senkst du ihn langsam ab, ohne in der Hüfte einzuknicken.',
    `esDescription` = 'Túmbate en el suelo o en un banco, agarra algo firme detrás de la cabeza y eleva todo el cuerpo sobre los hombros en una línea rígida, y luego bájalo despacio sin dejar que la cadera se doble.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dragon Flag' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos, un pied au sol et l''autre jambe tendue, et pousse dans le talon en appui pour lever les hanches sans les laisser basculer d''un côté.',
    `enDescription` = 'Lie on your back with one foot planted and the other leg extended, then drive through the planted heel to lift the hips without letting them tilt to one side.',
    `deDescription` = 'Leg dich auf den Rücken, ein Fuß aufgestellt und das andere Bein gestreckt, dann drück dich über die aufgestellte Ferse hoch, ohne die Hüfte zur Seite kippen zu lassen.',
    `esDescription` = 'Túmbate boca arriba con un pie apoyado y la otra pierna estirada. Empuja con el talón apoyado para subir la cadera sin dejar que se incline hacia un lado.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Ferme bien la porte, mets-toi du côté où elle s''ouvre en poussant et passe une serviette autour de la poignée. Saisis les deux extrémités, penche-toi en arrière bras tendus, puis tire les coudes vers l''arrière pour ramener la poitrine vers la porte. Plus tes pieds sont près de la porte, plus c''est dur.',
    `enDescription` = 'Shut the door firmly, stand on the side where it opens away from you and loop a towel around the handle. Grip both ends, lean back with straight arms, then drive your elbows back to bring your chest to the door. The closer your feet are to the door, the harder it gets.',
    `deDescription` = 'Schließ die Tür fest, stell dich auf die Seite, von der aus du sie aufdrückst, und leg ein Handtuch um die Klinke. Greif beide Enden, lehn dich mit gestreckten Armen zurück und zieh die Ellbogen nach hinten, bis die Brust zur Tür kommt. Je näher die Füße an der Tür stehen, desto schwerer wird es.',
    `esDescription` = 'Cierra bien la puerta, colócate en el lado desde el que se abre empujando y pasa una toalla por el pomo. Agarra los dos extremos, échate atrás con los brazos estirados y lleva los codos hacia atrás para acercar el pecho a la puerta. Cuanto más cerca de la puerta estén los pies, más difícil.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Towel Door Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'À quatre pattes, glisse un bras sous l''autre et pose l''épaule au sol. Garde les hanches au-dessus des genoux pour que la rotation vienne du haut du dos.',
    `enDescription` = 'From hands and knees, slide one arm under the other and rest the shoulder on the floor. Keep the hips stacked over the knees so the rotation comes from the upper back.',
    `deDescription` = 'Aus dem Vierfüßlerstand schiebst du einen Arm unter dem anderen durch und legst die Schulter auf dem Boden ab. Halte die Hüfte über den Knien, damit die Drehung aus dem oberen Rücken kommt.',
    `esDescription` = 'Desde cuatro patas, pasa un brazo por debajo del otro y apoya el hombro en el suelo. Mantén la cadera sobre las rodillas para que el giro salga de la parte alta de la espalda.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Thread the Needle' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Ventre contre le mur : pars en planche, pieds contre le mur, et monte les pieds le long du mur en rapprochant les mains jusqu''à environ un pas du mur. Dos au mur : lance une jambe puis l''autre pour poser les talons contre le mur. Bras verrouillés, côtes rentrées, regard entre les mains, et respire.',
    `enDescription` = 'Chest to the wall: start in a plank with your feet against the wall, then walk your feet up it as you bring your hands in to about a step from the wall. Back to the wall: kick up one leg then the other until your heels rest on it. Arms locked, ribs tucked, eyes between the hands, and breathe.',
    `deDescription` = 'Bauch zur Wand: Beginne im Stütz mit den Füßen an der Wand und lauf mit den Füßen an ihr hoch, während die Hände bis etwa einen Schritt vor die Wand nachrücken. Rücken zur Wand: Schwing ein Bein und dann das andere hoch, bis die Fersen an der Wand liegen. Arme durchgestreckt, Rippen eingezogen, Blick zwischen die Hände, und atme.',
    `esDescription` = 'Pecho hacia la pared: empieza en plancha con los pies contra la pared y sube los pies por ella mientras acercas las manos hasta quedar a un paso. Espalda hacia la pared: lanza una pierna y luego la otra hasta apoyar los talones. Brazos bloqueados, costillas cerradas, mirada entre las manos, y respira.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Handstand' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Suspends-toi à une barre, tire de façon explosive jusqu''à amener la poitrine au niveau de la barre, bascule les épaules par-dessus, puis pousse jusqu''à tendre les bras au-dessus d''elle.',
    `enDescription` = 'Hang from a bar, pull explosively until the chest reaches the bar, roll the shoulders over it, then press up to straight arms above it.',
    `deDescription` = 'Häng dich an eine Stange, zieh dich explosiv hoch, bis die Brust auf Höhe der Stange ist, roll die Schultern darüber und drück dich dann bis zu gestreckten Armen über ihr hoch.',
    `esDescription` = 'Cuélgate de una barra, tira de forma explosiva hasta llevar el pecho a la altura de la barra, pasa los hombros por encima y empuja hasta estirar los brazos sobre ella.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Muscle-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Marche d''un bon pas, à une allure où tu peux encore parler, et garde-la jusqu''à la fin.',
    `enDescription` = 'Walk briskly, at a pace where you can still talk, and keep it up to the end.',
    `deDescription` = 'Geh zügig, in einem Tempo, bei dem du noch reden kannst, und halte es bis zum Schluss.',
    `esDescription` = 'Camina a buen paso, a un ritmo en el que aún puedas hablar, y mantenlo hasta el final.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warden''s Walk' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Cours à une allure régulière, que tu pourrais tenir longtemps. Si tu dois marcher, marche, puis repars dès que le souffle revient.',
    `enDescription` = 'Run at a steady pace you could hold for a long time. If you need to walk, walk, then set off again once your breath comes back.',
    `deDescription` = 'Lauf in einem gleichmäßigen Tempo, das du lange halten könntest. Wenn du gehen musst, geh, und lauf wieder los, sobald du wieder zu Atem kommst.',
    `esDescription` = 'Corre a un ritmo constante que podrías mantener mucho tiempo. Si necesitas caminar, camina, y vuelve a correr en cuanto recuperes el aliento.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Messenger''s Run' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Monte en équilibre sur les mains contre un mur, plie les coudes pour descendre lentement jusqu''à ce que la tête effleure le sol, puis repousse pour remonter.',
    `enDescription` = 'Kick up into a handstand against a wall, bend your elbows to lower slowly until your head lightly touches the floor, then press back up.',
    `deDescription` = 'Schwing dich an einer Wand in den Handstand, beug die Ellbogen und senk dich langsam ab, bis der Kopf den Boden leicht berührt, dann drück dich wieder hoch.',
    `esDescription` = 'Sube al pino contra una pared, dobla los codos y baja despacio hasta rozar el suelo con la cabeza, y vuelve a empujar hacia arriba.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Handstand Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Croise une jambe en diagonale derrière l''autre, comme pour une révérence, fléchis les deux genoux, puis pousse sur le pied avant pour te relever.',
    `enDescription` = 'Step one leg diagonally behind the other into a curtsy, bending both knees, then push through the front foot to stand back up.',
    `deDescription` = 'Setz ein Bein diagonal hinter das andere wie bei einem Knicks, beug beide Knie und drück dich über den vorderen Fuß wieder hoch.',
    `esDescription` = 'Cruza una pierna en diagonal por detrás de la otra como en una reverencia, dobla ambas rodillas y empuja con el pie delantero para volver a subir.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Curtsy Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'À quatre pattes, alterne entre arrondir le dos vers le plafond et le laisser se creuser en ouvrant la poitrine. Déroule vertèbre par vertèbre et laisse la respiration donner le rythme.',
    `enDescription` = 'On hands and knees, alternate between rounding your back toward the ceiling and letting it sink as the chest opens. Move one vertebra at a time and let the breath set the pace.',
    `deDescription` = 'Im Vierfüßlerstand wechselst du zwischen einem runden Rücken zur Decke und einem absinkenden Rücken mit geöffneter Brust. Beweg einen Wirbel nach dem anderen und lass den Atem das Tempo bestimmen.',
    `esDescription` = 'A cuatro patas, alterna entre redondear la espalda hacia el techo y dejarla hundirse mientras se abre el pecho. Mueve vértebra a vértebra y deja que la respiración marque el ritmo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cat-Cow' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Place les mains plus larges qu''en pompe et descends vers une main pendant que le bras opposé reste tendu, puis repousse et change de côté. Le bras qui plie porte l''essentiel de la charge.',
    `enDescription` = 'Set your hands wider than for a push-up and lower toward one hand while the opposite arm stays straight, then press back up and switch sides. The bending arm takes most of the load.',
    `deDescription` = 'Setz die Hände weiter auf als beim Liegestütz und senk dich zu einer Hand ab, während der andere Arm gestreckt bleibt. Drück dich hoch und wechsle die Seite. Der gebeugte Arm trägt den Großteil der Last.',
    `esDescription` = 'Coloca las manos más abiertas que en una flexión y baja hacia una mano mientras el brazo contrario se queda recto. Sube y cambia de lado. El brazo que se dobla carga con la mayor parte del peso.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Archer Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Depuis la position debout, descends en squat, projette les jambes en arrière en position de pompe, ramène-les sous toi et termine par un saut, bras au-dessus de la tête.',
    `enDescription` = 'From standing, drop into a squat, kick your legs back to a push-up position, return them under you and finish with a jump, arms overhead.',
    `deDescription` = 'Geh aus dem Stand in die Hocke, spring mit den Beinen nach hinten in die Liegestützposition, hol sie wieder unter den Körper und schließ mit einem Sprung ab, die Arme über dem Kopf.',
    `esDescription` = 'De pie, baja a sentadilla, lanza las piernas atrás hasta la posición de flexión, recógelas bajo el cuerpo y termina con un salto, brazos arriba.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Burpee' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Depuis la position de pompe, rapproche les pieds et lève les hanches en V inversé, puis fléchis les coudes pour amener le sommet du crâne vers le sol avant de repousser.',
    `enDescription` = 'From a push-up position, walk the feet in and lift the hips into an inverted V, then bend the elbows to lower the top of your head toward the floor and press back up.',
    `deDescription` = 'Geh aus der Liegestützposition mit den Füßen nach vorn und heb die Hüfte zu einem umgekehrten V. Beug dann die Ellbogen, senk den Scheitel Richtung Boden und drück dich wieder hoch.',
    `esDescription` = 'Desde la posición de flexión, acerca los pies y sube la cadera en V invertida, y luego dobla los codos para bajar la coronilla hacia el suelo y vuelve a empujar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pike Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Saute ou monte sur un appui pour atteindre le haut de la traction, menton au-dessus de la barre, puis descends aussi lentement que possible, vise cinq secondes, et remonte pour la répétition suivante.',
    `enDescription` = 'Jump or step to the top of a pull-up, chin over the bar, then lower yourself as slowly as you can, aim for five seconds, and step back up for the next rep.',
    `deDescription` = 'Spring oder steig in die obere Position eines Klimmzugs, Kinn über der Stange, dann lass dich so langsam wie möglich ab, peil fünf Sekunden an, und steig für die nächste Wiederholung wieder hoch.',
    `esDescription` = 'Salta o súbete a un apoyo para ponerte arriba de la dominada, con la barbilla sobre la barra. Baja lo más despacio que puedas, intenta llegar a cinco segundos, y vuelve a subir para la siguiente repetición.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Negative Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Tiens une position de pompe, mains sous les épaules, et ramène alternativement un genou vers la poitrine à rythme rapide, sans laisser monter les hanches.',
    `enDescription` = 'Hold a push-up position with the hands under the shoulders and drive one knee at a time toward your chest, alternating quickly without letting the hips rise.',
    `deDescription` = 'Halte die Liegestützposition mit den Händen unter den Schultern und zieh abwechselnd und zügig ein Knie Richtung Brust, ohne die Hüfte anzuheben.',
    `esDescription` = 'Mantén la posición de flexión con las manos bajo los hombros y lleva las rodillas al pecho alternándolas rápido, sin subir la cadera.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Mountain Climber' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Saute en écartant les pieds tout en levant les bras au-dessus de la tête, puis reviens pieds joints, bras le long du corps, à rythme régulier.',
    `enDescription` = 'Jump the feet out wide while raising the arms overhead, then jump back to feet together with the arms at your sides, keeping a steady rhythm.',
    `deDescription` = 'Spring in die Grätsche und heb dabei die Arme über den Kopf, dann spring zurück in den geschlossenen Stand, die Arme seitlich am Körper, in gleichmäßigem Rhythmus.',
    `esDescription` = 'Salta abriendo los pies mientras subes los brazos por encima de la cabeza, luego vuelve a juntar los pies con los brazos a los lados, con un ritmo constante.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jumping Jack' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Prends une position de pompe genoux au sol, corps aligné de la tête aux genoux, puis descends la poitrine jusqu''à un poing du sol avant de repousser.',
    `enDescription` = 'Take a push-up position with your knees on the floor and your body straight from head to knee, then lower your chest to a fist''s height above the floor and press back up.',
    `deDescription` = 'Geh in die Liegestützposition mit den Knien am Boden und dem Körper gerade vom Kopf bis zum Knie, dann senk die Brust bis eine Faustbreite über den Boden und drück dich wieder hoch.',
    `esDescription` = 'Colócate en posición de flexión con las rodillas en el suelo y el cuerpo recto de la cabeza a las rodillas. Baja el pecho hasta un puño del suelo y vuelve a subir.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Knee Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'En appui sur une jambe, l''autre tendue devant toi, descends jusqu''au bas du squat et remonte sans que le talon libre touche jamais le sol.',
    `enDescription` = 'Standing on one leg with the other extended forward, lower all the way to the bottom of a squat and stand back up without the free heel ever touching the floor.',
    `deDescription` = 'Auf einem Bein, das andere nach vorn gestreckt, senk dich bis ganz unten in die Kniebeuge und steh wieder auf, ohne dass die freie Ferse je den Boden berührt.',
    `esDescription` = 'Sobre una pierna, con la otra estirada al frente, baja hasta el fondo de una sentadilla y vuelve a subir sin que el talón libre toque nunca el suelo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pistol Squat' AND `creator` = 'Admin';
