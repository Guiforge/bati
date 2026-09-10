---
title: UX audit, the hurried lifter
type: design
status: active
updated: 2026-09-10
related: [../audit-protocol.md]
---

# UX audit, the hurried lifter

Persona: years of training, in the gym right now, phone in one hand, forty seconds of rest
left. The RPG is fine, but not between two sets. Anything that costs a scroll, a second tap,
a moment of reading or an animation to wait out gets killed. Seeded hero, three years of
history, English, 6.3 inch phone held one-handed: the comfortable zone is the bottom half of
the screen.

Fourteen findings, hardest first.

---

[shot] 09-quest-detail
[severity] blocker
[claim] A villager is standing on top of the Start button and on the level chips, so the last screen before I train is the one screen I cannot act on.
[evidence] The blacksmith is drawn from mid-screen to the bottom, in front of everything. "Start Quest" reads "S...Start Quest" with the figure's torso and axe across its left half, and the Level row behind him shows "Easy" and then nothing: the selected chip is under the speech bubble. The bubble itself, three lines of "Quests are your workouts. Pick one, and I'll see to the rest", is text I already know, drawn over the only part of the screen I came for. Same figure covers the whole second card in 08-quests. Whether he eats the tap or only hides it, I cannot tell from the shot, and between two sets I am not going to find out by experiment.
[fix] Never let a cameo intersect the primary CTA or the level row: constrain it to the region above the action zone, and make one tap anywhere dismiss it immediately.

[shot] 29-session-active
[severity] blocker
[claim] The screen shows a number climbing and never says what number I am climbing to, so I cannot pace the hold or know when to stop.
[evidence] The biggest thing on screen by far is "0:23", under it "Seconds", under that "Keep going! Timer continues after target." The target is never printed. The quest screen said 30s, this screen does not repeat it. The two progress bars do not stand in for it either: here the bar under the title is about a quarter full at 0:23, and in 36-boss it is over half full at 0:12, so it is not the hold. So the only way to know when to stand up is to remember a number from a screen two taps back.
[fix] Print the target next to the count: "0:23 / 30s", with the target in the secondary colour. Nothing else on this screen needs to move.

[shot] 29-session-active
[severity] friction
[claim] "Replace" and "I couldn't do this one" sit in the landing zone of the thumb that hammers Done, one line above it.
[evidence] "Done" is the full-width purple bar at the very bottom. The gap above it holds two tappable grey texts, and my thumb arrives from below at speed with a bar to get back under. The two of them share one row, so the left half of the line under Done is "Replace" and the right half is "I couldn't do this one": nothing about a mid-set mis-tap should change what I am doing or write a failure.
[fix] Move both into the pause overlay, which already exists and already has room. If one must stay on the running screen, put it above the "Last time / best" row, a full block away from Done.

[shot] 36-boss
[severity] friction
[claim] On a boss quest the largest name on screen is the monster's, and the movement I am doing has been demoted to a small row with a thumbnail.
[evidence] The dragon owns the top 45% of the screen, "Nightcoil" is set at the size "Wall Sit" had in 29-session-active, and "Wall Sit" here is a small line under it beside a 40px thumbnail. Its boss HP, "422 / 425", is small grey text on art. So the two readings that matter, which movement and how far in, are both smaller than a decorative title, and I lose a second re-finding the exercise name every time I look up.
[fix] Cap the boss band at a strip: art thumbnail, name, HP bar, one row. Give "Wall Sit" the title treatment it has on the non-boss screen.

[shot] 01-home-top
[severity] friction
[claim] The one big button on Home does not start anything, it opens a page about the thing it could have started.
[evidence] "See the quest" is the only filled purple element on the screen, under a hero image, a title, "3 exercises - Circuit - ~10 min" and a yellow line about my weak points. Everything needed to decide is already on that card, and I decided before I unlocked the phone. So the hurried path is: tap, wait for a screen with the same image again, scroll or not, tap Start. Two taps and a page load to repeat what Home already told me.
[fix] Make the Home CTA "Start", since the card already carries the config it would start with, and demote "See the quest" to a text link on the same card.

[shot] 10-quest-detail-scrolled
[severity] friction
[claim] Finding out which three movements this quest contains costs a scroll past everything I did not ask for, and each one is a paragraph.
[evidence] Above the fold on 09-quest-detail there is not one exercise name: image, title, three lines of flavour, four chips, the level row, all before "Exercises". When I get there, one exercise is a card the height of a third of the screen: number, name, "Working up to Squat", a thumbnail, three lines of how-to, then "Last: 39s", "No equipment", "Legs". Three of those and the list alone is two screens. The one thing I want off this list, name plus target plus what I did last time, is present but diluted across six elements.
[fix] Collapse each exercise to one row: name, target, "Last: 39s". Tap the row to expand the art and the how-to for whoever needs it.

