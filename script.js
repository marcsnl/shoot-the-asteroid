// --- Game constants & elements ---
const GAME_WIDTH = 540;
const GAME_HEIGHT = 270;
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
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
const finalScoreText = document.getElementById("finalScoreText");
const highScoreText = document.getElementById("highScoreText");
const newHighScoreMsg = document.getElementById("newHighScoreMsg");

// --- Load images ---
const bgImage = new Image(); bgImage.src = "assets/space-bg.png";
const shipImage = new Image(); shipImage.src = "assets/player-ship.png";
const laserImage = new Image(); laserImage.src = "assets/laser.png";
const asteroidV1 = new Image(); asteroidV1.src = "assets/asteroid-medium-v1.png";
const asteroidV2 = new Image(); asteroidV2.src = "assets/asteroid-medium-v2.png";
const asteroidLargeImg = new Image(); asteroidLargeImg.src = "assets/asteroid-large.png";
const briefingImage = new Image(); briefingImage.src = "assets/briefing-scene.png"; // story background
const pauseButtonImg = new Image(); pauseButtonImg.src = "assets/pause-button.png";

// Powerup images
const powerupFireImg = new Image(); powerupFireImg.src = "assets/powerup-firerate.png";
const powerupHealthImg = new Image(); powerupHealthImg.src = "assets/powerup-health.png";

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


const fadeOverlay = document.getElementById("fadeOverlay");
function fadeToBlack(callback, duration = 600) {
  fadeOverlay.classList.add("fade-in");
  setTimeout(() => {
    if (callback) callback();
    // Only fade back after the next frame of the new scene has rendered
    requestAnimationFrame(() => {
      fadeFromBlack(duration);
    });
  }, duration);
}

function fadeFromBlack(duration = 600) {
  fadeOverlay.classList.remove("fade-in");
}


// --- Game State ---
let scrollX = 0;
let gameOver = false;
let shipExploding = false;
let explosionFrame = 0;
let explosionTimer = 0;
let explosionDone = false;
let nextFireTime = 0;
let animId = null;
let score = 0;

const HEALTH_BAR_HEIGHT = 40;
const HEALTH_BAR_MARGIN = 8;
const TOP_BOUNDARY = HEALTH_BAR_MARGIN + HEALTH_BAR_HEIGHT + 4;
const PAUSE_BTN_SIZE = 40;  // Scaled size for drawing (matches health bar height; adjust as needed)
const PAUSE_BTN_MARGIN = HEALTH_BAR_MARGIN;  // Reuse for consistency
const pauseBtnZone = {
  x: GAME_WIDTH - PAUSE_BTN_SIZE - PAUSE_BTN_MARGIN - 5,
  y: PAUSE_BTN_MARGIN,
  width: PAUSE_BTN_SIZE,
  height: PAUSE_BTN_SIZE
};

// --- HUD Layout positions ---
const HUD_GAP = 2;  // space between health, score, and firerate
const HB_WIDTH = 130;
const FR_WIDTH = 130;

// We'll compute center alignment dynamically
const HUD_TOTAL_WIDTH = HB_WIDTH + FR_WIDTH + 100 /* score box */ + (HUD_GAP * 2);
const HUD_START_X = (GAME_WIDTH - HUD_TOTAL_WIDTH) / 2;
const HUD_Y = HEALTH_BAR_MARGIN;



