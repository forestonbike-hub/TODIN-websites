// ── STATE ─────────────────────────────────────────────────────────────────────
let solves     = JSON.parse(localStorage.getItem('cubeSolves') || '[]').map(upgradeSolve);
// solves[i] = { id, ms, plus?, dnf?, insp?, stages? }
//   plus:   ms added as penalties (+2 from inspection, +2 or +0.2 from the buttons)
//   dnf:    true for a DNF (from inspection or the DNF button)
//   dnfCounts: true if a kept DNF should still count toward Best Time and Average
//   insp:   inspection length in ms
//   stages: ms for each stage (Stage Practice), adds up to ms

// Older saves kept penalties as one label: '+2', '+4' or 'DNF'
function upgradeSolve(s) {
  if (s.penalty === undefined) return s;
  const { penalty, ...rest } = s;
  if (penalty === 'DNF') rest.dnf = true;
  else rest.plus = { '+2': 2000, '+4': 4000 }[penalty] || 0;
  return rest;
}

const DEFAULT_SETTINGS = {
  stageOn: false, stageCount: 4, stageBeep: true,
  inspOn: false, voiceOn: true, voice1: 8, voice2: 12,
  stackOn: false,
};
let settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('cubeSettings') || '{}') };

let timerInterval = null;
let startTime     = null;
let holdTimeout   = null;
let isHolding     = false;
let isRunning     = false;
let wakeLock      = null;
let splits        = [];   // time on the clock at each stage tap during this solve
let lastTapAt     = 0;
let lastStopAt    = 0;

let isInspecting  = false;
let inspStart     = null;
let inspInterval  = null;
let inspCalled    = [false, false];
let pendingInsp   = null; // { ms, penalty } from this solve's inspection, until the solve is saved

let lastSolveId   = null;  // the solve the +2 / DNF buttons apply to
let buttonPlus    = 0;     // ms added with the +2 / +0.2 buttons (only one per solve)

const STAGE_COLORS = ['#40c4ff', '#ff4fa3', '#00e676', '#ffd740', '#b388ff',
                      '#ff9100', '#ff5252', '#64ffda', '#eeff41', '#ffffff'];
const stageColor = (i) => STAGE_COLORS[i % STAGE_COLORS.length];

// ── DOM ───────────────────────────────────────────────────────────────────────
const timerText    = document.getElementById('timer-text');
const statusNote   = document.getElementById('status-note');
const hint         = document.getElementById('hint');
const bestTime     = document.getElementById('best-time');
const avgTime      = document.getElementById('avg-time');
const solvesList   = document.getElementById('solves-list');
const holdOverlay  = document.getElementById('hold-overlay');
const runOverlay   = document.getElementById('run-overlay');
const runTimer     = document.getElementById('run-timer');
const runSplits    = document.getElementById('run-splits');
const runHint      = document.getElementById('run-hint');
const clearBtn     = document.getElementById('clear-btn');
const chartCanvas  = document.getElementById('progress-chart');
const chartHint    = document.getElementById('chart-hint');
const stageWrap    = document.getElementById('stage-chart-wrap');
const stageCanvas  = document.getElementById('stage-chart');
const stageHint    = document.getElementById('stage-chart-hint');
const stageLegend  = document.getElementById('stage-legend');
const startInspBtn = document.getElementById('start-insp-btn');
const inspOverlay  = document.getElementById('insp-overlay');
const inspTimer    = document.getElementById('insp-timer');
const inspWarn     = document.getElementById('insp-warn');
const startSolveBtn = document.getElementById('start-solve-btn');
const inspPadHint  = document.getElementById('insp-pad-hint');
const inspPadsEl   = document.getElementById('insp-pads');
const runPadsEl    = document.getElementById('run-pads');
const mainPadArea  = document.getElementById('main-pad-area');
const mainPadHint  = document.getElementById('main-pad-hint');
const mainPadsEl   = document.getElementById('main-pads');

const stageToggle  = document.getElementById('stage-toggle');
const stageCount   = document.getElementById('stage-count');
const stageOptions = document.getElementById('stage-options');
const stageSub     = document.getElementById('stage-sub');
const beepToggle   = document.getElementById('beep-toggle');
const inspToggle   = document.getElementById('insp-toggle');
const inspOptions  = document.getElementById('insp-options');
const voiceToggle  = document.getElementById('voice-toggle');
const voiceOptions = document.getElementById('voice-options');
const voice1Input  = document.getElementById('voice1');
const voice2Input  = document.getElementById('voice2');
const stackToggle  = document.getElementById('stack-toggle');

