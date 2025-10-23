// --- Game constants & elements ---
const GAME_WIDTH = 540;
const GAME_HEIGHT = 270;
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const rotatePrompt = document.getElementById("rotate-prompt");

// --- Splash & Main Menu Elements ---
const splashScreen = document.getElementById("splashScreen");
const mainMenu = document.getElementById("mainMenu");
const playBtn = document.getElementById("playBtn");
const settingsBtn = document.getElementById("settingsBtn");
const guideBtn = document.getElementById("guideBtn");

// --- Pause Modal Elements ---
const pauseModal = document.getElementById("pauseModal");
const resumeBtn = document.getElementById("resumeBtn");
const exitBtn = document.getElementById("exitBtn");

// --- Mission End Modal ---
const missionEndModal = document.getElementById("missionEndModal");
const playAgainBtn = document.getElementById("playAgainBtn");
const exitMissionBtn = document.getElementById("exitMissionBtn");

// --- Load images ---
const bgImage = new Image(); bgImage.src = "assets/space-bg.png";
const shipImage = new Image(); shipImage.src = "assets/player-ship.png";
const laserImage = new Image(); laserImage.src = "assets/laser.png";
const asteroidV1 = new Image(); asteroidV1.src = "assets/asteroid-medium-v1.png";
const asteroidV2 = new Image(); asteroidV2.src = "assets/asteroid-medium-v2.png";
const asteroidLargeImg = new Image(); asteroidLargeImg.src = "assets/asteroid-large.png";
const briefingImage = new Image(); briefingImage.src = "assets/briefing-scene.png"; // story background
const pauseButtonImg = new Image(); pauseButtonImg.src = "assets/pause-button.png";

const asteroidDestroyFrames = [
  "assets/asteroid-medium-destroyed-s1.png",
  "assets/asteroid-medium-destroyed-s2.png",
  "assets/asteroid-medium-destroyed-s3.png"
].map(src => { const img = new Image(); img.src = src; return img; });

const asteroidLargeDestroyFrames = [
  "assets/asteroid-large-destroyed-s1.png",
  "assets/asteroid-large-destroyed-s2.png",
  "assets/asteroid-large-destroyed-s3.png"
].map(src => { const img = new Image(); img.src = src; return img; });

const healthBars = [
  "assets/health-bar-0.png",
  "assets/health-bar-1.png",
  "assets/health-bar-2.png",
  "assets/health-bar-3.png",
  "assets/health-bar-4.png"
].map(src => { const img = new Image(); img.src = src; return img; });

const firerateBars = [
  "assets/firerate-bar-1.png",
  "assets/firerate-bar-2.png",
  "assets/firerate-bar-3.png",
  "assets/firerate-bar-4.png"
].map(src => { const img = new Image(); img.src = src; return img; });

const shipExplosionFrames = [
  "assets/ship-explode-s1.png",
  "assets/ship-explode-s2.png",
  "assets/ship-explode-s3.png",
  "assets/ship-explode-s4.png"
].map(src => { const img = new Image(); img.src = src; return img; });

// Powerup images
const powerupFireImg = new Image(); powerupFireImg.src = "assets/powerup-firerate.png";
const powerupHealthImg = new Image(); powerupHealthImg.src = "assets/powerup-health.png";

// --- Game State ---
let scrollX = 0;
let gameOver = false;
let shipExploding = false;
let explosionFrame = 0;
let explosionTimer = 0;
let explosionDone = false;
let nextFireTime = 0;
let animId = null;
const HEALTH_BAR_HEIGHT = 40;
const HEALTH_BAR_MARGIN = 8;
const TOP_BOUNDARY = HEALTH_BAR_MARGIN + HEALTH_BAR_HEIGHT + 4;
const PAUSE_BTN_SIZE = 40;  // Scaled size for drawing (matches health bar height; adjust as needed)
const PAUSE_BTN_MARGIN = HEALTH_BAR_MARGIN;  // Reuse for consistency
const pauseBtnZone = {
  x: GAME_WIDTH - PAUSE_BTN_SIZE - PAUSE_BTN_MARGIN,
  y: PAUSE_BTN_MARGIN,
  width: PAUSE_BTN_SIZE,
  height: PAUSE_BTN_SIZE
};