const ship = {
  x: 60, y: GAME_HEIGHT / 2 - 16, width: 35, height: 35, speed: 2.5,
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


// --- Game Audio ---
const musicTracks = {
  menu: new Audio("assets/main-menu-music.mp3"),
  story: new Audio("assets/story-game-music.mp3"),
  main: new Audio("assets/main-game-music.mp3"),
  end: new Audio("assets/end-game-music.mp3")  
};

// SFX
const sfx = {
  shipExplosion: new Audio("assets/ship-explosion-sfx.mp3"),
  shipBullet: new Audio("assets/ship-bullet-sfx.mp3"),
  asteroidMediumDestruction: new Audio("assets/asteroid-medium-destruction-sfx.mp3"),
  asteroidLargeDestruction: new Audio("assets/asteroid-large-destruction-sfx.mp3"),
  powerupCollect: new Audio("assets/metal-crate-sfx.mp3")
};

// Button UI SFX
const uiSfx = {
  hover: new Audio("assets/mouse-hover-sfx.mp3"),
  click: new Audio("assets/mouse-click-sfx.mp3")
};
uiSfx.hover.volume = 0.7;
uiSfx.click.volume = 0.7;

sfx.shipExplosion.volume = 1.0;
sfx.shipBullet.volume = 1.0;
sfx.asteroidMediumDestruction.volume = 1.0;
sfx.asteroidLargeDestruction.volume = 1.0;

// Make all tracks loop and prepare for pause/resume control
for (const key in musicTracks) {
    const track = musicTracks[key];
    track.loop = true;
    track.volume = 1.0; // default full volume
    gameAudioElements.push(track); // existing pause/resume system uses this
  }

let currentMusic = null;

function getValidVolume(key, defaultVol = 1.0) {
  const saved = localStorage.getItem(key);
  const parsed = parseFloat(saved);
  if (isNaN(parsed) || parsed < 0 || parsed > 1) {
    localStorage.setItem(key, defaultVol); // Auto-heal corrupted data
    return defaultVol;
  }
  return parsed;
}

function playMusic(type) {
  const newTrack = musicTracks[type];
  if (!newTrack) return;

  const savedVol = getSavedVolume("music");
  const savedMute = localStorage.getItem("musicMuted") === "true";

  // Fade out old track if switching
  if (currentMusic && currentMusic !== newTrack) {
    fadeOut(currentMusic, 800);
  }

  // Always reset to beginning
  newTrack.currentTime = 0;
  newTrack.volume = savedVol;
  newTrack.muted = savedMute;

  // Play with fade-in
  if (!savedMute && savedVol > 0) {
    setTimeout(() => {
      fadeIn(newTrack, 1000);
    }, currentMusic && currentMusic !== newTrack ? 100 : 0);
  }

  currentMusic = newTrack;
}

function playSfx(sound, isUi = false) {
  if (!sound) return;

  const savedVol = getValidVolume("sfxVolume", 1.0);
  const savedMute = localStorage.getItem("sfxMuted") === "true";

  if (savedMute || savedVol <= 0) return;

  const clone = sound.cloneNode();
  clone.volume = savedVol;
  clone.play().catch(() => {}); // Prevent unhandled promise rejection (e.g., autoplay policy)
}



// Smooth fade-out over duration (ms)
function fadeOut(audio, duration = 1000) {
  if (!audio || audio.paused) return;
  const step = 50; // ms between volume changes
  const steps = duration / step;
  const delta = audio.volume / steps;
  const fade = setInterval(() => {
    if (audio.volume - delta > 0) {
      audio.volume -= delta;
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fade);
    }
  }, step);
}

// Smooth fade-in over duration (ms)
function fadeIn(audio, duration = 1000) {
  const savedVol = parseFloat(localStorage.getItem("musicVolume")) ?? 1.0;
  const savedMute = localStorage.getItem("musicMuted") === "true";

  if (savedVol <= 0 || savedMute) {
    audio.pause();
    audio.volume = 0;
    return;
  }

  audio.volume = 0;
  audio.muted = false;
  audio.play().catch(() => {});

  const targetVolume = savedVol;
  const step = 50;
  const steps = duration / step;
  const delta = targetVolume / steps;

  const fade = setInterval(() => {
    if (audio.volume + delta < targetVolume) {
      audio.volume += delta;
    } else {
      audio.volume = targetVolume;
      clearInterval(fade);
    }
  }, step);
}



function getSavedVolume(type) {
  if (type === "music") return parseFloat(localStorage.getItem("musicVolume")) ?? 1.0;
  if (type === "sfx") return parseFloat(localStorage.getItem("sfxVolume")) ?? 1.0;
  return 1.0;
}

