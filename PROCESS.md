# Process overview

## What I built

A five-kick penalty shootout. Hover to aim, hold spacebar and release to
strike. The keeper paces the line while you aim, then dives from wherever it
is — covering only the ground its top speed and the ball's flight time allow.
Power buys one thing: time the keeper doesn't get. Lean on one corner and it
starts reading you.

## The moments that mattered

**The rule was wrong, not the numbers — twice.**
[`40ebe23`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/40ebe23),
[`2acffae`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/2acffae)
Playing it, I hit the far corner with the keeper on the opposite post — and it
still saved. The keeper was *assigned* a zone from shot history; distance never
entered the model, so the verdict preceded the ball. I replaced placement with
physics: `reach = flight(power) × speed`, making a save geometry rather than a
ruling. Then it happened again, because I'd separately raised `KEEPER_SPEED`
to 2.45 by feel, letting it cross the goal in 816ms. That number is pinned at
both ends — under 1.99 or the far corner is never safe, over 1.47 or a limp
ball is never punished. My test had passed because it checked one power value;
it now sweeps the band and goes red at 2.45.

**A correction that went into the harness.**
[`2652d8f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/2652d8f)
A scored pip leapt out of the scoreboard: it was marked `classList.add('goal')`,
and `.goal` is the goalmouth's class, so it inherited `position: absolute`.
Renaming it teaches nothing, so I added `spec/component-classes.test.ts` —
fails if any class toggled at runtime also positions an element — and checked
it went red on the old name first.

**A feature built, then deliberately not shipped.**
[`a1ff40a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/a1ff40a)
I built a two-player mode — red against blue, alternating kicks, sudden death,
dead-rubber kicks skipped once a lead is out of reach. It needed a name-entry
screen, which made the opening frame a form rather than the pitch, against the
brief's *no instructions anywhere on screen*. I kept it in commits that revert
whole for exactly this reason, and reverted before shipping: the deployed
prototype answers the published spec, and the two-player work stays in the
history as something considered rather than something smuggled in.

## Grounding

`pnpm check` was green on a build that was miserable to play, which is the
split this brief is about. So I drove the built page in a real browser at both
viewports, and raced a careless player against a careful one to test the skill
gap rather than assert it: 3/5 against 4–5/5.
