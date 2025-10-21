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

// --- Load images ---
const bgImage = new Image(); bgImage.src = "assets/space-bg.png";
const shipImage = new Image(); shipImage.src = "assets/player-ship.png";
const laserImage = new Image(); laserImage.src = "assets/laser.png";
const asteroidV1 = new Image(); asteroidV1.src = "assets/asteroid-medium-v1.png";
const asteroidV2 = new Image(); asteroidV2.src = "assets/asteroid-medium-v2.png";
const briefingImage = new Image(); briefingImage.src = "assets/briefing-scene.png"; // story background
const asteroidDestroyFrames = [
  "assets/asteroid-medium-destroyed-s1.png",
  "assets/asteroid-medium-destroyed-s2.png",
  "assets/asteroid-medium-destroyed-s3.png"
].map(src => { const img = new Image(); img.src = src; return img; });
const healthBars = [
  "assets/health-bar-0.png",
  "assets/health-bar-1.png",
  "assets/health-bar-2.png",
  "assets/health-bar-3.png",
  "assets/health-bar-4.png"
].map(src => { const img = new Image(); img.src = src; return img; });
const shipExplosionFrames = [
  "assets/ship-explode-s1.png",
  "assets/ship-explode-s2.png",
  "assets/ship-explode-s3.png",
  "assets/ship-explode-s4.png"
].map(src => { const img = new Image(); img.src = src; return img; });

// --- Game State ---
let scrollX = 0;
let gameOver = false;
let shipExploding = false;
let explosionFrame = 0;
let explosionTimer = 0;
let explosionDone = false;
let animId = null;
const HEALTH_BAR_HEIGHT = 40;
const HEALTH_BAR_MARGIN = 8;
const TOP_BOUNDARY = HEALTH_BAR_MARGIN + HEALTH_BAR_HEIGHT + 4;
const ship = {
  x: 60, y: GAME_HEIGHT / 2 - 16, width: 32, height: 32, speed: 2.5,
  movingUp: false, movingDown: false, firing: false, fireInterval: null, health: 2
};
let bullets = [];
let asteroids = [];
let paused = false;
let inGame = false; // track when gameplay is active
let gameAudioElements = [];
let asteroidInterval = null; // for spawning asteroids
let inputsSetup = false; // to avoid attaching duplicate input handlers

// --- Story slides (using your narrative) ---
const storySlides = [
  "A group of asteroids has been detected on a collision course with Earth.",
  "It was determined that the explosion from the mining operation ten years ago,",
  "altered the asteroids' trajectory from the asteroid belt.",
  "Drones were launched into space for a one-way mission to reduce their numbers.",
  "You're gonna be piloting one of them.",
  "The aim of this mission is solely to reduce their numbers.",
  "Desctruction of drones are expected.",
  "Just do your best, destroy as many asteroids as you can!"
];

// --- Story UI (created dynamically) ---
let storyOverlay = null;
let storyBgEl = null;
let storyDialogEl = null;
let storyTextEl = null;
let nextStoryBtn = null;
let skipStoryBtn = null;
let replayStoryBtn = null;
let currentSlideIndex = 0;

// This flag indicates that we're showing the story during the "first-time" flow.
// We only reveal the Replay Story button after the story has been shown once in that flow.
let storyShownThisInstall = false;
let replayingStory = false;
function createStoryElements() {
  // if already created, return
  if (storyOverlay) return;
  // overlay
  storyOverlay = document.getElementById("storyOverlay");
  const container = document.getElementById("storyContainer");
  storyTextEl = document.getElementById("storyText");
  skipStoryBtn = document.getElementById("skipStoryBtn");
  nextStoryBtn = document.getElementById("nextStoryBtn");

  // attach handlers
  nextStoryBtn.addEventListener("click", () => {
    advanceStory();
  });
  skipStoryBtn.addEventListener("click", () => {
    // treat skip as story "seen" in the first-time flow
    markStoryPlayedAndRevealReplay();
    hideStoryScreen();
    startGame();
  });
}

function showStoryScreen(forceReplay = false) {
  createStoryElements();
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  // Stop any active gameplay or animation
  inGame = false;
  paused = false;
  gameOver = false;
  if (asteroidInterval) clearInterval(asteroidInterval);
  asteroidInterval = null;
  cancelAnimationFrame(startGame._animId);
  // Clear or hide the canvas so old frame isn’t visible behind story
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.visibility = "hidden"; // 👈 hide during story playback
  // Hide main menu
  if (mainMenu) mainMenu.style.display = "none";
  currentSlideIndex = 0;
  renderCurrentSlide();
  storyShownThisInstall = !forceReplay;
  replayingStory = forceReplay;
  // Hide Skip when replaying
  if (skipStoryBtn) {
    skipStoryBtn.style.display = replayingStory ? "none" : "inline-block";
  }
  storyOverlay.style.display = "flex";
}
function hideStoryScreen() {
  if (storyOverlay) storyOverlay.style.display = "none";
  canvas.style.visibility = "visible"; // 👈 restore canvas visibility when done
}

