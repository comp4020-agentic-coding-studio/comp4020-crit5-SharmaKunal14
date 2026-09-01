import {
  favouriteRow,
  flightMs,
  isMatchOver,
  keeperCommit,
  keeperGuess,
  keeperReach,
  kicksToShow,
  matchWinner,
  nextShooter,
  pacePosition,
  resolveShot,
  shotQuality,
  type Column,
  type Pair,
  type PlayerIndex,
  type Row,
  type ShotOutcome,
  type Zone,
} from './game-logic';

const POWER_CYCLE_MS = 1500;
// Slow enough that the keeper's walk never outpaces its own dive (see
// KEEPER_SPEED), which also gives the striker time to actually read it.
const PACE_CYCLE_MS = 3900;
const SETTLE_MS = 720;
const RECOVER_MS = 360;
// A keeper commits as the ball is struck; it can't stop dead, but nor does it
// keep strolling for the whole flight. This is how much of its walk carries
// through into the dive.
const MOMENTUM_MS = 160;

const pitch = document.getElementById('pitch') as HTMLDivElement;
const goal = document.getElementById('goal') as HTMLDivElement;
const keeper = document.getElementById('keeper') as HTMLDivElement;
const reticle = document.getElementById('reticle') as HTMLDivElement;
const ball = document.getElementById('ball') as HTMLDivElement;
const powerMeter = document.getElementById('power-meter') as HTMLDivElement;
const powerMarker = document.getElementById('power-marker') as HTMLDivElement;
const endScreen = document.getElementById('end-screen') as HTMLDivElement;
const nameScreen = document.getElementById('name-screen') as HTMLFormElement;

const rows = [
  document.getElementById('row-0') as HTMLDivElement,
  document.getElementById('row-1') as HTMLDivElement,
];
const nameLabels = [
  document.getElementById('name-0') as HTMLSpanElement,
  document.getElementById('name-1') as HTMLSpanElement,
];
const pipRows = [
  document.getElementById('pips-0') as HTMLDivElement,
  document.getElementById('pips-1') as HTMLDivElement,
];
const nameInputs = [
  document.getElementById('name-input-0') as HTMLInputElement,
  document.getElementById('name-input-1') as HTMLInputElement,
];

const PLAYER_CLASS = ['player-red', 'player-blue'] as const;
const PLAYER_FALLBACK = ['Red', 'Blue'];

type Phase = 'naming' | 'aiming' | 'charging' | 'resolving' | 'over';

let phase: Phase = 'naming';
let aim: Zone = { col: 1, row: 0 };
let chargeStart = 0;
let pace = 1;
let paceClock = 0;
let lastFrame = 0;

// Each player is read separately by the keeper: a habit is one person's, and
// blending two strikers' histories would have it guessing at an average
// nobody actually plays.
let names = [...PLAYER_FALLBACK];
let histories: [Zone[], Zone[]] = [[], []];
let scores: Pair = [0, 0];
let shots: Pair = [0, 0];
let results: [boolean[], boolean[]] = [[], []];
let current: PlayerIndex = 0;

/* --- Geometry ----------------------------------------------------------- */

function pointToZone(clientX: number, clientY: number): Zone {
  const rect = goal.getBoundingClientRect();
  const relX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const relY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const col = Math.min(2, Math.floor((relX / rect.width) * 3)) as Column;
  const row: Row = relY < rect.height * 0.45 ? 1 : 0;
  return { col, row };
}

// A continuous column position (0..2) as a percentage across the pitch.
function columnToPitchLeft(position: number): number {
  return 12 + ((position + 0.5) / 3) * 76;
}

function rowToPitchTop(row: Row): number {
  return row === 1 ? 5 + 25 * 0.26 : 5 + 25 * 0.74;
}

// The same position, in the goal's own coordinates, for the keeper.
function columnToKeeperLeft(position: number): number {
  const keeperWidth = 24;
  return ((position + 0.5) / 3) * 100 - keeperWidth / 2;
}

/* --- Rendering ---------------------------------------------------------- */

function setFlight(el: HTMLElement, ms: number) {
  el.style.setProperty('--flight', `${ms}ms`);
}

function renderKeeperPacing(position: number) {
  keeper.classList.add('pacing');
  keeper.style.left = `${columnToKeeperLeft(position)}%`;
}