// Switch between music tracks smoothly
function playMusic(type) {
  const newTrack = musicTracks[type];
  if (!newTrack) return;

  const savedVol = getSavedVolume("music");
  const savedMute = localStorage.getItem("musicMuted") === "true";

  // Always reset to start when switching tracks
  if (currentMusic && currentMusic !== newTrack) {
    fadeOut(currentMusic, 800);
  }

  // Reset time to 0 BEFORE playing
  newTrack.currentTime = 0;
  newTrack.volume = savedVol;
  newTrack.muted = savedMute;

  // Only play if not muted and volume > 0
  if (!savedMute && savedVol > 0) {
    // Use fadeIn for smooth transition
    setTimeout(() => {
      fadeIn(newTrack, 1000);
    }, currentMusic && currentMusic !== newTrack ? 100 : 0);
  }

  currentMusic = newTrack;
}

// --- Global Audio Visibility Handler ---
function setupGlobalAudioHandlers() {
  // Pause audio on visibility change (tab hidden)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (currentMusic && !currentMusic.paused) {
        stopAllAudio();  // Or just pause currentMusic if you want to target only music
        console.log("⏸ Audio auto-paused (tab hidden)");
      }
    } else {
      if (currentMusic && currentMusic.paused && !paused) {  // Added !paused check
        resumeAllAudio();  // Or just resume currentMusic
        console.log("▶️ Audio auto-resumed (tab visible)");
      }
    }
  });

  // Pause audio on window blur (e.g., Alt-Tab or switch app)
  window.addEventListener("blur", () => {
    if (currentMusic && !currentMusic.paused) {
      stopAllAudio();
      console.log("⏸ Audio auto-paused (window unfocused)");
    }
  });

  // Resume on focus (optional, for symmetry with blur)
  window.addEventListener("focus", () => {
    if (currentMusic && currentMusic.paused && !paused) {  // Added !paused check
      resumeAllAudio();
      console.log("▶️ Audio auto-resumed (window focused)");
    }
  });
}

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
  "Intel reports some module remnants from the mining operation were detected",
  "You can grab some of those to help you with your operation.",
  "Note that as you travel further...",
  "the number of asteroid encounter increases.",
  "Also, be careful of larger asteroids.",
  "They deal more damage to our drones than the regular ones.",
  "Our drones are not equipped to clear them all.",
  "With that, the desctruction of drones are expected.",
  "The aim of this mission is solely to reduce their numbers.",
  "Just do your best...",
  "Shoot as many asteroids as you can!"
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
    uiSfx.click.currentTime = 0;
    playSfx(uiSfx.click, true);
    advanceStory();
  });

  skipStoryBtn.addEventListener("click", () => {
    uiSfx.click.currentTime = 0;
    playSfx(uiSfx.click, true);
    markStoryPlayedAndRevealReplay();

    // Smooth fade transition before starting main game
    fadeToBlack(() => {
      hideStoryScreen();
      startGame();
    });
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
  playMusic("story");

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
    fadeToBlack(() => {
    hideStoryScreen();
    if (mainMenu) mainMenu.style.display = "flex";
    playMusic("menu");
  });
    replayingStory = false;
    return;
  }
    if (storyShownThisInstall) {
      markStoryPlayedAndRevealReplay();
    }

    // Fade cleanly to black before starting the main game
    fadeToBlack(() => {
      hideStoryScreen();
      startGame();
    });
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
    // Going vertical mid-game → auto-pause
    togglePause(true);
  } else if (!isPortrait && paused && rotatePrompt.style.visibility === "hidden" && inGame) {
    // Going back to horizontal → unpause
    togglePause(false);

    // 🎵 Ensure correct music when resuming after vertical start
    if (currentMusic !== musicTracks.main) {
      playMusic("main");
    }
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
  gameAudioElements.forEach(a => { 
    a.dataset.wasPlaying = !a.paused; 
    a.pause(); 
  });
}

function resumeAllAudio() {
  const savedVol = getSavedVolume("music");
  const savedMute = localStorage.getItem("musicMuted") === "true";

  gameAudioElements.forEach(a => {
    if (a.dataset.wasPlaying === "true") {
      // Restore saved volume & mute BEFORE playing
      a.volume = savedVol;
      a.muted = savedMute;
      a.play().catch(() => {});
    }
  });
}