[shot] 08-quests
[severity] friction
[claim] The same quest tells me two different durations and two different XP figures depending on which screen I read it from, and duration is exactly what I am budgeting.
[evidence] The list card reads "~ 12 min" and "up to +140 XP". Tap it and the detail reads "~ 10 min" and "up to +70 XP" (09-quest-detail), and Home reads "~ 10 min" again with no XP at all. The level chip on the detail is "Medium" and the header pill also says "Medium", so nothing visible on either screen explains the gap. With half an hour left, a two minute swing and a doubled reward are the difference between doing this quest and doing another.
[fix] Make the list card read the same saved config the detail reads, so one quest shows one duration and one XP everywhere.

[shot] 35-boss-narrative
[severity] friction
[claim] A story modal lands between me and the quest I already chose, and the loud button is the one that takes me further away.
[evidence] "Start Quest" is greyed out behind the overlay. In front: "The Druid's Path", two sentences of narration, then a full-width purple "Begin Adventure" and a small "Not now" under it. The purple one is not what I opened this screen for, and the way out is the quietest thing in the dialog. Between two sets I read two sentences to decide about a thing I did not ask about, then aim for the small text.
[fix] Do not raise the adventure offer on entry to a quest screen. Put it on Home, or on the post session screen where there is time to read it.

[shot] 28-session-warmup
[severity] friction
[claim] Five warm-up exercises sit between my tap and the first working set, and the way past them is the smallest, dimmest text on the screen.
[evidence] "0:08" is the biggest thing, "1 of 5" is small grey text between two circular arrows, and "Skip warm-up" is plain grey body text at the very bottom with no button shape, no border, no fill. Nothing says how long the whole warm-up is, so "1 of 5" is a countdown of unknown length. I warmed up before I opened the app.
[fix] Give "Skip warm-up" a button outline so it reads as a control, and put the total beside the counter: "1 of 5 - 2:30 left".

[shot] 29-session-active
[severity] friction
[claim] Two progress bars, neither labelled, and neither of them is the one I want.
[evidence] A thin bar under "ROUND 1 / 3 - EXERCISE 1 / 3" at the top, with "11%" beside it. A second, thicker purple bar under "Wall Sit". At 0:23 the second is about a quarter filled; in 36-boss it is over half at 0:12, so it is not the hold and not the same scale as the 33% in that header either. So there are two bars competing for a glance, both out of thumb reach at the top, and the hold I am actually in has none.
[fix] Keep the round bar at the top and turn the second one into the hold's own progress, filling toward the target the timer is counting to.

[shot] 33-victory
[severity] friction
[claim] The resume card asks me to decide about an abandoned session without telling me when I abandoned it.
[evidence] "Resume workout?", "You have an unfinished session", then "Chop Wood / Progress: Round 1/3, Exercise 1/3 / Time: 0:55". Three numbers, no date. Resuming something from five minutes ago is right, resuming something from Tuesday is wrong, and the card puts "Resume" in the loud purple either way. The whole thing also sits above the quest card, so the thing I opened the app to do is now pushed down the page.
[fix] Add the age to the card: "left 18 h ago". One line, and the Discard / Resume choice answers itself.

[shot] 30-session-instructions
[severity] polish
[claim] Reading the how-to costs a pause, a modal, and the timer, to show me the picture that was already on screen.
[evidence] The dialog is the same Wall Sit art that fills the top of 29-session-active, at half the size, plus the same two lines of description the quest screen carried, plus "Close". Behind it, "Game Paused" and "Quit Quest" are visible through the scrim, so I am now one stray tap from ending the session. The one new thing on this dialog is the sentence.
[fix] Make it a bottom sheet with the text, no repeated art, over the running screen with the timer still visible.

[shot] 12-exercise-detail
[severity] polish
[claim] The page for a movement carries no number from my own three years and no way to do the movement.
[evidence] Art, name, six lines of description, "No equipment", "tempo 3s/rep", three muscle chips, and a ladder saying "RUNG 1/5 - You are on Wall Push-Up". Nothing about what I lifted, held or repped last time, though the session screen has "Last time 39s - best 45s" for exactly this. No action either: no start, no add to a quest. It is a reference page in an app whose whole point is my history.
[fix] Put the "Last time / best" row under the title, taken from the same source the session screen reads.

[shot] 02-home-scrolled
[severity] polish
[claim] Career totals get a row in the main column on the screen I open between sets.
[evidence] "547 Quests" and "67.0k XP" sit in the middle of the scroll, at body size with two icons, between "Swear an oath" and the village strip. Neither number changes anything I am about to do, and both are pure retrospection on the one screen whose job is the next forty seconds. The village strip pinned at the bottom of the scroll spends another band of the thumb zone on "Eternal Capital - Level 44", which is also not an action.
[fix] Move the totals to the Journal tab, where looking back is the point.

---

## Not auditable from the set

`13-quest-editor.png` shows the Expo dev-client menu ("Bati, Runtime version 2.2.0", Reload,
Go home, Tools) over the Quests list, not the quest editor. No finding either way.
