# Process overview

## What I built

A five-shot penalty shootout. You aim by hovering over the goal — the mouse
position maps straight onto a 6-zone target grid — then hold spacebar (or the
pointer) to charge an oscillating power meter and release to strike. Too weak
and the keeper reaches the zone next to yours; too long a hold and the ball
sails over the bar; get it right and away from wherever the keeper's adaptive
AI has committed, and it's a goal. No screen ever explains this — the reticle
and the meter are the only feedback, and the opening frame is just a ball, a
goal, and an empty pitch.

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

## How I directed, grounded, and corrected the work

I specified the mechanic myself (striker/keeper, hover-aim, spacebar-power)
before any code was written, and pushed back on the agent's first-pass
critique of my own idea — direction+power alone read as a 10-second toy, so I
asked for a concrete change (timed hold/release) rather than accepting a vague
"add depth" gesture. I grounded every claim of correctness in something
observable: `pnpm check` for the logic and build, then an actual headless
browser driving real pointer/keyboard events against the built page at both
the desktop and phone marking viewports, screenshotted at each step, before
accepting the game as working. The correction that mattered was the reticle
fix above — caught by looking at the play, not by reading the diff.