// The dive is described by where the keeper is going and how long it has to
// get there --- not by a corner it was assigned. The lean follows the actual
// travel, so a keeper that barely moves stays nearly upright.
function renderKeeperDive(from: number, to: number, row: Row, flight: number) {
  // `.pacing` carries `transition: none` so the per-frame walk doesn't smear.
  // Dropping it and moving the keeper in the same style batch would leave the
  // transition with no start value --- the keeper teleports and only the
  // rotation animates. Flushing layout in between is what makes it a dive.
  keeper.classList.remove('pacing');
  void keeper.offsetWidth;

  setFlight(keeper, flight);
  keeper.classList.add('diving');
  keeper.style.left = `${columnToKeeperLeft(to)}%`;

  const lean = Math.max(-34, Math.min(34, (to - from) * 30));
  const lift = row === 1 ? -38 : 4;
  keeper.style.transform = `translateY(${lift}%) rotate(${lean}deg)`;
}

// Stand back up on the spot the keeper left. The pace clock is frozen while
// the ball is live, so that spot is still under it and the handover back to
// pacing has nothing to jump over.
function renderKeeperRecover() {
  setFlight(keeper, RECOVER_MS);
  keeper.classList.remove('diving', 'saved');
  keeper.style.left = `${columnToKeeperLeft(pace)}%`;
  keeper.style.transform = '';
}

const BALL_REST_TOP = 88; // percent of pitch height
let ballOffset = { x: 0, y: 0 };

// Script-driven animation doesn't get the CSS media query for free. The
// flight *duration* stays --- it is the rule, not decoration, and shortening
// it would change the game --- but the arc and the flourishes go.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function pitchSize() {
  const rect = pitch.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

// Pixel offset from the penalty spot to a point given in pitch percentages.
function offsetTo(leftPct: number, topPct: number) {
  const { w, h } = pitchSize();
  return {
    x: ((leftPct - 50) / 100) * w,
    y: ((topPct - BALL_REST_TOP) / 100) * h,
  };
}

