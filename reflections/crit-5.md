# Crit 5 reflection — A game

**What was the breakthrough that moved the work forward?**

The breakthrough was rejecting my own first idea before building it. "Hover to
aim, press spacebar for power" is a fine skeleton, but taken literally it's two
independent one-shot inputs — obvious in ten seconds and forgotten by twenty.
Turning spacebar into hold-to-charge/release-to-fire didn't add a new input;
it made the existing one carry a timing skill, and it gave the game a genuine
way to lose that isn't just "the keeper happened to guess right" — over-hold
and you beat yourself. That reframing is what made the five-minute test
plausible at all, and it came from being willing to critique the brief I'd set
myself rather than defending it.

**What did this work change about who I want to be as a software developer?**

It sharpened how much I trust a green check suite on its own. Everything —
typecheck, build, all 25 tests — passed on the first full build, and the game
still had a visible bug: a reticle circle sitting in the corner before any
input, because nothing in the test suite exercised "before the user has done
anything." Only actually driving the built page with a headless browser and
looking at the screenshot surfaced it. I want to keep treating "the tests are
green" and "I watched it run" as two separate, both-required steps, not as the
second following automatically from the first — especially for anything
judged by feel rather than by assertion.
