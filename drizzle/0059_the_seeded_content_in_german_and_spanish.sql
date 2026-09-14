-- The seeded content in German and Spanish: every Admin exercise, quest, adventure and step.
--
-- 0058 added the columns empty, and `localizedText` has been showing English in them since. This
-- fills them, translated from the English with the French beside it and against the glossary's
-- German and Spanish terms (docs/product/glossary.md), in the register the rest of the game uses:
-- du and tú. Proper names are translated, not kept, the way French already translates them
-- (Warden's Walk is "Marche du Veilleur", so it is "Rundgang des Wächters" and "Paseo del Vigía").
--
-- Every statement is scoped to the seeded row: `creator = 'Admin'` on exercises (rule 2, 0035),
-- `author = 'Admin'` on quests and adventures, and steps through their Admin adventure. A hero's
-- own row is never touched: it already carries its one language in every column.
--
-- No semicolon inside any string: `seed-migration-guard.test.ts` splits statements on `;`, and a
-- description with one reads to it as a second statement that forgot its `creator`.
UPDATE `exercises` SET
    `deName` = 'Kniebeuge',
    `esName` = 'Sentadilla',
    `deDescription` = 'Stell dich mit schulterbreiten Füßen hin und geh runter, als würdest du dich auf einen Stuhl setzen, bis die Hüftfalte unter das Knie sinkt: Die Tiefe ist die Steigerung. Drück dich über den ganzen Fuß wieder hoch.',
    `esDescription` = 'Ponte de pie con los pies a la anchura de los hombros y baja como si fueras a sentarte en una silla, hasta que el pliegue de la cadera quede por debajo de la rodilla: la profundidad es la progresión. Sube empujando con todo el pie.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Liegestütze',
    `esName` = 'Flexiones',
    `deDescription` = 'Beginne im Stütz und senk dich ab, bis die Brust den Boden berührt, Ellbogen nach hinten statt zur Seite. Drück dich oben ganz bis zu gestreckten Armen hoch: Eine halbe Wiederholung trainiert nur den halben Weg.',
    `esDescription` = 'Empieza en plancha y baja hasta que el pecho toque el suelo, con los codos hacia atrás en lugar de abiertos. Sube hasta estirar del todo los brazos: media repetición entrena solo la mitad del recorrido.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Push-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Klimmzüge',
    `esName` = 'Dominadas',
    `deDescription` = 'Häng dich mit komplett gestreckten Armen und lockeren Schultern an eine Stange und zieh dich hoch, bis das Kinn darüber ist. Kehr bei jeder Wiederholung in den vollen Hang zurück: Das Hängen gehört zur Bewegung, es ist keine Pause.',
    `esDescription` = 'Cuélgate de una barra con los brazos totalmente estirados y los hombros relajados, y tira hasta que la barbilla la supere. Vuelve a colgar del todo en cada repetición: la suspensión forma parte del movimiento, no es un descanso.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pull-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Wandsitzen',
    `esName` = 'Sentadilla en pared',
    `deDescription` = 'Rutsch mit dem Rücken an einer Wand hinunter, bis deine Oberschenkel parallel zum Boden sind, und halte die Position.',
    `esDescription` = 'Desliza la espalda por una pared hasta que los muslos queden paralelos al suelo y mantén la posición.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Unterarmstütz',
    `esName` = 'Plancha',
    `deDescription` = 'Halte die Liegestützposition mit dem Körper in einer geraden Linie.',
    `esDescription` = 'Mantén la posición de flexión con el cuerpo en línea recta.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Crunch',
    `esName` = 'Crunch',
    `deDescription` = 'Leg dich auf den Rücken und roll die Schultern Richtung Becken ein.',
    `esDescription` = 'Túmbate boca arriba y lleva los hombros hacia la pelvis.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Ausfallschritt',
    `esName` = 'Zancada',
    `deDescription` = 'Mach einen Schritt nach vorn und senk dich ab, bis das hintere Knie den Boden streift und beide Knie etwa 90 Grad haben, das vordere Knie über dem Knöchel. Geh ganz in die Tiefe: Ein kurzer Schritt trainiert nur einen kurzen Weg.',
    `esDescription` = 'Da un paso adelante y baja hasta que la rodilla de atrás roce el suelo y ambas rodillas estén cerca de 90 grados, con la rodilla delantera sobre el tobillo. Baja del todo: un paso corto entrena un recorrido corto.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Lunge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Burpee',
    `esName` = 'Burpee',
    `deDescription` = 'Aus dem Stand in die Hocke, die Beine nach hinten in die Liegestützposition schieben, wieder unter den Körper holen und mit einem Sprung abschließen, die Arme über dem Kopf.',
    `esDescription` = 'Desde de pie, baja a sentadilla, lanza las piernas atrás hasta la posición de flexión, recógelas bajo el cuerpo y termina con un salto, brazos arriba.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Burpee' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Bergsteiger',
    `esName` = 'Escaladores',
    `deDescription` = 'Halte die Liegestützposition mit den Händen unter den Schultern und zieh abwechselnd und zügig ein Knie Richtung Brust, ohne die Hüfte anzuheben.',
    `esDescription` = 'Mantén la posición de flexión con las manos bajo los hombros y lleva una rodilla cada vez hacia el pecho, alternando rápido sin subir la cadera.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Mountain Climber' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Dips',
    `esName` = 'Fondos',
    `deDescription` = 'Stütz dich auf zwei Barren oder eine stabile Kante, senk dich ab, bis die Schultern auf Ellbogenhöhe sind, und drück dich wieder bis zu durchgestreckten Armen hoch. Hör vor dem Schmerz in der Schulter auf, nie vor dem Durchstrecken.',
    `esDescription` = 'Apóyate en dos barras paralelas o en un borde firme, baja hasta que los hombros lleguen a la altura de los codos y vuelve a subir hasta bloquear los brazos. Para antes del dolor en el hombro, nunca antes del bloqueo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dip' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Pike-Liegestütz',
    `esName` = 'Flexión en pica',
    `deDescription` = 'Aus der Liegestützposition die Füße heranlaufen und die Hüfte zu einem umgekehrten V heben, dann die Ellbogen beugen, den Scheitel Richtung Boden senken und wieder hochdrücken.',
    `esDescription` = 'Desde la posición de flexión, acerca los pies y sube la cadera en V invertida, y luego dobla los codos para bajar la coronilla hacia el suelo y vuelve a empujar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pike Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Hampelmann',
    `esName` = 'Saltos de tijera',
    `deDescription` = 'Spring mit weit geöffneten Beinen und hebe dabei die Arme über den Kopf, dann spring zurück in den geschlossenen Stand mit den Armen an der Seite, in gleichmäßigem Rhythmus.',
    `esDescription` = 'Salta abriendo los pies mientras subes los brazos por encima de la cabeza, luego vuelve a juntar los pies con los brazos a los lados, con un ritmo constante.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jumping Jack' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Kniehebelauf',
    `esName` = 'Rodillas arriba',
    `deDescription` = 'Lauf auf der Stelle und zieh jedes Knie bis auf Hüfthöhe, lande auf den Fußballen und halte den Oberkörper aufrecht.',
    `esDescription` = 'Corre en el sitio subiendo cada rodilla a la altura de la cadera, apoyando la parte delantera del pie y con el tronco erguido.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'High Knees' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Fahrrad-Crunch',
    `esName` = 'Crunch de bicicleta',
    `deDescription` = 'Leg dich auf den Rücken, Hände neben dem Kopf, und führ einen Ellbogen zum gegenüberliegenden Knie, während das andere Bein sich streckt. Wechsle ab, ohne am Nacken zu ziehen.',
    `esDescription` = 'Túmbate boca arriba, manos junto a la cabeza, y lleva un codo hacia la rodilla contraria mientras estiras la otra pierna, alternando sin tirar del cuello.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bicycle Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Diamant-Liegestütz',
    `esName` = 'Flexión diamante',
    `deDescription` = 'Mach einen Liegestütz mit eng zusammengesetzten Händen unter der Brust, Daumen und Zeigefinger bilden eine Raute, die Ellbogen streifen die Rippen.',
    `esDescription` = 'Haz una flexión con las manos juntas bajo el pecho, pulgares e índices formando un rombo y los codos rozando las costillas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Diamond Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Einbeiniges Kreuzheben',
    `esName` = 'Peso muerto a una pierna',
    `deDescription` = 'Auf einem Bein stehend, klapp in der Hüfte nach vorn und greif Richtung Boden, während das freie Bein nach hinten gestreckt wird, dann komm mit geradem Rücken wieder hoch.',
    `esDescription` = 'Sobre una pierna, flexiona la cadera y lleva las manos hacia el suelo mientras la pierna libre se estira hacia atrás, y luego vuelve arriba con la espalda recta.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Deadlift' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Kobra',
    `esName` = 'Postura de la cobra',
    `deDescription` = 'Leg dich auf den Bauch, Hände unter den Schultern, und drück die Brust nach oben, streck die Wirbelsäule, die Hüfte bleibt am Boden, und atme weiter.',
    `esDescription` = 'Túmbate boca abajo con las manos bajo los hombros y empuja el pecho hacia arriba, estirando la columna mientras la cadera se queda en el suelo, y sigue respirando.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cobra Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Kriegerhaltung',
    `esName` = 'Postura del guerrero',
    `deDescription` = 'Stell dich breit hin, dreh den vorderen Fuß nach außen und beug dieses Knie über den Knöchel, Arme auf Schulterhöhe gestreckt, und halte.',
    `esDescription` = 'Abre bien las piernas, gira el pie delantero hacia fuera y dobla esa rodilla sobre el tobillo, con los brazos extendidos a la altura de los hombros, y mantén.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warrior Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Eisschnellläufer',
    `esName` = 'Salto del patinador',
    `deDescription` = 'Spring seitlich von einem Fuß auf den anderen, lande weich mit leicht gebeugtem Knie und kreuz das freie Bein hinter dir.',
    `esDescription` = 'Salta de lado de un pie al otro, aterrizando suave con la rodilla algo flexionada y la pierna libre cruzando por detrás.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Skater Hop' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Hohlkörperhalte',
    `esName` = 'Hollow body',
    `deDescription` = 'Leg dich auf den Rücken, drück den unteren Rücken in den Boden und heb Schultern und Beine ein paar Zentimeter an, Arme über dem Kopf, und halte diese Bananenform.',
    `esDescription` = 'Túmbate boca arriba, pega la zona lumbar al suelo y levanta hombros y piernas unos centímetros, brazos por encima de la cabeza, sosteniendo esa forma de plátano.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hollow Body Hold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Chin-up',
    `esName` = 'Dominada supina',
    `deDescription` = 'Häng dich mit zu dir zeigenden Handflächen an eine Stange und zieh die Brust hoch, bis das Kinn über der Stange ist, dann senk dich kontrolliert ab.',
    `esDescription` = 'Cuélgate de una barra con las palmas hacia ti y sube el pecho hasta que la barbilla supere la barra, y luego baja con control.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Chin-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Superman',
    `esName` = 'Superman',
    `deDescription` = 'Leg dich mit gestreckten Armen und Beinen auf den Bauch, heb Brust, Arme und Beine gleichzeitig vom Boden und halte kurz, bevor du sie senkst.',
    `esDescription` = 'Túmbate boca abajo con brazos y piernas estirados, levanta a la vez el pecho, los brazos y las piernas del suelo y mantén antes de bajar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Superman' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Bärengang',
    `esName` = 'Paso del oso',
    `deDescription` = 'Beweg dich auf Händen und Füßen vorwärts, Hüfte tief und Rumpf angespannt, und setz jeweils die gegenüberliegende Hand und den Fuß gleichzeitig vor.',
    `esDescription` = 'Avanza a cuatro patas con la cadera baja y el core firme, moviendo a la vez la mano y el pie contrarios.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bear Crawl' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Russian Twist',
    `esName` = 'Giro ruso',
    `deDescription` = 'Setz dich mit gebeugten Knien und angehobenen Füßen hin, lehn dich leicht zurück und dreh den Oberkörper von Seite zu Seite, tipp dabei jedes Mal auf den Boden.',
    `esDescription` = 'Siéntate con las rodillas flexionadas y los pies en el aire, inclínate un poco hacia atrás y gira el tronco de lado a lado tocando el suelo cada vez.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Russian Twist' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Seitstütz',
    `esName` = 'Plancha lateral',
    `deDescription` = 'Leg dich auf die Seite, stütz dich auf einen Unterarm und heb die Hüfte, bis dein Körper eine gerade Linie bildet, dann halte.',
    `esDescription` = 'Túmbate de lado apoyándote en un antebrazo y sube la cadera hasta que el cuerpo forme una línea recta, y luego mantén.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Side Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Glute Bridge',
    `esName` = 'Puente de glúteos',
    `deDescription` = 'Leg dich mit gebeugten Knien auf den Rücken und spann den Po an, um die Hüfte in eine gerade Linie von den Knien bis zu den Schultern zu heben.',
    `esDescription` = 'Túmbate boca arriba con las rodillas flexionadas y aprieta los glúteos para subir la cadera en línea recta de las rodillas a los hombros.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Wadenheben im Stand',
    `esName` = 'Elevación de talones de pie',
    `deDescription` = 'Stell dich aufrecht hin und steig langsam auf die Fußballen, halte oben kurz inne und senk dann die Fersen wieder ab.',
    `esDescription` = 'Ponte recto y sube despacio sobre la punta de los pies, haz una pausa arriba y vuelve a bajar los talones.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Calf Raise' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Handstand-Liegestütz',
    `esName` = 'Flexión en pino',
    `deDescription` = 'Schwing dich an einer Wand in den Handstand, beug die Ellbogen, um den Kopf Richtung Boden zu senken, und drück dich wieder hoch.',
    `esDescription` = 'Sube al pino contra una pared, dobla los codos para bajar la cabeza hacia el suelo y vuelve a empujar hacia arriba.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Handstand Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Wand-Liegestütz',
    `esName` = 'Flexión en pared',
    `deDescription` = 'Stell dich eine Armlänge vor eine Wand, Hände auf Schulterhöhe, und beug die Ellbogen, um die Brust zur Wand zu bringen, bevor du dich zurückdrückst.',
    `esDescription` = 'Ponte a un brazo de distancia de una pared, con las manos a la altura de los hombros, y dobla los codos para acercar el pecho a la pared antes de empujar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Flutter Kicks',
    `esName` = 'Patadas de tijera',
    `deDescription` = 'Leg dich auf den Rücken, die Beine ein paar Zentimeter über dem Boden gestreckt, und mach abwechselnd kleine Auf-und-ab-Schläge.',
    `esDescription` = 'Túmbate boca arriba con las piernas estiradas a unos centímetros del suelo y alterna pequeñas patadas arriba y abajo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Flutter Kicks' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Umgekehrtes Rudern',
    `esName` = 'Remo invertido',
    `deDescription` = 'Häng dich mit gestreckten Beinen unter eine niedrige Stange, der Körper in einer Linie von den Fersen bis zu den Schultern, zieh die Brust zur Stange, indem du die Schulterblätter zusammenziehst, dann senk dich kontrolliert ab. Je tiefer die Stange, desto schwerer.',
    `esDescription` = 'Cuélgate bajo una barra baja con las piernas estiradas y el cuerpo en línea de los talones a los hombros, sube el pecho hasta la barra juntando las escápulas y baja con control. Cuanto más baja la barra, más difícil.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Inverted Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Dead Bug',
    `esName` = 'Dead bug',
    `deDescription` = 'Leg dich auf den Rücken, Arme nach oben und Knie im 90-Grad-Winkel, dann senk einen Arm und das gegenüberliegende Bein Richtung Boden, bevor du zurückkommst und die Seite wechselst.',
    `esDescription` = 'Túmbate boca arriba con los brazos hacia el techo y las rodillas a 90 grados. Baja un brazo y la pierna contraria hacia el suelo antes de volver y cambiar de lado.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Bug' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Beinheben im Hang',
    `esName` = 'Elevación de piernas colgado',
    `deDescription` = 'Häng dich mit gestreckten Armen an eine Stange und heb die gestreckten Beine vor dir, bis sie parallel zum Boden sind, dann senk sie kontrolliert ab.',
    `esDescription` = 'Cuélgate de una barra con los brazos estirados y sube las piernas rectas por delante hasta que queden paralelas al suelo, y luego bájalas con control.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hanging Leg Raise' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Sprungkniebeuge',
    `esName` = 'Sentadilla con salto',
    `deDescription` = 'Geh in die Hocke, dann spring explosiv nach oben und lande weich in der nächsten Kniebeuge.',
    `esDescription` = 'Baja a sentadilla, luego salta de forma explosiva y aterriza suave en la siguiente sentadilla.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jump Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Reverse Crunch',
    `esName` = 'Crunch invertido',
    `deDescription` = 'Leg dich mit gebeugten Knien auf den Rücken und roll die Hüfte vom Boden ab, um die Knie zur Brust zu bringen.',
    `esDescription` = 'Túmbate boca arriba con las rodillas flexionadas y enrolla la cadera despegándola del suelo para llevar las rodillas al pecho.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Reverse Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Curtsy-Kniebeuge',
    `esName` = 'Sentadilla de reverencia',
    `deDescription` = 'Setz ein Bein diagonal hinter das andere wie bei einem Knicks, beug beide Knie und drück dich über den vorderen Fuß wieder hoch.',
    `esDescription` = 'Cruza una pierna en diagonal por detrás de la otra como en una reverencia, dobla ambas rodillas y empuja con el pie delantero para volver a subir.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Curtsy Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Schulterblatt-Klimmzug',
    `esName` = 'Dominada escapular',
    `deDescription` = 'Häng dich mit gestreckten Armen an eine Stange und zieh, ohne die Ellbogen zu beugen, die Schulterblätter nach unten und zusammen, um den Körper leicht anzuheben.',
    `esDescription` = 'Cuélgate de una barra con los brazos estirados y, sin doblar los codos, lleva las escápulas hacia abajo y hacia dentro para subir un poco el cuerpo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Scapular Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'L-Sitz',
    `esName` = 'L-sit',
    `deDescription` = 'Setz dich mit gestreckten Beinen hin, drück die Hände neben der Hüfte in den Boden und heb die Beine zu einem L an, dann halte.',
    `esDescription` = 'Siéntate con las piernas estiradas, apoya las manos junto a la cadera y empuja para levantar las piernas en forma de L, y luego mantén.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Sternsprung',
    `esName` = 'Salto en estrella',
    `deDescription` = 'Spring explosiv hoch und spreiz dabei Arme und Beine zu einem Stern, dann lande weich und wiederhole.',
    `esDescription` = 'Salta de forma explosiva abriendo brazos y piernas en forma de estrella. Aterriza suave y repite.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Star Jump' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Scheibenwischer',
    `esName` = 'Limpiaparabrisas',
    `deDescription` = 'Leg dich auf den Rücken, Arme zur Seite, Beine zusammen angehoben, und dreh die Beine mit Kraft aus dem Rumpf wie Scheibenwischer von Seite zu Seite.',
    `esDescription` = 'Túmbate boca arriba con los brazos abiertos y las piernas juntas en el aire, y gíralas de lado a lado como un limpiaparabrisas usando el core.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Windshield Wipers' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Tischrudern',
    `esName` = 'Remo bajo la mesa',
    `deDescription` = 'Leg dich unter einen stabilen Tisch, greif die Kante mit beiden Händen, beug die Knie und stell die Füße flach auf, dann zieh die Brust zum Tisch und senk dich kontrolliert ab. Je weiter die Füße vorn stehen, desto schwerer.',
    `esDescription` = 'Túmbate bajo una mesa firme, agarra el borde con las dos manos, dobla las rodillas y apoya los pies planos. Sube el pecho hacia la mesa y baja con control. Cuanto más lejos los pies, más difícil.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Table Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Handtuch-Rudern an der Tür',
    `esName` = 'Remo con toalla en la puerta',
    `deDescription` = 'Leg ein Handtuch um eine Türklinke, greif beide Enden und lehn dich mit gestreckten Armen zurück, dann zieh dich hoch, indem du die Ellbogen an den Rippen vorbei nach hinten führst. Stell die Füße näher an die Tür, um es leichter zu machen.',
    `esDescription` = 'Pasa una toalla por el pomo de una puerta, agarra los dos extremos y échate atrás con los brazos estirados, y luego tira para incorporarte llevando los codos hacia atrás junto a las costillas. Acerca los pies a la puerta para hacerlo más fácil.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Towel Door Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Handgelenkkreisen',
    `esName` = 'Círculos de muñeca',
    `deDescription` = 'Im Vierfüßlerstand kreist du die Handgelenke langsam durch ihren ganzen Bewegungsumfang, dann wiegst du dich sanft über den flachen Handflächen vor und zurück. Jeder Grad bleibt schmerzfrei: Das ist Vorbereitung, hier wird nichts erzwungen.',
    `esDescription` = 'A cuatro patas, gira despacio las muñecas en todo su recorrido y luego balancéate con suavidad adelante y atrás sobre las palmas planas. Cada grado sin dolor: esto es preparación, y aquí no se fuerza nada.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wrist Circles' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Katze-Kuh',
    `esName` = 'Gato-vaca',
    `deDescription` = 'Im Vierfüßlerstand wechselst du zwischen einem runden Rücken zur Decke und einem absinkenden Rücken mit geöffneter Brust. Beweg einen Wirbel nach dem anderen und lass den Atem das Tempo bestimmen.',
    `esDescription` = 'A cuatro patas, alterna entre redondear la espalda hacia el techo y dejarla hundirse mientras se abre el pecho. Mueve vértebra a vértebra y deja que la respiración marque el ritmo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cat-Cow' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Nadelöhr',
    `esName` = 'Enhebrar la aguja',
    `deDescription` = 'Aus dem Vierfüßlerstand schiebst du einen Arm unter dem anderen durch und legst die Schulter auf dem Boden ab, mit einer Drehung im oberen Rücken. Halte die Hüfte über den Knien, damit die Drehung aus den Rippen kommt, nicht aus dem Becken.',
    `esDescription` = 'Desde cuatro patas, pasa un brazo por debajo del otro y apoya el hombro en el suelo, girando la parte alta de la espalda. Mantén la cadera sobre las rodillas para que el giro salga de las costillas, no de la pelvis.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Thread the Needle' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Vorbeuge im Stand',
    `esName` = 'Flexión hacia delante de pie',
    `deDescription` = 'Klapp aus der Hüfte nach vorn und lass den Oberkörper hängen, die Knie locker gebeugt. Lass die Schwerkraft an der Rückseite der Beine arbeiten, und wipp niemals.',
    `esDescription` = 'Flexiona desde la cadera y deja colgar el tronco, con las rodillas un poco dobladas. Deja que la gravedad trabaje la parte de atrás de las piernas, y nunca rebotes.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Forward Fold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Herabschauender Hund',
    `esName` = 'Perro boca abajo',
    `deDescription` = 'Aus dem Stütz auf Händen und Füßen schiebst du die Hüfte hoch und die Fersen nach unten, Arme gestreckt, Ohren zwischen den Oberarmen. Tritt abwechselnd mit den Füßen, um Waden und hintere Oberschenkel zu erreichen.',
    `esDescription` = 'Apoyando manos y pies, sube la cadera y lleva los talones hacia el suelo, brazos estirados y orejas entre los bíceps. Pedalea con los pies para llegar a gemelos e isquiotibiales por turnos.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Downward Dog' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Taube',
    `esName` = 'Postura de la paloma',
    `deDescription` = 'Bring ein Schienbein quer auf der Matte nach vorn und streck das andere Bein nach hinten, dann beug dich über das vordere Bein. Die Hüfte öffnet sich, während der Atem ruhiger wird. Lass nach, sobald das Knie sich meldet.',
    `esDescription` = 'Lleva una espinilla hacia delante cruzada sobre la esterilla y estira la otra pierna atrás, y luego inclínate sobre la pierna delantera. La cadera se abre a medida que la respiración se calma. Afloja en cuanto la rodilla proteste.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pigeon Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Die beste Dehnung der Welt',
    `esName` = 'El mejor estiramiento del mundo',
    `deDescription` = 'Geh in einen tiefen Ausfallschritt, setz die gegenüberliegende Hand auf, führ den inneren Ellbogen Richtung Boden und dreh den anderen Arm zur Decke. Hüftbeuger, Adduktor und oberer Rücken in einer Bewegung.',
    `esDescription` = 'Da una zancada profunda, apoya la mano contraria, lleva el codo interior hacia el suelo y gira el otro brazo hacia el techo. Flexor de cadera, aductor y parte alta de la espalda en un solo movimiento.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'World''s Greatest Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Knie-Liegestütz',
    `esName` = 'Flexión de rodillas',
    `deDescription` = 'Geh in die Liegestützposition mit den Knien am Boden und dem Körper gerade vom Kopf bis zum Knie, dann senk die Brust bis eine Faust über dem Boden und drück dich wieder hoch.',
    `esDescription` = 'Colócate en posición de flexión con las rodillas en el suelo y el cuerpo recto de la cabeza a las rodillas. Baja el pecho hasta un puño del suelo y vuelve a subir.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Knee Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Handstand an der Wand',
    `esName` = 'Pino en la pared',
    `deDescription` = 'Lauf mit den Füßen eine Wand hoch oder schwing dich mit dem Gesicht zur Wand in den Handstand, Arme durchgestreckt und Rippen geschlossen, und halte bei normaler Atmung.',
    `esDescription` = 'Sube los pies por una pared o haz el pino de cara a ella, con los brazos bloqueados y las costillas cerradas, y mantén respirando con normalidad.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Handstand' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Toter Hang',
    `esName` = 'Suspensión pasiva',
    `deDescription` = 'Häng dich mit gestreckten Armen und vollem Griff an eine Stange, die Schultern locker weg von den Ohren, und bleib einfach hängen: So baust du den Griff auf, der jeden Zug begrenzt.',
    `esDescription` = 'Cuélgate de una barra con los brazos estirados y el agarre completo, hombros relajados lejos de las orejas, y quédate ahí: así se construye el agarre que limita cada tirón.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Hang' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Negativer Klimmzug',
    `esName` = 'Dominada negativa',
    `deDescription` = 'Spring oder steig in die obere Position eines Klimmzugs, Kinn über der Stange, dann lass dich so langsam wie möglich ab, peil fünf Sekunden an, und steig für die nächste Wiederholung wieder hoch.',
    `esDescription` = 'Salta o súbete a lo alto de una dominada, con la barbilla sobre la barra. Baja lo más despacio que puedas, apunta a cinco segundos, y vuelve a subir para la siguiente repetición.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Negative Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Gehockter L-Sitz',
    `esName` = 'L-sit agrupado',
    `deDescription` = 'Setz dich hin, die Hände flach neben der Hüfte, drück nach unten, um das Gesäß vom Boden zu heben, und zieh beide Knie zur Brust, gehalten mit durchgestreckten Ellbogen.',
    `esDescription` = 'Siéntate con las manos planas junto a la cadera, empuja para despegar el trasero del suelo y lleva las dos rodillas al pecho, con los codos bloqueados.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Einbeinige Glute Bridge',
    `esName` = 'Puente de glúteos a una pierna',
    `deDescription` = 'Leg dich auf den Rücken, ein Fuß aufgestellt und das andere Bein gestreckt, dann drück dich über die aufgestellte Ferse hoch, ohne die Hüfte zur Seite kippen zu lassen.',
    `esDescription` = 'Túmbate boca arriba con un pie apoyado y la otra pierna estirada. Empuja con el talón apoyado para subir la cadera sin dejar que se incline hacia un lado.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Bulgarische Kniebeuge',
    `esName` = 'Sentadilla búlgara',
    `deDescription` = 'Leg den Rist des hinteren Fußes auf einen Stuhl hinter dir, senk dich senkrecht ab, bis der vordere Oberschenkel parallel ist, und drück dich mit aufrechtem Oberkörper wieder hoch.',
    `esDescription` = 'Apoya el empeine del pie trasero en una silla detrás de ti, baja en vertical hasta que el muslo delantero quede paralelo y vuelve a subir con el tronco erguido.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bulgarian Split Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Muscle-up',
    `esName` = 'Muscle-up',
    `deDescription` = 'Zieh dich explosiv hoch, bis die Brust über der Stange ist, roll die Schultern darüber und drück dich bis zu gestreckten Armen hoch, in einer fließenden Bewegung vom Hang in den Stütz.',
    `esDescription` = 'Tira de forma explosiva hasta que el pecho supere la barra, pasa los hombros por encima y empuja hasta estirar los brazos arriba, en un solo movimiento continuo de la suspensión al apoyo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Muscle-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Toes to Bar',
    `esName` = 'Pies a la barra',
    `deDescription` = 'Häng dich an eine Stange und heb beide Beine gestreckt nach oben, bis die Zehen die Stange zwischen deinen Händen berühren, dann senk sie kontrolliert ab, ohne zu schwingen.',
    `esDescription` = 'Cuélgate de una barra y sube las dos piernas rectas hasta que las puntas toquen la barra entre tus manos, y luego bájalas con control sin balancearte.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Toes to Bar' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Bogenschützen-Liegestütz',
    `esName` = 'Flexión del arquero',
    `deDescription` = 'Setz die Hände weiter als beim Liegestütz auf und senk dich zu einer Hand ab, während der andere Arm gestreckt bleibt, dann drück dich hoch und wechsle die Seite: Die meiste Last liegt auf dem beugenden Arm.',
    `esDescription` = 'Coloca las manos más abiertas que en una flexión y baja hacia una mano mientras el brazo contrario se queda recto. Sube y cambia de lado: la mayor parte de la carga va al brazo que se dobla.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Archer Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Pistol Squat',
    `esName` = 'Sentadilla pistol',
    `deDescription` = 'Auf einem Bein, das andere nach vorn gestreckt, senk dich bis ganz unten in die Kniebeuge und steh wieder auf, ohne dass die freie Ferse je den Boden berührt.',
    `esDescription` = 'Sobre una pierna, con la otra estirada al frente, baja hasta el fondo de una sentadilla y vuelve a subir sin que el talón libre toque nunca el suelo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pistol Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Dragon Flag',
    `esName` = 'Dragon flag',
    `deDescription` = 'Auf einer Bank oder dem Boden liegend greifst du hinter dem Kopf etwas Festes und hebst den ganzen Körper in einer starren Linie auf die Schultern, dann senkst du ihn langsam ab, ohne in der Hüfte einzuknicken.',
    `esDescription` = 'Túmbate en un banco o en el suelo, agarra algo firme detrás de la cabeza y eleva todo el cuerpo sobre los hombros en una línea rígida, y luego bájalo despacio sin dejar que la cadera se doble.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dragon Flag' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Gehockte Planche',
    `esName` = 'Plancha agrupada',
    `deDescription` = 'Mit den Händen flach am Boden lehnst du die Schultern weit vor die Handgelenke, Ellbogen durchgestreckt, und ziehst beide Knie zur Brust, bis die Füße ganz vom Boden abheben.',
    `esDescription` = 'Con las manos planas en el suelo, adelanta bien los hombros respecto a las muñecas con los codos bloqueados y lleva las dos rodillas al pecho hasta que los pies se despeguen por completo del suelo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck Planche' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Rundgang des Wächters',
    `esName` = 'Paseo del Vigía',
    `deDescription` = 'Geh in einem Tempo, bei dem du dich noch unterhalten könntest, und bleib dabei. Was zählt, ist die Strecke und die Zeit auf den Beinen.',
    `esDescription` = 'Camina a un ritmo en el que podrías mantener una conversación, y quédate en él. Lo que cuenta es la distancia recorrida y el tiempo de pie.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warden''s Walk' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Lauf des Boten',
    `esName` = 'Carrera del Mensajero',
    `deDescription` = 'Lauf in einem Tempo, das du bis zum Ende halten kannst. Geh, wenn du musst, und lauf dann wieder los. Was zählt, ist anzukommen.',
    `esDescription` = 'Corre a un ritmo que puedas mantener hasta el final. Camina cuando lo necesites y vuelve a correr. Lo que cuenta es llegar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Messenger''s Run' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `deName` = 'Ritt des Kundschafters',
    `esName` = 'Cabalgada del Explorador',
    `deDescription` = 'Fahr gleichmäßig statt in Schüben. Ein Reittier schafft in derselben Stunde viermal so viel Strecke wie ein Wanderer, und genau deshalb nimmt man eines.',
    `esDescription` = 'Pedalea con regularidad en lugar de a golpes. Una montura cubre en la misma hora cuatro veces la distancia de un caminante, y por eso se usa una.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Outrider''s Ride' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Holz hacken',
    `esTitle` = 'Cortar leña',
    `deDescription` = 'Schnapp dir deine Axt (eine vorgestellte zählt auch). Dein Dorf braucht Wärme, also hacken wir Holz, wie es sich für Helden gehört.',
    `esDescription` = 'Agarra tu hacha (una imaginaria también vale). Tu aldea necesita calor, así que vamos a cortar leña a lo héroe.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Chop Wood' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Turmbesteigung',
    `esTitle` = 'Subida a la torre',
    `deDescription` = 'Erklimm den alten Turm. Jedes Stockwerk prüft deine Entschlossenheit.',
    `esDescription` = 'Sube la antigua torre. Cada piso pone a prueba tu determinación.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Tower Climb' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Der Stoß des Ritters',
    `esTitle` = 'Empuje del caballero',
    `deDescription` = 'Ein Ritter hält den ganzen Tag einen Schild mit ausgestreckten Armen, und am Ende lernen es die Arme.',
    `esDescription` = 'Un caballero sostiene el escudo con el brazo estirado todo el día, y al final los brazos aprenden.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Knight Push' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Schildwall',
    `esTitle` = 'Muro de escudos',
    `deDescription` = 'Halte die Linie. Dein Rumpf ist dein Schild.',
    `esDescription` = 'Mantén la línea. Tu core es tu escudo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Shield Wall' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Steine sammeln',
    `esTitle` = 'Reunir piedras',
    `deDescription` = 'Das Fundament braucht Steine. Heb an und trag.',
    `esDescription` = 'Los cimientos necesitan piedras. Levanta y carga.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Gather Stones' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Den Unterschlupf errichten',
    `esTitle` = 'Levantar el refugio',
    `deDescription` = 'Bau den Unterschlupf. Drück und halte.',
    `esDescription` = 'Construye el refugio. Empuja y aguanta.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Raise the Shelter' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Rumpfschmiede',
    `esTitle` = 'Forja del core',
    `deDescription` = 'Schmiede deinen Rumpf wie Stahl. Stütze, Crunches und Halteübungen.',
    `esDescription` = 'Forja tu core como el acero. Planchas, crunches y posturas mantenidas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Core Forge' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Schlag gegen den Golem',
    `esTitle` = 'Golpe al gólem',
    `deDescription` = 'Schlag mit aller Kraft auf den Steingolem ein.',
    `esDescription` = 'Golpea al gólem de piedra con todas tus fuerzas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Golem Strike' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Herz des Golems',
    `esTitle` = 'Corazón del gólem',
    `deDescription` = 'Ziel auf das Herz des Golems. Halte und schlag zu.',
    `esDescription` = 'Apunta al corazón del gólem. Aguanta y golpea.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Golem Core' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Drachenklinge schmieden',
    `esTitle` = 'Forjar la hoja del dragón',
    `deDescription` = 'Das Eisen ist aus dem Feuer und bleibt nicht lange heiß. Schlag zu, solange es nachgibt, mit Brust und Armen hinter dem Hammer.',
    `esDescription` = 'El hierro ha salido del fuego y no seguirá caliente mucho tiempo. Golpea mientras cede, con el pecho y los brazos detrás del martillo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Forge the Dragon Blade' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Den Turm des Titanen erklimmen',
    `esTitle` = 'Escalar la torre del Titán',
    `deDescription` = 'Jedes Stockwerk wird mit der Kraft der Arme erobert, und von der Hälfte dieses Turms ist noch nie jemand wieder heruntergekommen.',
    `esDescription` = 'Cada piso se gana a fuerza de brazos, y nadie ha vuelto a bajar nunca desde la mitad de esta torre.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Climb the Titan''s Tower' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Festung bauen',
    `esTitle` = 'Construir el bastión',
    `deDescription` = 'Stein für Stein wächst die Mauer. Was schief gebaut ist, stürzt am Ende ein, und der Körper, der es gebaut hat, auch.',
    `esDescription` = 'Piedra a piedra, el muro sube. Lo que se construye torcido acaba cayendo, y el cuerpo que lo construyó también.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Build the Stronghold' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Prüfung des eisernen Panzerhandschuhs',
    `esTitle` = 'El desafío del guantelete de hierro',
    `deDescription` = 'Nur wenige kommen durch diese Tür zurück, und wer es schafft, ist bis zum Ende auf den Beinen geblieben.',
    `esDescription` = 'Pocos vuelven a cruzar esta puerta, y los que lo hacen aguantaron de pie hasta el final.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Gauntlet Challenge' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Flucht aus der einstürzenden Mine',
    `esTitle` = 'Huida de la mina derrumbada',
    `deDescription` = 'Der Stollen grollt. Steine lösen sich. Du hast ein paar Minuten, bevor sich der Ausgang schließt, also halt nicht an.',
    `esDescription` = 'El túnel retumba. Se sueltan rocas. Tienes unos minutos antes de que se cierre la salida, así que no pares.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Escape the Collapsing Mine' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Das Festungstor bewachen',
    `esTitle` = 'Guardar la puerta de la fortaleza',
    `deDescription` = 'Der Feind stürmt an, und du bist allein am Tor. Halte, so lange es nötig ist. Hinter dir ist niemand, der übernimmt.',
    `esDescription` = 'El enemigo carga y solo quedas tú en la puerta. Aguanta lo que haga falta. Detrás de ti no hay nadie para relevarte.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Guard the Fortress Gate' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Der arkane Panzerhandschuh',
    `esTitle` = 'El guantelete arcano',
    `deDescription` = 'Der Magier zieht den Kreis, tritt zurück, und alles geschieht in der Mitte des Körpers, reglos, solange die Linie hält.',
    `esDescription` = 'El mago traza el círculo, se aparta, y todo ocurre en el centro del cuerpo, inmóvil, mientras la línea aguante.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Arcane Gauntlet' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Der Pfad des Druiden',
    `esTitle` = 'La senda del druida',
    `deDescription` = 'Der Weg führt unter den Bäumen entlang, und niemand rennt darauf. Dehnen, atmen, die Hüfte öffnen lassen, auch das heilt einen Krieger.',
    `esDescription` = 'El sendero pasa bajo los árboles y nadie corre por él. Estira, respira, deja que se abra la cadera: eso también repara a un guerrero.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Druid''s Path' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Sprint durch die Schattenlande',
    `esTitle` = 'Sprint por las tierras de sombra',
    `deDescription` = 'Die Dunkelheit jagt dich und wird nie müde, also lauf, und heb dir etwas für das Ende auf.',
    `esDescription` = 'La oscuridad te persigue y nunca se cansa, así que corre, y guarda algo para el final.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Sprint Through the Shadowlands' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Morgen des Champions',
    `esTitle` = 'Mañana del campeón',
    `deDescription` = 'Die Burg schläft noch. Weck Hüfte, Schultern und Rücken, in dieser Reihenfolge, und du startest gut in den Tag.',
    `esDescription` = 'La fortaleza aún duerme. Despierta la cadera, los hombros y la espalda, en ese orden, y empezarás el día con buen pie.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Morning of the Champion' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Das Erwachen des Knappen',
    `esTitle` = 'El despertar del escudero',
    `deDescription` = 'Du bist noch kein Held. Du bist, wer den Schild trägt, und heute reicht das.',
    `esDescription` = 'Todavía no eres un héroe. Eres quien lleva el escudo, y hoy eso basta.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Awakening' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Der Weg des Bären',
    `esTitle` = 'El camino del oso',
    `deDescription` = 'Die Burg liegt einen halben Tagesmarsch durch die Kiefern entfernt. Geh auf zwei Beinen oder auf vieren, aber komm an, bevor das Licht schwindet.',
    `esDescription` = 'La fortaleza está a media jornada de marcha entre los pinos. Ve a dos patas o a cuatro, pero llega antes de que se vaya la luz.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Bear''s Road' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Der Kellerschlepper',
    `esTitle` = 'El tirón de la bodega',
    `deDescription` = 'Die Kellerluke klemmt, und das Unwetter steht schon auf dem Grat. Zieh, oder schlaf im Regen.',
    `esDescription` = 'La trampilla de la bodega está atascada y la tormenta ya está en la cresta. Tira, o duerme bajo la lluvia.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Cellar Hauler' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Der Schwur des Pflügers',
    `esTitle` = 'El juramento del labrador',
    `deDescription` = 'Kein Dorf wird von der Klinge eines Kriegers allein satt. Beug den Rücken über das Feld und verdien dir deinen Platz darin.',
    `esDescription` = 'Ninguna aldea come solo de la espada de un guerrero. Dobla la espalda sobre el campo y gánate tu sitio en ella.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Ploughman''s Vow' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Der Aufstieg der Krähe',
    `esTitle` = 'El ascenso del cuervo',
    `deDescription` = 'Die Krähen nisten, wo keine Leiter hinreicht. Nimm die Mauer mit den Händen und häng dort, bis sie dich hinauflässt.',
    `esDescription` = 'Los cuervos anidan donde no llega ninguna escalera. Toma el muro con las manos y cuélgate hasta que te deje subir.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Crow''s Ascent' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Prüfung des Kolosses',
    `esTitle` = 'La prueba del coloso',
    `deDescription` = 'Der Koloss steht auf den Händen, und die Welt hängt unter ihm. Halte. Fall nicht.',
    `esDescription` = 'El coloso se sostiene sobre las manos y el mundo cuelga bajo él. Aguanta. No caigas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Colossus Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Klingensturm',
    `esTitle` = 'Tormenta de espadas',
    `deDescription` = 'Die Plünderer kommen in einer Linie aus Stahl über die Dünen. Stell dich ihnen in Bewegung, oder werd dort zertrampelt, wo du stehst.',
    `esDescription` = 'Los saqueadores cruzan las dunas en una línea de acero. Recíbelos en movimiento, o te pisotearán donde estés.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Storm of Blades' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Umschlingung der Schlange',
    `esTitle` = 'El abrazo de la serpiente',
    `deDescription` = 'Die Schlange beißt nicht zu. Sie umschlingt dich und wartet, bis deine Mitte nachgibt. Gib nicht nach.',
    `esDescription` = 'La serpiente no ataca. Te rodea y espera a que tu centro ceda. No cedas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Serpent''s Coil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Das Ritual der Morgendämmerung',
    `esTitle` = 'El ritual del alba',
    `deDescription` = 'Bevor die Burg erwacht, der alte Brauch: die Hüfte öffnen, die Wirbelsäule lösen, sich erinnern, dass der Körper dir gehört. Der Tag beginnt erst, wenn das getan ist.',
    `esDescription` = 'Antes de que despierte la fortaleza, el viejo rito: abrir la cadera, soltar la columna, recordar que el cuerpo es tuyo. El día no empieza hasta que esto está hecho.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Dawn Ritual' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Das Lösen am Herdfeuer',
    `esTitle` = 'El desanudo junto al hogar',
    `deDescription` = 'Der Marsch ist vorbei, das Feuer brennt. Löse, was die Straße verknotet hat, zuerst die Hüfte, sie trägt dich am weitesten.',
    `esDescription` = 'La marcha ha terminado, el fuego está encendido. Deshaz lo que el camino anudó, primero la cadera, que es la que más lejos te lleva.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Hearthside Unbinding' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Wache der Handstandkünstler',
    `esTitle` = 'La vigilia del equilibrista',
    `deDescription` = 'Jeder Handstandkünstler lernt es auf die harte Tour: Die Handgelenke geben lange vor den Schultern auf. Kümmere dich am Abend davor um sie, nicht am Morgen danach.',
    `esDescription` = 'Todo equilibrista lo aprende a las malas: las muñecas ceden mucho antes que los hombros. Cuídalas la noche antes, no la mañana después.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Handler''s Vigil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Der geduldige Aufstieg',
    `esTitle` = 'El ascenso paciente',
    `deDescription` = 'Niemand wird an einem Tag an die Spitze des Turms gezogen. Häng, dann halte, dann lass dich langsam ab: Die Stange verschenkt nichts, und was sie gibt, gibt sie für immer.',
    `esDescription` = 'Nadie llega a lo alto de la torre en un día. Cuélgate, aguanta y baja despacio: la barra no regala nada, y lo que da, lo sigue dando.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Patient Ascent' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Das Fundament des Maurers',
    `esTitle` = 'El cimiento del albañil',
    `deDescription` = 'Jede Mauer, die das Dorf je errichtet hat, steht auf einem Fundament, das jemand auf einem Knie gegraben hat. Ein Bein nach dem anderen, eine Seite nach der anderen, das ist die Arbeit, die keiner sieht und auf der alles ruht.',
    `esDescription` = 'Cada muro que la aldea ha levantado se apoya en un cimiento que alguien cavó con una rodilla en el suelo. Una pierna cada vez, un lado cada vez: este es el trabajo que nadie ve y sobre el que descansa todo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Mason''s Footing' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Prüfung des Gipfels',
    `esTitle` = 'La prueba de la cumbre',
    `deDescription` = 'Jede Route in der Burg endet an einer Stange irgendwo über deinem Kopf. Heute findest du heraus, welche du wirklich erklommen hast.',
    `esDescription` = 'Todas las rutas de la fortaleza terminan en una barra en algún punto por encima de tu cabeza. Hoy descubres cuáles has escalado de verdad.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Summit Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Wache der gestreckten Arme',
    `esTitle` = 'La vigilia de los brazos rectos',
    `deDescription` = 'Keine Stange, keine Wand, nichts zum Festhalten. Nur der Boden, durchgestreckte Ellbogen und so lange, wie du dich weigerst einzuknicken.',
    `esDescription` = 'Sin barra, sin pared, nada de lo que colgarse. Solo el suelo, los codos bloqueados y el tiempo que aguantes sin doblarte.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Straight-Arm Vigil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Runde des Wächters',
    `esTitle` = 'La ronda del vigía',
    `deDescription` = 'Die Mauern halten, weil jemand sie abgeht. Jede Nacht fällt die Runde einem weiteren Paar Stiefel zu, und so wird das Land gesehen.',
    `esDescription` = 'Las murallas aguantan porque alguien las recorre. Cada noche la ronda le toca a un par de botas más, y así se vigila el terreno.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Warden''s Round' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die Nachricht muss ankommen',
    `esTitle` = 'La noticia debe llegar',
    `deDescription` = 'Etwas muss vor Einbruch der Dunkelheit das nächste Dorf erreichen, und heute Nacht ist sonst niemand unterwegs.',
    `esDescription` = 'Algo tiene que llegar a la aldea vecina antes de que oscurezca, y esta noche no hay nadie más en el camino.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Word Must Travel' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `deTitle` = 'Die große Weite',
    `esTitle` = 'El largo alcance',
    `deDescription` = 'Die Karte hört dort auf, ein Gerücht zu sein, wo ein Kundschafter gewesen ist. Alles jenseits dieser Linie ist Hörensagen von Händlern.',
    `esDescription` = 'El mapa deja de ser un rumor allí donde ha estado un explorador. Todo lo que hay más allá de esa línea son habladurías de mercaderes.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Long Reach' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `deTitle` = 'Der Holzfällerweg',
    `esTitle` = 'La ruta del leñador',
    `deDescription` = 'Bau deinen ersten Unterschlupf. Hack Holz, sammle Steine, zieh die Wände hoch.',
    `esDescription` = 'Construye tu primer refugio. Corta leña, reúne piedras, levanta los muros.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `deTitle` = 'Der Golem',
    `esTitle` = 'El gólem',
    `deDescription` = 'Ein Steingolem hat sich auf der Straße niedergelassen, und es braucht Kraft und Ausdauer, um ihn zu zermürben.',
    `esDescription` = 'Un gólem de piedra se ha plantado en el camino, y hará falta fuerza y fondo para desgastarlo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Golem' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `deTitle` = 'Die Eroberung des Eisernen Fürsten',
    `esTitle` = 'La conquista del Señor de Hierro',
    `deDescription` = 'Jede Prüfung der Burg, eine nach der anderen, und am Ende der Eiserne Fürst. Niemand hat diesen Weg in einem Zug geschafft.',
    `esDescription` = 'Todas las pruebas de la fortaleza, una tras otra, con el Señor de Hierro al final. Nadie ha hecho ese camino de una vez.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `deTitle` = 'Der Pfad des Knappen',
    `esTitle` = 'La senda del escudero',
    `deDescription` = 'Jeder Held beginnt als der, der den Schild trägt. Fünf Etappen, um sich das Recht auf eine Klinge zu verdienen: keine Stange, keine Gewichte, keine Ausreden.',
    `esDescription` = 'Todo héroe empieza llevando el escudo. Cinco etapas para ganarse el derecho a empuñar una espada: sin barra, sin pesas, sin excusas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `deTitle` = 'Die Erleuchtung des Mönchs',
    `esTitle` = 'La iluminación del monje',
    `deDescription` = 'Der Mönch bewegt sich langsam und kommt trotzdem an, also atme, halte die Position und komm morgen wieder.',
    `esDescription` = 'El monje se mueve despacio y llega igual, así que respira, mantén la postura y vuelve mañana.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `deTitle` = 'Die Prüfung des Kundschafters',
    `esTitle` = 'La prueba del explorador',
    `deDescription` = 'Dem Königreich fehlen Kundschafter, die durchhalten. Lauf, geh, brich wieder auf, und komm so heim, dass du morgen wieder losziehen kannst.',
    `esDescription` = 'Al reino le faltan exploradores que aguanten la distancia. Corre, camina, vuelve a salir, y regresa en forma para salir de nuevo mañana.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `deTitle` = 'Die Reise des Waldläufers',
    `esTitle` = 'El viaje del montaraz',
    `deDescription` = 'Wegstunden zu bewältigen, Begegnungen unterwegs und Ausdauer als einziges Reittier, auf einer Straße, die nie kürzer wird.',
    `esDescription` = 'Leguas por recorrer, encuentros por el camino y la resistencia como única montura, en un camino que nunca se acorta.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `deTitle` = 'Der Schwur des Hüters',
    `esTitle` = 'El juramento del guardián',
    `deDescription` = 'Ein Tor fällt nicht, solange jemand dahintersteht. Rücken und Rumpfspannung halten diesen Schwur, eine Wache nach der anderen.',
    `esDescription` = 'Una puerta no cae mientras alguien la sostiene. La espalda y la tensión del core cumplen ese juramento, guardia tras guardia.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Waldrand ist nicht mehr weit, hack sauber und atme ruhig.',
    `esNarrative` = 'El linde del bosque ya está cerca, corta limpio y respira con calma.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Steine und Holz. Dein Rumpf ist der Karren: Halt ihn stabil.',
    `esNarrative` = 'Piedras y madera. Tu core es el carro: mantenlo estable.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Errichte den Unterschlupf. Jetzt eine letzte Anstrengung, später Komfort.',
    `esNarrative` = 'Levanta el refugio. Un último esfuerzo ahora, comodidad después.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Boden bebt unter etwas, das schwerer ist als du.',
    `esNarrative` = 'El suelo tiembla bajo algo más pesado que tú.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Jetzt. Schlag härter zu, als er dich schlägt.',
    `esNarrative` = 'Ahora. Golpea más fuerte de lo que te golpea.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'In die Halle des Eisernen Fürsten geht man nicht unbewaffnet. Erst schmieden.',
    `esNarrative` = 'No se entra sin armas en la sala del Señor de Hierro. Primero, forja.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Die Außenmauer hat keine Treppe. Die Krähen sind trotzdem hinaufgekommen.',
    `esNarrative` = 'La muralla exterior no tiene escalera. Los cuervos subieron de algún modo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Seine Wachen stehen auf den Händen, um dich zu verhöhnen. Antworte ihnen.',
    `esNarrative` = 'Sus guardias se ponen sobre las manos para burlarse de ti. Respóndeles.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Nimm die Burg, dann mach sie zu deiner. Du wirst einen Rückzugsort brauchen.',
    `esNarrative` = 'Toma la fortaleza y hazla tuya. Necesitarás un lugar al que replegarte.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Panzerhandschuh ist das, was von denen übrig ist, die nicht wieder herauskamen.',
    `esNarrative` = 'El guantelete es lo que queda de quienes no volvieron a salir.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Sein Thron steht ganz oben, und es gibt immer noch keine Treppe.',
    `esNarrative` = 'Su trono está en lo alto y sigue sin haber escalera.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Eiserne Fürst kämpft kopfüber. Du auch.',
    `esNarrative` = 'El Señor de Hierro lucha boca abajo. Tú también.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 6
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Keine Tricks mehr übrig. Halte länger durch als er.',
    `esNarrative` = 'No quedan trucos. Aguanta más que él.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 7
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Man hat dir einen Schild gegeben, den du kaum heben kannst. Fang dort an.',
    `esNarrative` = 'Te han dado un escudo que apenas puedes levantar. Empieza por ahí.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Die Kiefern verschlucken den Pfad. Geh auf zwei Beinen, oder auf vieren, wenn es sein muss.',
    `esNarrative` = 'Los pinos se tragan el sendero. Avanza a dos patas, o a cuatro si hace falta.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Etwas, das im Unterholz zusammengerollt liegt, lässt dich vorbei, wenn deine Mitte hält.',
    `esNarrative` = 'Algo enroscado en la maleza te dejará pasar si tu centro aguanta.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Das Dorf ernährt die, die seine Felder bestellen. Beug den Rücken und verdien dir dein Bett.',
    `esNarrative` = 'La aldea alimenta a quien trabaja sus campos. Dobla la espalda y gánate la cama.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Schild sitzt jetzt richtig am Arm. Vor der Klinge gilt es noch, eine Nachricht ins nächste Dorf zu bringen, fällig bis zum Einbruch der Nacht.',
    `esNarrative` = 'El escudo ya encaja en el brazo. Antes de la espada queda llevar un mensaje a la aldea vecina, que debe llegar antes del anochecer.',
    `deOutroNarrative` = 'Die Nachricht kam an, solange noch Licht zum Lesen war. Ein Knappe, der eine Botschaft so weit trägt, kann auch eine Klinge tragen.',
    `esOutroNarrative` = 'El mensaje llegó cuando aún había luz para leerlo. Un escudero capaz de llevar un mensaje tan lejos puede llevar una espada.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Weg zum Kloster ist mit Absicht lang und langsam. Atme mit ihm.',
    `esNarrative` = 'El camino al monasterio es largo y lento a propósito. Respira con él.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Hinter dem ersten Tor zählt nur, wie lange du stillhalten kannst.',
    `esNarrative` = 'Tras la primera puerta solo cuenta cuánto aguantas sin moverte.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Die Schlange drückt langsam zu und wartet, bis du einknickst.',
    `esNarrative` = 'La serpiente aprieta despacio y espera a que te dobles.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Geh den Berg wieder hinunter. Der Aufstieg zählt nur, wenn du noch atmen kannst.',
    `esNarrative` = 'Baja la montaña caminando. La subida solo cuenta si todavía puedes respirar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Die Kundschafter brechen im Morgengrauen auf. Weck jeden Muskel vor dem Horn.',
    `esNarrative` = 'Los exploradores salen al alba. Despierta cada músculo antes del cuerno.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Geist besteht aus Wind. Schüttel ihn ab.',
    `esNarrative` = 'El espectro está hecho de viento. Sacúdetelo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Die Dünen erwachen voller Stahl. Halt die Füße in Bewegung, oder du verlierst sie.',
    `esNarrative` = 'Las dunas se llenan de acero. Mantén los pies en movimiento o los perderás.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Stollen bricht hinter dir ein. Es gibt nur ein Tempo: schnell.',
    `esNarrative` = 'El túnel se derrumba detrás de ti. No hay más ritmo que rápido.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Letzter Lauf, der Geist löst sich schon auf, mach ihn fertig.',
    `esNarrative` = 'Última carrera, el espectro ya se deshace, remátalo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Sieben Tage unterwegs beginnen mit einem ehrlichen Morgen.',
    `esNarrative` = 'Siete días de camino empiezan con una mañana honrada.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Waldläufer verdienen sich ihr Brot auf den Feldern, bevor sie einen Bogen spannen.',
    `esNarrative` = 'Los montaraces se ganan el pan en el campo antes de tensar un arco.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Etwas ist dir aus dem Waldrand gefolgt. Lass es nicht das Tempo bestimmen.',
    `esNarrative` = 'Algo te ha seguido fuera del bosque. No dejes que marque el ritmo.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Halbzeit. Bau ein Lager, das noch steht, wenn du wieder vorbeikommst.',
    `esNarrative` = 'A mitad de camino. Monta un campamento que siga en pie cuando vuelvas a pasar.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Der Titan schüttelt das Blätterdach, und die Plünderer nehmen es als Zeichen.',
    `esNarrative` = 'El titán sacude las copas y los saqueadores lo toman como una señal.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Die Beine sind am Ende. Kriech durch den letzten Rest Kiefernwald, wenn nur das bleibt.',
    `esNarrative` = 'Las piernas ya no responden. Termina los pinos a rastras si es lo que queda.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Letzte Morgendämmerung, der Titan ist nur noch Rinde und Moos, und du gehst immer noch.',
    `esNarrative` = 'Último amanecer: el titán ya es corteza y musgo, y tú sigues caminando.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 6
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Du hast geschworen, dieses Tor zu halten, und so ein Schwur wird in Nächten gezählt.',
    `esNarrative` = 'Juraste defender esta puerta, y un juramento así se cuenta en noches.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Die Waffenkammer liegt unter dem Boden, und die Luke ist zugequollen. Zieh.',
    `esNarrative` = 'La armería está bajo el suelo y la trampilla se ha hinchado y no abre. Tira.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Stein antwortet auf Stein. Zieh die Mauer hoch, bevor der Golem sie prüft.',
    `esNarrative` = 'La piedra responde a la piedra. Levanta el muro antes de que el gólem lo ponga a prueba.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Eine Rüstung nützt nichts, wenn der Körper darin einknickt. Spann an.',
    `esNarrative` = 'La armadura no sirve si el cuerpo que va dentro se dobla. Tensa.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Nimm den Turm mit den Händen. Der Golem kann dir nicht hinauf folgen.',
    `esNarrative` = 'Toma la torre con las manos. El gólem no puede seguirte arriba.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `deNarrative` = 'Zurück zum Tor, eine letzte Wache. Stein bricht Stein.',
    `esNarrative` = 'De vuelta a la puerta, una última guardia. La piedra rompe la piedra.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
