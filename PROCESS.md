# Process overview

## What I built

A five-shot penalty shootout. You aim by hovering over the goal — the mouse
position maps straight onto a six-zone target grid — then hold spacebar (or
the pointer) to charge an oscillating power meter, and release to strike. The
keeper paces the goal line the whole time you are aiming, and dives to where
it will be when the ball arrives: a fierce shot gives it almost no time to
travel, a limp one hands it plenty, and one held too long clears the bar
entirely. Lean on the same corner twice and it starts camping there. No screen
ever explains any of this — the opening frame is a ball on the spot, a goal,
and a keeper already moving.

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
