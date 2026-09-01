# Crit 5 reflection — A game

**What was the breakthrough that moved the work forward?**

Both breakthroughs came from the versions that didn't work. The first build did
exactly what I'd specified — hover to aim, hold and release for power — and
playing it was miserable: the keeper only appeared in its dive as the ball
left, so a red result was indistinguishable from an unfair one. Making the
keeper pace the line turned its position into something I could read.

The second was worse and more useful. A shot into the far corner at full power
was still saved by a keeper standing at the opposite post, because I had
written one that gets *assigned* a corner rather than one that has to travel to
it. Distance was not in the model at all. Giving the keeper a speed, and
letting a save fall out of the geometry, is the version I should have written
first — the rule now describes the situation instead of announcing the result.

**What did this work change about who I want to be as a software developer?**

It put a hard edge on what a green suite is worth. Every check passed on both
bad builds. The tests weren't wrong; they were answering a narrower question
than the one that mattered, and nothing warned me of the gap. What I want to
carry is treating "the tests pass" and "I used the thing" as two separate
obligations. I also want to keep the move I made at the end: instead of
claiming the balance felt right, I ran a careless player and a careful one
through the real page and compared their scores. Turning a judgement I'd
otherwise have asserted into something observable is the habit worth keeping.