const ship = {
  x: 60, y: GAME_HEIGHT / 2 - 16, width: 32, height: 32, speed: 2.5,
  movingUp: false, movingDown: false, firing: false, fireIntervalId: null,
  health: 2,
  fireRate: 1 // bullets per second, default 1, cap at 4
};

let bullets = [];
let asteroids = [];
let powerUps = [];
let paused = false;
let inGame = false; // track when gameplay is active
let gameAudioElements = [];
let totalPausedTime = 0;
let pauseStartTime = null;
let inputsSetup = false; // to avoid attaching duplicate input handlers

// Spawner/timer handles
let asteroidSpawnTimeout = null;
let powerUpTimeout = null;
let gameStartTime = null;

// progression config
const ASTEROID_CAP = 70; // maximum asteroids present at once
const FIRE_RATE_CAP = 4;
const HEALTH_CAP = 4;

// progression stage durations (seconds)
const STAGE_SECONDS = 30;

// powerup control
let nextPowerUpType = "firerate"; // alternate between "firerate" and "health"

// Story slides
const storySlides = [
  "A group of asteroids has been detected on a collision course with Earth.",
  "It was determined that the explosion from the mining operation ten years ago,",
  "altered the asteroids' trajectory from the asteroid belt.",
  "Drones were launched into space for a one-way mission to reduce their numbers.",
  "You're gonna be piloting one of them.",
  "Intel reports some modules remnant from the mining operation was detected",
  "You can grab some of those to help you with your operation.",
  "Note that as you travel further...",
  "the number of asteroid encounter increases.",
  "Also, be careful of larger asteroids.",
  "They deal more damage to our drones than the regular ones.",
  "The aim of this mission is solely to reduce their numbers!",
  "With that, the desctruction of drones are expected.",
  "Just do your best. Destroy as many asteroids as you can!"
];

// Story UI elements
let storyOverlay = null;
let storyBgEl = null;
let storyDialogEl = null;
let storyTextEl = null;
let nextStoryBtn = null;
let skipStoryBtn = null;
let replayStoryBtn = null;
let currentSlideIndex = 0;
let storyShownThisInstall = false;
let replayingStory = false;

function createStoryElements() {
  if (storyOverlay) return;
  storyOverlay = document.getElementById("storyOverlay");
  const container = document.getElementById("storyContainer");
  storyTextEl = document.getElementById("storyText");
  skipStoryBtn = document.getElementById("skipStoryBtn");
  nextStoryBtn = document.getElementById("nextStoryBtn");

  nextStoryBtn.addEventListener("click", () => {
    advanceStory();
  });
  skipStoryBtn.addEventListener("click", () => {
    markStoryPlayedAndRevealReplay();
    hideStoryScreen();
    startGame();
  });
}

function showStoryScreen(forceReplay = false) {
  createStoryElements();
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  inGame = false;
  paused = false;
  gameOver = false;
  if (asteroidSpawnTimeout) clearTimeout(asteroidSpawnTimeout);
  asteroidSpawnTimeout = null;
  canvas.style.visibility = "hidden";
  if (mainMenu) mainMenu.style.display = "none";
  currentSlideIndex = 0;
  renderCurrentSlide();
  storyShownThisInstall = !forceReplay;
  replayingStory = forceReplay;
  if (skipStoryBtn) {
    skipStoryBtn.style.display = replayingStory ? "none" : "inline-block";
  }
  storyOverlay.style.display = "flex";
}
function hideStoryScreen() {
  if (storyOverlay) storyOverlay.style.display = "none";
  canvas.style.visibility = "visible";
}

function renderCurrentSlide() {
  const txt = storySlides[currentSlideIndex] || "";
  storyTextEl.textContent = txt;
  if (currentSlideIndex >= storySlides.length - 1) {
    nextStoryBtn.textContent = replayingStory ? "EXIT" : "BEGIN";
  } else {
    nextStoryBtn.textContent = "NEXT";
  }
}

function advanceStory() {
  currentSlideIndex++;
  if (currentSlideIndex < storySlides.length) {
    renderCurrentSlide();
  } else {
    if (replayingStory) {
      hideStoryScreen();
      if (mainMenu) mainMenu.style.display = "flex";
      replayingStory = false;
      return;
    }
    if (storyShownThisInstall) {
      markStoryPlayedAndRevealReplay();
    }
    hideStoryScreen();
    startGame();
  }
}

