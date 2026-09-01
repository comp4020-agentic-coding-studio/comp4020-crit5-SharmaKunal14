import { chooseKeeperZone, resolveShot, shotQuality, type Zone } from './game-logic';

const TOTAL_SHOTS = 5;
const POWER_CYCLE_MS = 1100;

const pitch = document.getElementById('pitch') as HTMLDivElement;
const goal = document.getElementById('goal') as HTMLDivElement;
const keeper = document.getElementById('keeper') as HTMLDivElement;
const reticle = document.getElementById('reticle') as HTMLDivElement;
const ball = document.getElementById('ball') as HTMLDivElement;
const powerMeter = document.getElementById('power-meter') as HTMLDivElement;
const powerFill = document.getElementById('power-fill') as HTMLDivElement;
const scoreboard = document.getElementById('scoreboard') as HTMLDivElement;
const endScreen = document.getElementById('end-screen') as HTMLDivElement;

type Phase = 'aiming' | 'charging' | 'resolving' | 'over';

let phase: Phase = 'aiming';
let aim: Zone = { col: 1, row: 0 };
let history: Zone[] = [];
let goals = 0;
let shotsTaken = 0;
let chargeStart = 0;
let chargeFrame = 0;

for (let i = 0; i < TOTAL_SHOTS; i++) {
  const pip = document.createElement('div');
  pip.className = 'pip';
  scoreboard.appendChild(pip);
}

function goalRect() {
  return goal.getBoundingClientRect();
}

function pointToZone(clientX: number, clientY: number): Zone {
  const rect = goalRect();
  const relX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const relY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const col = Math.min(2, Math.floor((relX / rect.width) * 3)) as 0 | 1 | 2;
  const row = relY < rect.height / 2 ? 1 : 0;
  return { col, row: row as 0 | 1 };
}

function updateReticle(clientX: number, clientY: number) {
  const rect = pitch.getBoundingClientRect();
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  reticle.style.left = `${x}px`;
  reticle.style.top = `${y}px`;
  reticle.classList.add('visible');
}

function zoneToPercent(zone: Zone) {
  const left = 12 + ((zone.col + 0.5) / 3) * 76;
  const top = zone.row === 1 ? 4 + 26 * 0.28 : 4 + 26 * 0.78;
  return { left, top };
}

function positionKeeper(zone: Zone) {
  const leftByCol = [4, 36, 68];
  keeper.style.left = `${leftByCol[zone.col]}%`;
}

function setBallToStart() {
  ball.style.transition = 'none';
  ball.style.left = '50%';
  ball.style.bottom = '6%';
  ball.style.top = '';
  ball.style.opacity = '1';
  ball.style.transform = 'translateX(-50%)';
  // Force reflow so the next shot's transition re-enables cleanly.
  void ball.offsetHeight;
  ball.style.transition = '';
}

function fireBall(outcome: 'goal' | 'save' | 'miss', zone: Zone) {
  if (outcome === 'miss') {
    const { left } = zoneToPercent(zone);
    ball.style.left = `${left}%`;
    ball.style.top = '-18%';
    ball.style.bottom = '';
    ball.style.opacity = '0.15';
    return;
  }

  const { left, top } = zoneToPercent(zone);
  ball.style.left = `${left}%`;
  ball.style.top = `${top}%`;
  ball.style.bottom = '';
  if (outcome === 'save') {
    ball.style.transform = 'translateX(-50%) scale(0.8)';
  }
}

function fillScoreboard(index: number, outcome: 'goal' | 'save' | 'miss') {
  const pip = scoreboard.children[index] as HTMLDivElement;
  pip.classList.add(outcome === 'goal' ? 'goal' : 'miss');
}

function startCharge(now: number) {
  if (phase !== 'aiming') return;
  phase = 'charging';
  chargeStart = now;
  powerMeter.classList.add('charging');
  chargeFrame = requestAnimationFrame(tickPower);
}

function currentPower(now: number): number {
  const elapsed = (now - chargeStart) % POWER_CYCLE_MS;
  const t = elapsed / POWER_CYCLE_MS;
  return Math.round((Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) * 50);
}

function tickPower(now: number) {
  if (phase !== 'charging') return;
  const power = currentPower(now);
  powerFill.style.height = `${power}%`;
  chargeFrame = requestAnimationFrame(tickPower);
}

function releaseCharge(now: number) {
  if (phase !== 'charging') return;
  cancelAnimationFrame(chargeFrame);
  const power = currentPower(now);
  powerMeter.classList.remove('charging');
  resolveTurn(power);
}

function resolveTurn(power: number) {
  phase = 'resolving';
  const zone = aim;
  const keeperZone = chooseKeeperZone(history);
  const outcome = resolveShot(zone, power, keeperZone);

  positionKeeper(keeperZone);
  fireBall(outcome, zone);

  if (outcome === 'goal') goals += 1;
  fillScoreboard(shotsTaken, outcome);
  history.push(zone);
  shotsTaken += 1;

  window.setTimeout(() => {
    setBallToStart();
    powerFill.style.height = '0%';
    if (shotsTaken >= TOTAL_SHOTS) {
      showEndScreen();
    } else {
      phase = 'aiming';
    }
  }, 900);
}

function showEndScreen() {
  phase = 'over';
  endScreen.innerHTML = '';
  const tally = document.createElement('div');
  tally.className = 'tally';
  tally.textContent = `${goals} / ${TOTAL_SHOTS}`;
  const pulse = document.createElement('div');
  pulse.className = 'pulse';
  endScreen.appendChild(tally);
  endScreen.appendChild(pulse);
  endScreen.classList.remove('hidden');
}

function restart() {
  goals = 0;
  shotsTaken = 0;
  history = [];
  phase = 'aiming';
  Array.from(scoreboard.children).forEach((pip) => {
    pip.className = 'pip';
  });
  positionKeeper({ col: 1, row: 0 });
  setBallToStart();
  powerFill.style.height = '0%';
  endScreen.classList.add('hidden');
}

pitch.addEventListener('pointermove', (event) => {
  if (phase === 'over') return;
  aim = pointToZone(event.clientX, event.clientY);
  updateReticle(event.clientX, event.clientY);
});

pitch.addEventListener('pointerdown', (event) => {
  if (phase === 'over') {
    return;
  }
  aim = pointToZone(event.clientX, event.clientY);
  startCharge(performance.now());
});

pitch.addEventListener('pointerup', () => {
  releaseCharge(performance.now());
});

pitch.addEventListener('pointercancel', () => {
  releaseCharge(performance.now());
});

window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat) return;
  event.preventDefault();
  startCharge(performance.now());
});

window.addEventListener('keyup', (event) => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  releaseCharge(performance.now());
});

endScreen.addEventListener('click', restart);
window.addEventListener('keydown', (event) => {
  if (phase === 'over' && event.code === 'Space') {
    restart();
  }
});

positionKeeper({ col: 1, row: 0 });
setBallToStart();
