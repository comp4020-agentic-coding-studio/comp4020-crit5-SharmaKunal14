import {
  chooseKeeperZone,
  keeperLeadMs,
  paceColumn,
  pacePosition,
  resolveShot,
  type Column,
  type Row,
  type ShotOutcome,
  type Zone,
} from './game-logic';

const TOTAL_SHOTS = 5;
const POWER_CYCLE_MS = 1500;
const PACE_CYCLE_MS = 2600;
const REVEAL_MS = 1250;

const pitch = document.getElementById('pitch') as HTMLDivElement;
const goal = document.getElementById('goal') as HTMLDivElement;
const keeper = document.getElementById('keeper') as HTMLDivElement;
const reticle = document.getElementById('reticle') as HTMLDivElement;
const ball = document.getElementById('ball') as HTMLDivElement;
const powerMeter = document.getElementById('power-meter') as HTMLDivElement;
const powerMarker = document.getElementById('power-marker') as HTMLDivElement;
const scoreboard = document.getElementById('scoreboard') as HTMLDivElement;
const endScreen = document.getElementById('end-screen') as HTMLDivElement;

type Phase = 'aiming' | 'charging' | 'resolving' | 'over';

let phase: Phase = 'aiming';
let aim: Zone = { col: 1, row: 0 };
let history: Zone[] = [];
let goals = 0;
let shotsTaken = 0;
let chargeStart = 0;
let pace = 1;

for (let i = 0; i < TOTAL_SHOTS; i++) {
  const pip = document.createElement('div');
  pip.className = 'pip';
  scoreboard.appendChild(pip);
}

/* --- Geometry ----------------------------------------------------------- */

function pointToZone(clientX: number, clientY: number): Zone {
  const rect = goal.getBoundingClientRect();
  const relX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const relY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const col = Math.min(2, Math.floor((relX / rect.width) * 3)) as Column;
  const row: Row = relY < rect.height * 0.45 ? 1 : 0;
  return { col, row };
}

// Where a zone sits in pitch percentages, for the ball's flight.
function zoneToPitchPercent(zone: Zone) {
  const left = 12 + ((zone.col + 0.5) / 3) * 76;
  const top = zone.row === 1 ? 5 + 25 * 0.26 : 5 + 25 * 0.74;
  return { left, top };
}

// Keeper left offset, in goal-relative percentages, for a continuous
// pace position in column units (0..2).
function paceToKeeperLeft(position: number): number {
  const keeperWidth = 24;
  return ((position + 0.5) / 3) * 100 - keeperWidth / 2;
}

/* --- Rendering ---------------------------------------------------------- */

function renderKeeperPacing(position: number) {
  keeper.classList.add('pacing');
  keeper.classList.remove('diving', 'saved');
  keeper.classList.remove(
    'dive-low',
    'dive-high',
    'dive-left',
    'dive-center',
    'dive-right'
  );
  keeper.style.left = `${paceToKeeperLeft(position)}%`;
  keeper.style.transform = '';
}

function renderKeeperDive(zone: Zone) {
  keeper.classList.remove('pacing');
  keeper.classList.add('diving');
  keeper.classList.add(zone.row === 1 ? 'dive-high' : 'dive-low');
  keeper.classList.add(['dive-left', 'dive-center', 'dive-right'][zone.col]);
  keeper.style.left = `${paceToKeeperLeft(zone.col)}%`;
}

function resetBall() {
  ball.classList.remove('flying');
  ball.style.left = '50%';
  ball.style.top = '';
  ball.style.bottom = '7%';
  ball.style.opacity = '1';
  ball.style.transform = 'translate(-50%, 50%)';
  void ball.offsetHeight; // flush, so the next flight animates from the spot
}

function flyBall(outcome: ShotOutcome, zone: Zone, keeperZone: Zone) {
  ball.classList.add('flying');
  ball.style.bottom = '';

  if (outcome === 'miss') {
    const { left } = zoneToPitchPercent(zone);
    ball.style.left = `${left}%`;
    ball.style.top = '-14%';
    ball.style.opacity = '0';
    ball.style.transform = 'translate(-50%, -50%) scale(0.5)';
    return;
  }

  // On a save the ball stops where the keeper actually got to, so the
  // player sees who won the duel rather than guessing.
  const target = outcome === 'save' ? keeperZone : zone;
  const { left, top } = zoneToPitchPercent(target);
  ball.style.left = `${left}%`;
  ball.style.top = `${top}%`;
  ball.style.transform =
    outcome === 'save' ? 'translate(-50%, -50%) scale(0.72)' : 'translate(-50%, -50%) scale(0.62)';
}

