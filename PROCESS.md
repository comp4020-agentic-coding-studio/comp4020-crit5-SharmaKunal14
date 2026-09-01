# Process overview

## What I built

A five-shot penalty shootout. You aim by hovering over the goal — the mouse
position maps straight onto a six-zone target grid — then hold spacebar (or
the pointer) to charge an oscillating power meter, and release to strike. The
keeper paces the goal line the whole time you are aiming, and when you strike
it dives from wherever it happens to be — covering only as much ground as its
own top speed and the ball's flight time allow. A fierce shot away from it is
a goal because it physically cannot get there; a limp one hands it all the
time it needs; one held too long clears the bar entirely. Lean on the same
corner twice and it starts guessing that way, though guessing right and
arriving in time remain two different things. No screen ever explains any of
this — the opening frame is a ball on the spot, a goal, and a keeper already
moving.

## The moments that mattered

1. **Choosing what "power" means.** The brief only said "spacebar decides
   power." A single press-to-set-a-level felt thin for a five-minute game, so
   I went with hold-to-charge/release-to-fire instead — it turns the same one
   input into a timing skill, and it creates a failure mode that's entirely
   the player's own mistake (over-holding sails the ball over the bar) rather
   than only ever "the keeper guessed right." That's what makes the loss
   condition feel earned rather than arbitrary.
   [`c770dfd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/c770dfd)

2. **Separating the rule from the DOM.** `resolveShot`/`chooseKeeperZone` live
   in `game-logic.ts` with no DOM, timers, or randomness — pure functions of
   (zone, power, keeper history). That's what let me write a focused,
   deterministic test for the one rule the spec asks for, and it's what let me
   reason about edge cases (a weak shot next to the keeper vs. a well-struck
   one) as plain data before wiring any pixels to it.
   [`c770dfd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/c770dfd)

3. **The reticle bug only playing found.** `tsc`, `vite build`, and all 25
   tests were green after the first full build, but a headless-Chromium
   screenshot of the actual running page showed a stray circle sitting in the
   top-left corner before the first mouse move — the reticle defaults to
   `(0, 0)` until JavaScript positions it, and nothing in the test suite
   exercises "before any input happens." No unit test would have caught this;
   it took looking at the rendered frame. Fixed by hiding it via opacity until
   the first `pointermove`.
   [`1bc9ebf`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/1bc9ebf)

4. **The change that came from playing the finished game.** Every check was
   green and the game was, in play, bad. I took aim, struck it, and the pip
   went red with no way to tell whether I had been beaten or cheated — because
   the keeper only appeared in its dive at the instant the ball left, so its
   position was never information I could act on. The obvious fix was to tune
   the numbers. Instead I changed the mechanic: the keeper now paces the line
   while you aim, and it dives to where it *will* be rather than where it
   stood — with the lead time scaled by release power, so a weak shot hands it
   more time to travel. That turned two independent inputs into one decision
   (which corner, and how much to lead it), which is what the brief means by
   mechanics that interact.

   I checked the balance rather than asserting it: two scripted players driven
   through real pointer and keyboard events against the built page. One always
   shoots the same corner, one reads the keeper's live position and varies.
   Careless scored 2/5 every run; careful scored 3–5/5. That gap is the
   evidence the skill is real and the loss condition is reachable — and it
   also caught two things I had not been looking for, a power meter whose
   colour bands scaled with the fill (so "the green zone" moved while you
   charged) and a scoreboard sitting over the goal frame where a filled pip
   was invisible.
   [`c163dc0`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/c163dc0)

5. **The correction that went into the harness rather than the fix.** Playing
   the reworked build turned up two bugs a green suite could never see. The
   keeper snapped sideways into its dive instead of diving: `.pacing` carries
   `transition: none` for the frame-by-frame walk, and dropping that class
   while moving the keeper in the same style batch leaves the transition with
   no start value. And a scored pip jumped out of the scoreboard row, because
   it was marked with `classList.add('goal')` — and `.goal` is the goalmouth's
   own class, so the pip inherited `position: absolute; top: 5%; left: 12%;
   width: 76%`.

   The second one is the one worth citing. Renaming the class to `pip--goal`
   takes ten seconds and teaches nothing. What I added instead was
   `spec/component-classes.test.ts`: a sensor that fails if any class the app
   toggles at runtime is also a class that positions an element. I checked it
   actually bites before trusting it — put the old name back, watched it go
   red with `expected [ 'goal' ] to deeply equal []`, then took it green. That
   file is harness, not a contract test: it answers no line of this week's
   spec, and it comes with me into next week's repo.
   [`2652d8f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/2652d8f)

6. **The rule was wrong, not the numbers.** Playing it again turned up the
   worst bug of the week: shoot the far corner at full power with the keeper
   standing at the opposite post, and it still got saved. The keeper appeared
   at the far post as the ball left. The cause was that my keeper was
   *assigned* a zone — if your habit said left, it was placed left, and
   distance simply never entered the calculation. The verdict was computed
   before anything moved, and the animation was a dramatisation of a decision
   already made.

   The fix was to delete the idea of assigning it anywhere. The keeper now has
   a position, a top speed, and whatever time the ball's flight gives it:
   `reach = flight(power) × speed`, and it gets `clamp(guess − from, ±reach)`
   of the way toward what it wants. A save became geometry — is the ball
   within the keeper's body radius of where it actually arrived — instead of a
   verdict. That also gave power a single legible job: it buys time the keeper
   doesn't get. And because the animation is driven by the same `flight(power)`
   through a `--flight` custom property, what you watch is the race the rule
   just resolved, not a re-enactment of it.

   I pinned the bug rather than just fixing it: `spec/shot-resolution.test.ts`
   now asserts that a keeper at one post cannot reach the other against a firm
   shot, that it can when the striker gives it the time, and that it never
   travels further than its reach in either direction. Then I measured the
   real thing — keeper eases 1.81 → 0.78 columns while the ball crosses to
   0.00, and the ball wins.
   [`40ebe23`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/40ebe23)

## How I directed, grounded, and corrected the work

I specified the mechanic myself (striker/keeper, hover-aim, spacebar-power)
before any code was written, and asked for it to be evaluated against the
brief before a line was committed — direction and power as two independent
one-shot inputs read as a ten-second toy, so the design changed to a timed
hold-and-release while it was still cheap to change.

I grounded correctness in two separate things, and needed both. `pnpm check`
covers the rule: `resolveShot` and the keeper's decision are pure functions in
`game-logic.ts` with no DOM, timers or randomness, so they can be asserted
directly. But the suite was fully green on a build that was no fun to play,
which is exactly the split the brief is pointing at. The second ground was
driving the built page in a real browser — pointer and keyboard events,
screenshots at each step, both marking viewports — and then, past that, two
scripted players of different quality to see whether the skill gap the design
promised actually existed.

The correction that mattered is moment 4: the first build's failure was
diagnosable only by playing it, and the fix was to the mechanic rather than to
the constants. The cheaper move was available and I can name why I didn't take
it — tuning the numbers would have made an unreadable keeper easier to beat,
not readable.