const penaltyBtns  = document.getElementById('penalty-btns');
const plus2Btn     = document.getElementById('plus2-btn');
const plus02Btn    = document.getElementById('plus02-btn');
const dnfBtn       = document.getElementById('dnf-btn');
const modal        = document.getElementById('modal');
const modalTitle   = document.getElementById('modal-title');
const modalText    = document.getElementById('modal-text');
const modalYes     = document.getElementById('modal-yes');
const modalNo      = document.getElementById('modal-no');

// ── FORMAT TIME ───────────────────────────────────────────────────────────────
function fmt(ms) {
  const mins  = Math.floor(ms / 60000);
  const secs  = Math.floor((ms % 60000) / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${mins}:${String(secs).padStart(2,'0')}.${String(cents).padStart(2,'0')}`;
}
// Shorter form for stage times: 5.23 (or 1:05.23 past a minute)
function fmtShort(ms) {
  if (ms >= 60000) return fmt(ms);
  const secs  = Math.floor(ms / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${secs}.${String(cents).padStart(2,'0')}`;
}
// Inspection length in tenths, rounded down so 14.98 never shows as 15.0
function fmtSecs(ms) {
  return (Math.floor(ms / 100) / 10).toFixed(1);
}

// ── SOLVE HELPERS ─────────────────────────────────────────────────────────────
function isDNF(s)   { return !!s.dnf; }
// Counts toward Best Time and Average: every solve except DNFs left out
function counts(s)  { return !s.dnf || !!s.dnfCounts; }
function finalMs(s) { return s.ms + (s.plus || 0); }
// Added seconds as a badge label: 2000 -> "+2", 2200 -> "+2.2"
function plusLabel(ms) { return '+' + ms / 1000; }
function inspPenalty(ms) {
  if (ms >= 17000) return 'DNF';
  if (ms >= 15000) return '+2';
  return null;
}
// Solves recorded with the current number of stages
function stageSolves() {
  return solves.filter(s => s.stages && s.stages.length === settings.stageCount);
}

// ── WAKE LOCK ─────────────────────────────────────────────────────────────────
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) { /* silently ignore if not supported */ }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

// ── VOICE ─────────────────────────────────────────────────────────────────────
function say(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 1.05;
  speechSynthesis.speak(u);
}
// Tablets only allow speech after a tap, so warm it up on the Start Inspection tap
function primeSpeech() {
  if (!('speechSynthesis' in window) || !settings.voiceOn) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}

