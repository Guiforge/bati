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

## v3 (same day, Guillaume's second review)

Guillaume asked for eleven exercises to be redrawn "as if it were a new exercise", with no picture
of the old version: cat-cow, wall push-up, archer, pike, inverted row, curtsy squat, single-leg
bridge, bear crawl, flutter kicks, world's greatest stretch and pistol squat. He also asked for:

- the bicycle crunch, redrawn with the mannequin;
- more pictures for the reverse crunch, the dead bug and the mountain climber;
- a fix for the zoom on the superman W.

How:

- **A new still from the guide.** Image 1 is the mannequin, image 2 a style reference only (the
  squat still).
  - Every new still came out with the same heroine, the style reference's kind of hero.
- **The other key pose with the guide first.** Image 1 is the guide, image 2 the new still as the
  hero and the scene (`fresh_key`).
  - With the still first, both models copy its pose. With the guide first, the flutter kicks
    swap passed for the first time.
- **Slides undone by a fit.** `align_scale.py` fits a scale and a shift on the parts that never
  move, and applies them to the drawing. It was used for the superman reach (the "zoom" was a
  40 px slide), the pike top, the pistol top and the reverse crunch extension.

| | Exercises |
|---|---|
| Redrawn as new and animated | cat-cow, wall push-up, pike push-up, inverted row, single-leg glute bridge, pistol squat, bicycle crunch (from above, mirrored), flutter kicks |
| More pictures | reverse crunch (legs extended long, as a third phase), mountain climber (near knee, plank, far knee, plank) |
| Re-aligned | superman W, with a new video and no zoom |
| Failed, old version kept | curtsy squat (both models always draw a side lunge), archer (the plank seen from the front is never framed right), bear crawl next step, world's greatest stretch elbow down, dead bug other side (third failure) |
| New videos kept after the coach's audit | 10 |

Ledger total: 55.06 $ of the 65.67 $ cap (v3: 10.80 $).

Defects left:

- The pistol top's head touches the top edge.
- The reverse crunch's toes touch the right edge in the extension.
- The bicycle crunch and the flutter kicks videos do two cycles instead of one; they loop evenly.

## v4 and v5 (same day)

- **Anatomy rules for the mannequin**, written by a sub-agent:
  - joint ranges, bone lengths and the same bone length from key to key;
  - `check` and `selftest` commands;
  - paid calls refuse a guide that breaks a rule, unless `--force` is given;
  - all 75 existing guides pass, and 20 were fixed.
- **Male redo.** Guillaume asked for `gpt-image-2.6-sunburst` (`ANIM_OPENAI_MODEL`) and a male hero for pike, inverted row, cat-cow and bicycle crunch. The male hero comes from `ANIM_HERO` and a male style reference, the lunge still. All four are animated, with new videos.
- **New movements:**
  - jumping jack: front view;
  - windshield wipers: from above, the other side mirrored;
  - burpee: 4 poses;
  - standing calf raise: a full side view, which succeeded where the legs-only version had failed twice.
- **Burpee and the rules.** The squat breaks the hip-flexion limit (166 for 150): the chest really does go to the thighs. It was drawn with `--force`.
- **Small slides accepted over the scorer:** the jumping jack's closed pose and the calf raise's heels-down pose.
- **Bear crawl's next step:** failed a 6th time and stopped.
- **The BFL account ran out of credits.** HTTP 402 refused the videos of the jumping jack, calf raise and burpee, and nothing was billed. Their flip-books are done.
- Ledger total: 60.73 $ (cap raised to 75.67 $ by Guillaume).
- A web research note, from weak sources, is kept in the cache (`tools/research-notes.md`).

## v6: each gesture broken down before any video (2026-11-10)

Guillaume's third review asked for more pictures per movement before the video, a fix for the zoom
effect, and an audit. Exactness comes first, style second; the scoring brief now says so.

- **Where the "zoom" came from.** A new audit (`tools/vstab.py` in the cache) fits every video frame
  onto the first on a region that never moves. On the superman, the fault was in the stills, not in the
  video model: the reach pose was 7 % smaller than A. The video interpolated between the two, so it
  zoomed. The pose is now fitted on the legs. On the pike, the hands stayed put and the feet slid 21 px.
  That is the model inventing leg motion, which stabilising cannot fix. Every new picture is now fitted
  onto A before it is accepted (`tools/v6_align.py`). Only pike k1 and the reverse crunch extension
  needed it.
- **More pictures per gesture.** The in-between guides come from the same fk helpers, with their
  parameters interpolated, so bones keep their length and pins stay put. Mirrors are free for front and
  top views (`flop` command). Each exercise now has:
  - **Pike:** 6 pictures.
  - **Inverted row:** 4. The head is in line with the body and the face is up. There is a new top
    picture, and the bottom picture is drawn on it.
  - **Bicycle crunch:** 4, with a middle position.
  - **Jumping jack:** 4, with the arms level in the air.
  - **Windshield wipers:** 8, with half and vertical positions.
  - **Flutter kicks:** 4, with the legs crossing.
  - **Reverse crunch:** 6. The sequence now returns through the tabletop before the extension. The
    extension is at 40 degrees, because at 20 degrees the feet left the frame.
  - **Skater hop:** 4, with an airborne picture.
  - **World's greatest stretch:** 4, on the app's picture. The guides face left, and that hero has its
    own facing in the anatomy rules. The elbow-to-instep pose is dropped: it failed twice and was the
    picture that broke the end.
