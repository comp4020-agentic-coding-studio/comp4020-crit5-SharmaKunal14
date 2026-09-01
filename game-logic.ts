// Pure game logic for the penalty shootout: no DOM, no timers, no randomness.
// Kept separate from main.ts so the core rule can be unit tested directly.

export type Column = 0 | 1 | 2; // left, center, right
export type Row = 0 | 1; // low, high

export interface Zone {
  col: Column;
  row: Row;
}

export type ShotQuality = 'weak' | 'good' | 'over';

export type ShotOutcome = 'goal' | 'save' | 'miss';

export const ZONES: Zone[] = [
  { col: 0, row: 0 },
  { col: 0, row: 1 },
  { col: 1, row: 0 },
  { col: 1, row: 1 },
  { col: 2, row: 0 },
  { col: 2, row: 1 },
];

export function zonesEqual(a: Zone, b: Zone): boolean {
  return a.col === b.col && a.row === b.row;
}

function isAdjacentColumn(a: Zone, b: Zone): boolean {
  return a.row === b.row && Math.abs(a.col - b.col) === 1;
}

// The power meter oscillates 0-100; the value at release decides shot quality.
export function shotQuality(power: number): ShotQuality {
  if (power > 90) return 'over';
  if (power < 30) return 'weak';
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

// The keeper adapts: dive toward whichever zone the striker has favoured so
// far, biasing toward the earliest-favoured zone on a tie, defaulting to
// center-low when there is no history yet.
export function chooseKeeperZone(history: Zone[]): Zone {
  if (history.length === 0) return { col: 1, row: 0 };

  const counts = new Map<string, { zone: Zone; count: number; firstIndex: number }>();
  history.forEach((zone, index) => {
    const key = `${zone.col},${zone.row}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { zone, count: 1, firstIndex: index });
    }
  });

  let best: { zone: Zone; count: number; firstIndex: number } | null = null;
  for (const entry of counts.values()) {
    if (
      !best ||
      entry.count > best.count ||
      (entry.count === best.count && entry.firstIndex < best.firstIndex)
    ) {
      best = entry;
    }
  }

  return best!.zone;
}