// ── BEEPS ─────────────────────────────────────────────────────────────────────
// Short tones made by the browser (no sound files). Tablets only allow sound
// after a tap, so the audio is switched on at the first finger lift.
let audioCtx = null;
function unlockAudio() {
  if (!settings.stageOn || !settings.stageBeep) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('pointerup', unlockAudio, true);
document.addEventListener('touchend', unlockAudio, true);

function tone(freq, start, length) {
  const t    = audioCtx.currentTime + start;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}
function canBeep() {
  return settings.stageOn && settings.stageBeep && audioCtx && audioCtx.state === 'running';
}
// One short beep for each stage tap
function stageBeep() {
  if (canBeep()) tone(1047, 0, 0.09);
}
// A rising two-note chirp when the last stage finishes the solve
function doneBeep() {
  if (!canBeep()) return;
  tone(1047, 0, 0.08);
  tone(1568, 0.09, 0.16);
}

// ── GHOST-CLICK SHIELD ───────────────────────────────────────────────────────
// Stopping a timer hides its overlay on pointerdown, so the click that follows
// would land on whatever is underneath (like a delete button). Swallow clicks
// until every finger that stopped it has lifted.
let shieldPointers = new Set();
let shieldSince    = 0;
let shieldUntil    = 0;
function shieldClicks(pointerIds) {
  shieldPointers = new Set(pointerIds);
  shieldSince    = Date.now();
  shieldUntil    = Infinity;
}
function releaseShield(e) {
  if (!shieldPointers.delete(e.pointerId)) return;
  if (shieldPointers.size === 0) shieldUntil = Date.now() + 400;
}
document.addEventListener('pointerup', releaseShield, true);
document.addEventListener('pointercancel', releaseShield, true);
// A brand-new touch a second later means the hands have moved on
document.addEventListener('pointerdown', e => {
  if (shieldPointers.size && !shieldPointers.has(e.pointerId) && Date.now() - shieldSince > 1000) {
    shieldPointers.clear();
    shieldUntil = 0;
  }
}, true);
document.addEventListener('click', e => {
  if (Date.now() < shieldUntil) { e.preventDefault(); e.stopPropagation(); }
}, true);

// ── STACK MAT PADS ───────────────────────────────────────────────────────────
// Two pads, one per hand. 'start' pads turn green once both are held for half a
// second, then lifting either hand calls onLift. 'stop' pads call onBothDown the
// moment both are pressed.
function makePads(el, mode, { onLift, onBothDown, onChange }) {
  const pads  = [...el.querySelectorAll('.pad')];
  const held  = pads.map(() => new Set());   // pointer ids touching each pad
  let readyTimer = null;
  let ready      = false;
  const bothDown = () => held.every(s => s.size > 0);

  function state() {
    if (ready) return 'ready';
    return bothDown() ? 'holding' : 'idle';
  }
  function refresh() {
    pads.forEach((p, i) => p.classList.toggle('down', held[i].size > 0));
    el.classList.toggle('ready', ready);
    if (onChange) onChange(state());
  }
  function reset() {
    held.forEach(s => s.clear());
    clearTimeout(readyTimer);
    readyTimer = null;
    ready = false;
    refresh();
  }

  pads.forEach((pad, i) => pad.addEventListener('pointerdown', e => {
    e.preventDefault();
    held[i].add(e.pointerId);
    if (mode === 'stop') {
      refresh();
      if (bothDown()) onBothDown([...held[0], ...held[1]]);
      return;
    }
    if (bothDown() && !readyTimer && !ready) {
      readyTimer = setTimeout(() => { ready = true; refresh(); }, 500);
    }
    refresh();
  }));

  function release(e) {
    const i = held.findIndex(s => s.has(e.pointerId));
    if (i < 0) return;
    held[i].delete(e.pointerId);
    if (mode === 'start') {
      if (ready) {
        reset();
        onLift();
        return;
      }
      if (!bothDown()) { clearTimeout(readyTimer); readyTimer = null; }
    }
    refresh();
  }
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);

  return { reset };
}

function padHintText(state, idleText) {
  if (state === 'ready')   return 'Lift a hand to start!';
  if (state === 'holding') return 'Hold...';
  return idleText;
}
function showPadHint(el, state, idleText) {
  el.textContent = padHintText(state, idleText);
  el.classList.toggle('holding', state === 'holding');
  el.classList.toggle('ready',   state === 'ready');
}

// ── CHARTS ────────────────────────────────────────────────────────────────────
function prepCanvas(canvas, h) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(canvas.parentElement.clientWidth - 24, 0);
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w };
}

