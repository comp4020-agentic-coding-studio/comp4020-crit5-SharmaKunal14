import { describe, expect, it } from 'vitest';
import {
  decidedEarly,
  isMatchOver,
  kicksToShow,
  matchWinner,
  nextShooter,
  remainingKicks,
  type Pair,
} from '../game-logic';

// The two-player contract: kicks alternate, the match only ends on a
// completed round, and a level score after five kicks each goes to sudden
// death rather than being called a draw.

describe('nextShooter', () => {
  it('gives the opening kick to the first player', () => {
    expect(nextShooter([0, 0])).toBe(0);
  });

  it('alternates', () => {
    const shots: Pair = [0, 0];
    const order = [];
    for (let i = 0; i < 6; i++) {
      const who = nextShooter(shots);
      order.push(who);
      shots[who] += 1;
    }
    expect(order).toEqual([0, 1, 0, 1, 0, 1]);
  });
});

describe('remainingKicks', () => {
  it('counts what is left of the regulation five', () => {
    expect(remainingKicks([0, 0])).toEqual([5, 5]);
    expect(remainingKicks([3, 2])).toEqual([2, 3]);
  });

  it('gives only the player behind on kicks one owing in sudden death', () => {
    expect(remainingKicks([5, 5])).toEqual([0, 0]);
    expect(remainingKicks([6, 5])).toEqual([0, 1]);
  });
});

describe('decidedEarly', () => {
  // The case from the brief: 3-0 after three each cannot be caught.
  it('calls it when the trailing player cannot reach the lead', () => {
    expect(decidedEarly([3, 0], [3, 3])).toBe(0);
    expect(decidedEarly([0, 3], [3, 3])).toBe(1);
  });

  it('keeps going while the trailing player still could level', () => {
    expect(decidedEarly([3, 0], [3, 2])).toBe(null); // three kicks left, could reach 3
    expect(decidedEarly([2, 0], [3, 3])).toBe(null); // two kicks left, could reach 2
  });

  it('calls it mid-round when the last kicks cannot matter', () => {
    expect(decidedEarly([4, 1], [5, 4])).toBe(0); // one kick left, can only reach 2
  });

  it('never calls it at kick-off', () => {
    expect(decidedEarly([0, 0], [0, 0])).toBe(null);
  });

  it('never calls it in sudden death, where a round always completes', () => {
    expect(decidedEarly([4, 3], [6, 5])).toBe(null);
  });
});

describe('isMatchOver', () => {
  it('is over mid-round once the lead is out of reach', () => {
    expect(isMatchOver([5, 0], [5, 4])).toBe(true);
  });

  it('is not over mid-round while the trailing player can still catch up', () => {
    expect(isMatchOver([2, 1], [5, 4])).toBe(false);
  });

  it('is not over before five kicks each while it is still catchable', () => {
    expect(isMatchOver([2, 0], [3, 3])).toBe(false);
  });

  it('ends when five each have been taken and someone leads', () => {
    expect(isMatchOver([3, 2], [5, 5])).toBe(true);
  });

  it('goes to sudden death rather than a draw when five each are level', () => {
    expect(isMatchOver([3, 3], [5, 5])).toBe(false);
  });

  it('ends the first sudden-death round that separates them', () => {
    expect(isMatchOver([4, 3], [6, 6])).toBe(true);
    expect(isMatchOver([4, 4], [6, 6])).toBe(false);
  });

  // Walked rather than asserted at a point, because the property that matters
  // is that sudden death keeps pairing kicks until exactly one of them scores.
  it('plays sudden death one kick each until a round separates them', () => {
    const scores: Pair = [3, 3];
    const shots: Pair = [5, 5];
    // both score, both miss, both score, then red scores and blue misses
    const rounds = [
      [true, true],
      [false, false],
      [true, true],
      [true, false],
    ];

    const endedAfter: number[] = [];
    rounds.forEach(([red, blue], round) => {
      for (const [player, scored] of [
        [0, red],
        [1, blue],
      ] as [0 | 1, boolean][]) {
        expect(nextShooter(shots)).toBe(player);
        shots[player] += 1;
        if (scored) scores[player] += 1;
        if (isMatchOver(scores, shots)) endedAfter.push(round);
      }
    });

    expect(endedAfter).toEqual([3]); // only the fourth round ends it
    expect(matchWinner(scores)).toBe(0);
    expect(shots).toEqual([9, 9]); // nine kicks each, none skipped
  });
});

describe('matchWinner', () => {
  it('names whoever is ahead', () => {
    expect(matchWinner([3, 2])).toBe(0);
    expect(matchWinner([2, 3])).toBe(1);
  });

  it('names nobody while level', () => {
    expect(matchWinner([3, 3])).toBe(null);
  });
});

describe('kicksToShow', () => {
  it('always makes room for the regulation five', () => {
    expect(kicksToShow([0, 0])).toBe(5);
    expect(kicksToShow([2, 1])).toBe(5);
  });

  it('grows with sudden death', () => {
    expect(kicksToShow([6, 5])).toBe(6);
    expect(kicksToShow([7, 7])).toBe(7);
  });
});