exitBtn.addEventListener("click", () => {
  fadeToBlack(() => {
    pauseModal.style.display = "none";
    exitToMainMenu();
  }, 600);
});

function exitToMainMenu() {
  // Do NOT call fadeToBlack here — let caller control fade
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
  missionEndModal.style.display = "none"; // Ensure hidden

  if (mainMenu) mainMenu.style.display = "flex";
  stopAllAudio();
  playMusic("menu");
}

resumeBtn.addEventListener("click", () => togglePause(false));
// --- Click SFX for pause & mission end buttons (no hover) ---
[resumeBtn, exitBtn, playAgainBtn, exitMissionBtn].forEach(btn => {
  if (!btn) return;
  btn.addEventListener("click", () => {
    uiSfx.click.currentTime = 0;
    playSfx(uiSfx.click, true);
  });
});

// --- Mission End Buttons ---
playAgainBtn.addEventListener("click", () => {

  fadeToBlack(() => {
    missionEndModal.style.display = "none";
    startGame();
  });
});
exitMissionBtn.addEventListener("click", () => {

  fadeToBlack(() => {
    exitToMainMenu(); // Now safe: no double fade, no flash of game
  }, 600);
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
      uiSfx.click.currentTime = 0;
      playSfx(uiSfx.click, true);
      togglePause(true);  // Pause the game
    }
  });
  canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = GAME_WIDTH / rect.width;
  const scaleY = GAME_HEIGHT / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  // Check if hovering over the pause button
  if (
    x >= pauseBtnZone.x && x <= pauseBtnZone.x + pauseBtnZone.width &&
    y >= pauseBtnZone.y && y <= pauseBtnZone.y + pauseBtnZone.height
  ) {
    canvas.style.cursor = "pointer"; // 👈 changes to hand cursor
  } else {
    canvas.style.cursor = "default";
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
  playSfx(sfx.shipBullet);
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
    width: 25,
    height: 25,
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

          // --- Score + High Score Display ---
          const previousHigh = parseInt(localStorage.getItem("highScore") || "0", 10);
          const newHigh = Math.max(score, previousHigh);

          finalScoreText.textContent = `SCORE: ${score}`;

          if (score > previousHigh) {
            // New record
            newHighScoreMsg.textContent = "CONGRATS! NEW HIGH SCORE!";
            highScoreText.textContent = `HIGH SCORE: ${score}`;
            localStorage.setItem("highScore", score);
          } else if (previousHigh > 0) {
            // Existing high score only
            newHighScoreMsg.textContent = "";
            highScoreText.textContent = `HIGH SCORE: ${previousHigh}`;
          } else {
            // First game ever — no high score yet
            newHighScoreMsg.textContent = "";
            highScoreText.textContent = "";
          }
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
          const destructionSfx = a.large ? sfx.asteroidLargeDestruction : sfx.asteroidMediumDestruction;
          playSfx(destructionSfx);
          a.frameIndex = 0;
          a.frameTimer = 0;
          score += a.large ? 30 : 10; // larger asteroids give higher score

        }
      }
    });

    // ship collision
    if (!a.destroyed && checkCollision(a, ship)) {
      a.destroyed = true;
      const destructionSfx = a.large ? sfx.asteroidLargeDestruction : sfx.asteroidMediumDestruction;
      playSfx(destructionSfx);
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
  playSfx(sfx.shipExplosion);
  stopFiring();
  shipExploding = true;
  explosionFrame = 0;
  explosionTimer = 0;
  gameOver = true;
  //space for audio end at end game
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  clearAllSpawners();
  playMusic("end");
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
  playSfx(sfx.powerupCollect); // play metal-crate sound
  p.collected = true;
  // small visual removal: filter later in update/draw
}

