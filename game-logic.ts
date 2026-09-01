// Pure game logic for the penalty shootout: no DOM, no timers, no randomness.
// Kept separate from main.ts so the core rules can be unit tested directly.

export type Column = 0 | 1 | 2; // left, center, right
export type Row = 0 | 1; // low, high

export interface Zone {
  col: Column;
  row: Row;
}

export type ShotQuality = 'weak' | 'good' | 'over';

export type ShotOutcome = 'goal' | 'save' | 'miss';

export function zonesEqual(a: Zone, b: Zone): boolean {
  return a.col === b.col && a.row === b.row;
}

function isAdjacentColumn(a: Zone, b: Zone): boolean {
  return a.row === b.row && Math.abs(a.col - b.col) === 1;
}

// The power meter oscillates 0-100; the value at release decides shot quality.
// The good band is deliberately wide: the skill this game asks for is reading
// the keeper, not hitting a 200ms window blind.
export function shotQuality(power: number): ShotQuality {
  if (power > 95) return 'over';
  if (power < 22) return 'weak';
  return 'good';
}

// The rule under test: given where the striker aimed, how hard they struck it,
// and which zone the keeper committed to, what happens?
export function resolveShot(zone: Zone, power: number, keeperZone: Zone): ShotOutcome {
  const quality = shotQuality(power);

  if (quality === 'over') return 'miss';

  if (zonesEqual(zone, keeperZone)) return 'save';

  // A weak shot is slow enough that the keeper can also smother the next zone over.
  if (quality === 'weak' && isAdjacentColumn(zone, keeperZone)) return 'save';

  return 'goal';
}

// A column the striker has leaned on hard enough for the keeper to notice:
// clearly ahead of the others, not merely first past the post.
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

// Where the keeper commits when the ball is struck.
//
// It dives to wherever it is standing --- which the striker can see, because
// the keeper paces the line while they aim --- until they lean on one column
// hard enough for it to start camping there instead. Reading the pace is the
// first mechanic; noticing the keeper has learned your habit is the second.
export function chooseKeeperZone(history: Zone[], paceColumn: Column): Zone {
  return {
    col: favouriteColumn(history) ?? paceColumn,
    row: favouriteRow(history),
  };
}

// The keeper's continuous position along the goal line, in column units
// (0 = left post, 2 = right post), as a function of elapsed time.
export function pacePosition(elapsedMs: number, cycleMs: number): number {
  const t = (elapsedMs % cycleMs) / cycleMs;
  return 1 + Math.sin(t * Math.PI * 2);
}

// How far ahead of the strike the keeper gets to read the ball. This is where
// the two mechanics meet: a limp shot hangs in the air long enough for the
// keeper to travel to it, a fierce one gives it barely any time at all. So the
// striker isn't picking a corner and a power independently --- the power
// decides how much the corner has to be led.
export function keeperLeadMs(power: number, baseMs = 240, spanMs = 420): number {
  const clamped = Math.min(100, Math.max(0, power));
  return baseMs + (1 - clamped / 100) * spanMs;
}

export function paceColumn(position: number): Column {
  return Math.min(2, Math.max(0, Math.round(position))) as Column;
}