// display the current slide's text instantly (performance-friendly)
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
    // finished story
    if (replayingStory) {
      // just exit back to menu
      hideStoryScreen();
      if (mainMenu) mainMenu.style.display = "flex";
      replayingStory = false; // reset
      return;
    }
    // normal flow (first-time playthrough)
    if (storyShownThisInstall) {
      markStoryPlayedAndRevealReplay();
    }
    hideStoryScreen();
    startGame();
  }
}

// Marks story as played in localStorage and reveals the Replay Story button in the menu.
// This is the key change: we only reveal the replay button after the story has actually
// been shown to the player in the first-time flow.
function markStoryPlayedAndRevealReplay() {
  localStorage.setItem("storyPlayed", "true");
  // reveal the replay button in the menu if it exists
  if (replayStoryBtn) {
    replayStoryBtn.style.display = "block";
  }
  // reset the flag
  storyShownThisInstall = false;
}

// --- Input ---
function setupInput() {
  if (inputsSetup) return;
  inputsSetup = true;
  // Desktop
    window.addEventListener("keydown", e => {
    // Only handle ESC when actually in active gameplay
    if (e.code === "Escape") {
        if (inGame && !paused && !gameOver && !shipExploding) {
        togglePause(true);
        } else if (inGame && paused) {
        togglePause(false);
        }
        return; // stop further processing
    }

    // ignore input outside active game
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
    { x: GAME_WIDTH - ship.width, y: 0, width: ship.width, height: ship.height }
  ];
  canvas.addEventListener("touchstart", e => {
    if (gameOver || shipExploding || paused) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    if (!UI_ZONES.some(z => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height)) startFiring();
  });
  canvas.addEventListener("touchmove", e => {
    if (gameOver || shipExploding || paused) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const y = (touch.clientY - rect.top) * scale;
    ship.y = y - ship.height / 2;
    ship.y = Math.max(TOP_BOUNDARY, Math.min(GAME_HEIGHT - ship.height, ship.y));
  });
  canvas.addEventListener("touchend", e => { e.preventDefault(); stopFiring(); });
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
  bullets.push({ x: ship.x + ship.width - 4, y: ship.y + ship.height / 2 - 2, width: 8, height: 4, speed: 6 });
}

// --- Asteroids ---
function spawnAsteroid() {
  if (gameOver || shipExploding || paused) return;
  const type = Math.random() < 0.5 ? 1 : 2;
  asteroids.push({
    x: GAME_WIDTH + 30,
    y: TOP_BOUNDARY + Math.random() * (GAME_HEIGHT - TOP_BOUNDARY - 32),
    width: 32, height: 32, speed: type === 1 ? 1.8 : 2.2,
    type, destroyed: false, frameIndex: 0, frameTimer: 0
  });
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
  rotatePrompt.style.visibility = (window.innerHeight > window.innerWidth) ? "visible" : "hidden";
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
  } else if (!newState && paused) {
    paused = false;
    pauseModal.style.display = "none";
    resumeAllAudio();
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }
}

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
  // Stop all active intervals or animations
  if (asteroidInterval) clearInterval(asteroidInterval);
  asteroidInterval = null;
  paused = false;
  inGame = false;
  gameOver = false;
  shipExploding = false;
  explosionDone = false;
  // Reset player + world state
  bullets = [];
  asteroids = [];
  ship.health = 2;
  ship.x = 60;
  ship.y = GAME_HEIGHT / 2 - 16;
  // Hide pause modal
  pauseModal.style.display = "none";
  // Return to main menu
  if (mainMenu) mainMenu.style.display = "flex";
  // Stop any remaining audio
  stopAllAudio();
}

resumeBtn.addEventListener("click", () => togglePause(false));

// --- Only pause during gameplay ---
document.addEventListener("visibilitychange", () => {
  if (inGame && !paused && !gameOver && document.hidden) {
    togglePause(true);
  }
});

// --- Mission End Modal (when drone destroyed) ---
const missionEndModal = document.getElementById("missionEndModal");
// Button row
const playAgainBtn = document.getElementById("playAgainBtn");
const exitMissionBtn = document.getElementById("exitMissionBtn");

