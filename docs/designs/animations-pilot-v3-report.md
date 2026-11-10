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
