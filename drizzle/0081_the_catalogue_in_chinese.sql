-- The seeded content in Chinese: the columns, then every Admin exercise, quest, adventure and step.
--
-- Chinese shipped with its interface translated and its catalogue in English, because the tables had
-- no column for it (docs/architecture/adding-a-language.md, step 4). Like 0080 for Russian, this
-- adds eight columns on four tables, `text DEFAULT '' NOT NULL` like the ones beside them, then
-- their text, so a release that carries it carries one migration. `localizedText` reads an empty
-- column as English, so a hero's own row, written by an older build during an update, is valid the
-- moment the columns exist.
--
-- It is the content as it stands after 0080: the same 66 Admin exercises, 37 quests, 8 adventures
-- and 40 steps 0080 fills for Russian. The Chinese is translated from the English with the French
-- beside it and against the glossary's Chinese terms (docs/product/glossary.md), in the register
-- the rest of the game uses there: 你, the game talking to the hero. Proper names are translated,
-- not kept: the Squire is 侍从 the way French already has L'Écuyer, and the golem is 石魔 the way
-- the boss is 采石王.
--
-- Every statement is scoped to the seeded row: `creator = 'Admin'` on exercises (rule 2, 0035),
-- `author = 'Admin'` on quests and adventures, and steps through their Admin adventure. A hero's
-- own row is never touched: it already carries its one language in every column.
--
-- No semicolon inside any string: `seed-migration-guard.test.ts` splits statements on `;`. No em
-- dash either, the rule `locale-style.test.ts` holds everywhere a reader looks.
ALTER TABLE `exercises` ADD `zhName` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `exercises` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `zhTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `zhTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `zhNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `zhOutroNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '深蹲',
    `zhDescription` = '双脚与肩同宽，臀部向后下方坐，像坐进一张椅子，腰背挺直、脚跟踩实，直到髋部低于膝盖。蹬全脚站起，膝盖对准脚尖方向。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '俯卧撑',
    `zhDescription` = '从平板姿势开始，双手略宽于肩，胸部几乎触地时停下，肘部约与身体成 45 度。推回至手臂完全伸直，全身绷成一块。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Push-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '引体向上',
    `zhDescription` = '正握悬垂单杠，手臂伸直。拉到下巴越过横杠，再放回直臂，然后开始下一次。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pull-ups' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '靠墙静蹲',
    `zhDescription` = '背部沿墙下滑，直到大腿与地面平行，保持不动。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '平板支撑',
    `zhDescription` = '俯卧撑姿势，双手在肩下，脚跟、髋、肩成一条线，保持。收紧臀部和腹部，髋不要塌。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '卷腹',
    `zhDescription` = '仰卧，屈膝、脚掌贴地，收紧上背把肩抬向天花板，脖子不要用力，再有控制地放下。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '弓步蹲',
    `zhDescription` = '向后迈一大步，下到后膝轻触地面，双膝均近 90 度，前膝对准脚踝。前脚脚跟发力站起，再换腿。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Lunge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '波比跳',
    `zhDescription` = '站立开始，下蹲、双腿后蹬成俯卧撑姿势，收回腿下，最后向上跳起，手臂举过头顶。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Burpee' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '登山者',
    `zhDescription` = '俯卧撑姿势，双手在肩下，交替提膝奔胸，速度要快，髋不要抬起。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Mountain Climber' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '双杠臂屈伸',
    `zhDescription` = '撑在稳固的边缘或双杠上，手臂伸直，屈肘向后下放到肩与肘齐高，再推回锁臂。肩前侧有拉扯感就缩短下放幅度。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dip' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '折体俯卧撑',
    `zhDescription` = '从俯卧撑姿势把脚收向手、髋部抬高成倒 V，屈肘让头顶朝地面下沉，再推起。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pike Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '开合跳',
    `zhDescription` = '双脚跳开、手臂上举，再跳回并步、手臂落回体侧，保持稳定节奏。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jumping Jack' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '高抬腿',
    `zhDescription` = '原地跑，膝盖抬至髋高，前脚掌轻落，上体保持直立。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'High Knees' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '自行车卷腹',
    `zhDescription` = '仰卧，双手枕在头侧，一肘对一膝交替扭转，另一条腿伸直，脖子不要用力。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bicycle Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '钻石俯卧撑',
    `zhDescription` = '俯卧撑，双手并拢在胸下，拇食两指成菱形，肘部贴肋骨。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Diamond Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '单腿硬拉',
    `zhDescription` = '单腿站立，上体前倾伸手够地面，另一条腿向后伸直，再平背站直。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Deadlift' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '眼镜蛇式',
    `zhDescription` = '俯卧，双手在肩下、肘贴身。轻柔下压撑起胸部，骨盆和大腿留在原地，肘微屈、肩远离耳朵。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cobra Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '战士式',
    `zhDescription` = '战士二式：双脚大开，前脚正对前方、后脚外转。前膝弯向脚踝，手臂平举与肩齐、与腿成线，目光越过前手。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warrior Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '侧滑跳',
    `zhDescription` = '左右脚之间横向跳，轻落、膝微弯，后面的腿交叉到身后。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Skater Hop' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '空心体保持',
    `zhDescription` = '仰卧，下背贴地，肩与腿抬起几厘米，手臂上举，保持这个香蕉形。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hollow Body Hold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '反握引体',
    `zhDescription` = '掌心朝自己悬垂单杠，拉胸向上直到下巴过杠，再有控制地放下。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Chin-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '超人式',
    `zhDescription` = '俯卧，手脚伸直，同时抬起胸、手臂和腿，保持并呼吸。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Superman' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '熊爬',
    `zhDescription` = '双手双脚着地前进，膝离地、髋放低、核心收紧，对侧手脚同进。空间不够就原样爬回去再来。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bear Crawl' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '俄罗斯转体',
    `zhDescription` = '坐姿屈膝，上体稍后仰，左右转体，每次手触地面。开始脚放低，熟练后抬起。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Russian Twist' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '侧平板',
    `zhDescription` = '侧卧，一前臂撑地，髋抬起直到身体成一条直线，保持。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Side Plank' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '臀桥',
    `zhDescription` = '仰卧屈膝，收紧臀部把髋顶起，膝到肩成直线。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '站姿提踵',
    `zhDescription` = '站直，缓慢提起脚掌到脚尖，顶端停一下，再放下脚跟。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Calf Raise' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '倒立撑',
    `zhDescription` = '靠墙起倒立，屈肘缓慢下放到头轻触地面，再推起。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Handstand Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '墙壁俯卧撑',
    `zhDescription` = '离墙一臂距，双手与肩齐高，屈肘让胸贴近墙，再推回。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '仰卧交替踢腿',
    `zhDescription` = '仰卧，前臂撑地，双腿伸直离地几厘米，交替小幅上下打腿，腰不要弓。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Flutter Kicks' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '反向划船',
    `zhDescription` = '低杠下悬垂，腿伸直、脚跟到肩成一线，收缩肩胛把胸拉向杠，再有控制地下放。杠越低越难。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Inverted Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '死虫式',
    `zhDescription` = '仰卧，手上举、膝弯 90 度，一臂与对侧腿同时下放，再回正换边。全程下背贴地。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Bug' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '悬垂举腿',
    `zhDescription` = '单杠悬垂，直腿向前抬到与地面平行，再有控制地下放。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Hanging Leg Raise' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '深蹲跳',
    `zhDescription` = '下蹲后向上爆发跳起，轻柔落回下一个蹲。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Jump Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '反向卷腹',
    `zhDescription` = '仰卧屈膝，髋离地把膝收向胸。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Reverse Crunch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '屈膝礼蹲',
    `zhDescription` = '一腿斜向后交叉成屈膝礼，双膝弯曲，前脚发力站起。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Curtsy Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '肩胛引体',
    `zhDescription` = '单杠直臂悬垂，手肘不弯，让肩胛向下并向内收紧，身体随之略微上提。这是每次引体的第一段。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Scapular Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '直角支撑',
    `zhDescription` = '双腿伸直坐地，手掌在髋侧下压（地面或两个稳固支撑），抬腿成 L 形，保持。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '星跳',
    `zhDescription` = '向上爆发跳起，手脚展开成星形，轻落后重复。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Star Jump' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '雨刷器',
    `zhDescription` = '仰卧，手臂张开贴地，双腿并拢上举伸直，再像雨刷一样左右下放，肩不离地。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Windshield Wipers' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '桌下划船',
    `zhDescription` = '仰卧在稳固的桌子下，双手抓边缘，屈膝脚掌踏实，把胸拉向桌面再下放。脚越往前越难。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Table Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '毛巾门划船',
    `zhDescription` = '关紧门，站在门朝远离你的方向打开的一侧，毛巾绕过门把。抓两端，直臂后仰，再收肘把胸拉向门。脚越靠近门越难。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Towel Door Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '腕绕环',
    `zhDescription` = '手臂前伸，先缓慢正反绕腕到全幅度。再四肢着地、掌面贴平，轻轻前后摇。保持在无痛范围。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wrist Circles' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '猫牛式',
    `zhDescription` = '四肢着地，交替拱背向天花板和让背下沉、胸口打开。一节脊椎一动，让呼吸定节奏。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Cat-Cow' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '穿针式',
    `zhDescription` = '四肢着地，一臂从另一臂下穿过，肩部落在地面。髋保持在膝正上方，转动来自上背。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Thread the Needle' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '站立前屈',
    `zhDescription` = '以髋为轴前屈，让上体垂挂，膝微屈。让重力拉大腿后侧，不要弹振。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Standing Forward Fold' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '下犬式',
    `zhDescription` = '手脚着地，髋上推、脚跟下踩，手臂伸直、耳在肱二头肌之间。交替踩脚拉伸小腿和大腿后侧。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Downward Dog' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '鸽子式',
    `zhDescription` = '一腿屈在身前，小腿横过垫面、脚朝对侧髋，另一腿向后伸直，上体折叠趴在前腿上，缓慢呼吸。前膝疼就退出。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pigeon Pose' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '世界最伟大拉伸',
    `zhDescription` = '迈成深弓步，对侧手撑在前脚外侧地面。另一侧肘顶向前脚内侧，再转胸举手向天花板。这一式同时拉开后髋屈肌、内收肌和上背。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'World''s Greatest Stretch' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '跪姿俯卧撑',
    `zhDescription` = '跪地俯卧撑姿势，头到膝成直线，胸降到离地一拳高再推起。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Knee Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '靠墙倒立',
    `zhDescription` = '胸对墙：平板姿势、双脚抵墙，双脚沿墙上走、双手收至离墙约一步。背对墙：一腿前一腿蹬上，直到脚跟靠墙。手臂锁紧、肋骨下沉、目光看双手之间，保持呼吸。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wall Handstand' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '静悬垂',
    `zhDescription` = '单杠直臂悬垂，拇指绕杠，身体不摆。肩略下沉别耸向耳朵，保持。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dead Hang' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '离心引体向上',
    `zhDescription` = '跳或踩到引体最高位、下巴过杠，再尽可能慢地下放，目标五秒，然后踩回开始下一次。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Negative Pull-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '团身直角支撑',
    `zhDescription` = '坐地，手掌平放髋侧（地面或两个稳固支撑），下压抬起臀、双膝收向胸，肘锁紧，保持不动。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck L-Sit' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '单腿臀桥',
    `zhDescription` = '仰卧，一腿踏实、另一腿伸直，踏实腿的脚跟发力顶起髋，别让髋歪向一边。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Single-Leg Glute Bridge' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '保加利亚分腿蹲',
    `zhDescription` = '后脚背搭在身后的椅子上，直下到前大腿与地面平行、前膝 90 度，再推起，上体保持竖直。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Bulgarian Split Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '双力臂',
    `zhDescription` = '单杠悬垂，爆发上拉到胸触杠，翻肩过杠，再推起到杠上直臂。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Muscle-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '触杠举腿',
    `zhDescription` = '单杠悬垂，双腿伸直上举过头直到脚尖触到双手之间的杠，再有控制地不摆地下放。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Toes to Bar' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '弓箭手俯卧撑',
    `zhDescription` = '双手比俯卧撑更宽，下放时倒向一侧、另一臂保持伸直，再推起换边。弯的那侧臂承担大部分重量。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Archer Push-Up' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '手枪蹲',
    `zhDescription` = '单腿站立、另一腿前伸，一路下到蹲底再站起，自由脚的脚跟全程不触地。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pistol Squat' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '龙旗',
    `zhDescription` = '躺在地面或凳上，双手抓稳头后的固定物，把全身扛到肩上成一条硬直线，再缓慢下放，髋不要折。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dragon Flag' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '团身俄式挺身',
    `zhDescription` = '下蹲双手平放地面、与肩同宽。肩远远越过手腕、肘锁紧，直到双脚离地、膝收向胸，保持这个平衡不动。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Tuck Planche' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '守望者漫步',
    `zhDescription` = '快走，走到还能说话的节奏，一路走到底。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warden''s Walk' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '信使奔跑',
    `zhDescription` = '以一个能撑很久的稳定配速奔跑。需要走就走，呼吸顺过来再出发。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Messenger''s Run' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '先锋骑行',
    `zhDescription` = '平滑稳定地踩踏，不冲刺，选一个让双腿轻松转动的档位。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Outrider''s Ride' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `zhName` = '超人 W',
    `zhDescription` = '俯卧，手臂前伸。胸、手臂和腿稍微离地，眼看地面。肘部收向肋骨，像插进后裤袋，肩胛内收两秒。再前伸不触地，重复。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Superman W' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '砍柴',
    `zhDescription` = '抄起你的斧头，想象的也算。村庄需要暖和，来把柴禾劈出英雄气概。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Chop Wood' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '登塔',
    `zhDescription` = '攀上古老的塔，每一层都在考你的决心。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Tower Climb' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '骑士之推',
    `zhDescription` = '骑士整天平举着盾，手臂迟早学会这件事。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Knight Push' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '盾墙',
    `zhDescription` = '守住阵线，你的核心就是你的盾。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Shield Wall' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '采石',
    `zhDescription` = '地基需要石头，搬起来，扛起来。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Gather Stones' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '搭起庇护所',
    `zhDescription` = '把庇护所搭起来，推和撑。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Raise the Shelter' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '核心熔炉',
    `zhDescription` = '像打铁一样锻你的核心：平板、卷腹和保持。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Core Forge' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '痛击石魔',
    `zhDescription` = '用你全部的力气砸向那头石头魔像。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Golem Strike' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '石魔核心',
    `zhDescription` = '瞄准石魔的核心，撑住，再打。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Golem Core' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '锻龙刃',
    `zhDescription` = '铁已经出炉，热不了多久。趁它服软，锤下去，胸和臂都压在锤后。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Forge the Dragon Blade' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '登泰坦之塔',
    `zhDescription` = '每一层都靠手臂的力量赢，还没人从这座塔的半途回来过。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Climb the Titan''s Tower' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '筑起要塞',
    `zhDescription` = '一石一石，墙往上长。砌歪的工事迟早会塌，砌它的身体也一样。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Build the Stronghold' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '铁臂铠挑战',
    `zhDescription` = '从这道门回来的人不多，回来的都站到了最后一刻。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Gauntlet Challenge' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '逃出坍塌矿井',
    `zhDescription` = '隧道在轰鸣，石头松动。出口合上之前你只有几分钟，别停。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Escape the Collapsing Mine' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '守卫要塞之门',
    `zhDescription` = '敌军冲锋，门前只有你。能撑多久撑多久，你身后没有接班的人。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Guard the Fortress Gate' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '奥术臂铠',
    `zhDescription` = '法师画圆、退开，一切发生在身体的正中，静止，只要线还不断。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Arcane Gauntlet' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '德鲁伊之路',
    `zhDescription` = '小径在树下延伸，没人在上面跑。拉伸、呼吸、让髋打开，这也养战士。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Druid''s Path' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '暗影之地冲刺',
    `zhDescription` = '黑暗在追你，它从不知疲倦，所以跑，并给终点留点余力。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Sprint Through the Shadowlands' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '冠军的清晨',
    `zhDescription` = '城堡还在睡。唤醒髋、肩和背，按这个顺序，一天就从对的脚下开始。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Morning of the Champion' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '侍从的觉醒',
    `zhDescription` = '你还不是英雄，你是那个扛盾的人，今天这样就够了。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Awakening' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '熊道',
    `zhDescription` = '主堡在松林里半天的路程。两条腿走还是四条腿爬都行，天黑前赶到。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Bear''s Road' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '地窖拖曳',
    `zhDescription` = '地窖盖卡死了，风雨已经压到山脊。拉，或者睡在雨里。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Cellar Hauler' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '农人的誓言',
    `zhDescription` = '没有村庄只靠战士的刀吃饭。弯下腰向田地，换你在村里的位置。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Ploughman''s Vow' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '乌鸦登高',
    `zhDescription` = '乌鸦在没有梯子的地方筑巢。用手爬上墙，挂在上面，等它放你上去。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Crow''s Ascent' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '巨像试炼',
    `zhDescription` = '巨像用手掌站着，世界挂在它身下。撑住，别掉。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Colossus Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '刃风暴',
    `zhDescription` = '掠袭者排成一道钢线掠过沙丘。迎着他们动，或者站着被踩过去。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Storm of Blades' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '蛇之缠缚',
    `zhDescription` = '蛇不咬，它缠，等你的中心先松。别松。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Serpent''s Coil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '破晓仪式',
    `zhDescription` = '城堡醒来之前，按古老的仪轨：打开髋，松开脊，记起身体是你的。这仪式不完，一天不算开始。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Dawn Ritual' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '炉边解缚',
    `zhDescription` = '行军结束，火已点起。把路捆成的结一个个解开，髋优先，它驮你最远。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Hearthside Unbinding' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '倒立者守夜',
    `zhDescription` = '每个练倒立的人都是用艰难的方式学会的：手腕总比肩膀先垮。前一晚照料它们，别等第二天早上。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Handler''s Vigil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '耐心的登高',
    `zhDescription` = '没人一天就被拉到塔顶。悬、再撑、再慢放：杠子不会白送你什么，可它一旦给了，就一直是你的。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Patient Ascent' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '石匠的根基',
    `zhDescription` = '村里砌过的每堵墙，都立在某人单膝挖出的地基上。一次一条腿，一次一侧，这是没人看见、一切却都赖以为靠的活。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Mason''s Footing' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '登顶试炼',
    `zhDescription` = '堡里每条路的尽头，都是头顶某处的一根杠。今天你就来验：哪几条你真的爬上去过。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Summit Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '直臂守夜',
    `zhDescription` = '没有杠，没有墙，没处可挂。只有地板、锁死的肘，和你能拒绝折叠多久。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Straight-Arm Vigil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '守望者巡夜',
    `zhDescription` = '墙立着，因为有人走墙。每一夜这圈都落到又多一双靴子上，地面因此被看见。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Warden''s Round' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '消息必须送达',
    `zhDescription` = '有东西要在天黑前送到下一个村庄，今夜的路上没有别人。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Word Must Travel' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `zhTitle` = '更远的边界',
    `zhDescription` = '地图在先锋走过的地方才不再是传闻，那条线以外全是商人的道听途说。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Long Reach' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `zhTitle` = '伐木之路',
    `zhDescription` = '搭起你的第一座庇护所：砍柴、采石、垒墙。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `zhTitle` = '石魔',
    `zhDescription` = '一尊石头魔像堵在了路上，要耗它下去，得靠力气和肺。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Golem' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `zhTitle` = '铁王的征服',
    `zhDescription` = '堡里每一场试炼，一场接一场，铁王在最后。没人一口气走完过这条路。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `zhTitle` = '侍从之路',
    `zhDescription` = '每个英雄都从扛盾的开始。五场行军换来举刃的资格：没有杠，没有重量，没有借口。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `zhTitle` = '僧人的悟道',
    `zhDescription` = '僧人走得慢，一样到得了。呼吸、定住姿势，明天再来。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `zhTitle` = '侦察兵试炼',
    `zhDescription` = '王国缺撑得住距离的侦察兵。跑、走、再出发，回家时还得有力气明天再出门。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `zhTitle` = '游侠之旅',
    `zhDescription` = '要赶的路程、途中的际遇，还有那匹唯一的坐骑的耐力，在一条从不会变短的路上。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `zhTitle` = '守卫的誓言',
    `zhDescription` = '有人站在门后，门就不会倒。背和撑维持这个誓言，一夜一夜来。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '林边已经不远了，劈干净，气沉住。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '石头和木头，你的核心就是那辆车：稳住。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '把庇护所搭起来，最后一鼓作气，舒服留在后头。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '地面在比你更重的东西脚下发颤。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '就是现在，打得比它揍你更狠。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '他们递给你一面你几乎举不动的盾，从那儿开始。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '松林吞掉了小径，两条腿走，实在不行四条腿。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '灌木丛里盘着的东西会放你过去，只要你的中心不散。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '村庄养种地的人，弯下腰，挣你的铺。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '寺院长路又长又慢，故意的，顺着呼吸走。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '第一道门后头，只剩你还能定多久。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '蛇慢慢地绞，等你先折。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '走下山，这一趟只有你还喘着气才算数。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '侦察兵天亮出发，号角前把每块肌肉叫醒。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '怨灵是风做的，抖掉它。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '沙丘活了过来，尽是钢铁，脚别停，停了就没脚。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '隧道在身后塌，只有一个速度：快。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '最后一段，怨灵已经在变薄，收掉它。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '七天的路，从一个实在的早晨开始。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '游侠先在田里挣面包，才拉弓。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '树线外头有东西跟着你，别让它定节奏。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '过半了，扎个营，回来时还得立着。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '泰坦摇动树冠，掠袭者拿它当信号。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '腿没了，剩下的松林爬也爬过去。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '最后一个黎明，泰坦如今只剩树皮和苔藓，你还在走。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 6
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '你发过誓守这道门，那样的誓言按夜算。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '军械库在地板下，盖板胀死了，拉。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '石头对石头，在石魔来试之前把墙垒起来。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '盔甲里的身体一折，盔甲就没用，撑住。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '用手拿下这座塔，石魔跟不上来。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '回门边，最后一班岗，石头碎石头。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '空着手进不了铁王的大厅，先锻。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '外墙没有楼梯，乌鸦不知怎么上去的。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '他的卫兵倒立着嘲你，回应他们。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '拿下主堡，再让它成你的，总得有个退守的地方。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 3
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '臂铠是没能走出这里的人剩下的。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '他的王座在顶楼，那儿依然没有楼梯。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '铁王倒着打，你也倒着打。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 6
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '没什么花招了，耗过他。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 7
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `zhNarrative` = '盾如今正贴在臂上，举刃之前，还有一条消息要送到下一个村庄，天黑前得到。',
    `zhOutroNarrative` = '消息送到时，天还亮得能读，能送这么远消息的侍从，就能扛刀。',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
