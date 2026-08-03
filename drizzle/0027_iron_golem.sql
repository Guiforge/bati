-- The Golem gets its own monster. 0026 lent it stone_golem, shared with The Guardian's Oath —
-- defensible the way the two wilderness campaigns sharing forest_titan is, and still wrong for a
-- campaign literally named The Golem: the boss's identity (name, voice, legendary form) is keyed
-- off this path, so the two campaigns fought the same "Quarry King". iron_golem.webp shipped with
-- the square art batch; the Rustlord is a different monster in a different foundry.
UPDATE `adventures` SET `bossImagePath` = 'assets/images/bosses/iron_golem.jpg'
  WHERE `enTitle` = 'The Golem';
