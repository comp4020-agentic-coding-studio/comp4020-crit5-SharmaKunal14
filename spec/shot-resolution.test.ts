import { describe, expect, it } from 'vitest';
import {
  favouriteRow,
  flightMs,
  keeperCommit,
  keeperGuess,
  keeperReach,
  paceColumn,
  pacePosition,
  resolveShot,
  type Zone,
} from '../game-logic';

// The one rule this week's spec asks to see under a focused automated test:
// aim + release power + where the keeper can physically get to must combine
// into goal/save/miss, and the game must be losable by a wrong move.

const leftLow: Zone = { col: 0, row: 0 };
const centerLow: Zone = { col: 1, row: 0 };
const rightLow: Zone = { col: 2, row: 0 };
const rightHigh: Zone = { col: 2, row: 1 };

describe('resolveShot', () => {
  it('is a goal when the keeper ends up nowhere near the ball', () => {
    expect(resolveShot(rightLow, 70, 0.1, 0)).toBe('goal');
  });

  it('is a save when the keeper gets to the ball', () => {
    expect(resolveShot(centerLow, 70, 1.0, 0)).toBe('save');
  });

  it('is a miss on release power over the top, wherever the keeper is', () => {
    expect(resolveShot(rightLow, 98, 0.0, 0)).toBe('miss');
  });

  it('lets a well struck ball past a keeper that is merely close', () => {
    expect(resolveShot(rightLow, 70, 1.3, 0)).toBe('goal');
  });

  it('smothers that same gap when the ball is struck weakly', () => {
    expect(resolveShot(rightLow, 15, 1.3, 0)).toBe('save');
  });

  it('mostly beats a keeper that guessed the wrong height', () => {
    expect(resolveShot(rightHigh, 70, 1.7, 0)).toBe('goal');
  });

  it('still concedes a save to a wrong-height keeper the ball is hit straight at', () => {
    expect(resolveShot(rightHigh, 70, 2.0, 0)).toBe('save');
  });
});

// This is the bug that prompted the rewrite, pinned so it cannot come back:
// the keeper used to be *assigned* the column it wanted, so it could appear at
// the far post it had no way of reaching.
describe('the keeper cannot cover ground it has no time for', () => {
  it('does not reach the far post against a firm shot, however much it wants to', () => {
    const power = 90;
    const atRightPost = 2;
    const wantsLeftPost = 0;

    const reached = keeperCommit(atRightPost, wantsLeftPost, keeperReach(flightMs(power)));

    expect(reached).toBeGreaterThan(1);
    expect(resolveShot(leftLow, power, reached, 0)).toBe('goal');
  });

  it('does reach it when the striker gives it the time', () => {
    const power = 24; // barely out of the weak band, so a long, slow ball
    const reached = keeperCommit(2, 0, keeperReach(flightMs(power)));

    expect(reached).toBeLessThan(1);
  });

  it('never travels further than its reach in either direction', () => {
    for (const from of [0, 0.5, 1, 1.5, 2]) {
      for (const guess of [0, 1, 2]) {
        const reach = 0.4;
        expect(Math.abs(keeperCommit(from, guess, reach) - from)).toBeLessThanOrEqual(reach + 1e-9);
      }
    }
  });

  it('stays between the posts', () => {
    expect(keeperCommit(0, -5, 3)).toBe(0);
    expect(keeperCommit(2, 9, 3)).toBe(2);
  });
});

describe('flight time', () => {
  it('is shorter the harder the ball is struck', () => {
    expect(flightMs(95)).toBeLessThan(flightMs(30));
  });

  it('buys the keeper less ground the harder the ball is struck', () => {
    expect(keeperReach(flightMs(95))).toBeLessThan(keeperReach(flightMs(30)));
  });
});

describe('what the keeper reads', () => {
  it('follows its own walk while the striker has no habit', () => {
    expect(keeperGuess([], 1.7)).toBe(1.7);
    expect(keeperGuess([leftLow], 1.7)).toBe(1.7);
  });

  it('lunges for the column the striker keeps using', () => {
    expect(keeperGuess([leftLow, leftLow], 1.7)).toBe(0);
  });

  it('follows the striker upstairs once most shots have gone high', () => {
    expect(favouriteRow([{ col: 0, row: 1 }, { col: 1, row: 1 }])).toBe(1);
    expect(favouriteRow([])).toBe(0);
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

  it('reaches every column across a cycle, so all three are readable', () => {
    const seen = new Set(
      Array.from({ length: 200 }, (_, i) => paceColumn(pacePosition(i * 13, 2600)))
    );
    expect(seen).toEqual(new Set([0, 1, 2]));
  });
});
