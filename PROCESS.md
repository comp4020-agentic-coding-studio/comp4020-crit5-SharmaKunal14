# Process overview

## What I built

A five-shot penalty shootout. Hover to aim, hold spacebar and release to
strike. The keeper paces the line while you aim, then dives from wherever it
is — covering only the ground its top speed and the ball's flight time allow.
So power buys exactly one thing: time the keeper doesn't get. Nothing on
screen explains any of it.

## The moments that mattered

**The rule was wrong, not the numbers.**
[`40ebe23`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/40ebe23)
Playing it, I hit the far corner at full power with the keeper on the opposite
post — and it still saved. My keeper was *assigned* a zone from shot history;
distance never entered the model, so the verdict preceded the ball and the
animation just dramatised it. I replaced placement with physics:
`reach = flight(power) × speed`, and a save became geometry rather than a
ruling. The animation is driven by that same `flight(power)`, so what you watch
is the race the rule resolved. Tests pin it: a keeper at one post cannot reach
the other against a firm shot, and can when given the time.

**A correction that went into the harness.**
[`2652d8f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-SharmaKunal14/commit/2652d8f)
A scored pip leapt out of the scoreboard — marked with `classList.add('goal')`,
and `.goal` is the goalmouth's class, so it inherited `position: absolute`.
Renaming it teaches nothing, so I added `spec/component-classes.test.ts`: it
fails if any class toggled at runtime also positions an element. I checked it
went red on the old name before taking it green.

## Grounding

`pnpm check` was fully green on a build that was miserable to play — which is
the split this brief is about. So I also drove the built page in a real browser
at both viewports, and raced a careless player against a careful one to test
the skill gap rather than assert it: 3/5 against 4–5/5.