- **Reference poses.** The CC0 key poses of open-exercise-figures (`figures/*.json`, downloaded as data
  only) were read as references. Nothing from them is in the pictures. The other datasets cannot be used
  for the pictures:
  - **hasaneyldrm/exercises-dataset:** the media are (c) Gym visual, with permission to redistribute
    only. Its text is MIT.
  - **Open-Exercise-Art:** the artwork is GPL-3.
  - **free-exercise-db:** public domain, but not needed this round.
- **Picks:** 2 candidates per pose, gpt-image-2.6-sunburst, scored blind. Claude overrode the scorer
  twice:
  - **Inverted row bottom (N24):** the scorer gave every candidate a 3 for a slightly lifted chin. N24
    is the cleanest profile.
  - **Windshield wipers half-way (N21):** the retries bent the knees. N21 is straight but less
    foreshortened, and straight legs matter more.

  The skater's airborne picture keeps both arms wide (3 of 5, 4 tries).
- **Videos:** the BFL account is still at 0 credits. The site videos of these ten exercises no longer
  match their pictures, so they were set aside as `video_v5.mp4`.
- Ledger total: 63.41 $ (cap raised to 80.73 $ by Guillaume, 20 $ more on OpenAI).
- **Retry 2 (same day).** Three retries:
  - **Inverted row bottom:** N26 scored 4 on every line, with the head in line. It replaces N24.
  - **Skater hop airborne:** the guide now swings one arm across the chest. N26 scored 4 on every line.
  - **Windshield wipers half-way:** every retry still reads as bent knees, so N21 stays.

  Dead bug's other side failed a 5th time, guide-first included: the model keeps A's arms and legs.
  Ledger total: 63.97 $.

## v7: side swaps redrawn from above (2026-11-10)

- **Dead bug:** solved from directly above, after 5 failures from the side. It has a new A (male hero,
  try 2) and a start pose drawn guide-first. The other side is A mirrored. The loop has 4 pictures:
  start, one side, start, other side. The first A try put the straight leg on the same side as the
  overhead arm; the guide's left/right note fixed it.
- **Bear crawl from above:** rejected (blind score 1/5). Both tries read as a man climbing a wall. It
  keeps its v3 setup.
- Ledger total: 64.54 $.
- **Muscle-up (new):** the app's picture shows two panels with two different heroes, so the gesture was
  drawn from guides. It has 8 pictures: hang, pull, transition, dip bottom, lockout, then the same way
  down. The first lockout was drawn about 1.4 times larger than the guide. At that size the hang could
  not fit and the video would have zoomed. So A was scaled to 0.7 around the bar, an exact image
  operation, before the other poses were drawn. On the first try of the hang, the model moved the bar
  up. The retry, which says the bar never moves, kept it in place. Every pick scored 4 on all four lines
  of the blind score. The fit on the bar band was wrong (the band holds the arms and the head too), so
  the pictures stay as drawn: the scorer checked that the bar overlays A's.
- **Wrist circles** stay a still on purpose. The app's picture is a first-person view of two fists, the
  mannequin cannot guide a hand on its own, and the movement reads from the still and one line of text.
- Ledger total: 65.38 $.
- **Curtsy squat from behind:** rejected (blind score 1/5). Both tries are a diagonal lunge, with no
  crossing. Claude first read them as a crossing and was wrong. The curtsy keeps its v3 setup. From
  the front, from the side and from behind, the models do not draw a curtsy from a guide.
- Ledger total: 65.52 $.
- **Videos without BFL:** OpenAI's video endpoint answered 404 and the key lists no Sora or video model,
  so no clip was made and nothing was billed. The videos wait for a BFL top-up.
- **Key-pose videos (no model).** Each of the 12 reworked gestures now has an MP4 made only from its
  audited poses (`tools/keys_video.py` in the cache): every pose held, a 0.25 s cross-fade into the
  next, two reps, 384 px, 22 to 59 KB. Nothing is invented between poses, so nothing slides or zooms.
  They stand in until a BFL top-up makes the smooth model videos. The page says what they are.
- **Coach audit of the 12 key-pose videos** (blind, from 0.2 s control sheets): 11 kept outright. The
  coach rejected the bicycle crunch, reading the same side twice, and flagged that read as unsure.
  The file order is A (knee on the picture right), middle, A mirrored (knee on the left), middle, so
  the alternation is right. Claude kept it over the scorer.
- **Bicycle crunch re-audit:** a second blind coach, on a large sheet (one frame every 0.4 s), read the
  sides frame by frame. It confirmed the alternation (right, middle, left, middle, twice, loop closed)
  and kept the video. All 12 key-pose videos now pass the coach audit.
- **Bear crawl from the front:** the camera sits low in front of the head, and the next step is the
  picture mirrored. It is the first view that reads as a crawl. The best pair (N27) scored 3/3/4/3 blind:
  under the bar, because the hand-knee opposition is subtle. It is on the page marked "below the bar",
  for Guillaume to judge. 12 tries in all, from the side, from above and from the front.
- **Curtsy:** the lot 2 flip-book (crossed legs, edited on the app's picture) now has a key-pose video
  too. The redraw-as-new still fails.
- Ledger total: 65.95 $.