// --- Draw ---
function draw() {
  ctx.drawImage(bgImage, scrollX, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.drawImage(bgImage, scrollX + GAME_WIDTH, 0, GAME_WIDTH, GAME_HEIGHT);

  if (shipExploding) {
    const frame = shipExplosionFrames[explosionFrame];
    if (frame) ctx.drawImage(frame, ship.x - 0, ship.y - 0, ship.width + 8, ship.height + 8);
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

  // --- Centered HUD Layout ---
  const hbIndex = Math.max(0, Math.min(healthBars.length - 1, ship.health));
  const hb = healthBars[hbIndex];
  const frIndex = Math.max(1, Math.min(firerateBars.length, ship.fireRate)) - 1;
  const frImg = firerateBars[frIndex];

  let x = HUD_START_X;

  // Health Bar
  ctx.drawImage(hb, x, HUD_Y, HB_WIDTH, HEALTH_BAR_HEIGHT);
  x += HB_WIDTH + HUD_GAP;

  // Score (center text block between bars)
  ctx.font = "14px monospace";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  const scoreCenterX = x + 50; // middle of score box (100px wide)
  ctx.fillText("SCORE", scoreCenterX, HUD_Y + 14);
  ctx.fillText(score, scoreCenterX, HUD_Y + 30);
  x += 100 + HUD_GAP;

  // Firerate Bar
  ctx.drawImage(frImg, x, HUD_Y, FR_WIDTH, HEALTH_BAR_HEIGHT);

  // Pause button stays top-right
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
  splashScreen.style.display = "flex";
  mainMenu.style.display = "none";

  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.onclick = () => {
      splashScreen.classList.add("fadeOut");
      setTimeout(() => {
        splashScreen.style.display = "none";
        splashScreen.classList.remove("fadeOut");
        mainMenu.style.display = "flex";
        playMusic("menu");
      }, 500);
    };
  }
}

// --- Start Game ---
function startGame() {
  clearAllSpawners();
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // <— add this line

  
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
  score = 0;

  ship.x = 60;
  ship.y = GAME_HEIGHT / 2 - 16;
  ship.health = 2;
  ship.movingUp = false;
  ship.movingDown = false;
  ship.firing = false;
  ship.fireRate = 1;
  nextFireTime = 0;

  finalScoreText.textContent = "";
  newHighScoreMsg.textContent = "";
  highScoreText.textContent = "";

  // *** ONLY THIS — everything else in callback ***
  fadeToBlack(() => {
    if (mainMenu) mainMenu.style.display = "none";
    missionEndModal.style.display = "none";
    pauseModal.style.display = "none";

    inGame = true;
    setupInput();
    gameStartTime = Date.now();
    totalPausedTime = 0;
    pauseStartTime = null;
    scheduleNextAsteroid();
    scheduleNextPowerUp();

    // Check orientation FIRST before starting music or loop
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
      togglePause(true);      // Pause immediately
      rotatePrompt.style.visibility = "visible";
    } else {
      playMusic("main");      // Only play if landscape
      rotatePrompt.style.visibility = "hidden";
    }

    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  });


}

