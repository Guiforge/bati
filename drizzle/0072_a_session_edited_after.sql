-- When a session saved earlier was last changed by the hero: a set corrected from the History, a
-- feedback chip tapped after the save. Device sync names a session by its uuid and, until now,
-- never looked inside one both devices held, so a correction stayed on the phone that made it and
-- the two kept two figures for the same session for good (roadmap M-02).
--
-- Sync reads them three times: the fingerprint moves, so the device uploads; the comparison counts
-- a session the other holds older as news; the merge takes the later side's sets, and the later
-- side's feedback, each on its own stamp, so a chip tapped on one phone never carries that phone's
-- older sets over a correction made on the other. The stamps are copied verbatim, like every other
-- date the merge carries, so the two then agree.
--
-- NULL on every existing row and on every new one: a session nobody edited.
ALTER TABLE `completed_sessions` ADD `setsEditedAt` integer;--> statement-breakpoint
ALTER TABLE `completed_sessions` ADD `feedbackEditedAt` integer;