// Shared x/y scale for one or more lines of the same length
function chartScale(series, w, h) {
  const all   = series.flat();
  const minT  = Math.min(...all);
  const maxT  = Math.max(...all);
  const range = maxT - minT || 1;
  const pad   = { top: 8, bottom: 8, left: 4, right: 4 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const n = series[0].length;
  return {
    minT,
    px: (i) => pad.left + (i / (n - 1)) * chartW,
    py: (t) => pad.top  + (1 - (t - minT) / range) * chartH,
  };
}

function strokeLine(ctx, times, px, py, color, width) {
  ctx.beginPath();
  ctx.moveTo(px(0), py(times[0]));
  times.forEach((t, i) => { if (i > 0) ctx.lineTo(px(i), py(t)); });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// Total time for every solve in history. Kept DNFs show as red dots and never
// count as the best (yellow) dot.
function drawChart() {
  const h = 70;
  const { ctx, w } = prepCanvas(chartCanvas, h);

  const times = solves.map(finalMs);
  if (times.length < 2) {
    chartHint.style.display = solves.length === 0 ? 'block' : 'none';
    return;
  }
  chartHint.style.display = 'none';

  const { px, py } = chartScale([times], w, h);
  const best = getBest();

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 8, 0, h);
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
  strokeLine(ctx, times, px, py, '#00e5ff', 2.5);

  // Dots
  times.forEach((t, i) => {
    const dnf    = isDNF(solves[i]);
    const isBest = counts(solves[i]) && t === best;
    ctx.beginPath();
    ctx.arc(px(i), py(t), isBest ? 5 : dnf ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isBest ? '#ffe600' : dnf ? '#ff5252' : '#00e5ff';
    ctx.fill();
  });
}

// One colored line per stage
function drawStageChart() {
  if (!settings.stageOn) return;
  const h = 80;
  const { ctx, w } = prepCanvas(stageCanvas, h);

  const rows = stageSolves();
  if (rows.length < 2) {
    stageHint.style.display = 'block';
    return;
  }
  stageHint.style.display = 'none';

  const series = [];
  for (let i = 0; i < settings.stageCount; i++) series.push(rows.map(s => s.stages[i]));
  const { px, py } = chartScale(series, w, h);

  series.forEach((times, i) => {
    const color = stageColor(i);
    strokeLine(ctx, times, px, py, color, 2);
    times.forEach((t, j) => {
      ctx.beginPath();
      ctx.arc(px(j), py(t), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  });
}

function renderLegend() {
  stageLegend.innerHTML = '';
  for (let i = 0; i < settings.stageCount; i++) {
    const item = document.createElement('span');
    item.className = 'legend-item';
    item.style.color = stageColor(i);
    item.textContent = `Stage ${i + 1}`;
    stageLegend.appendChild(item);
  }
}

// ── BEST TIME ─────────────────────────────────────────────────────────────────
function getBest(list = solves) {
  const counted = list.filter(counts);
  if (counted.length === 0) return null;
  return Math.min(...counted.map(finalMs));
}
// Mean of every solve that counts (penalties included, DNFs only if chosen to count)
function getAverage() {
  const counted = solves.filter(counts);
  if (counted.length === 0) return null;
  return Math.round(counted.reduce((sum, s) => sum + finalMs(s), 0) / counted.length);
}
function updateBestBar() {
  const b = getBest();
  const a = getAverage();
  bestTime.textContent = b !== null ? fmt(b) : '--:--.--';
  avgTime.textContent  = a !== null ? fmt(a) : '--:--.--';
}

// ── RENDER SOLVES ─────────────────────────────────────────────────────────────
function timeWithBadge(s, className) {
  const wrap = document.createElement('span');
  const timeEl = document.createElement('span');
  timeEl.className = className + (counts(s) ? '' : ' dnf-time');
  timeEl.textContent = fmt(finalMs(s));
  wrap.appendChild(timeEl);
  const addBadge = (text, kind) => {
    const badge = document.createElement('span');
    badge.className = 'badge ' + kind;
    badge.textContent = text;
    wrap.appendChild(badge);
  };
  // Orange for whole +2s, purple when a +0.2 is part of it
  if (s.plus) addBadge(plusLabel(s.plus), s.plus % 2000 ? 'plus02' : 'plus2');
  if (isDNF(s)) addBadge('DNF', 'dnf');
  return wrap;
}

function deleteButton(id) {
  const del = document.createElement('button');
  del.className = 'solve-del';
  del.textContent = '✕';
  del.onclick = () => deleteSolve(id);
  return del;
}

function renderSolves() {
  drawChart();
  drawStageChart();
  solvesList.innerHTML = '';
  if (settings.stageOn) renderStageTable();
  else renderSolveList();
  updateBestBar();
  updatePenaltyButtons();
}

function renderSolveList() {
  const best = getBest();
  // Show newest first
  [...solves].reverse().forEach((s, ri) => {
    const num = solves.length - ri;
    const row = document.createElement('div');
    row.className = 'solve-row' + (counts(s) && finalMs(s) === best ? ' best' : '');

    const numEl  = document.createElement('span');
    numEl.className = 'solve-num';
    numEl.textContent = `#${num}`;

    row.append(numEl, timeWithBadge(s, 'solve-time'), deleteButton(s.id));
    solvesList.appendChild(row);
  });
}

// Stage Practice: one row per solve, one column per stage, then the total
function renderStageTable() {
  const n    = settings.stageCount;
  const rows = stageSolves();
  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'stage-empty';
    const how = settings.stackOn
      ? `tap the screen after each stage, and put both hands on the pads when Stage ${n} is done`
      : `tap the screen each time you finish a stage (${n} taps in all)`;
    empty.textContent = `No stage solves yet. Start a solve, then ${how}.`;
    solvesList.appendChild(empty);
    return;
  }

  const counted   = rows.filter(counts);
  const best      = getBest(rows);
  const stageBest = [];
  for (let i = 0; i < n; i++) {
    stageBest.push(counted.length ? Math.min(...counted.map(s => s.stages[i])) : null);
  }

  const table = document.createElement('table');
  table.className = 'stage-table';
  const head = table.createTHead().insertRow();
  const addTh = (text, color) => {
    const th = document.createElement('th');
    th.textContent = text;
    if (color) th.style.color = color;
    head.appendChild(th);
  };
  addTh('#');
  for (let i = 0; i < n; i++) addTh(`Stage ${i + 1}`, stageColor(i));
  addTh('Total');
  addTh('');

  const body = table.createTBody();
  [...rows].reverse().forEach((s, ri) => {
    const tr = body.insertRow();
    if (counts(s) && finalMs(s) === best) tr.className = 'best';

    tr.insertCell().textContent = `#${rows.length - ri}`;
    s.stages.forEach((t, i) => {
      const td = tr.insertCell();
      td.textContent = fmtShort(t);
      if (counts(s) && t === stageBest[i]) {
        td.classList.add('stage-best');
        td.style.color = stageColor(i);
      }
    });

    const total = tr.insertCell();
    total.className = 'total';
    total.appendChild(timeWithBadge(s, ''));

    tr.insertCell().appendChild(deleteButton(s.id));
  });
  solvesList.appendChild(table);
}

function saveSolves() {
  localStorage.setItem('cubeSolves', JSON.stringify(solves));
}

function addSolve(ms, extra) {
  const solve = { id: Date.now(), ms, ...extra };
  solves.push(solve);
  saveSolves();
  renderSolves();
  return solve;
}

function deleteSolve(id) {
  solves = solves.filter(s => s.id !== id);
  saveSolves();
  renderSolves();
}

// ── STATUS LINE + READY STATE ─────────────────────────────────────────────────
function setStatus(text, tone) {
  statusNote.textContent = text;
  statusNote.className = tone || '';
}

// How a solve gets started from the main screen:
//   Inspection on               -> big Start Inspection button
//   Inspection off, Stack Mat on -> two hand pads
//   both off                    -> hold anywhere
function updateReady() {
  const insp  = settings.inspOn;
  const stack = settings.stackOn && !insp;
  startInspBtn.classList.toggle('hidden', !insp);
  mainPadArea.classList.toggle('hidden', !stack);
  hint.classList.toggle('hidden', insp || stack);
  mainPads.reset();
}

// ── CONFIRM POP-UP ────────────────────────────────────────────────────────────
// Resolves true for the right-hand (yes) button, false for the left one
function ask(title, text, yesLabel, noLabel, tone) {
  return new Promise(resolve => {
    modalTitle.textContent = title;
    modalText.textContent  = text;
    modalYes.textContent   = yesLabel;
    modalNo.textContent    = noLabel;
    modalYes.className     = tone || '';
    modal.classList.remove('hidden');
    const done = (answer) => {
      modal.classList.add('hidden');
      modalYes.onclick = modalNo.onclick = null;
      resolve(answer);
    };
    modalYes.onclick = () => done(true);
    modalNo.onclick  = () => done(false);
  });
}

// ── RESULT + PENALTY BUTTONS ──────────────────────────────────────────────────
function lastSolve() {
  return solves.find(s => s.id === lastSolveId) || null;
}

// The line under the time, e.g. "+2 for inspection (15.6 sec) · +0.2 added"
function showResult(s) {
  timerText.textContent = fmt(finalMs(s));
  const inspP = s.insp != null ? inspPenalty(s.insp) : null;
  const fromButtons = (s.plus || 0) - (inspP === '+2' ? 2000 : 0);
  const notes = [];
  if (inspP === 'DNF')   notes.push(`DNF: inspected ${fmtSecs(s.insp)} sec`);
  else if (isDNF(s))     notes.push("DNF: the cube wasn't solved");
  if (inspP === '+2')    notes.push(`+2 for inspection (${fmtSecs(s.insp)} sec)`);
  if (fromButtons === 2000) notes.push('+2 added');
  if (fromButtons === 200)  notes.push('+0.2 added');
  if (isDNF(s) && counts(s)) notes.push('counts toward Best Time and Average');
  setStatus(notes.join(' · '), isDNF(s) ? 'danger' : notes.length ? 'warn' : '');
}

// The buttons show under the last solve until the next one starts.
// +2 and +0.2 are one-or-the-other; DNF stays available until it's used.
function updatePenaltyButtons() {
  const s = lastSolve();
  const canPlus = !!s && !buttonPlus;
  const canDnf  = !!s && !isDNF(s);
  plus2Btn.classList.toggle('hidden', !canPlus);
  plus02Btn.classList.toggle('hidden', !canPlus);
  dnfBtn.classList.toggle('hidden', !canDnf);
  penaltyBtns.classList.toggle('hidden', !canPlus && !canDnf);
}

function clearLastSolve() {
  lastSolveId = null;
  buttonPlus = 0;
  updatePenaltyButtons();
}

// After a DNF: first keep or exclude it, then (if kept) whether it counts
async function askKeepDNF(s) {
  const keep = await ask(
    'Keep this DNF in your history?',
    'Keep it: the time shows in your table and charts with a DNF note. Exclude it: this solve is removed completely.',
    'Keep in history', 'Exclude it');
  if (!keep) {
    deleteSolve(s.id);
    setStatus('DNF: left out of your history', 'danger');
    return;
  }
  const count = await ask(
    'Count it toward Best Time and Average?',
    'Yes: it counts like a normal solve. No: you still see it in your table and charts, but Best Time and Average leave it out.',
    'Yes, count it', 'No, leave it out');
  if (count && solves.includes(s)) {
    s.dnfCounts = true;
    saveSolves();
    renderSolves();
    if (lastSolve() === s) showResult(s);
  }
}

async function addButtonPenalty(ms) {
  const s = lastSolve();
  if (!s || buttonPlus) return;
  const secs = ms / 1000;
  const ok = await ask(
    `Add ${secs} seconds?`,
    `Your time becomes ${fmt(finalMs(s) + ms)}. A solve can get +2 or +0.2, not both.`,
    `Add ${secs} seconds`, 'Cancel', ms === 2000 ? 'plus2' : 'plus02');
  if (!ok || lastSolve() !== s || buttonPlus) return;
  s.plus = (s.plus || 0) + ms;
  buttonPlus = ms;
  saveSolves();
  renderSolves();
  showResult(s);
}

plus2Btn.addEventListener('click', () => addButtonPenalty(2000));
plus02Btn.addEventListener('click', () => addButtonPenalty(200));

dnfBtn.addEventListener('click', async () => {
  const s = lastSolve();
  if (!s || isDNF(s)) return;
  const ok = await ask(
    'Make this solve a DNF?',
    "Use this if you put the cube down before it was solved. Next you'll choose whether to keep it and whether it counts.",
    'Yes, DNF', 'Cancel', 'dnf');
  if (!ok || lastSolve() !== s) return;
  s.dnf = true;
  saveSolves();
  renderSolves();
  showResult(s);
  await askKeepDNF(s);
});

function nudgeStartButton() {
  startInspBtn.classList.remove('nudge');
  void startInspBtn.offsetWidth;   // restart the animation
  startInspBtn.classList.add('nudge');
}

// ── INSPECTION ────────────────────────────────────────────────────────────────
function startInspection() {
  if (isRunning || isInspecting) return;
  if (document.activeElement) document.activeElement.blur();
  primeSpeech();
  isInspecting = true;
  inspStart = Date.now();
  inspCalled = [false, false];
  inspTimer.textContent = '0';
  inspWarn.textContent = '';
  setStatus('');
  clearLastSolve();

  // Stack Mat swaps the Start Solve Timer button for the two hand pads
  const stack = settings.stackOn;
  startSolveBtn.classList.toggle('hidden', stack);
  inspPadHint.classList.toggle('hidden', !stack);
  inspPadsEl.classList.toggle('hidden', !stack);
  inspOverlay.classList.toggle('stack', stack);
  inspPads.reset();

  inspOverlay.classList.remove('hidden', 'warn', 'dnf');
  inspInterval = setInterval(tickInspection, 50);
  requestWakeLock();
}

function tickInspection() {
  const elapsed = Date.now() - inspStart;
  inspTimer.textContent = Math.floor(elapsed / 1000);

  if (settings.voiceOn) {
    [settings.voice1, settings.voice2].forEach((sec, i) => {
      if (!inspCalled[i] && elapsed >= sec * 1000) {
        inspCalled[i] = true;
        say(`${sec} seconds`);
      }
    });
  }

  const p = inspPenalty(elapsed);
  inspOverlay.classList.toggle('warn', p === '+2');
  inspOverlay.classList.toggle('dnf',  p === 'DNF');
  inspWarn.textContent = p === '+2' ? '+2 penalty' : p === 'DNF' ? 'DNF' : '';
}

// Inspection ends and the solve clock starts at the same instant
function startSolveFromInspection() {
  if (!isInspecting) return;
  const now = Date.now();
  const ms  = now - inspStart;
  clearInterval(inspInterval);
  isInspecting = false;
  inspOverlay.classList.add('hidden');
  pendingInsp = { ms, penalty: inspPenalty(ms) };
  startTimer(now);
}

startInspBtn.addEventListener('click', startInspection);
startSolveBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  startSolveFromInspection();
});

const inspPads = makePads(inspPadsEl, 'start', {
  onLift: startSolveFromInspection,
  onChange: (state) => showPadHint(inspPadHint, state, 'Both hands on the pads when you are ready'),
});

// Stack Mat without inspection: the pads on the main screen start the solve
const mainPads = makePads(mainPadsEl, 'start', {
  onLift: () => {
    if (isRunning || isInspecting || settings.inspOn) return;
    startTimer(Date.now());
  },
  onChange: (state) => showPadHint(mainPadHint, state, 'Both hands on the pads, then lift to start'),
});

// ── TIMER LOOP ────────────────────────────────────────────────────────────────
function tickRunning() {
  const elapsed = Date.now() - startTime;
  runTimer.textContent = fmt(elapsed);
}

// Stage times tapped so far, plus which stage to finish next
function renderRunSplits() {
  runSplits.innerHTML = '';
  splits.forEach((t, i) => {
    const el = document.createElement('div');
    el.style.color = stageColor(i);
    el.textContent = `Stage ${i + 1}`;
    const b = document.createElement('b');
    b.textContent = fmtShort(t - (i ? splits[i - 1] : 0));
    el.appendChild(b);
    runSplits.appendChild(el);
  });

  // Stack Mat pads stay hidden while stages are being tapped, and appear
  // for the last stage: both hands back on the pads stops the timer
  const stack = settings.stackOn;
  const stagesLeft = settings.stageOn && splits.length < settings.stageCount - 1;
  const showPads = stack && !stagesLeft;
  runPadsEl.classList.toggle('hidden', !showPads);
  runOverlay.classList.toggle('stack', showPads);

  if (settings.stageOn && settings.stageCount > 1) {
    const next = splits.length + 1;
    const last = next === settings.stageCount;
    if (!last)      runHint.textContent = `Tap when Stage ${next} is done`;
    else if (stack) runHint.textContent = `Both hands on the pads when Stage ${next} is done`;
    else            runHint.textContent = `Tap when Stage ${next} is done to finish`;
    runHint.style.color = stageColor(next - 1);
    runHint.classList.add('stage');
  } else {
    runHint.textContent = stack ? 'Both hands on the pads to stop' : 'Tap anywhere to stop';
    runHint.style.color = '';
    runHint.classList.toggle('stage', stack);
  }
}

// ── HOLD TO START ─────────────────────────────────────────────────────────────
function onHoldStart(e) {
  if (isRunning || isHolding || isInspecting) return;
  // Ignore taps on buttons, settings and pads
  if (e.target.closest('button, #settings, .pad')) return;
  // Ignore a second hand landing right after a stop
  if (Date.now() - lastStopAt < 400) return;
  if (document.activeElement) document.activeElement.blur();
  if (settings.inspOn) {
    nudgeStartButton();
    return;
  }
  // With Stack Mat on, only the pads start a solve
  if (settings.stackOn) return;
  isHolding = true;
  holdOverlay.classList.remove('hidden');
  holdOverlay.classList.remove('green');

  holdTimeout = setTimeout(() => {
    holdOverlay.classList.add('green');
    document.getElementById('hold-text').textContent = 'Let go!';
  }, 1000);
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
function startTimer(now = Date.now()) {
  isRunning = true;
  startTime = now;
  lastTapAt = startTime;
  splits = [];
  setStatus('');
  clearLastSolve();
  runPads.reset();

  runOverlay.classList.remove('hidden');
  runTimer.textContent = '0:00.00';
  renderRunSplits();
  timerInterval = setInterval(tickRunning, 30);
  requestWakeLock();
}

function stopTimer(now) {
  if (!isRunning) return;
  clearInterval(timerInterval);
  isRunning = false;
  lastStopAt = Date.now();
  const elapsed = now - startTime;
  runOverlay.classList.add('hidden');
  hint.textContent = 'Hold to start';

  const extra = {};
  if (settings.stageOn) {
    const marks = [...splits, elapsed];
    extra.stages = marks.map((t, i) => t - (i ? marks[i - 1] : 0));
  }
  if (pendingInsp) {
    extra.insp = pendingInsp.ms;
    if (pendingInsp.penalty === '+2')  extra.plus = 2000;
    if (pendingInsp.penalty === 'DNF') extra.dnf = true;
  }
  pendingInsp = null;
  doneBeep();

  const solve = addSolve(elapsed, extra);
  lastSolveId = solve.id;
  buttonPlus = 0;
  showResult(solve);
  updatePenaltyButtons();
  updateReady();
  releaseWakeLock();

  // A DNF from inspection gets the same keep-or-exclude choice
  if (isDNF(solve)) askKeepDNF(solve);
}

// ── TAP DURING SOLVE (stage taps, then stop) ─────────────────────────────────
runOverlay.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!isRunning) return;
  const now = Date.now();
  // Ignore a double tap (both hands landing together)
  if (now - lastTapAt < 300) return;

  if (settings.stageOn && splits.length < settings.stageCount - 1) {
    lastTapAt = now;
    splits.push(now - startTime);
    stageBeep();
    renderRunSplits();
  } else if (!settings.stackOn) {
    lastTapAt = now;
    shieldClicks([e.pointerId]);
    stopTimer(now);
  }
  // With Stack Mat on, only both pads together stop the timer
});