// --- Menu button wiring ---
function setupMenuButtons() {
  playBtn.removeEventListener("click", startGame);
  playBtn.addEventListener("click", () => {
    const played = localStorage.getItem("storyPlayed");

    if (!played) {
      // Smooth fade from main menu into the story scene
      fadeToBlack(() => {
        showStoryScreen(false);
      });
    } else {
      startGame();
    }
  });


  // --- SETTINGS MENU LOGIC ---
const settingsMenu = document.getElementById("settingsMenu");
const backBtn = document.getElementById("backBtn");
const resetBtn = document.getElementById("resetBtn");
const musicSlider = document.getElementById("musicSlider");
const sfxSlider = document.getElementById("sfxSlider");
const musicMute = document.getElementById("musicMute");
const sfxMute = document.getElementById("sfxMute");

/// === INITIALIZE AUDIO SETTINGS ONCE AT STARTUP ===
{
  const savedMusicVol = getValidVolume("musicVolume", 1.0);
  const savedSfxVol = getValidVolume("sfxVolume", 1.0);
  const savedMusicMute = localStorage.getItem("musicMuted") === "true";
  const savedSfxMute = localStorage.getItem("sfxMuted") === "true";

  // Apply safely
  for (const key in musicTracks) {
    musicTracks[key].volume = savedMusicVol;
    musicTracks[key].muted = savedMusicMute;
  }
  for (const key in sfx) {
    sfx[key].volume = savedSfxVol;
    sfx[key].muted = savedSfxMute;
  }
  for (const key in uiSfx) {
    uiSfx[key].volume = savedSfxVol * 0.7;
    uiSfx[key].muted = savedSfxMute;
  }

  // Sync UI
  if (musicSlider) musicSlider.value = savedMusicVol * 100;
  if (sfxSlider) sfxSlider.value = savedSfxVol * 100;
  if (musicMute) musicMute.checked = savedMusicMute;
  if (sfxMute) sfxMute.checked = savedSfxMute;
}

// --- Open Settings ---
settingsBtn.addEventListener("click", () => {

  mainMenu.style.display = "none";
  settingsMenu.style.display = "flex";

  // Always use SAVED values for consistency (ignore fade-in/out changes)
  const savedMusicVol = getValidVolume("musicVolume", 1.0);
  const savedSfxVol = getValidVolume("sfxVolume", 1.0);
  const savedMusicMute = localStorage.getItem("musicMuted") === "true";
  const savedSfxMute = localStorage.getItem("sfxMuted") === "true";

  musicSlider.value = savedMusicVol * 100;
  sfxSlider.value = savedSfxVol * 100;
  musicMute.checked = savedMusicMute;
  sfxMute.checked = savedSfxMute;
});

// --- Back button ---
backBtn.addEventListener("click", () => {
  uiSfx.click.currentTime = 0;
  playSfx(uiSfx.click, true);
  settingsMenu.style.display = "none";
  mainMenu.style.display = "flex";
});

// --- Reset button ---
// --- Reset button (FULL GAME RESET + CONFIRMATION) ---
resetBtn.addEventListener("click", () => {
  // Play UI click sound first (still works even if user cancels)
  uiSfx.click.currentTime = 0;
  playSfx(uiSfx.click, true);

  // ---- CONFIRMATION DIALOG ----
  const userConfirmed = confirm(
    "You are about to reset the local save of the game.\n\n" +
    "Continue?"
  );

  // If user clicks Cancel → exit early
  if (!userConfirmed) return;

  // ==============================
  // === ACTUAL RESET (only runs on OK) ===
  // ==============================

  const defaultVol = 1.0;
  const defaultMute = false;

  // ---- Reset audio objects ----
  for (const key in musicTracks) {
    musicTracks[key].volume = defaultVol;
    musicTracks[key].muted = defaultMute;
  }
  for (const key in sfx) {
    sfx[key].volume = defaultVol;
    sfx[key].muted = defaultMute;
  }
  for (const key in uiSfx) {
    uiSfx[key].volume = defaultVol * 0.7;
    uiSfx[key].muted = defaultMute;
  }

  // ---- Clear game data from localStorage ----
  localStorage.removeItem("highScore");      // or .setItem("highScore", "0")
  localStorage.removeItem("storyPlayed");    // hides REPLAY STORY button

  // ---- Save clean audio defaults ----
  localStorage.setItem("musicVolume", defaultVol);
  localStorage.setItem("sfxVolume",   defaultVol);
  localStorage.setItem("musicMuted",  defaultMute);
  localStorage.setItem("sfxMuted",    defaultMute);

  // ---- Update UI immediately ----
  if (musicSlider) musicSlider.value = defaultVol * 100;
  if (sfxSlider)   sfxSlider.value   = defaultVol * 100;
  if (musicMute)   musicMute.checked = defaultMute;
  if (sfxMute)     sfxMute.checked   = defaultMute;

  // Hide replay button (makes menu look like first launch)
  const replayBtn = document.getElementById("replayStoryBtn");
  if (replayBtn) replayBtn.style.display = "none";

  // ---- Final success message ----
  alert("All game data and audio settings have been reset!");
});

// === LIVE AUDIO CONTROL ===

// MUSIC SLIDER
musicSlider.addEventListener("input", () => {
  const rawValue = parseFloat(musicSlider.value) / 100 || 0;
  const value = Math.min(1, Math.max(0, isNaN(rawValue) ? 1 : rawValue));

  for (const key in musicTracks) {
    musicTracks[key].volume = value;
  }
  if (currentMusic) currentMusic.volume = value;

  localStorage.setItem("musicVolume", value);
});

// SFX SLIDER
sfxSlider.addEventListener("input", () => {
  const rawValue = parseFloat(sfxSlider.value) / 100 || 0;
  const value = Math.min(1, Math.max(0, isNaN(rawValue) ? 1 : rawValue));

  localStorage.setItem("sfxVolume", value);

  // APPLY TO ALL SFX IMMEDIATELY
  for (const key in sfx) {
    sfx[key].volume = value;
  }
  for (const key in uiSfx) {
    uiSfx[key].volume = value * 0.7;
  }
});

// MUSIC MUTE
musicMute.addEventListener("change", () => {
  const muted = musicMute.checked;
  for (const key in musicTracks) musicTracks[key].muted = muted;
  if (currentMusic) currentMusic.muted = muted;
  localStorage.setItem("musicMuted", muted);
});



// SFX MUTE
sfxMute.addEventListener("change", () => {
  const muted = sfxMute.checked;
  for (const key in sfx) sfx[key].muted = muted;
  for (const key in uiSfx) uiSfx[key].muted = muted;
  localStorage.setItem("sfxMuted", muted);
});

// --- Guide menu wiring & behavior ---
function showGuideMenu() {
  const guideMenu = document.getElementById("guideMenu");
  if (!guideMenu) return;

  // Play UI click sound once
  uiSfx.click.currentTime = 0;
  playSfx(uiSfx.click, true);

  // Hide other menus
  if (mainMenu) mainMenu.style.display = "none";
  if (settingsMenu) settingsMenu.style.display = "none";

  // Hide the canvas to prevent last frame background issue
  if (canvas) canvas.style.display = "none";

  guideMenu.style.display = "flex";

  // Pause game if currently playing
  if (inGame && !paused) {
    togglePause(true);
  }
}

function hideGuideMenu() {
  const guideMenu = document.getElementById("guideMenu");
  if (!guideMenu) return;

  uiSfx.click.currentTime = 0;
  playSfx(uiSfx.click, true);

  guideMenu.style.display = "none";

  // Restore the canvas visibility when exiting the guide
  if (canvas) canvas.style.display = "block";

  // Return to main menu
  if (mainMenu) mainMenu.style.display = "flex";
}

// Clean setup — ensure no duplicate listeners
const guideBtn = document.getElementById("guideBtn");
if (guideBtn) {
  guideBtn.replaceWith(guideBtn.cloneNode(true)); // remove any previous listeners safely
  const newGuideBtn = document.getElementById("guideBtn");
  newGuideBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showGuideMenu();
  });
}