function markPip(index: number, outcome: ShotOutcome) {
  (scoreboard.children[index] as HTMLDivElement).classList.add(outcome);
}

/* --- Loop --------------------------------------------------------------- */

function frame(now: number) {
  if (phase === 'aiming' || phase === 'charging') {
    pace = pacePosition(now, PACE_CYCLE_MS);
    renderKeeperPacing(pace);
  }

  if (phase === 'charging') {
    powerMarker.style.bottom = `${currentPower(now)}%`;
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
  resolveTurn(power, now);
}

function resolveTurn(power: number, struckAt: number) {
  phase = 'resolving';

  // The keeper dives to where it will be when the ball arrives, not where it
  // stood when it was struck --- so the striker has to lead it, and a weak
  // shot gives it further to travel.
  const projected = pacePosition(struckAt + keeperLeadMs(power), PACE_CYCLE_MS);

  const zone = aim;
  const keeperZone = chooseKeeperZone(history, paceColumn(projected));
  const outcome = resolveShot(zone, power, keeperZone);

  renderKeeperDive(keeperZone);
  flyBall(outcome, zone, keeperZone);

  if (outcome === 'goal') {
    goals += 1;
    goal.classList.add('scored');
  } else if (outcome === 'save') {
    keeper.classList.add('saved');
  }

  markPip(shotsTaken, outcome);
  history.push(zone);
  shotsTaken += 1;

  window.setTimeout(() => {
    goal.classList.remove('scored');
    powerMarker.style.bottom = '0%';
    resetBall();

    if (shotsTaken >= TOTAL_SHOTS) {
      showEndScreen();
    } else {
      phase = 'aiming';
    }
  }, REVEAL_MS);
}

function showEndScreen() {
  phase = 'over';
  endScreen.replaceChildren();

  const tally = document.createElement('div');
  tally.className = 'tally';
  tally.textContent = `${goals} / ${TOTAL_SHOTS}`;

  const replay = document.createElement('div');
  replay.className = 'replay';

  endScreen.append(tally, replay);
  endScreen.classList.remove('hidden');
}

function restart() {
  goals = 0;
  shotsTaken = 0;
  history = [];
  for (const pip of Array.from(scoreboard.children)) pip.className = 'pip';
  powerMarker.style.bottom = '0%';
  resetBall();
  endScreen.classList.add('hidden');
  phase = 'aiming';
}

/* --- Input -------------------------------------------------------------- */

function aimAt(clientX: number, clientY: number) {
  aim = pointToZone(clientX, clientY);
  const rect = pitch.getBoundingClientRect();
  reticle.style.left = `${Math.min(Math.max(clientX - rect.left, 0), rect.width)}px`;
  reticle.style.top = `${Math.min(Math.max(clientY - rect.top, 0), rect.height)}px`;
  reticle.classList.add('visible');
}

pitch.addEventListener('pointermove', (event) => {
  if (phase === 'over') return;
  aimAt(event.clientX, event.clientY);
});

pitch.addEventListener('pointerdown', (event) => {
  if (phase === 'over') return;
  pitch.setPointerCapture(event.pointerId);
  aimAt(event.clientX, event.clientY);
  startCharge(performance.now());
});

pitch.addEventListener('pointerup', () => releaseCharge(performance.now()));
pitch.addEventListener('pointercancel', () => releaseCharge(performance.now()));

window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  if (event.repeat) return;
  if (phase === 'over') {
    restart();
    return;
  }
  startCharge(performance.now());
});

window.addEventListener('keyup', (event) => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  releaseCharge(performance.now());
});

endScreen.addEventListener('click', restart);

/* --- Go ----------------------------------------------------------------- */

resetBall();
requestAnimationFrame(frame);