// --- Mission End Buttons (event handlers) ---
playAgainBtn.addEventListener("click", () => {
  missionEndModal.style.display = "none";
  startGame(); // restart gameplay cleanly
});
exitMissionBtn.addEventListener("click", () => {
  missionEndModal.style.display = "none";
  exitToMainMenu(); // reuse your existing exit logic
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
        inGame = false; // stop gameplay after explosion finishes
        // Show the mission modal now
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
  bullets.forEach(b => b.x += b.speed);
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
      ship.health--;
      if (ship.health < 0) ship.health = 0;
      if (ship.health === 0) triggerShipExplosion();
    }
    if (a.destroyed) {
      a.frameTimer++;
      if (a.frameTimer > 6) { a.frameTimer = 0; a.frameIndex++; }
    }
  });
  asteroids = asteroids.filter(a => a.x + a.width > 0 && a.frameIndex < asteroidDestroyFrames.length);
}

function triggerShipExplosion() {
  stopFiring();
  shipExploding = true;
  explosionFrame = 0;
  explosionTimer = 0;
  gameOver = true;
  if (animId) cancelAnimationFrame(animId); // Clean up any pending frame
  animId = null;
  // Don’t set inGame = false yet — let the explosion animate first
  // inGame will be set false after the explosion finishes
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
  splashScreen.style.display = "flex";
  if (mainMenu) mainMenu.style.display = "none";
  setTimeout(() => {
    splashScreen.style.display = "none";
    if (mainMenu) mainMenu.style.display = "flex";
  }, 2500);
}

// --- Start Game ---
function startGame() {
  // Stop anything leftover from previous sessions
  if (asteroidInterval) clearInterval(asteroidInterval);
  asteroidInterval = null;
  // Reset game world
  scrollX = 0; // <<< Reset background scroll
  bullets = [];
  asteroids = [];
  paused = false;
  gameOver = false;
  shipExploding = false;
  explosionDone = false;
  explosionFrame = 0;
  explosionTimer = 0;
  // Reset player state
  ship.x = 60;
  ship.y = GAME_HEIGHT / 2 - 16;
  ship.health = 2;
  ship.movingUp = false;
  ship.movingDown = false;
  ship.firing = false;
  // Hide menus/modals
  if (mainMenu) mainMenu.style.display = "none";
  missionEndModal.style.display = "none";
  pauseModal.style.display = "none";
  // Mark gameplay as active
  inGame = true;
  // Attach inputs (only once)
  setupInput();
  // Spawn asteroids on interval
  asteroidInterval = setInterval(spawnAsteroid, 1200);
  // Start the main loop (clean frame)
  if (animId) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

// --- Button handlers & menu integration ---
// Replay logic Replay Story button starts hidden on first run
// Becomes visible after the story has been shown (or skipped) in that first run.
function setupMenuButtons() {
  // Play button: show story (once) then start, else directly start
  playBtn.removeEventListener("click", startGame); // safe remove in case it was bound earlier
  playBtn.addEventListener("click", () => {
    const played = localStorage.getItem("storyPlayed");
    if (!played) {
      // show story for the first time (this will mark played only when the story is actually seen or skipped)
      showStoryScreen(false);
    } else {
      startGame();
    }
  });
  settingsBtn.addEventListener("click", () => alert("Settings placeholder"));
  guideBtn.addEventListener("click", () => alert("Guide placeholder"));
  // Add Replay Story button below guideBtn (initially hidden until story is played once)
  replayStoryBtn = document.getElementById("replayStoryBtn");
  // When clicked, force replay (don't alter storage)
  replayStoryBtn.addEventListener("click", () => {
    showStoryScreen(true);
  });
  // insert below guideBtn if mainMenu is present
  if (guideBtn && guideBtn.parentNode) {
    guideBtn.parentNode.insertBefore(replayStoryBtn, guideBtn.nextSibling);
  } else if (mainMenu) {
    mainMenu.appendChild(replayStoryBtn);
  }
  // If the user has already played in a previous session, show the replay button immediately
  if (localStorage.getItem("storyPlayed")) {
    replayStoryBtn.style.display = "block";
  }
}
setupMenuButtons();

// --- Wait for all images before starting (including briefingImage) ---
const allImages = [
  bgImage, shipImage, laserImage, asteroidV1, asteroidV2, briefingImage,
  ...asteroidDestroyFrames, ...healthBars, ...shipExplosionFrames
];
let loaded = 0;
allImages.forEach(img => {
  // If the item is already an HTMLImageElement with src set, use onload
  if (!img) { loaded++; return; }
  img.onload = () => {
    loaded++;
    if (loaded === allImages.length) showSplashThenMenu();
  };
  // In case image cached and onload doesn't fire, check complete
  if (img.complete) {
    // small timeout to let onload run; if onload won't run, increment now
    setTimeout(() => {
      if (loaded < allImages.length && img.complete) {
        // Guard: avoid double counting if onload already incremented
        if (!img.__counted) {
          loaded++;
          img.__counted = true;
          if (loaded === allImages.length) showSplashThenMenu();
        }
      }
    }, 20);
  }
});