// ── COLOURS ──────────────────────────────────────────────────────────────────
const COLORS = [
  '#e53935','#e91e63','#9c27b0','#673ab7','#3f51b5',
  '#2196f3','#03a9f4','#00bcd4','#009688','#4caf50',
  '#8bc34a','#cddc39','#ffeb3b','#ffc107','#ff9800',
  '#ff5722','#795548','#ffffff','#9e9e9e','#212121',
  'ERASER'
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let drawings = JSON.parse(localStorage.getItem('drawingFun') || '[]');
// drawings[i] = { id, name, dataURL, type:'color'|'draw', svgName:str|null }

let activeScreen   = 'main';
let currentColor   = '#e53935';
let brushSize      = 6;
let isDrawing      = false;
let lastX = 0, lastY = 0;
let undoStack      = [];
let editingIndex   = null;   // gallery index being edited in view screen
let usedDrawingNames = new Set(drawings.filter(d=>d.svgName).map(d=>d.svgName));

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const screens = {
  main:  document.getElementById('screen-main'),
  add:   document.getElementById('screen-add'),
  color: document.getElementById('screen-color'),
  draw:  document.getElementById('screen-draw'),
  view:  document.getElementById('screen-view'),
};
const colorCanvas = document.getElementById('color-canvas');
const drawCanvas  = document.getElementById('draw-canvas');
const viewCanvas  = document.getElementById('view-canvas');
const gallery     = document.getElementById('gallery');
const emptyMsg    = document.getElementById('empty-msg');
const modal       = document.getElementById('modal');
const modalMsg    = document.getElementById('modal-msg');

// ── SCREEN SWITCHER ───────────────────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  activeScreen = name;
}

// ── PALETTE BUILDER ───────────────────────────────────────────────────────────
function buildPalette(containerId, onPick) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  COLORS.forEach(c => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (c === 'ERASER' ? ' eraser' : '');
    if (c !== 'ERASER') sw.style.background = c;
    if (c === currentColor) sw.classList.add('selected');
    sw.addEventListener('click', () => {
      el.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      onPick(c);
    });
    el.appendChild(sw);
  });
}

// ── CANVAS SETUP ──────────────────────────────────────────────────────────────
function fitCanvas(canvas) {
  const wrap = canvas.parentElement;
  const size = Math.min(wrap.clientWidth, wrap.clientHeight) - 8;
  canvas.width  = size;
  canvas.height = size;
  return size;
}

// ── COLOR SCREEN ──────────────────────────────────────────────────────────────
let colorMode = null;   // 'fill' via flood or 'brush'
let colorSVGName = null;

function openColorScreen(svgName) {
  colorSVGName = svgName;
  showScreen('color');
  fitCanvas(colorCanvas);
  renderSVGToCanvas(colorCanvas, svgName);
  buildPalette('color-palette', c => { currentColor = c; });
  attachColorDrawing(colorCanvas);
}

function renderSVGToCanvas(canvas, svgName) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const entry = DRAWINGS.find(d => d.name === svgName);
  if (!entry) return;
  const img = new Image();
  const blob = new Blob([entry.svg], {type:'image/svg+xml'});
  const url  = URL.createObjectURL(blob);
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function attachColorDrawing(canvas) {
  // On coloring screen: tap fills a region with flood-fill; drag draws brush
  canvas.onpointerdown = e => {
    e.preventDefault();
    isDrawing = true;
    const {x,y} = canvasPos(canvas, e);
    lastX = x; lastY = y;
    if (currentColor === 'ERASER') {
      startBrush(canvas, e);
    } else {
      floodFill(canvas, Math.round(x), Math.round(y), currentColor);
    }
  };
  canvas.onpointermove = e => {
    if (!isDrawing) return;
    e.preventDefault();
    if (currentColor === 'ERASER') continueBrush(canvas, e, 20);
  };
  canvas.onpointerup = canvas.onpointercancel = e => { isDrawing = false; };
}

