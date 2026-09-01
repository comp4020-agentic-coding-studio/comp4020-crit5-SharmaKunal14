// Pure game logic for the penalty shootout: no DOM, no timers, no randomness.
// Kept separate from main.ts so the core rules can be unit tested directly.
//
// The governing idea is that the keeper is never *placed* anywhere. It has a
// position, a top speed, and however long the ball is in the air --- and it
// gets wherever those three allow. A save is then a consequence of the
// geometry rather than a verdict handed down before the ball moves.

export type Column = 0 | 1 | 2; // left, center, right
export type Row = 0 | 1; // low, high

export interface Zone {
  col: Column;
  row: Row;
}

export type ShotQuality = 'weak' | 'good' | 'over';

export type ShotOutcome = 'goal' | 'save' | 'miss';

// How quickly the keeper can travel along its line, in columns per second.
//
// This number is load-bearing, and it is not a taste setting. The goal is two
// columns wide, so the constraint is:
//
//   a well struck ball into the far corner must ALWAYS beat it
//     -> reach < 2 - 0.58   at the fastest good shot   -> S < 1.99
//   a limp one into the far corner should NOT
//     -> reach >= 2 - 0.95  at the slowest weak shot   -> S >= 1.47
//
// An earlier value of 2.45 sat outside that window and let the keeper cross
// the entire goal in 816ms, so any shot at half power was caught in the
// opposite corner --- the ball went one way, the keeper went the other, and
// it still saved. The pacing walk is slowed to match (see PACE_CYCLE_MS): a
// keeper that strolls faster than it dives reads as broken even when the
// arithmetic happens to work out.
export const KEEPER_SPEED = 1.6;

export const FASTEST_FLIGHT_MS = 340;
export const SLOWEST_FLIGHT_MS = 820;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// The power meter oscillates 0-100; the value at release decides shot quality.
export function shotQuality(power: number): ShotQuality {
  if (power > 95) return 'over';
  if (power < 22) return 'weak';
  return 'good';
}

// How long the ball is in the air. This is the only thing power really buys
// you: time the keeper doesn't get.
export function flightMs(power: number): number {
  const t = clamp(power, 0, 100) / 100;
  return SLOWEST_FLIGHT_MS - (SLOWEST_FLIGHT_MS - FASTEST_FLIGHT_MS) * t;
}

// Ground the keeper can cover while the ball travels, in columns.
export function keeperReach(flight: number, speed = KEEPER_SPEED): number {
  return (flight / 1000) * speed;
}

// A column the striker has leaned on hard enough for the keeper to notice.
export function favouriteColumn(history: Zone[]): Column | null {
  if (history.length < 2) return null;

  const counts = [0, 0, 0];
  for (const zone of history) counts[zone.col] += 1;

  const max = Math.max(...counts);
  const leader = counts.indexOf(max) as Column;
  const runnerUp = Math.max(...counts.filter((_, i) => i !== leader));

  return max > runnerUp ? leader : null;
}

export function favouriteRow(history: Zone[]): Row {
  const high = history.filter((zone) => zone.row === 1).length;
  return high * 2 > history.length ? 1 : 0;
}

// Where the keeper *wants* to be. A read, not an outcome --- it may be
// nowhere near able to get there.
export function keeperGuess(history: Zone[], driftTo: number): number {
  return favouriteColumn(history) ?? driftTo;
}

// Where it actually ends up: it sets off from `from` toward `guess` and gets
// as far as `reach` allows. This is what stops the keeper materialising at the
// far post: wanting to be there and being able to reach it are different.
export function keeperCommit(from: number, guess: number, reach: number): number {
  return clamp(from + clamp(guess - from, -reach, reach), 0, 2);
}

// How wide a net the keeper's body casts, in columns. A slow ball lets it
// smother far more than a dead hand does; guessing the wrong height leaves it
// only whatever it can stick out on the way past.
export function saveRadius(quality: ShotQuality, rowMatches: boolean): number {
  const base = quality === 'weak' ? 0.95 : 0.58;
  return rowMatches ? base : base * 0.42;
}

// The rule under test. Note what it takes: the keeper's *actual* position, not
// a zone it was assigned.
export function resolveShot(
  zone: Zone,
  power: number,
  keeperPosition: number,
  keeperRow: Row
): ShotOutcome {
  const quality = shotQuality(power);
  if (quality === 'over') return 'miss';

  const radius = saveRadius(quality, keeperRow === zone.row);
  return Math.abs(keeperPosition - zone.col) <= radius ? 'save' : 'goal';
}

// The keeper's continuous position along the goal line, in column units
// (0 = left post, 2 = right post), as a function of elapsed time.
export function pacePosition(elapsedMs: number, cycleMs: number): number {
  const t = (elapsedMs % cycleMs) / cycleMs;
  return 1 + Math.sin(t * Math.PI * 2);
}

export function paceColumn(position: number): Column {
  return clamp(Math.round(position), 0, 2) as Column;
}
