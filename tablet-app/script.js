var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var drawing = false;
var currentColor = "#ff6b6b";
var brushSize = 8;

// Make canvas fill available space
function resizeCanvas() {
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Color buttons
document.querySelectorAll(".color-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".color-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    currentColor = btn.dataset.color;
  });
});

// Brush size
document.getElementById("brushSize").addEventListener("input", function (e) {
  brushSize = e.target.value;
});

// Clear button
document.getElementById("clearBtn").addEventListener("click", function () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Get position from mouse or touch event
function getPos(e) {
  var rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

// Drawing functions
function startDraw(e) {
  e.preventDefault();
  drawing = true;
  var pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  e.preventDefault();
  if (!drawing) return;
  var pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function stopDraw(e) {
  e.preventDefault();
  drawing = false;
}

// Mouse events
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDraw);
canvas.addEventListener("mouseleave", stopDraw);

// Touch events (for tablet)
canvas.addEventListener("touchstart", startDraw);
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("touchend", stopDraw);
canvas.addEventListener("touchcancel", stopDraw);
