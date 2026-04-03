// ── STATE ─────────────────────────────────────────────────────────────────────
let solves     = JSON.parse(localStorage.getItem('cubeSolves') || '[]');
// solves[i] = { id, ms }

let timerInterval = null;
let startTime     = null;
let holdTimeout   = null;
let isHolding     = false;
let isRunning     = false;
let wakeLock      = null;

// ── DOM ───────────────────────────────────────────────────────────────────────
const timerText   = document.getElementById('timer-text');
const hint        = document.getElementById('hint');
const bestTime    = document.getElementById('best-time');
const solvesList  = document.getElementById('solves-list');
const holdOverlay = document.getElementById('hold-overlay');
const runOverlay  = document.getElementById('run-overlay');
const runTimer    = document.getElementById('run-timer');
const clearBtn    = document.getElementById('clear-btn');

// ── FORMAT TIME ───────────────────────────────────────────────────────────────
function fmt(ms) {
  const mins  = Math.floor(ms / 60000);
  const secs  = Math.floor((ms % 60000) / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${mins}:${String(secs).padStart(2,'0')}.${String(cents).padStart(2,'0')}`;
}

// ── WAKE LOCK ─────────────────────────────────────────────────────────────────
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) { /* silently ignore if not supported */ }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

// ── BEST TIME ─────────────────────────────────────────────────────────────────
function getBest() {
  if (solves.length === 0) return null;
  return Math.min(...solves.map(s => s.ms));
}
function updateBestBar() {
  const b = getBest();
  bestTime.textContent = b !== null ? fmt(b) : '--:--.--';
}

// ── RENDER SOLVES ─────────────────────────────────────────────────────────────
function renderSolves() {
  solvesList.innerHTML = '';
  const best = getBest();
  // Show newest first
  [...solves].reverse().forEach((s, ri) => {
    const num = solves.length - ri;
    const row = document.createElement('div');
    row.className = 'solve-row' + (s.ms === best ? ' best' : '');

    const numEl  = document.createElement('span');
    numEl.className = 'solve-num';
    numEl.textContent = `#${num}`;

    const timeEl = document.createElement('span');
    timeEl.className = 'solve-time';
    timeEl.textContent = fmt(s.ms);

    const del = document.createElement('button');
    del.className = 'solve-del';
    del.textContent = '✕';
    del.onclick = () => deleteSolve(s.id);

    row.append(numEl, timeEl, del);
    solvesList.appendChild(row);
  });
  updateBestBar();
}

function saveSolves() {
  localStorage.setItem('cubeSolves', JSON.stringify(solves));
}

function addSolve(ms) {
  solves.push({ id: Date.now(), ms });
  saveSolves();
  renderSolves();
}

function deleteSolve(id) {
  solves = solves.filter(s => s.id !== id);
  saveSolves();
  renderSolves();
}

// ── TIMER LOOP ────────────────────────────────────────────────────────────────
function tickRunning() {
  const elapsed = Date.now() - startTime;
  runTimer.textContent = fmt(elapsed);
}

// ── HOLD TO START ─────────────────────────────────────────────────────────────
function onHoldStart(e) {
  if (isRunning || isHolding) return;
  // Ignore taps on buttons
  if (e.target.closest('button')) return;
  isHolding = true;
  holdOverlay.classList.remove('hidden');
  holdOverlay.classList.remove('green');

  holdTimeout = setTimeout(() => {
    holdOverlay.classList.add('green');
    document.getElementById('hold-text').textContent = 'Let go!';
  }, 2000);
}

function onHoldEnd(e) {
  if (!isHolding) return;
  clearTimeout(holdTimeout);

  if (holdOverlay.classList.contains('green')) {
    // Ready -- start the timer
    holdOverlay.classList.add('hidden');
    holdOverlay.classList.remove('green');
    document.getElementById('hold-text').textContent = 'Keep holding...';
    isHolding = false;
    startTimer();
  } else {
    // Released too early -- cancel
    holdOverlay.classList.add('hidden');
    document.getElementById('hold-text').textContent = 'Keep holding...';
    isHolding = false;
  }
}

// ── START / STOP ──────────────────────────────────────────────────────────────
function startTimer() {
  isRunning = true;
  startTime = Date.now();
  runOverlay.classList.remove('hidden');
  runTimer.textContent = '0:00.00';
  timerInterval = setInterval(tickRunning, 30);
  requestWakeLock();
}

function stopTimer() {
  if (!isRunning) return;
  clearInterval(timerInterval);
  isRunning = false;
  const elapsed = Date.now() - startTime;
  runOverlay.classList.add('hidden');
  timerText.textContent = fmt(elapsed);
  hint.textContent = 'Hold to start';
  addSolve(elapsed);
  releaseWakeLock();
}

// ── TAP TO STOP ───────────────────────────────────────────────────────────────
runOverlay.addEventListener('pointerdown', e => {
  e.preventDefault();
  stopTimer();
});

// ── HOLD LISTENERS on main app ────────────────────────────────────────────────
document.getElementById('app').addEventListener('pointerdown', onHoldStart);
document.addEventListener('pointerup',   onHoldEnd);
document.addEventListener('pointercancel', onHoldEnd);

// ── CLEAR ALL ─────────────────────────────────────────────────────────────────
clearBtn.onclick = () => {
  if (solves.length === 0) return;
  if (confirm('Delete all your solves?')) {
    solves = [];
    saveSolves();
    renderSolves();
    timerText.textContent = '0:00.00';
  }
};

// ── BLOCK LONG-PRESS CONTEXT MENU ────────────────────────────────────────────
document.addEventListener('contextmenu', e => e.preventDefault());

// ── INIT ──────────────────────────────────────────────────────────────────────
renderSolves();
