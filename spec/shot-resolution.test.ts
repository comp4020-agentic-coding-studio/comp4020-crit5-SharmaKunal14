import { describe, expect, it } from 'vitest';
import { chooseKeeperZone, resolveShot, type Zone } from '../game-logic';

// The one rule this week's spec asks to see under a focused automated test:
// aim + release-power + keeper commitment must combine into goal/save/miss
// exactly as the brief demands the game be "lost, and end somewhere."

const left: Zone = { col: 0, row: 0 };
const center: Zone = { col: 1, row: 0 };
const right: Zone = { col: 2, row: 0 };

describe('resolveShot', () => {
  it('is a goal when the shot is well struck and away from the keeper', () => {
    expect(resolveShot(right, 60, left)).toBe('goal');
  });

  it('is a save when the keeper commits to the exact zone struck', () => {
    expect(resolveShot(center, 60, center)).toBe('save');
  });

  it('is a save when a weak shot lands next to the keeper, not just on them', () => {
    expect(resolveShot(center, 20, left)).toBe('save');
  });

  it('beats an adjacent keeper when the shot is well struck, not weak', () => {
    expect(resolveShot(center, 60, left)).toBe('goal');
  });

  it('is a miss on release power over the top, regardless of the keeper', () => {
    expect(resolveShot(right, 95, left)).toBe('miss');
  });
});

describe('chooseKeeperZone', () => {
  it('defaults to center with no shot history', () => {
    expect(chooseKeeperZone([])).toEqual(center);
  });

  it('adapts toward the zone struck most often', () => {
    expect(chooseKeeperZone([left, left, right])).toEqual(left);
  });

  it('breaks a tie in favour of whichever zone was favoured first', () => {
    expect(chooseKeeperZone([right, left, right, left])).toEqual(right);
  });
});
