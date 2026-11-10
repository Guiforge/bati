# Animated exercise illustrations, pilot v3: report

Date: 2026-11-10. Branch: worktree-better-image. Script: `scripts/anim-pilot-v3.py` (page template
`scripts/anim-pilot-v3-page.html`). All output in `~/.cache/bati-anim-pilot-v3/` (ledger
`pilot-ledger.json`, signed originals in `originals/`, motion sheets in `motion/`, scores in
`scores/`). Nothing in `assets/` or `scripts/provenance.json` changed. The comparison page, with
the picks, is the private artifact "Bati Motion Pilot".

## Recommendation

- **Catalogue format: the flip-book with hard cuts**, with the comic strip as the reduced-motion
  fallback, and video only as an upgrade where an exercise passes its audit.
- **Why.** Across the auditors and exercises, hard cuts got 14 of 15 "useful" votes. The art
  director rejected the fades on all five exercises for ghosted double exposures. Hard cuts need
  nothing beyond the drawn key poses.
- **Cost.** 0.32 $ per accepted drawn pose, failures included: about 30 $ and +1.4 Mo for the 47
  moving exercises. Video adds 0.60 $ and about 75 Ko per exercise, and 1 of 3 videos failed.

## What was done

Exercises: dips, chin-ups, push-ups (the control) and Cat-Cow. Thread the Needle was added too,
since the budget allowed it after those four.

1. **Motion sheets.** One per exercise: 4 to 5 key poses, checkpoints, what never moves, tempo
   and camera. Audited by a coach and a beginner, both passing by round 2.
2. **Mannequin key poses.** Built on each still's own geometry (`EXERCISES` in the script):
   onion skin and stick flip-book at the real tempo.
   - Push-ups needed 4 rounds instead of the 3 allowed.
   - Dips: the coach passed them in round 4; the beginner still read the stick top as sitting on
     the bar.
   - Thread the Needle: the coach passed it; the beginner blocked it because a stick figure
     cannot show the chest turning.
   - Both went to drawing anyway: those blocks were about what a stick figure can show.
3. **Drawn key poses,** each an edit of the still with the mannequin as pose guide.
   - Routes: F (`flux-3-image`) and O (`gpt-image-2.5-sunburst`, quality high).
   - Every candidate was scored blind on pose, style, fixed points and anatomy, and accepted at 4
     or more on every line.
4. **Flip-books, made for all five exercises.**
   - Fade (150 ms cross-fades): 112 Ko on average.
   - Hard cuts: 29 Ko.
   - Comic strip: 26 Ko.
   - One WebP per pose at 512 px: 16 Ko.
5. **Video.**
   - `flux-3-video`, i2v, draft, 1:1, 5 s, no audio, every key pose as a keyframe.
   - 2 drafts per exercise, but only for the exercises whose key poses were all accepted:
     push-ups, Cat-Cow and Thread the Needle.
   - The kept draft is encoded as MP4 H.264 at 384 px (CRF 28) and as animated WebP at 12 fps.
6. **Final audit.** A coach, a beginner and an art director filled the checklist for every
   format; disagreements are kept as they are on the page.

## Results

| Exercise | Drawn poses | Route | Video | Claude's pick |
|---|---|---|---|---|
| Dips | top only; halfway failed 6 times | F | not made (rule) | strip |
| Chin-ups | hang only; halfway failed 6 times | O | not made (rule) | strip |
| Push-ups | halfway and bottom | O | d2 of 2, every line passed | cuts (ties with video at 28 Ko vs 61) |
| Cat-Cow | neutral and cow | O | d2 of 2, every line passed | video (the only cat the coach accepts) |
| Thread the Needle | tabletop and open | O | removed (keyed on the wrong-arm pose) | cuts |

Thread the Needle was fixed after Guillaume's review of the flip-book. The open pose raised the
wrong arm: the mannequin had the threading arm on the near side, but in A it is the far one. The
drawn poses also sat about 250 px lower than A (1024 scale), so the body jumped at the loop. The
fix:

