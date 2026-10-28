-- The seeded content in Russian: the columns, then every Admin exercise, quest, adventure and step.
--
-- Russian shipped with its interface translated and its catalogue in English, because the tables had
-- no column for it (docs/architecture/adding-a-language.md, step 4). This does what 0058 and 0059
-- did for German and Spanish in one migration, so a release that carries it carries one migration:
-- eight columns on four tables, `text DEFAULT '' NOT NULL` like the ones beside them, then their
-- text. `localizedText` reads an empty column as English, so a hero's own row, written by an older
-- build during an update, is valid the moment the columns exist.
--
-- This is the content as it stands after 0079: 66 Admin exercises, 37 quests, 8 adventures and their
-- 40 steps. The Russian is translated from the English with the French beside it, against the
-- vocabulary of locales/ru.json (the hero is addressed as "ty", a quest is a "zadanie", the core is
-- the "kor"), and exercises carry the name a Russian-speaking trainer uses rather than a calque.
--
-- Every statement is scoped to the seeded row: `creator = 'Admin'` on exercises (rule 2, 0035),
-- `author = 'Admin'` on quests and adventures, and steps through their Admin adventure. A hero's own
-- row is never touched: it already carries its one language in every column.
--
-- No semicolon inside any string: `seed-migration-guard.test.ts` splits statements on the semicolon.
ALTER TABLE `exercises` ADD `ruName` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `exercises` ADD `ruDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `ruTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `ruDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `ruTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `ruDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `ruNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `ruOutroNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Приседания',
    `ruDescription` = 'Поставь ноги на ширине плеч, сядь назад и вниз, как на стул, спина прямая, пятки на полу, пока тазобедренная складка не опустится ниже колен. Поднимайся, отталкиваясь всей стопой, колени идут по линии носков.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Отжимания',
    `ruDescription` = 'Прими упор лёжа, ладони чуть шире плеч, и опускайся, пока грудь почти не коснётся пола, локти примерно под 45 градусов к корпусу. Выжимайся до полностью прямых рук, тело напряжено как единое целое.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Push-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Подтягивания',
    `ruDescription` = 'Повисни на перекладине хватом сверху (ладони от себя), руки прямые. Подтянись так, чтобы подбородок оказался над перекладиной, затем опустись до полностью прямых рук перед следующим повторением.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pull-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Стульчик у стены',
    `ruDescription` = 'Скользи спиной по стене вниз, пока бёдра не станут параллельны полу, и удерживай позицию.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Планка',
    `ruDescription` = 'В упоре лёжа, ладони под плечами, выстрой пятки, таз и плечи в одну линию и удерживай. Напряги ягодицы и пресс, чтобы таз не провисал.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Скручивания',
    `ruDescription` = 'Лёжа на спине, колени согнуты, стопы на полу, скрути верхнюю часть спины, поднимая плечи к потолку и не подтягивая шею руками, затем под контролем опустись.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Выпады',
    `ruDescription` = 'Сделай длинный шаг назад и опустись, пока заднее колено почти не коснётся пола, оба колена согнуты примерно на 90 градусов, переднее колено над щиколоткой. Оттолкнись передней пяткой, чтобы встать, затем смени ногу.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Lunge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Берпи',
    `ruDescription` = 'Из стойки присядь, выбрось ноги назад в упор лёжа, верни их под себя и закончи прыжком с руками над головой.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Burpee' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Скалолаз',
    `ruDescription` = 'Прими упор лёжа, ладони под плечами, и быстро подтягивай колени к груди по очереди, не поднимая таз.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Mountain Climber' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Отжимания на брусьях',
    `ruDescription` = 'Обопрись на устойчивый край или на параллельные брусья, руки прямые, и опускайся, сгибая локти назад, пока плечи не окажутся на уровне локтей. Выжмись обратно до выпрямленных рук. Если тянет переднюю часть плеча, уменьши глубину.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dip' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Отжимания горкой',
    `ruDescription` = 'Из упора лёжа подведи стопы ближе и подними таз, образуя перевёрнутую букву V, затем согни локти, опуская макушку к полу, и выжмись обратно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pike Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Джампинг-джек',
    `ruDescription` = 'Прыжком разведи ноги широко и подними руки над головой, затем прыжком вернись в стойку ноги вместе, руки вдоль тела, сохраняя ровный ритм.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jumping Jack' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Бег с высоким подниманием колен',
    `ruDescription` = 'Беги на месте, поднимая каждое колено до уровня таза, приземляясь на переднюю часть стопы и держа корпус вертикально.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'High Knees' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Скручивания «велосипед»',
    `ruDescription` = 'Лёжа на спине, руки у головы, тяни локоть к противоположному колену, пока другая нога вытягивается, чередуя стороны и не подтягивая шею руками.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bicycle Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Алмазные отжимания',
    `ruDescription` = 'Выполни отжимание, поставив ладони близко друг к другу под грудью так, чтобы большие и указательные пальцы образовали ромб, локти скользят вдоль рёбер.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Diamond Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Румынская тяга на одной ноге',
    `ruDescription` = 'Стоя на одной ноге, наклони корпус вперёд и тянись к полу, пока свободная нога уходит назад, затем вернись в вертикальное положение с прямой спиной.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Deadlift' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Растяжка «кобра»',
    `ruDescription` = 'Лёжа на животе, ладони под плечами, локти прижаты к телу. Мягко надави руками и подними грудь, пока таз и верх бёдер остаются на полу, локти слегка согнуты, плечи отведены от ушей.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cobra Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Поза воина',
    `ruDescription` = 'В позе воина II встань в широкую стойку, передняя стопа смотрит прямо, задняя повёрнута наружу. Согни переднее колено над щиколоткой, разведи руки параллельно полу на одной линии с ногами и смотри поверх передней руки.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warrior Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Прыжки конькобежца',
    `ruDescription` = 'Прыгай в сторону с одной ноги на другую, мягко приземляясь на слегка согнутую ногу, свободная нога уходит за опорную.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Skater Hop' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Холлоу-бади',
    `ruDescription` = 'Лёжа на спине, прижми поясницу к полу и приподними плечи и ноги на несколько сантиметров, руки над головой, и держи форму банана.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hollow Body Hold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Подтягивания обратным хватом',
    `ruDescription` = 'Повисни на перекладине хватом снизу (ладони к себе) и подтягивай грудь вверх, пока подбородок не окажется выше перекладины, затем под контролем опустись.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Chin-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Супермен',
    `ruDescription` = 'Лёжа на животе, руки и ноги вытянуты, одновременно оторви от пола грудь, руки и ноги и удерживай, продолжая дышать.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Superman' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Медвежья походка',
    `ruDescription` = 'Двигайся вперёд на руках и ногах, колени чуть над полом, таз низко, кор напряжён, переставляя вместе противоположные руку и ногу. Если место закончилось, ползи обратно тем же путём и повтори.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bear Crawl' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Русский твист',
    `ruDescription` = 'Сядь с согнутыми коленями, слегка откинься назад и поворачивай корпус из стороны в сторону, каждый раз касаясь пола. Сначала держи стопы на полу, а когда станет легко, поднимай их.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Russian Twist' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Боковая планка',
    `ruDescription` = 'Лёжа на боку, обопрись на одно предплечье и подними таз, чтобы тело образовало прямую линию, и удерживай.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Side Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Ягодичный мостик',
    `ruDescription` = 'Лёжа на спине с согнутыми коленями, напряги ягодицы и подними таз так, чтобы от колен до плеч получилась прямая линия.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Подъёмы на носки стоя',
    `ruDescription` = 'Встань прямо, медленно поднимись на носки, задержись вверху, затем опусти пятки.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Calf Raise' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Отжимания в стойке на руках',
    `ruDescription` = 'Забрось ноги в стойку на руках у стены, согни локти и медленно опустись, пока голова слегка не коснётся пола, затем выжмись обратно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Handstand Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Отжимания от стены',
    `ruDescription` = 'Встань на расстоянии вытянутой руки от стены, ладони на уровне плеч, и согни локти, приближая грудь к стене, затем оттолкнись обратно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Ножницы лёжа',
    `ruDescription` = 'Лёжа на спине, обопрись на предплечья, ноги вытянуты и подняты на несколько сантиметров над полом, и чередуй небольшие махи вверх и вниз, не прогибая поясницу.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Flutter Kicks' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Австралийские подтягивания',
    `ruDescription` = 'Повисни под низкой перекладиной, ноги прямые, тело в одну линию от пяток до плеч, подтяни грудь к перекладине, сводя лопатки, затем под контролем опустись. Чем ниже перекладина, тем тяжелее.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Inverted Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Мёртвый жук',
    `ruDescription` = 'Лёжа на спине, руки подняты вверх, колени согнуты под 90 градусов. Опусти одну руку и противоположную ногу к полу, вернись и смени стороны. Всё время прижимай поясницу к полу.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Bug' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Подъёмы ног в висе',
    `ruDescription` = 'Повисни на перекладине с прямыми руками и подними прямые ноги перед собой до параллели с полом, затем под контролем опусти.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hanging Leg Raise' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Приседания с прыжком',
    `ruDescription` = 'Присядь, затем взрывно выпрыгни вверх и мягко приземлись сразу в следующий присед.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jump Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Обратные скручивания',
    `ruDescription` = 'Лёжа на спине с согнутыми коленями, оторви таз от пола, подворачивая его, и подтяни колени к груди.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Reverse Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Приседания «реверанс»',
    `ruDescription` = 'Отведи одну ногу по диагонали за другую, как в реверансе, согни обе ноги, затем оттолкнись передней стопой и вернись в стойку.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Curtsy Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Лопаточные подтягивания',
    `ruDescription` = 'Повисни на перекладине с прямыми руками и, не сгибая локти, опусти лопатки вниз и сведи их, слегка приподнимая тело. Это первая часть любого подтягивания.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Scapular Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Уголок',
    `ruDescription` = 'Сядь с вытянутыми ногами, упрись ладонями рядом с бёдрами, на полу или на двух устойчивых опорах, и подними ноги, образуя букву L, затем удерживай.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Прыжок «звезда»',
    `ruDescription` = 'Взрывно выпрыгни вверх, разводя руки и ноги в форме звезды, затем мягко приземлись и повтори.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Star Jump' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Дворники',
    `ruDescription` = 'Лёжа на спине, руки широко разведены и прижаты к полу, ноги вместе подняты вертикально, и опускай их из стороны в сторону, как дворники, не отрывая плечи от пола.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Windshield Wipers' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Подтягивания под столом',
    `ruDescription` = 'Ляг под устойчивый стол, возьмись за край обеими руками, согни колени и поставь стопы на пол, затем подтяни грудь к столу и под контролем опустись. Чем дальше выставишь стопы, тем тяжелее.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Table Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Тяга на полотенце у двери',
    `ruDescription` = 'Плотно закрой дверь, встань с той стороны, где она открывается от тебя, и накинь полотенце на ручку. Возьмись за оба конца, откинься назад с прямыми руками, затем тяни локти назад, чтобы приблизить грудь к двери. Чем ближе стопы к двери, тем тяжелее.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Towel Door Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Вращения кистями',
    `ruDescription` = 'Руки перед собой, сначала медленно вращай кистями в обе стороны во всей амплитуде. Затем встань на четвереньки, ладони плоско на полу, и мягко покачивайся вперёд и назад. Оставайся в безболезненной амплитуде.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wrist Circles' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Кошка-корова',
    `ruDescription` = 'На четвереньках чередуй округление спины к потолку и прогиб вниз с раскрытием груди. Двигайся по одному позвонку, пусть темп задаёт дыхание.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cat-Cow' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Нитка в иголку',
    `ruDescription` = 'С четверенек проведи одну руку под другой и положи плечо на пол. Держи таз над коленями, чтобы вращение шло из верхней части спины.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Thread the Needle' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Наклон вперёд стоя',
    `ruDescription` = 'Наклонись от тазобедренных суставов и дай корпусу свободно повиснуть, колени мягко согнуты. Пусть сила тяжести растягивает заднюю поверхность ног, без пружинящих движений.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Forward Fold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Собака мордой вниз',
    `ruDescription` = 'Из упора на руках и ногах подними таз высоко, а пятки тяни вниз, руки прямые, голова между рук. Поочерёдно сгибай колени, как на педалях, растягивая икры и заднюю поверхность бёдер.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Downward Dog' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Поза голубя',
    `ruDescription` = 'Согни одну ногу перед собой, голень поперёк коврика, стопа к противоположному бедру, другую ногу вытяни назад, затем наклони грудь над передней ногой и дыши медленно. Если болит переднее колено, выйди из позы.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pigeon Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Лучшая растяжка в мире',
    `ruDescription` = 'Шагни в глубокий выпад и поставь на пол ладонь, противоположную передней ноге. Другой локоть веди к внутренней стороне передней стопы, затем разверни грудь и потяни эту руку к потолку. Так растягиваются сгибатель бедра задней ноги, приводящие мышцы и верх спины одновременно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'World''s Greatest Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Отжимания с колен',
    `ruDescription` = 'Прими упор лёжа, опираясь на колени, тело прямое от головы до колен, затем опусти грудь на высоту кулака от пола и выжмись обратно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Knee Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Стойка на руках у стены',
    `ruDescription` = 'Лицом к стене: из планки упрись стопами в стену и шагай ими вверх по стене, подводя руки примерно на шаг к ней. Спиной к стене: поочерёдно забрось одну ногу, затем другую, пока пятки не обопрутся о стену. Руки прямые, рёбра втянуты, взгляд между ладоней, дыши.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Handstand' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Вис на перекладине',
    `ruDescription` = 'Повисни на перекладине с прямыми руками, большие пальцы обхватывают её, и дай телу висеть без раскачивания. Слегка опусти плечи вниз, чтобы они не ползли к ушам, и удерживай.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Hang' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Негативные подтягивания',
    `ruDescription` = 'Запрыгни или встань на опору так, чтобы оказаться в верхней точке подтягивания, подбородок над перекладиной, затем опускайся как можно медленнее, цель: пять секунд, и снова поднимись наверх для следующего повторения.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Negative Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Уголок с согнутыми ногами',
    `ruDescription` = 'Сядь, ладони плоско рядом с бёдрами, на полу или на двух устойчивых опорах, надави вниз, чтобы приподнять таз, и подтяни оба колена к груди, локти прямые, затем неподвижно удерживай.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Ягодичный мостик на одной ноге',
    `ruDescription` = 'Лёжа на спине, одна стопа стоит на полу, другая нога вытянута, толкнись опорной пяткой и подними таз, не давая ему перекашиваться набок.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Болгарский сплит-присед',
    `ruDescription` = 'Положи подъём задней стопы на стул позади, затем опускайся прямо вниз, пока переднее бедро не станет параллельно полу, а переднее колено не согнётся до 90 градусов, и поднимись обратно, держа корпус прямо.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bulgarian Split Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Выход силой',
    `ruDescription` = 'Повисни на перекладине, взрывно подтянись так, чтобы грудь дошла до перекладины, переведи плечи над ней, затем выжмись до прямых рук над перекладиной.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Muscle-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Ноги к перекладине',
    `ruDescription` = 'Повисни на перекладине и подними обе прямые ноги вверх так, чтобы носки коснулись перекладины между руками, затем под контролем опусти, без раскачивания.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Toes to Bar' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Отжимания лучника',
    `ruDescription` = 'Поставь руки шире, чем для обычного отжимания, и опускайся к одной ладони, пока противоположная рука остаётся прямой, затем выжмись и смени сторону. Основную нагрузку берёт сгибающаяся рука.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Archer Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Пистолетик',
    `ruDescription` = 'Стоя на одной ноге, другую вытяни вперёд, опустись в самый низ приседа и встань обратно, ни разу не коснувшись пола свободной пяткой.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pistol Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Флаг дракона',
    `ruDescription` = 'Лёжа на полу или на скамье, возьмись за что-нибудь прочное за головой и подними всё тело на плечи одной жёсткой линией, затем медленно опусти, не давая тазу складываться.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dragon Flag' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Планш в группировке',
    `ruDescription` = 'Присядь и поставь ладони плоско на пол на ширине плеч. Наклони плечи далеко за линию запястий, локти прямые, пока стопы не оторвутся от пола, колени подтянуты к груди, и неподвижно удерживай равновесие.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck Planche' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Прогулка Стража',
    `ruDescription` = 'Иди быстрым шагом, в таком темпе, чтобы ещё можно было говорить, и держи его до конца.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warden''s Walk' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Бег гонца',
    `ruDescription` = 'Беги в ровном темпе, который можно держать долго. Если нужно перейти на шаг, иди, а потом снова побеги, когда дыхание вернётся.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Messenger''s Run' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Поездка дозорного',
    `ruDescription` = 'Крути педали плавно и ровно, без рывков, на передаче, при которой ноги вращаются легко.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Outrider''s Ride' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `ruName` = 'Супермен W',
    `ruDescription` = 'Лёжа на животе, руки вытянуты вперёд. Чуть оторви от пола грудь, руки и ноги, взгляд в пол. Подтяни локти к рёбрам, как будто в задние карманы, и сведи лопатки на две секунды. Снова вытяни руки вперёд, не касаясь пола, и повторяй.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Superman W' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Рубка дров',
    `ruDescription` = 'Бери топор (воображаемый тоже сойдёт). Твоей деревне нужно тепло, так что порубим дров по-геройски.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Chop Wood' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Подъём на башню',
    `ruDescription` = 'Поднимись на древнюю башню. Каждый этаж испытывает твою решимость.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Tower Climb' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Жим рыцаря',
    `ruDescription` = 'Рыцарь целый день держит щит на вытянутой руке, и в конце концов руки этому учатся.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Knight Push' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Стена щитов',
    `ruDescription` = 'Держи строй. Твой кор и есть твой щит.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Shield Wall' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Сбор камней',
    `ruDescription` = 'Фундаменту нужны камни. Поднимай и неси.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Gather Stones' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Возведение убежища',
    `ruDescription` = 'Построй убежище. Жми и держи.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Raise the Shelter' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Кузница кора',
    `ruDescription` = 'Выкуй свой кор, как сталь. Планки, скручивания и удержания.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Core Forge' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Удар по голему',
    `ruDescription` = 'Ударь каменного голема изо всех сил.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Golem Strike' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Ядро голема',
    `ruDescription` = 'Целься в ядро голема. Держи и бей.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Golem Core' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Выкуй клинок дракона',
    `ruDescription` = 'Железо вынуто из огня и недолго останется горячим. Бей, пока оно поддаётся, грудью и руками за молотом.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Forge the Dragon Blade' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Взойди на Башню Титана',
    `ruDescription` = 'Каждый этаж берётся силой рук, и никто ещё не спускался обратно, дойдя до середины этой башни.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Climb the Titan''s Tower' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Возведи оплот',
    `ruDescription` = 'Камень за камнем растёт стена. Что построено криво, в конце концов рушится, и тело, которое это строило, тоже.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Build the Stronghold' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Железная рукавица',
    `ruDescription` = 'Мало кто выходит через эту дверь обратно, и те, кто выходит, до конца держались на ногах.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Gauntlet Challenge' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Бегство из рушащейся шахты',
    `ruDescription` = 'Тоннель гудит. Камни срываются. У тебя несколько минут, пока выход не закрылся, так что не останавливайся.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Escape the Collapsing Mine' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Защита ворот крепости',
    `ruDescription` = 'Враг идёт в атаку, а ты один у ворот. Держись, сколько потребуется. За твоей спиной некому тебя сменить.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Guard the Fortress Gate' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Чародейская рукавица',
    `ruDescription` = 'Маг чертит круг, отступает, и всё происходит в центре тела, неподвижно, пока держится линия.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Arcane Gauntlet' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Тропа друида',
    `ruDescription` = 'Тропа идёт под деревьями, и никто по ней не бегает. Тянись, дыши, раскрывай бёдра: так лечат и воина.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Druid''s Path' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Рывок через Земли Теней',
    `ruDescription` = 'Тьма охотится за тобой и не устаёт, так что беги, но оставь что-нибудь на финиш.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Sprint Through the Shadowlands' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Утро чемпиона',
    `ruDescription` = 'Крепость ещё спит. Разбуди бёдра, плечи и спину, именно в таком порядке, и день начнётся с правой ноги.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Morning of the Champion' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Пробуждение оруженосца',
    `ruDescription` = 'Ты ещё не герой. Ты тот, кто носит щит, и сегодня этого достаточно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Awakening' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Медвежья дорога',
    `ruDescription` = 'До крепости полдня пути через сосны. Иди на двух ногах или на четырёх, но приди до того, как угаснет свет.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Bear''s Road' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Грузчик погреба',
    `ruDescription` = 'Люк погреба заклинило, а буря уже на гребне. Тяни, или спи под дождём.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Cellar Hauler' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Обет пахаря',
    `ruDescription` = 'Ни одна деревня не живёт одним клинком воина. Согни спину над полем и заслужи в нём своё место.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Ploughman''s Vow' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Вороний подъём',
    `ruDescription` = 'Вороны гнездятся там, куда не достаёт ни одна лестница. Бери стену руками и виси, пока она не отпустит тебя наверх.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Crow''s Ascent' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Испытание колосса',
    `ruDescription` = 'Колосс стоит на руках, и мир висит под ним. Держись. Не падай.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Colossus Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Буря клинков',
    `ruDescription` = 'Налётчики идут через дюны стальной цепью. Встреть их в движении, или тебя растопчут на месте.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Storm of Blades' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Кольца змеи',
    `ruDescription` = 'Змея не нападает. Она обвивает и ждёт, пока твой центр не сдастся. Не сдавайся.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Serpent''s Coil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Обряд рассвета',
    `ruDescription` = 'Пока крепость не проснулась, старый обряд: раскрыть бёдра, размять позвоночник, вспомнить, что тело принадлежит тебе. День не начнётся, пока это не сделано.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Dawn Ritual' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Освобождение у очага',
    `ruDescription` = 'Переход окончен, огонь горит. Распусти то, что дорога затянула узлами, начиная с бёдер: они несут тебя дальше всего.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Hearthside Unbinding' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Бдение перед стойкой',
    `ruDescription` = 'Каждый, кто стоит на руках, учится этому на собственном опыте: запястья сдают задолго до плеч. Позаботься о них накануне вечером, а не наутро после.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Handler''s Vigil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Терпеливый подъём',
    `ruDescription` = 'За один день никого не втаскивают на вершину башни. Вис, затем удержание, затем медленное опускание: перекладина ничего не отдаёт даром, а то, что она даёт, остаётся с тобой.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Patient Ascent' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Фундамент каменщика',
    `ruDescription` = 'Каждая стена, поднятая в деревне, стоит на основании, которое кто-то выкопал, стоя на одном колене. Одна нога за раз, одна сторона за раз: это работа, которую никто не видит, а на ней держится всё.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Mason''s Footing' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Испытание вершины',
    `ruDescription` = 'Каждый маршрут в крепости заканчивается перекладиной где-то над твоей головой. Сегодня ты узнаешь, на какие из них ты действительно поднялся.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Summit Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Бдение на прямых руках',
    `ruDescription` = 'Ни перекладины, ни стены, не за что повиснуть. Только пол, прямые локти и столько времени, сколько ты сможешь не сгибаться.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Straight-Arm Vigil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Обход Стража',
    `ruDescription` = 'Стены стоят, потому что кто-то по ним ходит. Каждую ночь обход достаётся ещё одной паре сапог, и благодаря этому землю видно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Warden''s Round' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Весть должна дойти',
    `ruDescription` = 'Что-то должно дойти до соседней деревни до темноты, а на дороге сегодня больше никого нет.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Word Must Travel' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `ruTitle` = 'Дальний рубеж',
    `ruDescription` = 'Карта перестаёт быть слухом там, где побывал дозорный. Всё за этой чертой известно лишь со слов торговцев.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Long Reach' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `ruTitle` = 'Дорога дровосека',
    `ruDescription` = 'Построй своё первое убежище. Руби дрова, собирай камни, возводи стены.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `ruTitle` = 'Голем',
    `ruDescription` = 'Каменный голем засел на дороге, и чтобы его измотать, понадобятся сила и дыхание.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Golem' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `ruTitle` = 'Покорение Владыки Ржавчины',
    `ruDescription` = 'Все испытания крепости одно за другим, и Владыка Ржавчины в конце. Никто ещё не проходил этот путь за один раз.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `ruTitle` = 'Путь оруженосца',
    `ruDescription` = 'Каждый герой начинает как тот, кто носит щит. Пять переходов, чтобы заслужить право поднять клинок: без перекладины, без весов, без оправданий.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `ruTitle` = 'Просветление монаха',
    `ruDescription` = 'Монах движется медленно и всё равно приходит, так что дыши, держи позицию и возвращайся завтра.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `ruTitle` = 'Испытание разведчика',
    `ruDescription` = 'Королевству не хватает разведчиков, способных держать дистанцию. Беги, иди шагом, снова беги и возвращайся домой в форме, чтобы завтра выйти снова.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `ruTitle` = 'Странствие следопыта',
    `ruDescription` = 'Лиги пути, встречи по дороге и выносливость вместо коня на пути, который не становится короче.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `ruTitle` = 'Клятва хранителя',
    `ruDescription` = 'Ворота не падают, пока за ними кто-то стоит. Спина и корпус держат эту клятву, смена за сменой.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Опушка уже недалеко, руби чисто и дыши ровно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Камни и дрова. Твой кор и есть тележка: держи её устойчивой.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Возводи убежище. Сейчас последнее усилие, комфорт потом.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Земля дрожит под чем-то тяжелее тебя.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Сейчас. Бей сильнее, чем он бьёт тебя.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'В зал Владыки Ржавчины без оружия не входят. Сначала выкуй.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'У внешней стены нет лестницы. Вороны как-то забрались.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Его стражи стоят на руках, чтобы поддеть тебя. Ответь им.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Возьми крепость, а потом сделай её своей. Тебе понадобится место, куда отступить.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Латная рукавица осталась от тех, кто не вышел обратно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Его трон наверху, и лестницы всё ещё нет.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Владыка Ржавчины сражается вверх ногами. Тебе придётся так же.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 6
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Хитростей не осталось. Переживи его.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 7
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Тебе вручили щит, который ты едва поднимаешь. Начни с него.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Сосны проглатывают тропу. Двигайся на двух ногах, а если придётся, то на четырёх.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Что-то свернувшееся в подлеске пропустит тебя, если твой центр держится.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Деревня кормит тех, кто работает на её полях. Согни спину и заслужи ночлег.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Щит уже сидит на руке как надо. Перед клинком остаётся одно послание, которое нужно донести до соседней деревни к ночи.',
    `ruOutroNarrative` = 'Весть пришла, пока ещё хватало света, чтобы её прочесть. Оруженосец, способный донести послание так далеко, донесёт и клинок.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Дорога к монастырю длинная и медленная нарочно. Дыши в её ритме.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'За первыми воротами остаётся только одно: сколько ты можешь стоять неподвижно.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Змея сжимает медленно и ждёт, когда ты сдашься.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Спустись обратно с горы. Подъём считается, только если ты ещё можешь дышать.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Разведчики выходят на рассвете. Разбуди каждую мышцу до сигнала рога.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Призрак сделан из ветра. Стряхни его.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Дюны оживают сталью. Двигай ногами, или потеряешь их.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Тоннель обрушивается позади тебя. Темп только один: быстрый.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Последний бег, призрак уже редеет, добей его.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Семь дней пути начинаются с одного честного утра.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Следопыты зарабатывают хлеб на полях, прежде чем натянут лук.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Что-то увязалось за тобой от кромки леса. Не дай ему задавать темп.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Полпути. Разбей лагерь, который ещё будет стоять, когда ты вернёшься.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Титан сотрясает кроны, и налётчики принимают это за сигнал.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Ног не чувствуешь. Проползи последний отрезок через сосны, если больше нечем.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Последний рассвет, титан теперь кора и мох, а ты всё ещё идёшь.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 6
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Ты поклялся держать эти ворота, а такая клятва исчисляется ночами.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Арсенал под полом, и люк разбух и не открывается. Тяни.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Камень отвечает камню. Подними стену, пока голем её не испытал.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Доспех бесполезен, если тело внутри складывается. Напрягись.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Бери башню руками. Голем за тобой наверх не полезет.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `ruNarrative` = 'Снова к воротам, последняя смена. Камень ломает камень.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
