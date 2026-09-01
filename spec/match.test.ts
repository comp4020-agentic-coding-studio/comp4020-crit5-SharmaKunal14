import { describe, expect, it } from 'vitest';
import {
  isMatchOver,
  kicksToShow,
  matchWinner,
  nextShooter,
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

describe('isMatchOver', () => {
  it('is not over mid-round, even with a decisive lead', () => {
    expect(isMatchOver([5, 0], [5, 4])).toBe(false);
  });

  it('is not over before five kicks each', () => {
    expect(isMatchOver([3, 0], [3, 3])).toBe(false);
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