const runPads = makePads(runPadsEl, 'stop', {
  onBothDown: (pointerIds) => {
    const now = Date.now();
    if (!isRunning || now - startTime < 300) return;
    shieldClicks(pointerIds);
    stopTimer(now);
  },
});

// ── HOLD LISTENERS on main app ────────────────────────────────────────────────
document.getElementById('app').addEventListener('pointerdown', onHoldStart);
document.addEventListener('pointerup',   onHoldEnd);
document.addEventListener('pointercancel', onHoldEnd);

// ── CLEAR ALL ─────────────────────────────────────────────────────────────────
clearBtn.onclick = async () => {
  if (solves.length === 0) return;
  const n = solves.length;
  const ok = await ask(
    'Clear all your solves?',
    `This deletes all ${n} solve${n === 1 ? '' : 's'}, your charts and your best time on this device. It can't be undone.`,
    'Clear all', 'Cancel', 'dnf');
  if (!ok) return;
  solves = [];
  saveSolves();
  renderSolves();
  timerText.textContent = '0:00.00';
  setStatus('');
};

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function saveSettings() {
  localStorage.setItem('cubeSettings', JSON.stringify(settings));
}

function applySettings() {
  stageOptions.classList.toggle('hidden', !settings.stageOn);
  stageSub.classList.toggle('hidden', !settings.stageOn);
  stageWrap.classList.toggle('hidden', !settings.stageOn);
  inspOptions.classList.toggle('hidden', !settings.inspOn);
  voiceOptions.classList.toggle('hidden', !settings.voiceOn);
  renderLegend();
  renderSolves();
  updateReady();
}

