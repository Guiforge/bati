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
-- Scoped to `creator = 'Admin'` (0035). No semicolon inside any string: the guard test splits on it.
UPDATE `exercises` SET
    `frDescription` = 'Allonge-toi sur le dos, en appui sur les avant-bras, jambes tendues à quelques centimètres du sol, et alterne de petits battements de haut en bas sans creuser le bas du dos.',
    `enDescription` = 'Lie on your back propped on your forearms, legs extended a few inches off the ground, and alternate small up-and-down kicks without arching your lower back.',
    `deDescription` = 'Leg dich auf den Rücken, auf die Unterarme gestützt, die Beine ein paar Zentimeter über dem Boden gestreckt, und mach abwechselnd kleine Auf-und-ab-Schläge, ohne ins Hohlkreuz zu gehen.',
    `esDescription` = 'Túmbate boca arriba apoyado en los antebrazos, con las piernas estiradas a unos centímetros del suelo, y alterna pequeñas patadas arriba y abajo sin arquear la zona lumbar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Flutter Kicks' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'À vélo, roule régulièrement plutôt que par à-coups : en une heure, une monture couvre quatre fois le terrain d''un marcheur, et c''est bien pour ça qu''on en prend une.',
    `enDescription` = 'On a bike, ride steadily rather than in bursts. A mount covers four times a walker''s ground in the same hour, which is the whole reason to take one.',
    `deDescription` = 'Fahr mit dem Rad gleichmäßig statt in Schüben. Ein Reittier schafft in derselben Stunde viermal so viel Strecke wie ein Wanderer, und genau deshalb nimmt man eines.',
    `esDescription` = 'En bicicleta, pedalea con regularidad en lugar de a golpes. Una montura cubre en la misma hora cuatro veces la distancia de un caminante, y por eso se usa una.',
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
    `frDescription` = 'Recule d''un pas et descends jusqu''à ce que le genou arrière frôle le sol, les deux genoux proches de 90 degrés, genou avant à l''aplomb de la cheville. Le pas arrière ménage le genou avant. Prends toute la profondeur : un pas court n''entraîne qu''une amplitude courte.',
    `enDescription` = 'Step back and lower until the back knee grazes the floor, both knees near 90 degrees, front knee over the ankle. Stepping back spares the front knee. Take the full depth: a short step trains a short range.',
    `deDescription` = 'Mach einen Schritt nach hinten und senk dich ab, bis das hintere Knie den Boden streift und beide Knie etwa 90 Grad haben, das vordere Knie über dem Knöchel. Der Schritt nach hinten schont das vordere Knie. Geh ganz in die Tiefe: Ein kurzer Schritt trainiert nur einen kurzen Weg.',
    `esDescription` = 'Da un paso atrás y baja hasta que la rodilla de atrás roce el suelo y ambas rodillas estén cerca de 90 grados, con la rodilla delantera sobre el tobillo. El paso atrás cuida la rodilla delantera. Baja del todo: un paso corto entrena un recorrido corto.',
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
    `frDescription` = 'Assis jambes tendues, pousse sur les mains posées à côté des hanches, au sol ou sur deux appuis stables, et lève les jambes pour former un L, puis maintiens la position.',
    `enDescription` = 'Sit with legs extended, press your hands down beside your hips, on the floor or on two sturdy supports, and lift your legs to form an L shape, then hold.',
    `deDescription` = 'Setz dich mit gestreckten Beinen hin, drück die Hände neben der Hüfte nach unten, auf den Boden oder auf zwei stabile Stützen, und heb die Beine zu einem L an, dann halte.',
    `esDescription` = 'Siéntate con las piernas estiradas, apoya las manos junto a la cadera, en el suelo o sobre dos apoyos firmes, empuja para levantar las piernas en forma de L, y luego mantén.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Assis, mains à plat de chaque côté des hanches, au sol ou sur deux appuis stables, pousse pour décoller le bassin et ramène les deux genoux contre la poitrine, coudes verrouillés, puis tiens la position sans bouger.',
    `enDescription` = 'Sit with the hands flat beside the hips, on the floor or on two sturdy supports, press down to lift the seat and pull both knees up to the chest, elbows locked, then hold still.',
    `deDescription` = 'Setz dich hin, die Hände flach neben der Hüfte, auf dem Boden oder auf zwei stabilen Stützen, drück nach unten, um das Gesäß anzuheben, und zieh beide Knie zur Brust, Ellbogen durchgestreckt, dann halte die Position.',
    `esDescription` = 'Siéntate con las manos planas junto a la cadera, en el suelo o sobre dos apoyos firmes, empuja para despegar el trasero y lleva las dos rodillas al pecho con los codos bloqueados, y mantén la posición.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Entre dans une fente profonde et pose au sol la main opposée au pied avant. Amène l''autre coude vers l''intérieur du pied avant, puis tourne le buste et tends ce bras vers le plafond. Fléchisseur de hanche, adducteur et haut du dos en un seul mouvement.',
    `enDescription` = 'Step into a deep lunge and plant the hand opposite the front foot. Drive the other elbow toward the inside of the front foot, then turn your chest and reach that arm to the ceiling. Hip flexor, adductor and upper back in one movement.',
    `deDescription` = 'Geh in einen tiefen Ausfallschritt und setz die Hand, die dem vorderen Fuß gegenüberliegt, auf den Boden. Führ den anderen Ellbogen zur Innenseite des vorderen Fußes, dann dreh den Oberkörper auf und streck diesen Arm zur Decke. Hüftbeuger, Adduktor und oberer Rücken in einer Bewegung.',
    `esDescription` = 'Da una zancada profunda y apoya en el suelo la mano contraria al pie delantero. Lleva el otro codo hacia el interior del pie delantero, luego gira el tronco y estira ese brazo hacia el techo. Flexor de cadera, aductor y parte alta de la espalda en un solo movimiento.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'World''s Greatest Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Avance à quatre pattes, genoux juste au-dessus du sol, hanches basses et sangle abdominale gainée, en faisant avancer la main et le pied opposés ensemble. Si la place manque, recule de la même façon et repars.',
    `enDescription` = 'Move forward on hands and feet, knees just off the floor, hips low and core tight, advancing the opposite hand and foot together. Short on space, crawl back the same way and go again.',
    `deDescription` = 'Beweg dich auf Händen und Füßen vorwärts, Knie knapp über dem Boden, Hüfte tief und Rumpf angespannt, und setz jeweils die gegenüberliegende Hand und den Fuß gleichzeitig vor. Fehlt der Platz, krabbel genauso rückwärts und starte neu.',
    `esDescription` = 'Avanza a cuatro patas con las rodillas justo por encima del suelo, la cadera baja y el core firme, moviendo a la vez la mano y el pie contrarios. Si falta espacio, retrocede igual y vuelve a empezar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bear Crawl' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Bascule depuis les hanches et laisse le buste pendre, genoux légèrement fléchis. Laisse la gravité étirer l''arrière des jambes, sans jamais donner d''à-coups.',
    `enDescription` = 'Hinge from the hips and let the torso hang, knees softly bent. Let gravity stretch the back of the legs, and never bounce.',
    `deDescription` = 'Klapp aus der Hüfte nach vorn und lass den Oberkörper hängen, die Knie locker gebeugt. Lass die Schwerkraft die Rückseite der Beine dehnen, und wipp niemals.',
    `esDescription` = 'Flexiona desde la cadera y deja colgar el tronco, con las rodillas un poco dobladas. Deja que la gravedad estire la parte de atrás de las piernas, y nunca rebotes.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Forward Fold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Accroupi, pose les mains à plat au sol à largeur d''épaules. Penche les épaules bien en avant des poignets, coudes verrouillés, jusqu''à ce que les pieds décollent, genoux serrés contre la poitrine, et tiens cet équilibre sans bouger.',
    `enDescription` = 'Crouch and place your hands flat on the floor, shoulder-width apart. Lean the shoulders well past the wrists, elbows locked, until the feet leave the ground with the knees tucked to the chest, and hold that balance still.',
    `deDescription` = 'Geh in die Hocke und setz die Hände schulterbreit flach auf den Boden. Lehn die Schultern weit vor die Handgelenke, Ellbogen durchgestreckt, bis die Füße abheben und die Knie an der Brust liegen, und halte dieses Gleichgewicht ruhig.',
    `esDescription` = 'En cuclillas, apoya las manos planas en el suelo a la anchura de los hombros. Adelanta bien los hombros respecto a las muñecas con los codos bloqueados hasta que los pies se despeguen, con las rodillas pegadas al pecho, y mantén ese equilibrio sin moverte.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck Planche' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Plie une jambe devant toi, tibia en travers du tapis et pied vers la hanche opposée, tends l''autre jambe loin derrière, puis penche-toi sur la jambe avant. La hanche s''ouvre à mesure que le souffle ralentit, et relâche dès que le genou fait mal.',
    `enDescription` = 'Bend one leg in front of you, shin across the mat and foot toward the opposite hip, extend the other leg long behind, then fold over the front leg. The hip opens as the breath slows, and back off the moment the knee hurts.',
    `deDescription` = 'Beug ein Bein vor dir, das Schienbein quer auf der Matte und den Fuß Richtung gegenüberliegender Hüfte, streck das andere Bein lang nach hinten und beug dich dann über das vordere Bein. Die Hüfte öffnet sich, während der Atem ruhiger wird. Lass nach, sobald das Knie schmerzt.',
    `esDescription` = 'Dobla una pierna delante de ti, con la espinilla cruzada sobre la esterilla y el pie hacia la cadera contraria, estira la otra pierna bien atrás y luego inclínate sobre la pierna delantera. La cadera se abre a medida que la respiración se calma. Afloja en cuanto la rodilla duela.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pigeon Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `frDescription` = 'Bras tendus devant toi, fais d''abord tourner lentement les poignets dans les deux sens sur toute leur amplitude. Puis mets-toi à quatre pattes, paumes à plat, et bascule doucement d''avant en arrière. Chaque degré doit rester indolore : c''est une préparation, et rien ne s''y force.',
    `enDescription` = 'Arms out in front, first circle your wrists slowly both ways through their full range. Then get on hands and knees, palms flat, and rock gently forward and back. Keep every degree pain-free: this is preparation, and nothing gets forced.',
    `deDescription` = 'Streck die Arme vor dir aus und kreis die Handgelenke zuerst langsam in beide Richtungen durch ihren ganzen Bewegungsumfang. Dann geh in den Vierfüßlerstand, Handflächen flach, und wieg dich sanft vor und zurück. Jeder Grad bleibt schmerzfrei: Das ist Vorbereitung, hier wird nichts erzwungen.',
    `esDescription` = 'Con los brazos estirados al frente, gira primero despacio las muñecas en ambos sentidos en todo su recorrido. Luego ponte a cuatro patas con las palmas planas y balancéate con suavidad adelante y atrás. Cada grado sin dolor: esto es preparación, y aquí no se fuerza nada.',
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
    `frDescription` = 'Suspends-toi à une barre bras tendus, prise pleine, épaules relâchées loin des oreilles, et tiens simplement. Une poigne plus forte, ce sont des tractions en plus.',
    `enDescription` = 'Hang from a bar with straight arms and a full grip, shoulders relaxed away from the ears, and simply stay there. A stronger grip means more pull-ups.',
    `deDescription` = 'Häng dich mit gestreckten Armen und vollem Griff an eine Stange, die Schultern locker weg von den Ohren, und bleib einfach hängen. Ein stärkerer Griff bringt dir mehr Klimmzüge.',
    `esDescription` = 'Cuélgate de una barra con los brazos estirados y el agarre completo, hombros relajados lejos de las orejas, y quédate ahí. Un agarre más fuerte te da más dominadas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Hang' AND `creator` = 'Admin';
