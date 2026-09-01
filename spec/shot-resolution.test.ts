import { describe, expect, it } from 'vitest';
import {
  chooseKeeperZone,
  keeperLeadMs,
  paceColumn,
  pacePosition,
  resolveShot,
  type Zone,
} from '../game-logic';

// The one rule this week's spec asks to see under a focused automated test:
// aim + release-power + keeper commitment must combine into goal/save/miss
// exactly as the brief demands the game be "lost, and end somewhere."

const left: Zone = { col: 0, row: 0 };
const center: Zone = { col: 1, row: 0 };
const right: Zone = { col: 2, row: 0 };
const rightHigh: Zone = { col: 2, row: 1 };

describe('resolveShot', () => {
  it('is a goal when the shot is well struck and away from the keeper', () => {
    expect(resolveShot(right, 60, left)).toBe('goal');
  });

  it('is a save when the keeper commits to the exact zone struck', () => {
    expect(resolveShot(center, 60, center)).toBe('save');
  });

  it('is a save when a weak shot lands next to the keeper, not just on them', () => {
    expect(resolveShot(center, 15, left)).toBe('save');
  });

  it('beats an adjacent keeper when the shot is well struck, not weak', () => {
    expect(resolveShot(center, 60, left)).toBe('goal');
  });

  it('is a miss on release power over the top, regardless of the keeper', () => {
    expect(resolveShot(right, 98, left)).toBe('miss');
  });

  it('separates the rows: the same column at a different height beats the keeper', () => {
    expect(resolveShot(rightHigh, 60, right)).toBe('goal');
  });
});

describe('chooseKeeperZone', () => {
  it('dives where it is standing while the striker has no habit yet', () => {
    expect(chooseKeeperZone([], 2)).toEqual(right);
    expect(chooseKeeperZone([left], 2)).toEqual(right);
  });

  it('camps the column the striker has leaned on, ignoring where it stood', () => {
    expect(chooseKeeperZone([left, left, left], 2)).toEqual(left);
  });

  it('keeps reading the pace while no column is clearly favoured', () => {
    expect(chooseKeeperZone([left, right], 1)).toEqual(center);
  });

  it('punishes a repeated corner from the shot after it', () => {
    expect(chooseKeeperZone([right, right], 0)).toEqual(right);
  });

  it('follows the striker upstairs once most shots have gone high', () => {
    const high: Zone[] = [
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ];
    expect(chooseKeeperZone(high, 2).row).toBe(1);
  });
});

describe('keeperLeadMs', () => {
  it('gives the keeper more time the weaker the shot', () => {
    expect(keeperLeadMs(20)).toBeGreaterThan(keeperLeadMs(90));
  });

  it('never lets a shot arrive before the keeper can react at all', () => {
    for (const power of [0, 25, 50, 75, 100]) {
      expect(keeperLeadMs(power)).toBeGreaterThanOrEqual(240);
    }
  });
});

describe('pacing', () => {
  it('sweeps the full goal line and stays between the posts', () => {
    for (let ms = 0; ms < 3000; ms += 37) {
      const position = pacePosition(ms, 2600);
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThanOrEqual(2);
    }
  });

  it('reaches both posts across a cycle, so every column is readable', () => {
    const samples = Array.from({ length: 200 }, (_, i) => paceColumn(pacePosition(i * 13, 2600)));
    expect(new Set(samples)).toEqual(new Set([0, 1, 2]));
  });
});