function markStoryPlayedAndRevealReplay() {
  localStorage.setItem("storyPlayed", "true");
  const replayBtn = document.getElementById("replayStoryBtn");
  if (replayBtn) replayBtn.style.display = "block";
  storyShownThisInstall = false;
}

function getEffectiveElapsed() {
  return (Date.now() - gameStartTime - totalPausedTime) / 1000;
}

// --- Helpers ---
function checkCollision(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

// --- Orientation & resize ---
function checkOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  rotatePrompt.style.visibility = (isPortrait && inGame) ? "visible" : "hidden";
  pauseModal.style.visibility = isPortrait ? "hidden" : "visible";

  if (isPortrait && inGame && !paused) {
    togglePause(true);
  } else if (!isPortrait && paused && rotatePrompt.style.visibility === "hidden" && inGame) {
    togglePause(false);
  }
}
window.addEventListener("resize", checkOrientation);
checkOrientation();

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  canvas.width = GAME_WIDTH * scale;
  canvas.height = GAME_HEIGHT * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- Pause ---
function togglePause(force = null) {
  const newState = force !== null ? force : !paused;
  if (newState && !paused) {
  paused = true;
  pauseModal.style.display = "flex";
  stopAllAudio();
  // Stop spawning while paused
  if (asteroidSpawnTimeout) clearTimeout(asteroidSpawnTimeout);
  asteroidSpawnTimeout = null;
  if (powerUpTimeout) clearTimeout(powerUpTimeout);
  powerUpTimeout = null;
  pauseStartTime = Date.now();  // NEW: Start tracking pause duration
} else if (!newState && paused) {
    if (pauseStartTime !== null) {  // NEW: Accumulate paused time
      totalPausedTime += Date.now() - pauseStartTime;
      pauseStartTime = null;
    }
    paused = false;
    pauseModal.style.display = "none";
    resumeAllAudio();
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
    // resume spawners
    scheduleNextAsteroid();
    scheduleNextPowerUp();
  }
}

// --- Auto-pause when player leaves tab or window ---
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Pause only if gameplay is active
    if (inGame && !paused && !gameOver && !shipExploding) {
      togglePause(true);
      console.log("⏸ Game auto-paused (tab hidden)");
    }
  }
});

// --- Also pause when browser window loses focus (e.g. Alt-Tab, click outside) ---
window.addEventListener("blur", () => {
  if (inGame && !paused && !gameOver && !shipExploding) {
    togglePause(true);
    console.log("⏸ Game auto-paused (window unfocused)");
  }
});


function stopAllAudio() {
  gameAudioElements.forEach(a => { a.dataset.wasPlaying = !a.paused; a.pause(); });
}

function resumeAllAudio() {
  gameAudioElements.forEach(a => { if (a.dataset.wasPlaying === "true") a.play(); });
}

exitBtn.addEventListener("click", exitToMainMenu);
function exitToMainMenu() {
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  clearAllSpawners();
  paused = false;
  inGame = false;
  gameOver = false;
  shipExploding = false;
  explosionDone = false;
  bullets = [];
  asteroids = [];
  powerUps = [];
  ship.health = 2;
  ship.x = 60;
  ship.y = GAME_HEIGHT / 2 - 16;
  pauseModal.style.display = "none";
  if (mainMenu) mainMenu.style.display = "flex";
  stopAllAudio();
  if (pauseStartTime !== null) {
    totalPausedTime += Date.now() - pauseStartTime;
    pauseStartTime = null;
  }
}

resumeBtn.addEventListener("click", () => togglePause(false));

// --- Mission End Buttons ---
playAgainBtn.addEventListener("click", () => {
  missionEndModal.style.display = "none";
  startGame();
});
exitMissionBtn.addEventListener("click", () => {
  missionEndModal.style.display = "none";
  exitToMainMenu();
});