function bindToggle(input, key) {
  input.checked = settings[key];
  input.addEventListener('change', () => {
    settings[key] = input.checked;
    saveSettings();
    applySettings();
  });
}

// Whole numbers only; anything out of range snaps back to the last good value
function bindNumber(input, key, min, max) {
  input.value = settings[key];
  input.addEventListener('change', () => {
    const n = Math.round(Number(input.value));
    if (input.value !== '' && n >= min && n <= max) settings[key] = n;
    input.value = settings[key];
    saveSettings();
    applySettings();
  });
}

bindToggle(stageToggle, 'stageOn');
bindNumber(stageCount, 'stageCount', 1, 10);
bindToggle(beepToggle, 'stageBeep');
bindToggle(inspToggle, 'inspOn');
bindToggle(voiceToggle, 'voiceOn');
bindNumber(voice1Input, 'voice1', 1, 60);
bindNumber(voice2Input, 'voice2', 1, 60);
bindToggle(stackToggle, 'stackOn');

// ── BLOCK LONG-PRESS CONTEXT MENU ────────────────────────────────────────────
document.addEventListener('contextmenu', e => e.preventDefault());

// Redraw charts when the tablet rotates
window.addEventListener('resize', () => { drawChart(); drawStageChart(); });

// ── INIT ──────────────────────────────────────────────────────────────────────
applySettings();
