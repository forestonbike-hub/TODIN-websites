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
const timerText    = document.getElementById('timer-text');
const hint         = document.getElementById('hint');
const bestTime     = document.getElementById('best-time');
const solvesList   = document.getElementById('solves-list');
const holdOverlay  = document.getElementById('hold-overlay');
const runOverlay   = document.getElementById('run-overlay');
const runTimer     = document.getElementById('run-timer');
const clearBtn     = document.getElementById('clear-btn');
const chartCanvas  = document.getElementById('progress-chart');
const chartHint    = document.getElementById('chart-hint');

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

// ── PROGRESS CHART ───────────────────────────────────────────────────────────
function drawChart() {
  const dpr = window.devicePixelRatio || 1;
  const wrap = chartCanvas.parentElement;
  const w = wrap.clientWidth - 24;
  const h = 70;
  chartCanvas.width  = w * dpr;
  chartCanvas.height = h * dpr;
  chartCanvas.style.width  = w + 'px';
  chartCanvas.style.height = h + 'px';

  const ctx = chartCanvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (solves.length < 2) {
    chartHint.style.display = solves.length === 0 ? 'block' : 'none';
    return;
  }
  chartHint.style.display = 'none';

  const times = solves.map(s => s.ms);
  const minT  = Math.min(...times);
  const maxT  = Math.max(...times);
  const range = maxT - minT || 1;
  const pad   = { top: 8, bottom: 8, left: 4, right: 4 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const px = (i) => pad.left + (i / (times.length - 1)) * chartW;
  const py = (t) => pad.top  + (1 - (t - minT) / range) * chartH;

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, h);
  grad.addColorStop(0, 'rgba(0,229,255,0.35)');
  grad.addColorStop(1, 'rgba(0,229,255,0)');
  ctx.beginPath();
  ctx.moveTo(px(0), py(times[0]));
  times.forEach((t, i) => { if (i > 0) ctx.lineTo(px(i), py(t)); });
  ctx.lineTo(px(times.length - 1), h);
  ctx.lineTo(px(0), h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(px(0), py(times[0]));
  times.forEach((t, i) => { if (i > 0) ctx.lineTo(px(i), py(t)); });
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots
  times.forEach((t, i) => {
    const isBest = t === minT;
    ctx.beginPath();
    ctx.arc(px(i), py(t), isBest ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isBest ? '#ffe600' : '#00e5ff';
    ctx.fill();
  });
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
  drawChart();
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