// --- Input ---
function setupInput() {
  if (inputsSetup) return;
  inputsSetup = true;

  window.addEventListener("keydown", e => {
    if (e.code === "Escape" && window.innerWidth > window.innerHeight) {
      if (inGame && !paused && !gameOver && !shipExploding) {
        togglePause(true);
      } else if (inGame && paused) {
        togglePause(false);
      }
      return;
    }
    if (!inGame || paused || gameOver || shipExploding) return;

    if (e.code === "ArrowUp" || e.code === "KeyW") ship.movingUp = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") ship.movingDown = true;
    if (e.code === "Space" && !ship.firing) startFiring();
  });

  window.addEventListener("keyup", e => {
    if (e.code === "ArrowUp" || e.code === "KeyW") ship.movingUp = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") ship.movingDown = false;
    if (e.code === "Space") stopFiring();
  });

  // Touch
  const UI_ZONES = [
    { x: HEALTH_BAR_MARGIN, y: HEALTH_BAR_MARGIN, width: 135, height: HEALTH_BAR_HEIGHT },
    { x: GAME_WIDTH - ship.width, y: 0, width: ship.width, height: ship.height },
    pauseBtnZone
  ];
  canvas.addEventListener("touchstart", e => {
    if (gameOver || shipExploding || paused) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;  // FIXED: Use logical width for correct scaling
    const scaleY = GAME_HEIGHT / rect.height;  // FIXED: Same for height
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    // NEW: Check if touch is on pause button
    if (inGame && !paused && !gameOver && !shipExploding &&
        x >= pauseBtnZone.x && x <= pauseBtnZone.x + pauseBtnZone.width &&
        y >= pauseBtnZone.y && y <= pauseBtnZone.y + pauseBtnZone.height) {
      togglePause(true);  // Pause the game
      return;  // Prevent firing or other actions
    }
    if (!UI_ZONES.some(z => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height)) startFiring();
  });
  canvas.addEventListener("touchmove", e => {
    if (gameOver || shipExploding || paused) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleY = GAME_HEIGHT / rect.height;  // FIXED: Use logical height for correct scaling
    const y = (touch.clientY - rect.top) * scaleY;
    ship.y = y - ship.height / 2;
    ship.y = Math.max(TOP_BOUNDARY, Math.min(GAME_HEIGHT - ship.height, ship.y));
  });
  canvas.addEventListener("touchend", e => { e.preventDefault(); stopFiring(); });
  // NEW: Mouse click support for pause button on desktop
  // UPDATED: Use "click" instead of "mousedown" for better button-like behavior on desktop
  canvas.addEventListener("click", e => {
    if (!inGame || paused || gameOver || shipExploding) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;  // FIXED: Use logical width for correct scaling
    const scaleY = GAME_HEIGHT / rect.height;  // FIXED: Same for height
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if click is on pause button
    if (x >= pauseBtnZone.x && x <= pauseBtnZone.x + pauseBtnZone.width &&
        y >= pauseBtnZone.y && y <= pauseBtnZone.y + pauseBtnZone.height) {
      togglePause(true);  // Pause the game
    }
  });
}

// --- Firing logic ---
function startFiring() {
  if (ship.firing) return;
  ship.firing = true;
  fireBullet(); // Immediate fire on press (if cooldown allows)
}
function stopFiring() {
  ship.firing = false;
}

function fireBullet() {
  const now = Date.now();
  if (now < nextFireTime) return;
  bullets.push({ x: ship.x + ship.width - 4, y: ship.y + ship.height / 2 - 2, width: 8, height: 4, speed: 6 });
  nextFireTime = now + 1000 / ship.fireRate;
}

// --- Asteroids & progression scheduler ---
// Use a scheduled timeout pattern so spawn delay can change with progression
function computeAsteroidDelay() {
  if (!gameStartTime) return 1200;
  const elapsed = getEffectiveElapsed();  // CHANGED: Use effective elapsed
  // Continuous decay: gradually shortens spawn delay over time
  // Starts at 1200ms, approaches 250ms asymptotically
  const delay = 250 + 950 * Math.exp(-elapsed / 120);
  return Math.max(250, delay); // never faster than 4 per second
}

function scheduleNextAsteroid() {
  if (paused || gameOver || !inGame) return;
  if (asteroidSpawnTimeout) clearTimeout(asteroidSpawnTimeout);
  const delay = computeAsteroidDelay();
  asteroidSpawnTimeout = setTimeout(() => {
    if (asteroids.length < ASTEROID_CAP) spawnAsteroid();
    scheduleNextAsteroid();
  }, delay);
}