function ballTransform(x: number, y: number, scale: number) {
  return `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
}

function resetBall() {
  for (const animation of ball.getAnimations()) animation.cancel();
  ballOffset = { x: 0, y: 0 };
  ball.style.opacity = '1';
  ball.style.transform = ballTransform(0, 0, 1);
  if (reducedMotion.matches) return;
  // Placed, rather than teleported back: a short settle reads as the next ball
  // going down on the spot.
  ball.animate(
    [
      { transform: ballTransform(0, 0, 0.55), opacity: 0 },
      { transform: ballTransform(0, 0, 1), opacity: 1 },
    ],
    { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }
  );
}

// The ball travels for exactly as long as its power says it should, so what
// you see is the same number the keeper is racing against. The arc and the
// shrink are what stop it reading as a sprite sliding up the screen: it lifts
// off the spot, and it recedes as it goes away from you.
function flyBall(outcome: ShotOutcome, zone: Zone, flight: number) {
  for (const animation of ball.getAnimations()) animation.cancel();

  const target =
    outcome === 'miss'
      ? offsetTo(columnToPitchLeft(zone.col), -12)
      : offsetTo(columnToPitchLeft(zone.col), rowToPitchTop(zone.row));

  // A ball driven along the ground barely lifts; one aimed at the top corner
  // has to climb, so it carries a longer parabola.
  const lift = reducedMotion.matches
    ? 0
    : Math.abs(target.y) * (zone.row === 1 ? 0.13 : 0.055);
  const endScale = outcome === 'miss' ? 0.4 : 0.58;

  ballOffset = target;
  ball.style.opacity = outcome === 'miss' ? '0' : '1';
  ball.style.transform = ballTransform(target.x, target.y, endScale);

  ball.animate(
    [
      { transform: ballTransform(0, 0, 1), opacity: 1, offset: 0 },
      {
        transform: ballTransform(target.x * 0.5, target.y * 0.5 - lift, 0.84),
        opacity: 1,
        offset: 0.5,
      },
      {
        transform: ballTransform(target.x, target.y, endScale),
        opacity: outcome === 'miss' ? 0 : 1,
        offset: 1,
      },
    ],
    { duration: flight, easing: 'cubic-bezier(0.3, 0.64, 0.5, 1)', fill: 'forwards' }
  );
}

// A save is a deflection, not a catch: the ball has already arrived, so it
// leaves again off the keeper rather than stopping dead in mid-air.
function deflectBall(zone: Zone, keeperPosition: number) {
  const away = keeperPosition <= zone.col ? 1 : -1;
  const from = ballOffset;
  const to = offsetTo(columnToPitchLeft(zone.col + away * 1.05), rowToPitchTop(0) + 12);

  ball.style.opacity = '0';
  ball.style.transform = ballTransform(to.x, to.y, 0.46);

  ball.animate(
    [
      { transform: ballTransform(from.x, from.y, 0.58), opacity: 1, offset: 0 },
      { transform: ballTransform(to.x, to.y, 0.46), opacity: 0, offset: 1 },
    ],
    { duration: 420, easing: 'cubic-bezier(0.15, 0.8, 0.4, 1)', fill: 'forwards' }
  );
}

// Rebuilt from state rather than mutated in place, so sudden death can grow
// the rows without any of the bookkeeping that a five-slot assumption needs.
function renderScoreboard() {
  const slots = kicksToShow(shots);

  for (const player of [0, 1] as PlayerIndex[]) {
    const row = pipRows[player];
    while (row.children.length < slots) {
      const pip = document.createElement('div');
      pip.className = 'pip';
      row.appendChild(pip);
    }
    while (row.children.length > slots) row.lastElementChild!.remove();

    for (let kick = 0; kick < slots; kick++) {
      const pip = row.children[kick] as HTMLDivElement;
      pip.className = 'pip';
      if (kick >= shots[player]) continue;
      pip.classList.add(results[player][kick] ? 'pip--scored' : 'pip--spent');
    }

    nameLabels[player].textContent = names[player];
    rows[player].classList.toggle('is-shooting', phase !== 'over' && current === player);
  }
}

function renderTurn() {
  reticle.classList.remove(...PLAYER_CLASS);
  reticle.classList.add(PLAYER_CLASS[current]);
  renderScoreboard();
}

/* --- Loop --------------------------------------------------------------- */

function frame(now: number) {
  const delta = lastFrame === 0 ? 0 : now - lastFrame;
  lastFrame = now;

  if (phase === 'aiming' || phase === 'charging') {
    // The pace clock only advances while the striker is on the ball, so the
    // keeper resumes its walk exactly where the dive interrupted it.
    paceClock += delta;
    pace = pacePosition(paceClock, PACE_CYCLE_MS);
    renderKeeperPacing(pace);
  }

  if (phase === 'charging') {
    const power = currentPower(now);
    powerMarker.style.bottom = `${power}%`;
    // The marker wears the colour of the band it is crossing, which is how
    // the meter explains itself without a word on screen.
    const zone = shotQuality(power);
    powerMarker.classList.toggle('zone-weak', zone === 'weak');
    powerMarker.classList.toggle('zone-good', zone === 'good');
    powerMarker.classList.toggle('zone-over', zone === 'over');
  }

  requestAnimationFrame(frame);
}

function currentPower(now: number): number {
  const t = ((now - chargeStart) % POWER_CYCLE_MS) / POWER_CYCLE_MS;
  return Math.round((Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) * 50);
}

/* --- Turn --------------------------------------------------------------- */

function startCharge(now: number) {
  if (phase !== 'aiming') return;
  phase = 'charging';
  chargeStart = now;
  powerMeter.classList.add('charging');
  reticle.classList.add('armed');
}

function releaseCharge(now: number) {
  if (phase !== 'charging') return;
  const power = currentPower(now);
  powerMeter.classList.remove('charging');
  reticle.classList.remove('armed');
  resolveTurn(power);
}

function resolveTurn(power: number) {
  phase = 'resolving';

  const shooter = current;
  const history = histories[shooter];
  const zone = aim;
  const flight = flightMs(power);

  // Where the keeper is, where it would like to be, and how far it can
  // actually get in the time the ball gives it.
  const from = pace;
  const drift = pacePosition(paceClock + Math.min(flight, MOMENTUM_MS), PACE_CYCLE_MS);
  const guess = keeperGuess(history, drift);
  const reached = keeperCommit(from, guess, keeperReach(flight));
  const keeperRow = favouriteRow(history);

  const outcome = resolveShot(zone, power, reached, keeperRow);

  renderKeeperDive(from, reached, keeperRow, flight);
  flyBall(outcome, zone, flight);

  history.push(zone);
  shots[shooter] += 1;
  results[shooter].push(outcome === 'goal');
  if (outcome === 'goal') scores[shooter] += 1;

  // Everything that reacts to the result waits for the ball to actually get
  // there. Scoring it at the moment of the strike is what made the old build
  // feel like the verdict came before the shot.
  window.setTimeout(() => {
    renderScoreboard();

    if (outcome === 'goal') {
      goal.classList.add('scored');
    } else if (outcome === 'save') {
      keeper.classList.add('saved');
      deflectBall(zone, reached);
    }

    window.setTimeout(() => {
      goal.classList.remove('scored');
      powerMarker.style.bottom = '0%';
      resetBall();
      renderKeeperRecover();

      window.setTimeout(() => {
        if (isMatchOver(scores, shots)) {
          showEndScreen();
        } else {
          current = nextShooter(shots);
          phase = 'aiming';
          renderTurn();
        }
      }, RECOVER_MS);
    }, SETTLE_MS);
  }, flight);
}

function showEndScreen() {
  phase = 'over';
  renderScoreboard();
  endScreen.replaceChildren();

  const tally = document.createElement('div');
  tally.className = 'tally';
  const left = document.createElement('span');
  left.className = 'red';
  left.textContent = String(scores[0]);
  const dash = document.createElement('span');
  dash.className = 'dash';
  dash.textContent = '–';
  const right = document.createElement('span');
  right.className = 'blue';
  right.textContent = String(scores[1]);
  tally.append(left, dash, right);

  const won = matchWinner(scores);
  const winner = document.createElement('div');
  winner.className = `winner ${won === 0 ? 'red' : 'blue'}`;
  winner.textContent = won === null ? '' : names[won];

  const replay = document.createElement('div');
  replay.className = 'replay';

  endScreen.append(tally, winner, replay);
  endScreen.classList.remove('hidden');
}

function restart() {
  scores = [0, 0];
  shots = [0, 0];
  results = [[], []];
  histories = [[], []];
  current = 0;
  powerMarker.style.bottom = '0%';
  resetBall();
  renderKeeperRecover();
  endScreen.classList.add('hidden');
  phase = 'aiming';
  renderTurn();
}

/* --- Input -------------------------------------------------------------- */

function aimAt(clientX: number, clientY: number) {
  aim = pointToZone(clientX, clientY);
  const rect = pitch.getBoundingClientRect();
  reticle.style.left = `${Math.min(Math.max(clientX - rect.left, 0), rect.width)}px`;
  reticle.style.top = `${Math.min(Math.max(clientY - rect.top, 0), rect.height)}px`;
  reticle.classList.add('visible');
}

function inPlay() {
  return phase === 'aiming' || phase === 'charging' || phase === 'resolving';
}

pitch.addEventListener('pointermove', (event) => {
  if (!inPlay()) return;
  aimAt(event.clientX, event.clientY);
});

pitch.addEventListener('pointerdown', (event) => {
  if (!inPlay()) return;
  pitch.setPointerCapture(event.pointerId);
  aimAt(event.clientX, event.clientY);
  startCharge(performance.now());
});

pitch.addEventListener('pointerup', () => releaseCharge(performance.now()));
pitch.addEventListener('pointercancel', () => releaseCharge(performance.now()));

// A space belongs to whoever is typing a name; it only strikes the ball once
// the match is under way.
function typingAName(event: Event) {
  return event.target instanceof HTMLInputElement;
}

window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || typingAName(event)) return;
  event.preventDefault();
  if (event.repeat) return;
  if (phase === 'over') {
    restart();
    return;
  }
  startCharge(performance.now());
});

window.addEventListener('keyup', (event) => {
  if (event.code !== 'Space' || typingAName(event)) return;
  event.preventDefault();
  releaseCharge(performance.now());
});

endScreen.addEventListener('click', restart);

/* --- Names -------------------------------------------------------------- */

nameScreen.addEventListener('submit', (event) => {
  event.preventDefault();
  names = nameInputs.map(
    (input, i) => input.value.trim().slice(0, 12) || PLAYER_FALLBACK[i]
  );
  nameScreen.classList.add('hidden');
  phase = 'aiming';
  restart();
});

/* --- Go ----------------------------------------------------------------- */

resetBall();
renderTurn();
requestAnimationFrame(frame);
