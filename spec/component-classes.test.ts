import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// A sensor, not a contract test: this one isn't answering this week's brief,
// it's guarding a mistake I actually shipped and want caught by `pnpm check`
// next time rather than by squinting at a screenshot.
//
// The scoreboard marked a scored shot by adding the class `goal` to a pip.
// `.goal` is also the goalmouth's class, and it sets
// `position: absolute; top: 5%; left: 12%; width: 76%` --- so the pip was
// yanked out of its flex row and rendered as an offset blob overlapping its
// neighbour. Everything was green: no test looks at cascade collisions, and
// the bug is invisible unless you happen to score and then look closely.
//
// The general rule this encodes: a class a component toggles at runtime must
// never also be a class that positions an element.

const DIST = resolve('dist');

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return path.endsWith('.css') ? [path] : [];
  });
}

const stylesheet = cssFiles(DIST)
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

// Class names this app adds to or removes from elements at runtime.
const RUNTIME_CLASSES = [
  'pip',
  'pip--scored',
  'pip--spent',
  'is-shooting',
  'player-red',
  'player-blue',
  'red',
  'blue',
  'winner',
  'tally',
  'replay',
  'pacing',
  'diving',
  'saved',
  'dive-low',
  'dive-high',
  'dive-left',
  'dive-center',
  'dive-right',
  'visible',
  'armed',
  'charging',
  'flying',
  'scored',
  'hidden',
];

// Every class that, on its own, takes an element out of normal flow.
function positioningClasses(css: string): Set<string> {
  const found = new Set<string>();
  // Match `.name { ... }` blocks whose selector is exactly one bare class.
  for (const match of css.matchAll(/(^|[},])\s*\.([A-Za-z][\w-]*)\s*\{([^}]*)\}/g)) {
    const [, , name, body] = match;
    if (/position\s*:\s*(absolute|fixed)/.test(body)) found.add(name);
  }
  return found;
}

describe('sensor: runtime classes never collide with positioning classes', () => {
  it('built a stylesheet to check', () => {
    expect(stylesheet.length).toBeGreaterThan(0);
  });

  it('no class toggled at runtime also positions an element', () => {
    const positioning = positioningClasses(stylesheet);
    const collisions = RUNTIME_CLASSES.filter((name) => positioning.has(name));
    expect(collisions).toEqual([]);
  });
});