function spawnAsteroid() {
  if (gameOver || shipExploding || paused) return;
  const elapsed = Math.floor(getEffectiveElapsed());  // CHANGED: Use effective elapsed
  const stage = Math.floor(elapsed / STAGE_SECONDS) + 1;

  // decide whether to spawn a large asteroid based on stage and probability
  let spawnLarge = false;
  if (stage >= 3) {
    // stage 3+: start introducing large asteroids
    // higher stage -> higher probability
    const baseChance = stage === 3 ? 0.25 : (stage === 4 ? 0.4 : 0.5);
    spawnLarge = Math.random() < baseChance;
  }

  // fallback: don't exceed cap
  if (asteroids.length >= ASTEROID_CAP) return;

  if (spawnLarge) {
    asteroids.push({
      x: GAME_WIDTH + 40,
      y: TOP_BOUNDARY + Math.random() * (GAME_HEIGHT - TOP_BOUNDARY - 48),
      width: 48, height: 48,
      speed: 1.6, // was 1.2 → slightly faster movement
      hitCount: 3,
      damage: 2,
      large: true,
      destroyed: false,
      frameIndex: 0,
      frameTimer: 0
    });
  } else {
    const type = Math.random() < 0.5 ? 1 : 2;
    asteroids.push({
      x: GAME_WIDTH + 30,
      y: TOP_BOUNDARY + Math.random() * (GAME_HEIGHT - TOP_BOUNDARY - 32),
      width: 32, height: 32,
      speed: type === 1 ? 1.8 : 2.2,
      hitCount: 1,
      damage: 1,
      large: false,
      type,
      destroyed: false,
      frameIndex: 0,
      frameTimer: 0
    });
  }
}

// --- Power-up system ---
function scheduleNextPowerUp() {
  if (paused || gameOver || !inGame) return;
  if (powerUpTimeout) clearTimeout(powerUpTimeout);
  // spawn every 45-60 seconds
  const delay = 20000 + Math.random() * 10000;
  powerUpTimeout = setTimeout(() => {
    // only spawn if no active, visible powerup
    const active = powerUps.some(p => !p.collected);
    if (!active) {
      // choose nextPowerUpType but respect caps
      if (nextPowerUpType === "firerate" && ship.fireRate >= FIRE_RATE_CAP) {
        nextPowerUpType = "health";
      } else if (nextPowerUpType === "health" && ship.health >= HEALTH_CAP) {
        nextPowerUpType = "firerate";
      }
      spawnPowerUp(nextPowerUpType);
      nextPowerUpType = nextPowerUpType === "firerate" ? "health" : "firerate";
    }
    scheduleNextPowerUp();
  }, delay);
}

function spawnPowerUp(type) {
  if (gameOver || paused || shipExploding) return;
  // spawn somewhere on playable area not overlapping UI
  const pu = {
    x: GAME_WIDTH + 20,
    y: TOP_BOUNDARY + 20 + Math.random() * (GAME_HEIGHT - TOP_BOUNDARY - 60),
    width: 20,
    height: 20,
    type,
    collected: false,
    vx: -1.6 // drift left
  };
  powerUps.push(pu);
}

// --- Clear spawners ---
function clearAllSpawners() {
  if (asteroidSpawnTimeout) { clearTimeout(asteroidSpawnTimeout); asteroidSpawnTimeout = null; }
  if (powerUpTimeout) { clearTimeout(powerUpTimeout); powerUpTimeout = null; }
}