- The open pose was redrawn with the far arm raised.
- For the flip-book only, the drawn poses move up 55 px and A moves down 200 px, so the knees,
  feet and planted hand stay put.
- The final checklist was filled before this fix.

Videos were then made on request for chin-ups and Thread the Needle, 2 drafts each, 1.20 $. Only
the coach audited them.

- **Chin-ups:** keyed on the two end poses only (hang, top, hang). Draft 2 does one clean rep and
  passes every line; draft 1 did two pulls with a leg swing.
- **Thread the Needle:** keyed on the corrected poses. Draft 4 has the right arm and holds its
  timing. It fails style and fixed points because the still's lighter background comes in at
  2.2 s.

Ledger total after these videos: 5.67 $.

- **Candidates:** 41 in total (16 F, 25 O) for 8 accepted drawn poses. Accepted per route: F 1
  of 16, O 7 of 25.
- **Spend:** 4.33 $ of the 15 $ cap. That breaks down into 2.53 $ for poses (BFL 2.57 $ and
  OpenAI 1.76 $ across poses and video) and 1.80 $ for 6 video drafts at 0.30 $ each, read from
  the balance because the API returns no cost field.
- **Not done:** no HD enhance, because no draft clearly beat its flip-book.

## Findings

- **Middle poses are the hard part.** With the still as image 1, both models anchor to its pose:
  0 of 12 halfway candidates passed for dips and chin-ups, even with the other end pose as a third
  reference. Distinct positions drew fine (the cow, the open arm).
- **OpenAI moves the frame.** It slid the chin-up scene up 113 px and the dip scene 40 to 76 px.
  The script measures the offset on the bars' row profile and undoes it for free. FLUX never moved
  the frame.
- **Editing from the nearest accepted pose works.** Thread the Needle's tabletop, edited from its
  open pose, passed on the first retry.
- **FLUX 3 Video does not hold keyframe times.** One draft did two reps, another raised the arm
  twice. Seam SSIM between first and last frame: 0.82 to 0.97.
- **Animated WebP is the wrong container for video:** 4 to 7 times the MP4's weight.
- **Camera and still findings:**
  - Chin-ups: the grip direction can't be read from the front at 180 px, and the still is framed
    so tight that the dead hang leaves the frame.
  - Cat-Cow: the still's cat is under-rounded.
  - Thread the Needle: the still is a tangle at 180 px.

## For the full run

- **End poses only** for exercises that travel vertically. Keep a middle pose only where it is a
  distinct position.
- **Route O by default,** with the offset check run on every candidate before scoring.
- **Edit from the nearest accepted pose,** not always from the still.
- **Fix framing first:** frame stills for the whole movement, and redraw the stills the auditors
  flagged.
- **Formats:** MP4 for video, and strips of 3 panels at most for 180 px.

## Full run (same day, after Guillaume approved the plan)

The plan: hard-cut flip-books for every moving exercise, and a video only where it passes the
audit. The cap was 60 $ on top of the pilot. The run went in five lots, each with this sequence:
guides, OpenAI edits, blind scoring, up to two retries, flip-books, two video drafts, a coach
audit of the videos, and a final checklist from three auditors.

| | Exercises |
|---|---|
| Attempted (pilot 5 + 37) | 42 |
| Animated as flip-books | 34 |
| With a kept video | 30 |
| Failed after retries, keep their still | 8: knee push-up, calf raise, crunch, bicycle crunch, towel door row, bear crawl, flutter kicks, world's greatest stretch |
| Not attempted | 7: windshield wipers (side camera hides the sweep), muscle-up, burpee, jumping jack (the still already shows two heroes), superman (a hold), wrist circles (a circle), warden's walk (a landscape) |
| Holds and stretches, still by plan | 17 |

Ledger total: 30.16 $ (pilot 5.67 $, full run 24.49 $).

What the full run showed:

- **End poses work.** Most first tries passed when the pose to draw is the other end of the
  movement.
- **Side swaps fail.** When the other pose means swapping legs, or swapping the hand-and-foot
  pairs, both models redraw A. This failed for the bicycle crunch, bear crawl and flutter kicks,
  all seen from the side. It worked twice, both from the front: skater hop and high knees.
