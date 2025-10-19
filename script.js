const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const rotatePrompt = document.getElementById("rotate-prompt");

// --- Pause Modal Elements ---
const pauseModal = document.getElementById("pauseModal");
const resumeBtn = document.getElementById("resumeBtn");

// --- Load images ---
const bgImage = new Image();
bgImage.src = "assets/space-bg.png";

const shipImage = new Image();
shipImage.src = "assets/player-ship.png";

const laserImage = new Image();
laserImage.src = "assets/laser.png";

const asteroidV1 = new Image();
asteroidV1.src = "assets/asteroid-medium-v1.png";

const asteroidV2 = new Image();
asteroidV2.src = "assets/asteroid-medium-v2.png";

const asteroidDestroyFrames = [
  "assets/asteroid-medium-destroyed-s1.png",
  "assets/asteroid-medium-destroyed-s2.png",
  "assets/asteroid-medium-destroyed-s3.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const healthBars = [
  "assets/health-bar-0.png",
  "assets/health-bar-1.png",
  "assets/health-bar-2.png",
  "assets/health-bar-3.png",
  "assets/health-bar-4.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const shipExplosionFrames = [
  "assets/ship-explode-s1.png",
  "assets/ship-explode-s2.png",
  "assets/ship-explode-s3.png",
  "assets/ship-explode-s4.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

let scrollX = 0;
let gameOver = false;
let shipExploding = false;
let explosionFrame = 0;
let explosionTimer = 0;
let explosionDone = false;

// --- Health bar + top boundary constants ---
const HEALTH_BAR_HEIGHT = 40;
const HEALTH_BAR_MARGIN = 8;
const TOP_BOUNDARY = HEALTH_BAR_MARGIN + HEALTH_BAR_HEIGHT + 4;

// --- Player state ---
const ship = {
  x: 60,
  y: GAME_HEIGHT / 2 - 16,
  width: 32,
  height: 32,
  speed: 2.5,
  movingUp: false,
  movingDown: false,
  firing: false,
  fireInterval: null,
  health: 2
};

// --- Entities ---
let bullets = [];
let asteroids = [];

// --- Pause system state ---
let paused = false;

// --- (Future) Audio references ---
let gameAudioElements = []; // fill with your music/sfx Audio objects later

// --- Input (desktop) ---
window.addEventListener("keydown", e => {
  if (gameOver || shipExploding) return;

  if (e.code === "Escape") {
    togglePause();
    return;
  }

  if (paused) return;

  if (e.code === "ArrowUp" || e.code === "KeyW") ship.movingUp = true;
  if (e.code === "ArrowDown" || e.code === "KeyS") ship.movingDown = true;
  if (e.code === "Space" && !ship.firing) startFiring();
});

window.addEventListener("keyup", e => {
  if (e.code === "ArrowUp" || e.code === "KeyW") ship.movingUp = false;
  if (e.code === "ArrowDown" || e.code === "KeyS") ship.movingDown = false;
  if (e.code === "Space") stopFiring();
});

// --- Input (mobile) ---
canvas.addEventListener("touchstart", handleTouchStart);
canvas.addEventListener("touchmove", handleTouchMove);
canvas.addEventListener("touchend", handleTouchEnd);

function handleTouchStart(e) {
  if (gameOver || shipExploding || paused) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (touch.clientX - rect.left) * scale;
  const y = (touch.clientY - rect.top) * scale;

  if (
    x >= ship.x &&
    x <= ship.x + ship.width &&
    y >= ship.y &&
    y <= ship.y + ship.height
  ) {
    startFiring();
  }
}

function handleTouchMove(e) {
  if (gameOver || shipExploding || paused) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const y = (touch.clientY - rect.top) * scale;

  ship.y = y - ship.height / 2;
  ship.y = Math.max(TOP_BOUNDARY, Math.min(GAME_HEIGHT - ship.height, ship.y));
}

function handleTouchEnd(e) {
  e.preventDefault();
  stopFiring();
}

// --- Firing logic ---
function startFiring() {
  if (ship.firing) return;
  ship.firing = true;
  fireBullet();
  ship.fireInterval = setInterval(fireBullet, 333);
}

function stopFiring() {
  ship.firing = false;
  clearInterval(ship.fireInterval);
}

function fireBullet() {
  bullets.push({
    x: ship.x + ship.width - 4,
    y: ship.y + ship.height / 2 - 2,
    width: 8,
    height: 4,
    speed: 6
  });
}

// --- Asteroids ---
function spawnAsteroid() {
  if (gameOver || shipExploding || paused) return;
  const type = Math.random() < 0.5 ? 1 : 2;
  const asteroid = {
    x: GAME_WIDTH + 20,
    y: TOP_BOUNDARY + Math.random() * (GAME_HEIGHT - TOP_BOUNDARY - 32),
    width: 32,
    height: 32,
    speed: type === 1 ? 1.6 : 2.0,
    type,
    destroyed: false,
    frameIndex: 0,
    frameTimer: 0
  };
  asteroids.push(asteroid);
}
setInterval(spawnAsteroid, 1200);

// --- Helpers ---
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// --- Orientation & resize ---
function checkOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  rotatePrompt.style.visibility = isPortrait ? "visible" : "hidden";
}
window.addEventListener("resize", checkOrientation);
checkOrientation();