// --- Update ---
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
        inGame = false;
        // Show mission end modal
        setTimeout(() => {
          missionEndModal.style.display = "flex";
          missionEndModal.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
        }, 300);
      }
    }
    return;
  }

  scrollX -= 1.2;
  if (scrollX <= -GAME_WIDTH) scrollX = 0;

  if (ship.movingUp) ship.y -= ship.speed;
  if (ship.movingDown) ship.y += ship.speed;
  ship.y = Math.max(TOP_BOUNDARY, Math.min(GAME_HEIGHT - ship.height, ship.y));

  if (ship.firing) {
    fireBullet();
  }

  bullets.forEach(b => b.x += b.speed);
  bullets = bullets.filter(b => b.x < GAME_WIDTH + 40);

  // move powerups
  powerUps.forEach(p => {
    if (!p.collected) p.x += p.vx;
  });
  powerUps = powerUps.filter(p => p.x + p.width > 0 && !p.collected);

  // asteroid and collision logic
  asteroids.forEach((a, ai) => {
    if (!a.destroyed) a.x -= a.speed;

    // bullets collision
    bullets.forEach((b, bi) => {
      if (!a.destroyed && checkCollision(a, b)) {
        // reduce hitCount rather than immediate destroy for large
        a.hitCount = (a.hitCount || 1) - 1;
        bullets.splice(bi, 1);
        if (a.hitCount <= 0) {
          a.destroyed = true;
          a.frameIndex = 0;
          a.frameTimer = 0;
        }
      }
    });

    // ship collision
    if (!a.destroyed && checkCollision(a, ship)) {
      a.destroyed = true;
      a.frameIndex = 0;
      a.frameTimer = 0;
      const dmg = a.damage || 1;
      ship.health -= dmg;
      if (ship.health < 0) ship.health = 0;
      if (ship.health === 0) triggerShipExplosion();
    }

    // destruction animation stepping
    if (a.destroyed) {
      a.frameTimer++;
      if (a.frameTimer > 6) { a.frameTimer = 0; a.frameIndex++; }
    }
  });

  // remove asteroids that went off-screen or finished destroy animation
  asteroids = asteroids.filter(a => (a.x + a.width > 0 && (!a.destroyed || (a.destroyed && ((a.large ? a.frameIndex : a.frameIndex) < (a.large ? asteroidLargeDestroyFrames.length : asteroidDestroyFrames.length))))) );

  // powerup-ship collision
  powerUps.forEach((p, i) => {
    if (!p.collected && checkCollision(p, ship)) {
      collectPowerUp(p);
    }
  });

  // move bullets beyond screen cleaning done above
}

function triggerShipExplosion() {
  stopFiring();
  shipExploding = true;
  explosionFrame = 0;
  explosionTimer = 0;
  gameOver = true;
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  clearAllSpawners();
}

// --- Collect powerup ---
function collectPowerUp(p) {
  if (p.type === "firerate") {
    ship.fireRate = Math.min(ship.fireRate + 1, FIRE_RATE_CAP);
    // Allow immediate fire after upgrade if cooldown was limiting
    nextFireTime = Math.min(nextFireTime, Date.now());
    // if currently firing, refresh the interval
   
  } else if (p.type === "health") {
    ship.health = Math.min(ship.health + 1, HEALTH_CAP);
  }
  p.collected = true;
  // small visual removal: filter later in update/draw
}