// ── FLOOD FILL ────────────────────────────────────────────────────────────────
function hexToRGB(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

function floodFill(canvas, startX, startY, fillColor) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width, h = canvas.height;

  const idx = (x,y) => (y*w+x)*4;
  const target = data.slice(idx(startX,startY), idx(startX,startY)+4);

  // Don't fill dark outlines (stroke pixels)
  if (target[0] < 80 && target[1] < 80 && target[2] < 80) return;

  const [fr,fg,fb] = hexToRGB(fillColor);
  if (target[0]===fr && target[1]===fg && target[2]===fb) return;

  const stack = [[startX, startY]];
  const visited = new Uint8Array(w * h);

  while (stack.length) {
    const [x,y] = stack.pop();
    if (x<0||x>=w||y<0||y>=h) continue;
    const i = idx(x,y);
    if (visited[y*w+x]) continue;
    // Stop at dark pixels (the line drawing strokes)
    if (data[i]<80 && data[i+1]<80 && data[i+2]<80) continue;
    // Stop if already filled with target color
    if (data[i]===target[0]&&data[i+1]===target[1]&&data[i+2]===target[2]) {
      visited[y*w+x] = 1;
      data[i]=fr; data[i+1]=fg; data[i+2]=fb; data[i+3]=255;
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    } else {
      visited[y*w+x] = 1;
    }
  }
  ctx.putImageData(imgData,0,0);
  // Re-draw SVG on top to keep lines crisp
  const entry = DRAWINGS.find(d => d.name === colorSVGName);
  if (entry) {
    const img = new Image();
    const blob = new Blob([entry.svg],{type:'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    img.onload = () => { ctx.drawImage(img,0,0,canvas.width,canvas.height); URL.revokeObjectURL(url); };
    img.src = url;
  }
}

// ── FREE DRAW SCREEN ──────────────────────────────────────────────────────────
function openDrawScreen(loadDataURL) {
  showScreen('draw');
  fitCanvas(drawCanvas);
  const ctx = drawCanvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  if (loadDataURL) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
    img.src = loadDataURL;
  }
  undoStack = [drawCanvas.toDataURL()];
  buildPalette('draw-palette', c => { currentColor = c; });
  attachFreeDrawing(drawCanvas);
}

function attachFreeDrawing(canvas) {
  canvas.onpointerdown = e => {
    e.preventDefault();
    isDrawing = true;
    const {x,y} = canvasPos(canvas, e);
    lastX = x; lastY = y;
    startBrush(canvas, e);
  };
  canvas.onpointermove = e => {
    if (!isDrawing) return;
    e.preventDefault();
    continueBrush(canvas, e, brushSize);
  };
  canvas.onpointerup = canvas.onpointercancel = () => {
    if (!isDrawing) return;
    isDrawing = false;
    undoStack.push(canvas.toDataURL());
    if (undoStack.length > 30) undoStack.shift();
  };
}

// ── VIEW/EDIT SCREEN ──────────────────────────────────────────────────────────
function openViewScreen(index) {
  editingIndex = index;
  const d = drawings[index];
  showScreen('view');
  fitCanvas(viewCanvas);
  const ctx = viewCanvas.getContext('2d');
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, viewCanvas.width, viewCanvas.height);
  img.src = d.dataURL;
  if (d.type === 'color') {
    colorSVGName = d.svgName;
    buildPalette('view-palette', c => { currentColor = c; });
    attachColorDrawing(viewCanvas);
  } else {
    undoStack = [d.dataURL];
    buildPalette('view-palette', c => { currentColor = c; });
    attachFreeDrawing(viewCanvas);
  }
}

// ── BRUSH HELPERS ─────────────────────────────────────────────────────────────
function canvasPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
  const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;
  return { x: cx * scaleX, y: cy * scaleY };
}

function startBrush(canvas, e) {
  const {x,y} = canvasPos(canvas, e);
  lastX = x; lastY = y;
}

function continueBrush(canvas, e, size) {
  const ctx = canvas.getContext('2d');
  const {x,y} = canvasPos(canvas, e);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.strokeStyle = currentColor === 'ERASER' ? '#ffffff' : currentColor;
  ctx.lineWidth   = currentColor === 'ERASER' ? size * 3 : size;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.stroke();
  lastX = x; lastY = y;
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
function renderGallery() {
  gallery.innerHTML = '';
  if (drawings.length === 0) {
    gallery.appendChild(emptyMsg);
    return;
  }
  drawings.forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    const img = document.createElement('img');
    img.src = d.dataURL;
    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = d.name;
    const del = document.createElement('button');
    del.className = 'delete-x';
    del.textContent = '✕';
    del.onclick = e => { e.stopPropagation(); confirmDeleteOne(i); };
    item.onclick = () => openViewScreen(i);
    item.append(img, label, del);
    gallery.appendChild(item);
  });
}

