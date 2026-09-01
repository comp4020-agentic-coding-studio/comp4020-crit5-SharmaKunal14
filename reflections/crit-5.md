# Crit 5 reflection — A game

**What was the breakthrough that moved the work forward?**

The breakthrough came from the version that didn't work. My first build did
exactly what I'd specified — hover to aim, hold and release for power — and
playing it was miserable. I took aim, struck it, and the pip went red with no
way to know whether I'd been beaten or robbed. The keeper only appeared in its
dive at the moment the ball left, so where it stood was never something I
could use. The fix I reached for first was to make the numbers kinder. The fix
that actually worked was to make the keeper *visible*: it paces the line while
you aim, and it commits to where it will be rather than where it was, with the
lead time set by how hard you struck it. That last part is what tied the two
inputs together — the corner and the power stopped being separate decisions.
The breakthrough was recognising that "this feels unfair" was a design report,
not a difficulty complaint.

The same lesson arrived again, harder, at the end of the week. A shot into the
far corner at full power was still being saved by a keeper standing at the
opposite post — because I had written a keeper that gets *assigned* a corner
rather than one that has to travel to it. Distance was simply not in the
model. Fixing it meant giving the keeper a speed and letting a save be
geometry, which is the version I should have written first: the rule now
describes the situation instead of announcing the result.

**What did this work change about who I want to be as a software developer?**

It put a hard edge on how much a green suite is worth. Every check passed on a
build that was genuinely bad to play — and the tests weren't wrong, they were
answering a different question than the one that mattered. What I want to
carry is the habit of pairing them: assert the rule, then go and use the
thing, and treat the second as non-optional rather than as confirmation. I
also want to keep the move I made at the end — instead of claiming the balance
felt right, I ran a careless player and a careful one through the real page
and compared their scores. Turning a judgement I'd otherwise have asserted
into something observable is the part of this week I'd want to repeat.