- **Fixed points are the usual reason for a fail.** The pose comes out right but a foot or hand
  slides 20 to 50 px.
  - When OpenAI slides the whole frame, it is measured on the bars and undone for free.
  - On floor exercises the slide is in the body itself, and cannot be undone.
- **Zooming A out in its frame lets standing and hanging poses fit.** This is done for the
  flip-book only; the still in the app does not change. It was used for squat, lunge, curtsy,
  hanging leg raise, negative pull-up and toes to bar.
- **Video timing is often off.** The coach found the timing off by half a second to a second, and
  a few drafts doing two reps. Videos were kept for 30 of the 34 animated exercises.
- **Stills to redraw before the next pass:** squat (half depth), curtsy (not crossed), cat-cow
  (shallow cat), chin-up top, and the five exercises whose still could not be animated.

Deviations from the protocol:

- The mannequin guides of the full run were not audited separately; the pose scorer sees them.
- Bear crawl, flutter kicks and world's greatest stretch stopped after one retry instead of two,
  because the same failure came back on both routes.
- The towel door row got a second, independent scoring. I thought the overlay looked aligned; the
  second scoring was stricter.

## v2 redo (same day, after Guillaume's review)

Guillaume went through the page exercise by exercise. He picked formats for the ones that work,
asked for redraws of the rest, a better mannequin, the pistol squat, and the Towel Door Row out of
the sessions.

**Mannequin v2.** Poses are now written as joint angles (forward kinematics, `fk()` in the
script) rather than hand-placed points, so bones keep their length from pose to pose. It has:

- a 9-point spine with chest and pelvis blocks;
- a neck, and a nose wedge that shows where the head looks;
- joint dots, plus hands and feet;
- rings on the points that never move.

**New route: redraw the still too.** Image 1 is the mannequin and image 2 the shipped still, used
only for the hero and the style. The new still is scored blind, then the other key pose is
edited from it as before.

**Mirror for the other side.** In a front or top view, the other side of the movement is the
still flipped: free and exact. This fixes the side swap that both models keep failing.

| | Exercises |
|---|---|
| Redrawn from scratch, still included | 12: wall push-up, pike push-up, inverted row, Bulgarian split squat, crunch, reverse crunch, superman W, mountain climber, bicycle crunch (seen from above, mirrored), skater hop (front, mirrored), high knees (front, mirrored), and the dip's bottom |
| Fixed on the old still | cat-cow (gentle cow, deep cat), single-leg glute bridge (the guide had the legs swapped), knee push-up, world's greatest stretch |
| New | pistol squat |
| New videos kept after the coach's audit | 16 |
| Still failing after 2 retries | calf raise (feet slide), dead bug's other side (the arms never swap), flutter kicks (the legs never swap), bear crawl (hands slide) |

Ledger total: 44.26 $ of the 65.67 $ cap (v2: 14.10 $). Three video drafts hit HTTP 429 when
batches ran in parallel. They were not billed, and one batch at a time avoids it.

What v2 showed:

- **A new still beats an edit of a bad one.** 9 of 12 fresh stills passed by the second try.
  The failures were mostly my own guide's mistakes.
- **Side swaps seen from the side still fail,** even with colour-coded near and far limbs and
  explicit text. Mirroring a front view is the way around it, wherever the camera allows it.
- **The archer video** keeps the feet still now, but it does two reps instead of one. Guillaume
  can compare it with the old video.

Deviations:

- Two calls went against the blind scorer. The inverted row still: my guide put the bar too
  low, and the drawings were right. The Bulgarian top: the sheet's checkpoint asked for the rear
  knee pointing down, which is wrong at the top.
- The world's greatest stretch mannequin was not shown to Guillaume before drawing. The scorer
  saw it.
- Only the coach audited the new videos; the three-auditor checklist covers the old media only.
- Towel Door Row: retired in the app on its own branch `retire-towel-door-row`, not merged. The
  Cellar Hauler quest now has Table Row twice.