function resizeCanvas() {
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );
  canvas.width = GAME_WIDTH * scale;
  canvas.height = GAME_HEIGHT * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- Pause logic ---
function togglePause(force = null) {
  const newState = force !== null ? force : !paused;

  if (newState && !paused) {
    paused = true;
    pauseModal.style.display = "block";
    stopAllAudio();
  } else if (!newState && paused) {
    paused = false;
    pauseModal.style.display = "none";
    resumeAllAudio();
    requestAnimationFrame(loop);
  }
}

function stopAllAudio() {
  gameAudioElements.forEach(a => {
    a.dataset.wasPlaying = !a.paused;
    a.pause();
  });
}

function resumeAllAudio() {
  gameAudioElements.forEach(a => {
    if (a.dataset.wasPlaying === "true") a.play();
  });
}

resumeBtn.addEventListener("click", () => togglePause(false));

document.addEventListener("visibilitychange", () => {
  if (document.hidden && !paused && !gameOver) togglePause(true);
});

// --- Game Logic ---
function update() {
  if (gameOver && !shipExploding) return;

  if (shipExploding) {
    explosionTimer++;
    if (explosionTimer > 12) {
      explosionTimer = 0;
      explosionFrame++;
      if (explosionFrame >= shipExplosionFrames.length) {
        shipExploding = false;
        explosionDone = true;
      }
    }
    return;
  }

  scrollX -= 1;
  if (scrollX <= -GAME_WIDTH) scrollX = 0;

  if (ship.movingUp) ship.y -= ship.speed;
  if (ship.movingDown) ship.y += ship.speed;
  ship.y = Math.max(TOP_BOUNDARY, Math.min(GAME_HEIGHT - ship.height, ship.y));

  bullets.forEach(b => (b.x += b.speed));
  bullets = bullets.filter(b => b.x < GAME_WIDTH);

  asteroids.forEach(a => {
    if (!a.destroyed) a.x -= a.speed;

    bullets.forEach((b, bi) => {
      if (!a.destroyed && checkCollision(a, b)) {
        a.destroyed = true;
        a.frameIndex = 0;
        a.frameTimer = 0;
        bullets.splice(bi, 1);
      }
    });

    if (!a.destroyed && checkCollision(a, ship)) {
      a.destroyed = true;
      a.frameIndex = 0;
      a.frameTimer = 0;
      ship.health -= 1;
      if (ship.health < 0) ship.health = 0;
      if (ship.health === 0) triggerShipExplosion();
    }

    if (a.destroyed) {
      a.frameTimer++;
      if (a.frameTimer > 6) {
        a.frameTimer = 0;
        a.frameIndex++;
      }
    }
  });

  asteroids = asteroids.filter(
    a => a.x + a.width > 0 && a.frameIndex < asteroidDestroyFrames.length
  );
}

function triggerShipExplosion() {
  stopFiring();
  shipExploding = true;
  explosionFrame = 0;
  explosionTimer = 0;
  gameOver = true;
}

// --- Draw everything ---
function draw() {
  ctx.drawImage(bgImage, scrollX, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.drawImage(bgImage, scrollX + GAME_WIDTH, 0, GAME_WIDTH, GAME_HEIGHT);

  if (shipExploding) {
    const frame = shipExplosionFrames[explosionFrame];
    if (frame)
      ctx.drawImage(frame, ship.x - 8, ship.y - 8, ship.width + 16, ship.height + 16);
  } else if (!explosionDone) {
    ctx.drawImage(shipImage, ship.x, ship.y, ship.width, ship.height);
  }

  bullets.forEach(b => ctx.drawImage(laserImage, b.x, b.y, b.width, b.height));

  asteroids.forEach(a => {
    if (a.destroyed) {
      const frame = asteroidDestroyFrames[a.frameIndex];
      if (frame) ctx.drawImage(frame, a.x, a.y, a.width, a.height);
    } else {
      const img = a.type === 1 ? asteroidV1 : asteroidV2;
      ctx.drawImage(img, a.x, a.y, a.width, a.height);
    }
  });

  const hb = healthBars[ship.health];
  const hbWidth = 135;
  ctx.drawImage(hb, HEALTH_BAR_MARGIN, HEALTH_BAR_MARGIN, hbWidth, HEALTH_BAR_HEIGHT);

  if (explosionDone) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = "white";
    ctx.font = "20px monospace";
    ctx.fillText("GAME OVER", GAME_WIDTH / 2 - 60, GAME_HEIGHT / 2);
    ctx.font = "12px monospace";
    ctx.fillText("Refresh to restart", GAME_WIDTH / 2 - 60, GAME_HEIGHT / 2 + 20);
  }
}

// --- Main loop ---
function loop() {
  if (paused) return;
  update();
  draw();
  requestAnimationFrame(loop);
}

// --- Wait for all images before starting ---
const allImages = [
  bgImage,
  shipImage,
  laserImage,
  asteroidV1,
  asteroidV2,
  ...asteroidDestroyFrames,
  ...healthBars,
  ...shipExplosionFrames
];

let loaded = 0;
allImages.forEach(img => {
  img.onload = () => {
    loaded++;
    if (loaded === allImages.length) loop();
  };
});