// Close button inside/outside guide
const guideCloseBtn = document.getElementById("guideCloseBtn");
if (guideCloseBtn) {
  guideCloseBtn.replaceWith(guideCloseBtn.cloneNode(true));
  const newGuideCloseBtn = document.getElementById("guideCloseBtn");
  newGuideCloseBtn.addEventListener("click", () => {
    hideGuideMenu();
  });
}

// Optional: clicking outside the card closes the guide
const guideModal = document.getElementById("guideMenu");
if (guideModal) {
  guideModal.addEventListener("click", (ev) => {
    if (ev.target === guideModal) {
      hideGuideMenu();
    }
  });
}



// --- Replay Story Button ---
const replayStoryBtn = document.getElementById("replayStoryBtn");
replayStoryBtn.addEventListener("click", () => {
  fadeToBlack(() => showStoryScreen(true));
});

// --- Inject Replay Story Button into Menu if needed ---
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

// --- Hover & Click SFX for Menu Buttons ---
const uiButtons = [
  document.getElementById("startBtn"),
  playBtn,
  guideBtn,
  settingsBtn,
  document.getElementById("replayStoryBtn")
];

uiButtons.forEach(btn => {
  if (!btn) return;
  btn.addEventListener("mouseenter", () => {
    uiSfx.hover.currentTime = 0;
    playSfx(uiSfx.hover, true);
  });
  btn.addEventListener("click", () => {
    uiSfx.click.currentTime = 0;
    playSfx(uiSfx.click, true);
  });
});


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

setupGlobalAudioHandlers();