// --- Draw ---
function draw() {
  ctx.drawImage(bgImage, scrollX, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.drawImage(bgImage, scrollX + GAME_WIDTH, 0, GAME_WIDTH, GAME_HEIGHT);

  if (shipExploding) {
    const frame = shipExplosionFrames[explosionFrame];
    if (frame) ctx.drawImage(frame, ship.x - 8, ship.y - 8, ship.width + 16, ship.height + 16);
  } else if (!explosionDone) {
    ctx.drawImage(shipImage, ship.x, ship.y, ship.width, ship.height);
  }

  bullets.forEach(b => ctx.drawImage(laserImage, b.x, b.y, b.width, b.height));

  // draw asteroids
  asteroids.forEach(a => {
    if (a.destroyed) {
      const frames = a.large ? asteroidLargeDestroyFrames : asteroidDestroyFrames;
      const frame = frames[a.frameIndex];
      if (frame) ctx.drawImage(frame, a.x, a.y, a.width, a.height);
    } else {
      if (a.large) {
        ctx.drawImage(asteroidLargeImg, a.x, a.y, a.width, a.height);
      } else {
        const img = a.type === 1 ? asteroidV1 : asteroidV2;
        ctx.drawImage(img, a.x, a.y, a.width, a.height);
      }
    }
  });

  // draw powerups
  powerUps.forEach(p => {
    if (p.collected) return;
    const img = p.type === "firerate" ? powerupFireImg : powerupHealthImg;
    ctx.drawImage(img, p.x, p.y, p.width, p.height);
  });

  // draw health bar
  const hbIndex = Math.max(0, Math.min(healthBars.length - 1, ship.health));
  const hb = healthBars[hbIndex];
  const hbWidth = 135;
  ctx.drawImage(hb, HEALTH_BAR_MARGIN, HEALTH_BAR_MARGIN, hbWidth, HEALTH_BAR_HEIGHT);

  // draw firerate bar (right of health bar)
  const FR_GAP = 10; // small gap between bars
  const frIndex = Math.max(1, Math.min(firerateBars.length, ship.fireRate)) - 1;
  const frImg = firerateBars[frIndex];
  const frWidth = 130;
  ctx.drawImage(
    frImg,
    HEALTH_BAR_MARGIN + hbWidth + FR_GAP,
    HEALTH_BAR_MARGIN,
    frWidth,
    HEALTH_BAR_HEIGHT
  );

  // NEW: Draw pause button (only during active gameplay)
  ctx.drawImage(pauseButtonImg, pauseBtnZone.x, pauseBtnZone.y, pauseBtnZone.width, pauseBtnZone.height);

}

// --- Main loop ---
function loop() {
  if (paused || !inGame || (gameOver && !shipExploding)) return;
  update();
  draw();
  animId = requestAnimationFrame(loop);
}

// --- Splash & Menu ---
function showSplashThenMenu() {
  const splashSeen = localStorage.getItem("splashSeen");
  if (splashSeen) {
    splashScreen.style.display = "none";
    mainMenu.style.display = "flex";
    return;
  }
  splashScreen.style.display = "flex";
  mainMenu.style.display = "none";
  setTimeout(() => {
    splashScreen.classList.add("fadeOut");
    setTimeout(() => {
      splashScreen.style.display = "none";
      splashScreen.classList.remove("fadeOut");
      mainMenu.style.display = "flex";
      localStorage.setItem("splashSeen", "true");
    }, 500);
  }, 2500);
}

// --- Start Game ---
function startGame() {
  clearAllSpawners();

  scrollX = 0;
  bullets = [];
  asteroids = [];
  powerUps = [];
  paused = false;
  gameOver = false;
  shipExploding = false;
  explosionDone = false;
  explosionFrame = 0;
  explosionTimer = 0;

  ship.x = 60;
  ship.y = GAME_HEIGHT / 2 - 16;
  ship.health = 2;
  ship.movingUp = false;
  ship.movingDown = false;
  ship.firing = false;
  ship.fireRate = 1;
  nextFireTime = 0;



  if (mainMenu) mainMenu.style.display = "none";
  missionEndModal.style.display = "none";
  pauseModal.style.display = "none";

  inGame = true;

  setupInput();

  gameStartTime = Date.now();

  totalPausedTime = 0;
  pauseStartTime = null;

  // schedule first asteroid & powerup spawns
  scheduleNextAsteroid();
  scheduleNextPowerUp();

  if (animId) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);

  checkOrientation();
}

// --- Menu button wiring ---
function setupMenuButtons() {
  playBtn.removeEventListener("click", startGame);
  playBtn.addEventListener("click", () => {
    const played = localStorage.getItem("storyPlayed");
    if (!played) {
      showStoryScreen(false);
    } else {
      startGame();
    }
  });

  settingsBtn.addEventListener("click", () => alert("Settings placeholder"));
  guideBtn.addEventListener("click", () => alert("Guide placeholder"));

  const replayStoryBtn = document.getElementById("replayStoryBtn");
  replayStoryBtn.addEventListener("click", () => {
    showStoryScreen(true);
  });

  const container = document.querySelector(".main-menu-button-container");
  if (container) {
    const lastBtn = container.querySelector("button:last-child");
    if (lastBtn && replayStoryBtn !== lastBtn) {
      lastBtn.insertAdjacentElement("afterend", replayStoryBtn);
    }
  }

  if (localStorage.getItem("storyPlayed")) {
    const r = document.getElementById("replayStoryBtn");
    if (r) r.style.display = "block";
  }
}
setupMenuButtons();

// --- Wait for all images before starting (including briefingImage & new assets) ---
const allImages = [
  bgImage, shipImage, laserImage, asteroidV1, asteroidV2, asteroidLargeImg, briefingImage,
  ...asteroidDestroyFrames, ...asteroidLargeDestroyFrames, ...healthBars, ...shipExplosionFrames,
  powerupFireImg, powerupHealthImg, pauseButtonImg
];
let loaded = 0;
allImages.forEach(img => {
  if (!img) { loaded++; return; }
  img.onload = () => {
    loaded++;
    if (loaded === allImages.length) showSplashThenMenu();
  };
  if (img.complete) {
    setTimeout(() => {
      if (loaded < allImages.length && img.complete) {
        if (!img.__counted) {
          loaded++;
          img.__counted = true;
          if (loaded === allImages.length) showSplashThenMenu();
        }
      }
    }, 20);
  }
});