function saveDrawing(canvas, name, type, svgName) {
  const dataURL = canvas.toDataURL();
  const id = Date.now();
  drawings.push({ id, name, dataURL, type, svgName: svgName || null });
  localStorage.setItem('drawingFun', JSON.stringify(drawings));
  renderGallery();
}

function updateDrawing(index, canvas) {
  drawings[index].dataURL = canvas.toDataURL();
  localStorage.setItem('drawingFun', JSON.stringify(drawings));
  renderGallery();
}

function deleteDrawing(index) {
  drawings.splice(index, 1);
  localStorage.setItem('drawingFun', JSON.stringify(drawings));
  renderGallery();
}

// ── RANDOM IMAGE ──────────────────────────────────────────────────────────────
function pickRandomDrawing() {
  // Prefer unused ones first
  let unused = DRAWINGS.filter(d => !usedDrawingNames.has(d.name));
  if (unused.length === 0) { usedDrawingNames.clear(); unused = [...DRAWINGS]; }
  const pick = unused[Math.floor(Math.random() * unused.length)];
  usedDrawingNames.add(pick.name);
  return pick.name;
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
let modalCallback = null;
function showModal(msg, cb) {
  modalMsg.textContent = msg;
  modalCallback = cb;
  modal.classList.remove('hidden');
}
document.getElementById('modal-confirm').onclick = () => {
  modal.classList.add('hidden');
  if (modalCallback) modalCallback();
};
document.getElementById('modal-cancel').onclick = () => modal.classList.add('hidden');

function confirmDeleteOne(i) {
  showModal(`Delete "${drawings[i].name}"?`, () => { deleteDrawing(i); });
}

// ── BUTTON WIRING ─────────────────────────────────────────────────────────────

// Main screen
document.getElementById('add-drawing-btn').onclick = () => showScreen('add');
document.getElementById('clear-all-btn').onclick = () => {
  if (drawings.length === 0) return;
  showModal('Delete ALL your drawings? This cannot be undone!', () => {
    drawings = [];
    localStorage.setItem('drawingFun', JSON.stringify(drawings));
    renderGallery();
  });
};

// Add screen
document.getElementById('add-back-btn').onclick = () => showScreen('main');
document.getElementById('go-color-btn').onclick = () => {
  const name = pickRandomDrawing();
  openColorScreen(name);
};
document.getElementById('go-draw-btn').onclick = () => openDrawScreen(null);

// Color screen
document.getElementById('color-back-btn').onclick = () => showScreen('main');
document.getElementById('random-btn').onclick = () => {
  colorSVGName = pickRandomDrawing();
  renderSVGToCanvas(colorCanvas, colorSVGName);
};
document.getElementById('color-save-btn').onclick = () => {
  saveDrawing(colorCanvas, colorSVGName || 'Coloring', 'color', colorSVGName);
  showScreen('main');
};

// Free draw screen
document.getElementById('draw-back-btn').onclick = () => showScreen('main');
document.getElementById('draw-clear-btn').onclick = () => {
  showModal('Clear your drawing?', () => {
    const ctx = drawCanvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    undoStack = [drawCanvas.toDataURL()];
  });
};
document.getElementById('draw-undo-btn').onclick = () => {
  if (undoStack.length <= 1) return;
  undoStack.pop();
  const ctx = drawCanvas.getContext('2d');
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
  img.src = undoStack[undoStack.length - 1];
};
document.getElementById('draw-save-btn').onclick = () => {
  saveDrawing(drawCanvas, 'My Drawing', 'draw', null);
  showScreen('main');
};

// Brush size buttons
document.querySelectorAll('.size-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    brushSize = parseInt(btn.dataset.size);
  };
});

// View screen
document.getElementById('view-back-btn').onclick = () => showScreen('main');
document.getElementById('view-delete-btn').onclick = () => {
  showModal(`Delete this drawing?`, () => {
    deleteDrawing(editingIndex);
    showScreen('main');
  });
};
document.getElementById('view-save-btn').onclick = () => {
  updateDrawing(editingIndex, viewCanvas);
  showScreen('main');
};

// ── INIT ──────────────────────────────────────────────────────────────────────
renderGallery();
