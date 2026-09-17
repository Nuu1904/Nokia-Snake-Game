/**
 * Nokia Snake - Retro Arcade Remake
 * Pure Vanilla JavaScript implementation.
 * Zero external dependencies.
 */

// =========================
// DOM ELEMENTS
// =========================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const screenGlass = document.getElementById("screenGlass");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const hudModeBadge = document.getElementById("hudModeBadge");
const hudMissionText = document.getElementById("hudMissionText");
const hudComboText = document.getElementById("hudComboText");
const powerStatusRow = document.getElementById("powerStatusRow");

const modeSoftBtn = document.getElementById("modeSoftBtn");
const skinSoftBtn = document.getElementById("skinSoftBtn");
const statsSoftBtn = document.getElementById("statsSoftBtn");
const pauseSoftBtn = document.getElementById("pauseSoftBtn");
const soundSoftBtn = document.getElementById("soundSoftBtn");

// =========================
// GAME CONFIGURATION
// =========================
const GRID_COUNT = 24;      // 24x24 logical tiles
const TILE_SIZE = 25;       // 24 * 25 = 600px square logical canvas
const CANVAS_LOGICAL = 600;

// Game States
const STATE_INTRO = "INTRO";
const STATE_MODE_SELECT = "MODE_SELECT";
const STATE_SKINS = "SKINS";
const STATE_STATS = "STATS";
const STATE_ACHIEVEMENTS = "ACHIEVEMENTS";
const STATE_PLAYING = "PLAYING";
const STATE_PAUSED = "PAUSED";
const STATE_GAME_OVER = "GAME_OVER";

// Available Modes
const MODES = {
    CLASSIC:  { id: "CLASSIC",  name: "CLASSIC",  desc: "Traditional Snake. Pure skill, no powers or hazards." },
    ARCADE:   { id: "ARCADE",   name: "ARCADE",   desc: "Power-ups, combos, golden food, events, and boss snake!" },
    SURVIVAL: { id: "SURVIVAL", name: "SURVIVAL", desc: "Obstacles scattered, survival clock, endure as long as you can." },
    CHAOS:    { id: "CHAOS",    name: "CHAOS",    desc: "Fast speed, random power-ups, obstacles & weird events!" }
};
const MODE_KEYS = ["ARCADE", "CLASSIC", "SURVIVAL", "CHAOS"];

// =========================
// GAME STATE
// =========================
let gameState = STATE_INTRO;
let currentModeIndex = 0;
let selectedMode = MODES.ARCADE;

let snake = [];
let food = { x: 0, y: 0 };
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let inputQueue = [];

let score = 0;
let isNewHighScore = false;
let gameStartTime = 0;

let shieldFlashTimer = 0;
let screenShake = 0;
let lastTickTime = 0;
let animationFrameId = null;
let introAnimationTick = 0;

// =========================
// PERSISTENCE & LOCALSTORAGE
// =========================
const defaultStats = {
    highScore: 0,
    longestSnake: 4,
    bestCombo: 0,
    foodEaten: 0,
    goldenEaten: 0,
    timePlayed: 0,
    powersUsed: 0,
    gamesPlayed: 0,
    bossesSurvived: 0,
    wallsPassed: 0
};

let stats = Object.assign({}, defaultStats, JSON.parse(localStorage.getItem("nokia_snake_stats") || "{}"));
function saveStats() {
    localStorage.setItem("nokia_snake_stats", JSON.stringify(stats));
}

// Achievements
const ACHIEVEMENTS = [
    { id: "first_bite",   name: "First Bite",    desc: "Eat your first food", skin: null },
    { id: "growing_up",   name: "Growing Up",    desc: "Reach a snake length of 15", skin: null },
    { id: "speed_demon",  name: "Speed Demon",   desc: "Collect 3 Speed Boosts", skin: "neon" },
    { id: "ghost_walker", name: "Ghost Walker",  desc: "Pass through 5 walls in Ghost Mode", skin: "ghost" },
    { id: "combo_master", name: "Combo Master",  desc: "Reach a 5x Combo chain", skin: "pixel" },
    { id: "golden_hunter",name: "Golden Hunter", desc: "Collect 3 Golden Foods", skin: "golden" },
    { id: "survivor",     name: "Survivor",      desc: "Survive 60s in Survival Mode", skin: "shadow" },
    { id: "boss_slayer",  name: "Boss Slayer",   desc: "Survive the Giant Boss Snake event", skin: null },
    { id: "snake_god",    name: "Snake God",     desc: "Score 1,000 points in any mode", skin: "diamond" }
];

let unlockedAchievements = new Set(JSON.parse(localStorage.getItem("nokia_snake_achievements") || "[]"));
function saveAchievements() {
    localStorage.setItem("nokia_snake_achievements", JSON.stringify([...unlockedAchievements]));
}

let achievementToast = null;
function triggerAchievement(id) {
    if (unlockedAchievements.has(id)) return;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;

    unlockedAchievements.add(id);
    saveAchievements();
    Sound.achievement();
    achievementToast = {
        title: "★ ACHIEVEMENT UNLOCKED! ★",
        desc: ach.name,
        expiresAt: performance.now() + 4000
    };
}

// =========================
// AUDIO SYNTHESIZER
// =========================
let soundEnabled = localStorage.getItem("nokia_sound") !== "false";
soundSoftBtn.textContent = soundEnabled ? "🔊 ON" : "🔇 OFF";

let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function playTone(freq, type = "square", duration = 0.08, vol = 0.1) {
    if (!soundEnabled) return;
    try {
        const actx = getAudioContext();
        if (!actx) return;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        gain.gain.setValueAtTime(vol, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + duration);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + duration);
    } catch (e) {}
}

const Sound = {
    move: () => playTone(140, "triangle", 0.02, 0.02),
    eat: () => {
        playTone(580, "square", 0.04, 0.1);
        setTimeout(() => playTone(880, "square", 0.06, 0.1), 40);
    },
    combo: (level) => {
        const base = Math.min(500 + level * 130, 1500);
        playTone(base, "square", 0.06, 0.12);
        setTimeout(() => playTone(base * 1.25, "square", 0.08, 0.12), 45);
    },
    golden: () => {
        const chords = [800, 1000, 1200, 1500];
        chords.forEach((n, i) => setTimeout(() => playTone(n, "square", 0.09, 0.14), i * 50));
    },
    powerup: () => {
        [520, 650, 780, 1040].forEach((n, i) => setTimeout(() => playTone(n, "square", 0.06, 0.12), i * 40));
    },
    shieldHit: () => {
        playTone(220, "sawtooth", 0.16, 0.18);
        setTimeout(() => playTone(140, "sawtooth", 0.2, 0.18), 50);
    },
    highScore: () => {
        [523, 659, 784, 1046, 1318].forEach((n, i) => setTimeout(() => playTone(n, "square", 0.1, 0.15), i * 65));
    },
    mission: () => {
        [600, 750, 900, 1200].forEach((n, i) => setTimeout(() => playTone(n, "square", 0.08, 0.14), i * 50));
    },
    achievement: () => {
        [440, 554, 659, 880].forEach((n, i) => setTimeout(() => playTone(n, "square", 0.09, 0.15), i * 60));
    },
    warning: () => {
        [350, 250, 350, 250].forEach((n, i) => setTimeout(() => playTone(n, "sawtooth", 0.1, 0.15), i * 80));
    },
    bossVictory: () => {
        [523, 659, 784, 1046, 1318, 1568].forEach((n, i) => setTimeout(() => playTone(n, "square", 0.12, 0.16), i * 75));
    },
    die: () => {
        [400, 310, 230, 150, 80].forEach((n, i) => setTimeout(() => playTone(n, "sawtooth", 0.11, 0.16), i * 75));
    },
    click: () => playTone(440, "triangle", 0.02, 0.04)
};

soundSoftBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("nokia_sound", soundEnabled ? "true" : "false");
    soundSoftBtn.textContent = soundEnabled ? "🔊 ON" : "🔇 OFF";
    if (soundEnabled) Sound.click();
});

// =========================
// MISSIONS & CHALLENGES
// =========================
const MISSION_POOL = [
    { id: "eat_15",   desc: "🍎 EAT 15 FOODS", goal: 15, type: "EAT" },
    { id: "speed_2",  desc: "⚡ GET 2 SPEED BOOSTS", goal: 2, type: "SPEED" },
    { id: "surv_45",  desc: "🛡️ SURVIVE 45 SECONDS", goal: 45, type: "TIME" },
    { id: "walls_4",  desc: "👻 PASS 4 GHOST WALLS", goal: 4, type: "WALL" },
    { id: "combo_4",  desc: "🔥 GET 4X COMBO", goal: 4, type: "COMBO" },
    { id: "score_400",desc: "💰 REACH 400 POINTS", goal: 400, type: "SCORE" }
];

let activeMissionIndex = 0;
let missionProgress = 0;
let missionCompletedBanner = null;

function checkMission(type, value = 1) {
    const m = MISSION_POOL[activeMissionIndex % MISSION_POOL.length];
    if (m.type !== type) return;

    if (type === "SCORE" || type === "TIME" || type === "COMBO") {
        missionProgress = Math.max(missionProgress, value);
    } else {
        missionProgress += value;
    }

    if (missionProgress >= m.goal) {
        Sound.mission();
        score += 100;
        scoreElement.textContent = score;
        missionCompletedBanner = {
            text: `MISSION COMPLETE! +100`,
            expiresAt: performance.now() + 3500
        };
        createParticleBurst(CANVAS_LOGICAL / 2, 100, 25, "#2c3325");
        activeMissionIndex++;
        missionProgress = 0;
    }
    updateHUDMission();
}

function updateHUDMission() {
    const m = MISSION_POOL[activeMissionIndex % MISSION_POOL.length];
    hudMissionText.textContent = `${m.desc} (${Math.min(missionProgress, m.goal)}/${m.goal})`;
}

// =========================
// COMBO SYSTEM
// =========================
let comboCount = 0;
let comboExpiresAt = 0;
const COMBO_DURATION = 4500; // 4.5s decay

function registerFoodCombo() {
    const now = performance.now();
    comboCount++;
    comboExpiresAt = now + COMBO_DURATION;
    stats.bestCombo = Math.max(stats.bestCombo, comboCount);
    saveStats();

    if (comboCount >= 5) triggerAchievement("combo_master");
    checkMission("COMBO", comboCount);

    if (comboCount > 1) {
        Sound.combo(comboCount);
        addFloatingText(`COMBO x${comboCount}!`, food.x, food.y);
    } else {
        Sound.eat();
    }
    updateHUDCombo();
}

function updateHUDCombo() {
    const now = performance.now();
    if (comboCount > 1 && now < comboExpiresAt) {
        const ratio = Math.max(0, (comboExpiresAt - now) / COMBO_DURATION);
        const bars = Math.round(ratio * 5);
        const barStr = "■".repeat(bars) + "░".repeat(5 - bars);
        hudComboText.style.display = "inline";
        hudComboText.innerHTML = `<span class="combo-badge">x${comboCount}</span> [${barStr}]`;
    } else {
        hudComboText.style.display = "none";
        if (comboCount > 0 && now >= comboExpiresAt) comboCount = 0;
    }
}

// =========================
// SPECIAL GOLDEN FOOD
// =========================
let goldenFood = null;
let nextGoldenSpawnCheck = 0;

function checkSpawnGoldenFood() {
    if (selectedMode.id === "CLASSIC") return;
    if (goldenFood) return;
    const now = performance.now();
    if (now < nextGoldenSpawnCheck) return;

    nextGoldenSpawnCheck = now + 15000 + Math.random() * 15000;
    if (Math.random() < 0.35) {
        const tile = findUnoccupiedTile();
        if (tile) {
            goldenFood = {
                x: tile.x,
                y: tile.y,
                expiresAt: now + 5000
            };
            Sound.warning();
            addFloatingText("👑 GOLDEN FOOD!", tile.x, tile.y);
        }
    }
}

// =========================
// OBSTACLES
// =========================
let obstacles = [];

function generateObstacles(count) {
    obstacles = [];
    const safeZone = new Set();
    for (let x = 6; x <= 14; x++) {
        for (let y = 10; y <= 14; y++) safeZone.add(`${x},${y}`);
    }

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        while (attempts < 100) {
            attempts++;
            const rx = 2 + Math.floor(Math.random() * (GRID_COUNT - 4));
            const ry = 2 + Math.floor(Math.random() * (GRID_COUNT - 4));
            if (!safeZone.has(`${rx},${ry}`) && !obstacles.some(o => o.x === rx && o.y === ry)) {
                obstacles.push({ x: rx, y: ry });
                break;
            }
        }
    }
}

// =========================
// RANDOM EVENTS
// =========================
const EVENTS = {
    SPEED_STORM:    { id: "SPEED_STORM",    name: "⚡ SPEED STORM!",    desc: "Speed drastically boosted!" },
    BLACKOUT:       { id: "BLACKOUT",       name: "🌑 BLACKOUT!",       desc: "Screen visibility dimmed!" },
    FOOD_RAIN:      { id: "FOOD_RAIN",      name: "🍎 FOOD RAIN!",      desc: "Apples raining down!" },
    GHOST_INVASION: { id: "GHOST_INVASION", name: "👻 GHOST INVASION!", desc: "Ghost powers unleashed!" }
};

let activeEvent = null;
let nextEventTime = 0;
let extraFoods = [];

function scheduleNextEvent() {
    const delay = selectedMode.id === "CHAOS" ? (18000 + Math.random() * 15000) : (35000 + Math.random() * 25000);
    nextEventTime = performance.now() + delay;
}

function triggerRandomEvent() {
    if (selectedMode.id === "CLASSIC") return;
    const now = performance.now();
    const eventKeys = Object.keys(EVENTS);
    const chosenKey = eventKeys[Math.floor(Math.random() * eventKeys.length)];
    const evt = EVENTS[chosenKey];

    Sound.warning();
    screenShake = 6;

    if (evt.id === "SPEED_STORM") {
        activeEvent = { type: evt, expiresAt: now + 5000 };
    } else if (evt.id === "BLACKOUT") {
        activeEvent = { type: evt, expiresAt: now + 3500 };
        screenGlass.classList.add("blackout-active");
    } else if (evt.id === "FOOD_RAIN") {
        activeEvent = { type: evt, expiresAt: now + 6000 };
        extraFoods = [];
        for (let i = 0; i < 6; i++) {
            const t = findUnoccupiedTile();
            if (t) extraFoods.push(t);
        }
    } else if (evt.id === "GHOST_INVASION") {
        activeEvent = { type: evt, expiresAt: now + 6000 };
        activePowers.ghostUntil = now + 6000;
    }

    addFloatingText(`⚠ ${evt.name}`, 12, 6);
    scheduleNextEvent();
}

// =========================
// GIANT BOSS SNAKE
// =========================
let bossSnake = null;
let bossEncounterTriggered = false;

function spawnBossSnake() {
    if (bossSnake && bossSnake.active) return;
    const now = performance.now();
    bossEncounterTriggered = true;
    Sound.warning();
    screenShake = 10;

    const segments = [];
    for (let i = 0; i < 14; i++) segments.push({ x: 2, y: 2 + i });

    bossSnake = {
        segments: segments,
        dir: { x: 1, y: 0 },
        active: true,
        expiresAt: now + 20000,
        lastMoveTime: now
    };

    addFloatingText("⚠ GIANT SNAKE HAS APPEARED! ⚠", 12, 4);
    addFloatingText("SURVIVE 20 SECONDS!", 12, 6);
}

function updateBossSnake(now) {
    if (!bossSnake || !bossSnake.active) return;

    if (now >= bossSnake.expiresAt) {
        bossSnake.active = false;
        Sound.bossVictory();
        score += 500;
        scoreElement.textContent = score;
        stats.bossesSurvived++;
        saveStats();
        triggerAchievement("boss_slayer");
        createParticleBurst(CANVAS_LOGICAL / 2, CANVAS_LOGICAL / 2, 40, "#2c3325");
        addFloatingText("★ BOSS SURVIVED! +500 ★", 12, 8);
        return;
    }

    if (now - bossSnake.lastMoveTime >= 130) {
        bossSnake.lastMoveTime = now;
        const head = bossSnake.segments[0];

        const dirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];

        const playerHead = snake[0];
        dirs.sort((a, b) => {
            const distA = Math.hypot(head.x + a.x - playerHead.x, head.y + a.y - playerHead.y);
            const distB = Math.hypot(head.x + b.x - playerHead.x, head.y + b.y - playerHead.y);
            return distA - distB;
        });

        let chosenDir = bossSnake.dir;
        for (const d of dirs) {
            if (d.x === -bossSnake.dir.x && d.y === -bossSnake.dir.y) continue;
            const nx = head.x + d.x;
            const ny = head.y + d.y;
            if (nx >= 0 && nx < GRID_COUNT && ny >= 0 && ny < GRID_COUNT) {
                const hitSelf = bossSnake.segments.some(s => s.x === nx && s.y === ny);
                const hitObs = obstacles.some(o => o.x === nx && o.y === ny);
                if (!hitSelf && !hitObs) {
                    chosenDir = d;
                    break;
                }
            }
        }

        bossSnake.dir = chosenDir;
        let newHead = { x: head.x + chosenDir.x, y: head.y + chosenDir.y };

        if (newHead.x < 0) newHead.x = GRID_COUNT - 1;
        else if (newHead.x >= GRID_COUNT) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GRID_COUNT - 1;
        else if (newHead.y >= GRID_COUNT) newHead.y = 0;

        bossSnake.segments.unshift(newHead);
        bossSnake.segments.pop();

        const playerHitBoss = bossSnake.segments.some(s => s.x === snake[0].x && s.y === snake[0].y);
        if (playerHitBoss) {
            if (activePowers.hasShield) {
                triggerShieldBreakEffect(snake[0].x, snake[0].y);
            } else if (activePowers.ghostUntil <= now) {
                endGame();
            }
        }
    }
}

// =========================
// POWER-UPS
// =========================
const POWER_TYPES = {
    SPEED:  { id: 'SPEED',  name: 'SPEED',  icon: '⚡', duration: 5000 },
    SHIELD: { id: 'SHIELD', name: 'SHIELD', icon: '🛡️', duration: 0 },
    GHOST:  { id: 'GHOST',  name: 'GHOST',  icon: '👻', duration: 5000 },
    MAGNET: { id: 'MAGNET', name: 'MAGNET', icon: '✦', duration: 5000 },
    DOUBLE: { id: 'DOUBLE', name: '2X SCORE', icon: '×2', duration: 8000 }
};

let currentPowerUp = null;
let nextPowerSpawnTime = 0;
let activePowers = {
    speedUntil: 0,
    hasShield: false,
    ghostUntil: 0,
    magnetUntil: 0,
    doubleUntil: 0
};

function scheduleNextPowerSpawn() {
    if (selectedMode.id === "CLASSIC") return;
    const delay = selectedMode.id === "CHAOS" ? (7000 + Math.random() * 5000) : (12000 + Math.random() * 6000);
    nextPowerSpawnTime = performance.now() + delay;
}

function spawnPowerUp() {
    if (selectedMode.id === "CLASSIC") return;
    if (currentPowerUp) return;
    const now = performance.now();
    const types = Object.keys(POWER_TYPES);
    const randomTypeKey = types[Math.floor(Math.random() * types.length)];
    const powerDef = POWER_TYPES[randomTypeKey];

    const freePos = findUnoccupiedTile();
    if (!freePos) return;

    currentPowerUp = {
        type: powerDef,
        x: freePos.x,
        y: freePos.y,
        spawnTime: now,
        expiresAt: now + 10000
    };
}

function activatePower(powerDef) {
    const now = performance.now();
    Sound.powerup();
    stats.powersUsed++;
    saveStats();

    if (powerDef.id === 'SPEED') {
        activePowers.speedUntil = now + powerDef.duration;
        addFloatingText("SPEED 5s!", snake[0].x, snake[0].y);
        checkMission("SPEED", 1);
    } else if (powerDef.id === 'SHIELD') {
        activePowers.hasShield = true;
        addFloatingText("SHIELD UP!", snake[0].x, snake[0].y);
    } else if (powerDef.id === 'GHOST') {
        activePowers.ghostUntil = now + powerDef.duration;
        addFloatingText("GHOST 5s!", snake[0].x, snake[0].y);
    } else if (powerDef.id === 'MAGNET') {
        activePowers.magnetUntil = now + powerDef.duration;
        addFloatingText("MAGNET 5s!", snake[0].x, snake[0].y);
    } else if (powerDef.id === 'DOUBLE') {
        activePowers.doubleUntil = now + powerDef.duration;
        addFloatingText("2X SCORE 8s!", snake[0].x, snake[0].y);
    }

    createParticleBurst(currentPowerUp.x * TILE_SIZE + TILE_SIZE / 2, currentPowerUp.y * TILE_SIZE + TILE_SIZE / 2, 14, "#2c3325");
    currentPowerUp = null;
    scheduleNextPowerSpawn();
}

function updateHUDPowers() {
    const now = performance.now();
    const badges = [];

    if (activePowers.speedUntil > now) badges.push(`⚡ SPEED ${Math.ceil((activePowers.speedUntil - now) / 1000)}s`);
    if (activePowers.hasShield) badges.push(`🛡️ SHIELD`);
    if (activePowers.ghostUntil > now) badges.push(`👻 GHOST ${Math.ceil((activePowers.ghostUntil - now) / 1000)}s`);
    if (activePowers.magnetUntil > now) badges.push(`✦ MAGNET ${Math.ceil((activePowers.magnetUntil - now) / 1000)}s`);
    if (activePowers.doubleUntil > now) badges.push(`×2 SCORE ${Math.ceil((activePowers.doubleUntil - now) / 1000)}s`);

    if (bossSnake && bossSnake.active) {
        const bSecs = Math.max(0, Math.ceil((bossSnake.expiresAt - now) / 1000));
        badges.unshift(`⚠ BOSS: ${bSecs}s`);
    }

    if (activeEvent && activeEvent.expiresAt > now) {
        const eSecs = Math.max(0, Math.ceil((activeEvent.expiresAt - now) / 1000));
        badges.unshift(`${activeEvent.type.name} ${eSecs}s`);
    }

    if (badges.length > 0) {
        powerStatusRow.innerHTML = badges.map(b => `<span class="power-tag">${b}</span>`).join(" ");
    } else {
        powerStatusRow.innerHTML = `<span class="hud-hint">POWERS: COLLECT ITEMS ON BOARD</span>`;
    }
}

// =========================
// SNAKE SKINS
// =========================
const SKINS = [
    { id: "classic", name: "Classic 🟩", desc: "Original segmented Nokia pixel snake", req: "Default" },
    { id: "shadow",  name: "Shadow ⬛",  desc: "Deep stealth blocks with crisp border", req: "Survivor Achievement" },
    { id: "golden",  name: "Golden 👑",  desc: "Royal LCD gold pattern with crown", req: "Golden Hunter Achievement" },
    { id: "neon",    name: "Neon ⚡",    desc: "Hollow wireframe with glowing core", req: "Speed Demon Achievement" },
    { id: "pixel",   name: "Pixel 🏁",   desc: "Retro checkerboard dot matrix", req: "Combo Master Achievement" },
    { id: "ghost",   name: "Ghost 👻",   desc: "Ethereal translucent dither stipple", req: "Ghost Walker Achievement" },
    { id: "diamond", name: "Diamond 💎", desc: "Dual-angle faceted crystal blocks", req: "Snake God Achievement" }
];

let currentSkinId = localStorage.getItem("nokia_snake_skin") || "classic";
let skinSelectIndex = Math.max(0, SKINS.findIndex(s => s.id === currentSkinId));

function isSkinUnlocked(skinId) {
    if (skinId === "classic") return true;
    const ach = ACHIEVEMENTS.find(a => a.skin === skinId);
    if (!ach) return true;
    return unlockedAchievements.has(ach.id);
}

// =========================
// PARTICLES & VISUAL EFFECTS
// =========================
let particles = [];
let floatingTexts = [];

function createParticleBurst(x, y, count = 10, color = "#2c3325") {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 4.0;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() > 0.4 ? 4 : 2,
            life: 1.0,
            decay: 0.035 + Math.random() * 0.05,
            color: color
        });
    }
}

function addFloatingText(text, tileX, tileY) {
    floatingTexts.push({
        text: text,
        x: tileX * TILE_SIZE + TILE_SIZE / 2,
        y: tileY * TILE_SIZE,
        vy: -0.85,
        opacity: 1.0
    });
}

function updateAndDrawEffects() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }

    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Courier New', Courier, monospace";
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.opacity -= 0.025;
        if (ft.opacity <= 0) {
            floatingTexts.splice(i, 1);
            continue;
        }
        ctx.fillStyle = "#2c3325";
        ctx.globalAlpha = ft.opacity;
        ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    }

    const now = performance.now();
    if (achievementToast && now < achievementToast.expiresAt) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(40, 20, CANVAS_LOGICAL - 80, 50);
        ctx.fillStyle = "#9ead86";
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.fillText(achievementToast.title, CANVAS_LOGICAL / 2, 42);
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillText(achievementToast.desc, CANVAS_LOGICAL / 2, 60);
    } else if (achievementToast && now >= achievementToast.expiresAt) {
        achievementToast = null;
    }

    if (missionCompletedBanner && now < missionCompletedBanner.expiresAt) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(60, 80, CANVAS_LOGICAL - 120, 36);
        ctx.fillStyle = "#e0edd0";
        ctx.font = "bold 15px 'Courier New', monospace";
        ctx.fillText(missionCompletedBanner.text, CANVAS_LOGICAL / 2, 104);
    } else if (missionCompletedBanner && now >= missionCompletedBanner.expiresAt) {
        missionCompletedBanner = null;
    }

    ctx.globalAlpha = 1.0;
    ctx.textAlign = "start";
}

// =========================
// RENDERING ENGINE
// =========================
function clearCanvas() {
    ctx.fillStyle = "#8b9975";
    ctx.fillRect(0, 0, CANVAS_LOGICAL, CANVAS_LOGICAL);

    ctx.fillStyle = "rgba(44, 51, 37, 0.08)";
    for (let x = 0; x < GRID_COUNT; x++) {
        for (let y = 0; y < GRID_COUNT; y++) {
            ctx.fillRect(x * TILE_SIZE + TILE_SIZE - 2, y * TILE_SIZE + TILE_SIZE - 2, 1, 1);
        }
    }

    ctx.strokeStyle = "#2c3325";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CANVAS_LOGICAL - 2, CANVAS_LOGICAL - 2);
}

function drawFood() {
    const px = food.x * TILE_SIZE;
    const py = food.y * TILE_SIZE;
    const now = performance.now();
    const pulse = Math.floor(now / 350) % 2 === 0;

    ctx.fillStyle = "#2c3325";
    if (pulse) {
        ctx.fillRect(px + 6, py + 3, 4, 3);
        ctx.fillRect(px + 4, py + 6, TILE_SIZE - 8, TILE_SIZE - 9);
        ctx.fillRect(px + 6, py + TILE_SIZE - 3, TILE_SIZE - 12, 2);
    } else {
        ctx.fillRect(px + 7, py + 2, 3, 3);
        ctx.fillRect(px + 3, py + 5, TILE_SIZE - 6, TILE_SIZE - 8);
        ctx.fillRect(px + 5, py + TILE_SIZE - 3, TILE_SIZE - 10, 2);
    }

    extraFoods.forEach(ef => {
        const ex = ef.x * TILE_SIZE;
        const ey = ef.y * TILE_SIZE;
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(ex + 5, py + 4, 3, 3);
        ctx.fillRect(ex + 4, ey + 7, TILE_SIZE - 8, TILE_SIZE - 9);
    });
}

function drawGoldenFood() {
    if (!goldenFood) return;
    const now = performance.now();
    const timeLeft = goldenFood.expiresAt - now;

    if (timeLeft <= 0) {
        goldenFood = null;
        return;
    }

    if (timeLeft < 2000 && Math.floor(now / 130) % 2 === 0) return;

    const px = goldenFood.x * TILE_SIZE;
    const py = goldenFood.y * TILE_SIZE;

    ctx.fillStyle = "#2c3325";
    ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    ctx.fillStyle = "#8b9975";
    ctx.fillRect(px + 5, py + 5, TILE_SIZE - 10, TILE_SIZE - 10);

    ctx.fillStyle = "#2c3325";
    ctx.fillRect(px + 5, py + 7, 3, 7);
    ctx.fillRect(px + 11, py + 5, 3, 9);
    ctx.fillRect(px + 17, py + 7, 3, 7);
    ctx.fillRect(px + 5, py + 14, 15, 4);
}

function drawObstacles() {
    ctx.fillStyle = "#2c3325";
    obstacles.forEach(o => {
        const px = o.x * TILE_SIZE;
        const py = o.y * TILE_SIZE;
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = "#8b9975";
        ctx.fillRect(px + 4, py + 4, 3, 3);
        ctx.fillRect(px + TILE_SIZE - 7, py + TILE_SIZE - 7, 3, 3);
        ctx.fillStyle = "#2c3325";
    });
}

function drawPowerUp() {
    if (!currentPowerUp) return;
    const now = performance.now();
    const timeLeft = currentPowerUp.expiresAt - now;

    if (timeLeft <= 0) {
        currentPowerUp = null;
        scheduleNextPowerSpawn();
        return;
    }

    if (timeLeft < 3000 && Math.floor(now / 150) % 2 === 0) return;

    const px = currentPowerUp.x * TILE_SIZE;
    const py = currentPowerUp.y * TILE_SIZE;
    const type = currentPowerUp.type.id;

    ctx.fillStyle = "#2c3325";
    ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.fillStyle = "#8b9975";
    ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    ctx.fillStyle = "#2c3325";

    if (type === 'SPEED') {
        ctx.beginPath();
        ctx.moveTo(px + 14, py + 4);
        ctx.lineTo(px + 7, py + 13);
        ctx.lineTo(px + 13, py + 13);
        ctx.lineTo(px + 10, py + 21);
        ctx.lineTo(px + 18, py + 11);
        ctx.lineTo(px + 12, py + 11);
        ctx.closePath();
        ctx.fill();
    } else if (type === 'SHIELD') {
        ctx.fillRect(px + 6, py + 5, 13, 3);
        ctx.fillRect(px + 7, py + 8, 11, 6);
        ctx.fillRect(px + 9, py + 14, 7, 4);
        ctx.fillRect(px + 11, py + 18, 3, 2);
    } else if (type === 'GHOST') {
        ctx.fillRect(px + 7, py + 5, 11, 4);
        ctx.fillRect(px + 5, py + 9, 15, 7);
        ctx.fillRect(px + 5, py + 16, 3, 3);
        ctx.fillRect(px + 11, py + 16, 3, 3);
        ctx.fillRect(px + 17, py + 16, 3, 3);
        ctx.fillStyle = "#8b9975";
        ctx.fillRect(px + 8, py + 8, 2, 3);
        ctx.fillRect(px + 14, py + 8, 2, 3);
    } else if (type === 'MAGNET') {
        ctx.fillRect(px + 11, py + 4, 3, 17);
        ctx.fillRect(px + 4, py + 11, 17, 3);
        ctx.fillRect(px + 9, py + 9, 7, 7);
    } else if (type === 'DOUBLE') {
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("2X", px + 12, py + 17);
        ctx.textAlign = "start";
    }
}

function drawSnakeSegment(px, py, skinId, isGhost, index) {
    if (isGhost) {
        ctx.fillStyle = "#2c3325";
        ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        for (let gx = 0; gx < TILE_SIZE - 4; gx += 4) {
            for (let gy = 0; gy < TILE_SIZE - 4; gy += 4) {
                ctx.fillRect(px + 2 + gx, py + 2 + gy, 2, 2);
            }
        }
        return;
    }

    if (skinId === "shadow") {
        ctx.fillStyle = "#151a1d";
        ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.strokeStyle = "#4a5443";
        ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    } else if (skinId === "golden") {
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.fillStyle = "#9ead86";
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
    } else if (skinId === "neon") {
        ctx.strokeStyle = "#2c3325";
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
    } else if (skinId === "pixel") {
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.fillStyle = "#8b9975";
        for (let x = 3; x < TILE_SIZE - 4; x += 4) {
            for (let y = 3; y < TILE_SIZE - 4; y += 4) {
                ctx.fillRect(px + x, py + y, 2, 2);
            }
        }
    } else if (skinId === "diamond") {
        ctx.fillStyle = "#2c3325";
        ctx.beginPath();
        ctx.moveTo(px + TILE_SIZE / 2, py + 1);
        ctx.lineTo(px + TILE_SIZE - 1, py + TILE_SIZE / 2);
        ctx.lineTo(px + TILE_SIZE / 2, py + TILE_SIZE - 1);
        ctx.lineTo(px + 1, py + TILE_SIZE / 2);
        ctx.closePath();
        ctx.fill();
    } else {
        // Classic
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.fillStyle = "rgba(139, 153, 117, 0.4)";
        ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }
}

function drawSnake() {
    const now = performance.now();
    const isGhost = activePowers.ghostUntil > now;
    const hasShield = activePowers.hasShield;

    snake.forEach((part, index) => {
        const px = part.x * TILE_SIZE;
        const py = part.y * TILE_SIZE;

        drawSnakeSegment(px, py, currentSkinId, isGhost, index);

        if (index === 0) {
            ctx.fillStyle = currentSkinId === "golden" ? "#2c3325" : "#8b9975";
            if (dir.x === 1) {
                ctx.fillRect(px + TILE_SIZE - 6, py + 4, 3, 3);
                ctx.fillRect(px + TILE_SIZE - 6, py + TILE_SIZE - 7, 3, 3);
            } else if (dir.x === -1) {
                ctx.fillRect(px + 3, py + 4, 3, 3);
                ctx.fillRect(px + 3, py + TILE_SIZE - 7, 3, 3);
            } else if (dir.y === 1) {
                ctx.fillRect(px + 4, py + TILE_SIZE - 6, 3, 3);
                ctx.fillRect(px + TILE_SIZE - 7, py + TILE_SIZE - 6, 3, 3);
            } else if (dir.y === -1) {
                ctx.fillRect(px + 4, py + 3, 3, 3);
                ctx.fillRect(px + TILE_SIZE - 7, py + 3, 3, 3);
            }

            if (hasShield) {
                ctx.strokeStyle = "#2c3325";
                ctx.lineWidth = 2;
                ctx.strokeRect(px - 3, py - 3, TILE_SIZE + 6, TILE_SIZE + 6);
            }
        }
    });
}

function drawBossSnake() {
    if (!bossSnake || !bossSnake.active) return;
    const now = performance.now();
    const blink = Math.floor(now / 180) % 2 === 0;

    bossSnake.segments.forEach((seg, idx) => {
        const px = seg.x * TILE_SIZE;
        const py = seg.y * TILE_SIZE;

        ctx.fillStyle = "#2c3325";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = blink ? "#8b9975" : "#9ead86";
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(px + 7, py + 7, TILE_SIZE - 14, TILE_SIZE - 14);

        if (idx === 0) {
            ctx.fillStyle = "#8b9975";
            ctx.fillRect(px + 3, py + 3, 5, 5);
            ctx.fillRect(px + TILE_SIZE - 8, py + 3, 5, 5);
        }
    });
}

// =========================
// OVERLAY & MENU SCREENS
// =========================
function drawIntroScreen() {
    clearCanvas();
    introAnimationTick += 0.05;

    ctx.fillStyle = "#2c3325";
    ctx.textAlign = "center";

    ctx.font = "900 34px 'Courier New', Courier, monospace";
    ctx.fillText("NOKIA", CANVAS_LOGICAL / 2, 110);
    ctx.font = "900 46px 'Courier New', Courier, monospace";
    ctx.fillText("SNAKE", CANVAS_LOGICAL / 2, 160);

    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillText(`MODE: [${selectedMode.name}]`, CANVAS_LOGICAL / 2, 195);

    const demoY = 255;
    for (let i = 0; i < 9; i++) {
        const segX = (CANVAS_LOGICAL / 2 - 100) + i * 22;
        const segY = demoY + Math.sin(introAnimationTick + i * 0.45) * 16;
        drawSnakeSegment(segX, segY, currentSkinId, false, i);
        if (i === 8) ctx.strokeRect(segX + 32, demoY, 14, 14);
    }

    const blink = Math.floor(performance.now() / 450) % 2 === 0;
    if (blink) {
        ctx.font = "bold 20px 'Courier New', Courier, monospace";
        ctx.fillText("PRESS SPACE OR TAP", CANVAS_LOGICAL / 2, 355);
        ctx.font = "bold 16px 'Courier New', Courier, monospace";
        ctx.fillText("TO START", CANVAS_LOGICAL / 2, 385);
    }

    ctx.font = "bold 13px 'Courier New', Courier, monospace";
    ctx.fillText("⚡ POWERS &bull; 👑 GOLDEN FOOD &bull; 🏆 MISSIONS", CANVAS_LOGICAL / 2, 440);
    ctx.fillText("🔥 COMBOS &bull; 🐍 7 SKINS &bull; ☠️ GIANT BOSS", CANVAS_LOGICAL / 2, 465);

    ctx.font = "12px 'Courier New', monospace";
    ctx.fillText(`HIGH SCORE: ${stats.highScore}  |  BEST COMBO: x${stats.bestCombo}`, CANVAS_LOGICAL / 2, 520);
    ctx.fillText("Press M for Modes | S for Skins | OK to Play", CANVAS_LOGICAL / 2, 555);

    ctx.textAlign = "start";
}

function drawModeSelectScreen() {
    clearCanvas();
    ctx.fillStyle = "#2c3325";
    ctx.textAlign = "center";

    ctx.font = "900 28px 'Courier New', monospace";
    ctx.fillText("SELECT GAME MODE", CANVAS_LOGICAL / 2, 90);

    MODE_KEYS.forEach((k, idx) => {
        const m = MODES[k];
        const y = 170 + idx * 75;
        const isSelected = idx === currentModeIndex;

        if (isSelected) {
            ctx.fillStyle = "#2c3325";
            ctx.fillRect(50, y - 28, CANVAS_LOGICAL - 100, 60);
            ctx.fillStyle = "#9ead86";
            ctx.font = "900 22px 'Courier New', monospace";
            ctx.fillText(`> ${m.name} <`, CANVAS_LOGICAL / 2, y);
            ctx.font = "11px 'Courier New', monospace";
            ctx.fillText(m.desc, CANVAS_LOGICAL / 2, y + 20);
        } else {
            ctx.fillStyle = "#2c3325";
            ctx.font = "bold 18px 'Courier New', monospace";
            ctx.fillText(m.name, CANVAS_LOGICAL / 2, y);
            ctx.font = "10px 'Courier New', monospace";
            ctx.fillText(m.desc, CANVAS_LOGICAL / 2, y + 18);
        }
    });

    ctx.fillStyle = "#2c3325";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("▲/▼ TO BROWSE &bull; OK/SPACE TO CONFIRM", CANVAS_LOGICAL / 2, 530);
    ctx.fillText("PRESS ESC / BACK TO RETURN", CANVAS_LOGICAL / 2, 555);
    ctx.textAlign = "start";
}

function drawSkinsScreen() {
    clearCanvas();
    ctx.fillStyle = "#2c3325";
    ctx.textAlign = "center";

    ctx.font = "900 28px 'Courier New', monospace";
    ctx.fillText("SNAKE SKINS", CANVAS_LOGICAL / 2, 85);

    const skin = SKINS[skinSelectIndex];
    const unlocked = isSkinUnlocked(skin.id);
    const isEquipped = skin.id === currentSkinId;

    ctx.strokeRect(CANVAS_LOGICAL / 2 - 80, 120, 160, 70);
    for (let i = 0; i < 5; i++) {
        drawSnakeSegment((CANVAS_LOGICAL / 2 - 60) + i * 26, 142, skin.id, false, i);
    }

    ctx.font = "900 24px 'Courier New', monospace";
    ctx.fillText(skin.name, CANVAS_LOGICAL / 2, 235);

    ctx.font = "13px 'Courier New', monospace";
    ctx.fillText(skin.desc, CANVAS_LOGICAL / 2, 265);

    if (isEquipped) {
        ctx.fillStyle = "#2c3325";
        ctx.fillRect(CANVAS_LOGICAL / 2 - 70, 290, 140, 30);
        ctx.fillStyle = "#9ead86";
        ctx.font = "900 15px 'Courier New', monospace";
        ctx.fillText("EQUIPPED ✓", CANVAS_LOGICAL / 2, 310);
    } else if (unlocked) {
        ctx.fillStyle = "#2c3325";
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillText("[ PRESS OK TO EQUIP ]", CANVAS_LOGICAL / 2, 310);
    } else {
        ctx.fillStyle = "rgba(44, 51, 37, 0.7)";
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.fillText("🔒 LOCKED", CANVAS_LOGICAL / 2, 300);
        ctx.font = "12px 'Courier New', monospace";
        ctx.fillText(`Unlock: ${skin.req}`, CANVAS_LOGICAL / 2, 325);
    }

    ctx.fillStyle = "#2c3325";
    let dots = SKINS.map((s, idx) => idx === skinSelectIndex ? "●" : "○").join(" ");
    ctx.font = "18px 'Courier New', monospace";
    ctx.fillText(dots, CANVAS_LOGICAL / 2, 400);

    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("◀/▶ BROWSE SKINS &bull; OK TO SELECT", CANVAS_LOGICAL / 2, 480);
    ctx.fillText("PRESS ESC / BACK TO RETURN", CANVAS_LOGICAL / 2, 510);
    ctx.textAlign = "start";
}

function drawStatsScreen() {
    clearCanvas();
    ctx.fillStyle = "#2c3325";
    ctx.textAlign = "center";

    ctx.font = "900 26px 'Courier New', monospace";
    ctx.fillText("PLAYER STATS", CANVAS_LOGICAL / 2, 75);

    const m = Math.floor(stats.timePlayed / 60);
    const s = stats.timePlayed % 60;
    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;

    const rows = [
        ["HIGH SCORE", `${stats.highScore}`],
        ["LONGEST SNAKE", `${stats.longestSnake}`],
        ["BEST COMBO", `x${stats.bestCombo}`],
        ["FOOD EATEN", `${stats.foodEaten}`],
        ["GOLDEN FOOD", `${stats.goldenEaten}`],
        ["TIME PLAYED", `${timeStr}`],
        ["POWERS USED", `${stats.powersUsed}`],
        ["GAMES PLAYED", `${stats.gamesPlayed}`],
        ["BOSS SURVIVED", `${stats.bossesSurvived}`]
    ];

    ctx.font = "bold 15px 'Courier New', monospace";
    rows.forEach((r, idx) => {
        const y = 120 + idx * 36;
        ctx.textAlign = "start";
        ctx.fillText(r[0], 90, y);
        ctx.textAlign = "end";
        ctx.fillText(r[1], CANVAS_LOGICAL - 90, y);
    });

    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("PRESS [ACTION/OK] FOR ACHIEVEMENTS", CANVAS_LOGICAL / 2, 485);
    ctx.fillText("PRESS ESC / BACK TO RETURN", CANVAS_LOGICAL / 2, 520);
    ctx.textAlign = "start";
}

function drawAchievementsScreen() {
    clearCanvas();
    ctx.fillStyle = "#2c3325";
    ctx.textAlign = "center";

    ctx.font = "900 24px 'Courier New', monospace";
    ctx.fillText("ACHIEVEMENTS", CANVAS_LOGICAL / 2, 60);

    ACHIEVEMENTS.forEach((a, idx) => {
        const y = 100 + idx * 44;
        const isUnlocked = unlockedAchievements.has(a.id);
        ctx.textAlign = "start";
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.fillText(`${isUnlocked ? "☑" : "☐"} ${a.name}`, 60, y);
        ctx.font = "11px 'Courier New', monospace";
        ctx.fillText(a.desc, 85, y + 16);
    });

    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("PRESS ESC / BACK TO RETURN", CANVAS_LOGICAL / 2, 530);
    ctx.textAlign = "start";
}

function drawPauseScreen() {
    ctx.fillStyle = "rgba(139, 153, 117, 0.88)";
    ctx.fillRect(0, 0, CANVAS_LOGICAL, CANVAS_LOGICAL);

    ctx.fillStyle = "#2c3325";
    ctx.textAlign = "center";
    ctx.font = "900 42px 'Courier New', Courier, monospace";
    ctx.fillText("PAUSED", CANVAS_LOGICAL / 2, CANVAS_LOGICAL / 2 - 40);

    const blink = Math.floor(performance.now() / 450) % 2 === 0;
    if (blink) {
        ctx.font = "bold 20px 'Courier New', Courier, monospace";
        ctx.fillText("PRESS P TO CONTINUE", CANVAS_LOGICAL / 2, CANVAS_LOGICAL / 2 + 25);
        ctx.font = "16px 'Courier New', Courier, monospace";
        ctx.fillText("(OR TAP TO RESUME)", CANVAS_LOGICAL / 2, CANVAS_LOGICAL / 2 + 65);
    }
    ctx.textAlign = "start";
}

function drawGameOverScreen() {
    ctx.fillStyle = "rgba(44, 51, 37, 0.90)";
    ctx.fillRect(0, 0, CANVAS_LOGICAL, CANVAS_LOGICAL);

    ctx.fillStyle = "#9ead86";
    ctx.textAlign = "center";

    ctx.font = "900 42px 'Courier New', Courier, monospace";
    ctx.fillText("GAME OVER", CANVAS_LOGICAL / 2, 160);

    if (isNewHighScore) {
        ctx.fillStyle = "#e0edd0";
        ctx.font = "900 22px 'Courier New', Courier, monospace";
        const blink = Math.floor(performance.now() / 300) % 2 === 0;
        ctx.fillText(blink ? "★ NEW HIGH SCORE! ★" : "★   NEW HIGH SCORE   ★", CANVAS_LOGICAL / 2, 215);
    }

    ctx.fillStyle = "#9ead86";
    ctx.font = "bold 24px 'Courier New', Courier, monospace";
    ctx.fillText(`SCORE: ${score}`, CANVAS_LOGICAL / 2, 280);

    ctx.font = "bold 20px 'Courier New', Courier, monospace";
    ctx.fillText(`HIGH SCORE: ${stats.highScore}`, CANVAS_LOGICAL / 2, 325);

    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillText(`BEST COMBO: x${comboCount > 1 ? comboCount : stats.bestCombo}`, CANVAS_LOGICAL / 2, 365);

    const blink = Math.floor(performance.now() / 450) % 2 === 0;
    if (blink) {
        ctx.fillStyle = "#d1dfba";
        ctx.font = "bold 20px 'Courier New', Courier, monospace";
        ctx.fillText("PRESS SPACE", CANVAS_LOGICAL / 2, 440);
        ctx.font = "bold 16px 'Courier New', Courier, monospace";
        ctx.fillText("OR TAP TO RETRY", CANVAS_LOGICAL / 2, 475);
    }
    ctx.textAlign = "start";
}

// =========================
// INITIALIZATION & RESIZING
// =========================
function calculateScreenSize() {
    const isMobile = window.innerWidth <= 650;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let overhead = isMobile ? 260 : 275;
    if (vh < 750 && !isMobile) overhead = 245;

    let size = Math.min(vw - (isMobile ? 28 : 68), vh - overhead);

    if (!isMobile) {
        size = Math.min(size, 640);
        size = Math.max(size, 400);
    } else {
        size = Math.max(size, 260);
    }

    document.documentElement.style.setProperty('--canvas-size', `${Math.floor(size)}px`);
}

window.addEventListener("resize", calculateScreenSize);
window.addEventListener("orientationchange", () => setTimeout(calculateScreenSize, 100));
calculateScreenSize();

function findUnoccupiedTile() {
    const occupied = new Set();
    snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`));
    occupied.add(`${food.x},${food.y}`);
    if (goldenFood) occupied.add(`${goldenFood.x},${goldenFood.y}`);
    if (currentPowerUp) occupied.add(`${currentPowerUp.x},${currentPowerUp.y}`);
    obstacles.forEach(o => occupied.add(`${o.x},${o.y}`));
    extraFoods.forEach(ef => occupied.add(`${ef.x},${ef.y}`));
    if (bossSnake && bossSnake.active) {
        bossSnake.segments.forEach(bs => occupied.add(`${bs.x},${bs.y}`));
    }

    const emptyTiles = [];
    for (let x = 1; x < GRID_COUNT - 1; x++) {
        for (let y = 1; y < GRID_COUNT - 1; y++) {
            if (!occupied.has(`${x},${y}`)) emptyTiles.push({ x, y });
        }
    }

    if (emptyTiles.length === 0) return null;
    return emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
}

function spawnFood() {
    const freePos = findUnoccupiedTile();
    if (freePos) food = { x: freePos.x, y: freePos.y };
}

function resetGame() {
    const startY = 12;
    snake = [
        { x: 10, y: startY },
        { x: 9, y: startY },
        { x: 8, y: startY },
        { x: 7, y: startY }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    inputQueue = [];

    score = 0;
    scoreElement.textContent = score;
    highScoreElement.textContent = stats.highScore;
    hudModeBadge.textContent = selectedMode.name;
    isNewHighScore = false;
    gameStartTime = performance.now();

    activePowers = {
        speedUntil: 0,
        hasShield: false,
        ghostUntil: 0,
        magnetUntil: 0,
        doubleUntil: 0
    };
    currentPowerUp = null;
    goldenFood = null;
    extraFoods = [];
    bossSnake = null;
    bossEncounterTriggered = false;
    activeEvent = null;
    screenGlass.classList.remove("blackout-active");

    comboCount = 0;
    comboExpiresAt = 0;
    particles = [];
    floatingTexts = [];
    shieldFlashTimer = 0;
    screenShake = 0;

    if (selectedMode.id === "SURVIVAL") generateObstacles(7);
    else if (selectedMode.id === "CHAOS") generateObstacles(9);
    else generateObstacles(0);

    spawnFood();
    scheduleNextPowerSpawn();
    scheduleNextEvent();

    gameState = STATE_PLAYING;
    lastTickTime = performance.now();
    stats.gamesPlayed++;
    saveStats();

    updateHUDPowers();
    updateHUDMission();
    pauseSoftBtn.textContent = "❚❚ PAUSE";
}

// =========================
// GAME LOOP
// =========================
function mainLoop(currentTime) {
    if (gameState === STATE_INTRO) {
        drawIntroScreen();
    } else if (gameState === STATE_MODE_SELECT) {
        drawModeSelectScreen();
    } else if (gameState === STATE_SKINS) {
        drawSkinsScreen();
    } else if (gameState === STATE_STATS) {
        drawStatsScreen();
    } else if (gameState === STATE_ACHIEVEMENTS) {
        drawAchievementsScreen();
    } else if (gameState === STATE_PLAYING) {
        const interval = getCurrentSpeedInterval();

        if (!currentPowerUp && currentTime > nextPowerSpawnTime) spawnPowerUp();
        if (currentTime > nextEventTime) triggerRandomEvent();
        if (activeEvent && currentTime > activeEvent.expiresAt) {
            if (activeEvent.type.id === "BLACKOUT") screenGlass.classList.remove("blackout-active");
            activeEvent = null;
        }

        if (currentTime - lastTickTime >= interval) {
            moveSnake();
            lastTickTime = currentTime;
        }

        updateBossSnake(currentTime);

        clearCanvas();
        drawObstacles();
        drawFood();
        drawGoldenFood();
        drawPowerUp();
        drawBossSnake();
        drawSnake();
        updateAndDrawEffects();
        updateHUDPowers();
        updateHUDCombo();

        if (shieldFlashTimer > 0) {
            ctx.fillStyle = "rgba(44, 51, 37, 0.4)";
            ctx.fillRect(0, 0, CANVAS_LOGICAL, CANVAS_LOGICAL);
            shieldFlashTimer--;
        }
    } else if (gameState === STATE_PAUSED) {
        drawPauseScreen();
    } else if (gameState === STATE_GAME_OVER) {
        drawGameOverScreen();
        updateAndDrawEffects();
    }

    animationFrameId = requestAnimationFrame(mainLoop);
}

animationFrameId = requestAnimationFrame(mainLoop);

// =========================
// SNAKE MOVEMENT & COLLISION
// =========================
function queueDirection(nx, ny) {
    const last = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : nextDir;
    if (nx === -last.x && ny === -last.y) return;
    if (nx === last.x && ny === last.y) return;
    if (inputQueue.length < 2) inputQueue.push({ x: nx, y: ny });
}

function goLeft()  { queueDirection(-1, 0); }
function goRight() { queueDirection(1, 0); }
function goUp()    { queueDirection(0, -1); }
function goDown()  { queueDirection(0, 1); }

function triggerShieldBreakEffect(x, y) {
    Sound.shieldHit();
    activePowers.hasShield = false;
    shieldFlashTimer = 6;
    screenShake = 5;
    createParticleBurst(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 22, "#2c3325");
    addFloatingText("SHIELD BROKEN!", x, y);
}

function moveSnake() {
    const now = performance.now();
    if (inputQueue.length > 0) nextDir = inputQueue.shift();
    dir = nextDir;
    Sound.move();

    if (activePowers.magnetUntil > now) {
        const head = snake[0];
        const mdx = head.x - food.x;
        const mdy = head.y - food.y;

        if (Math.random() > 0.35) {
            let nfx = food.x + (Math.abs(mdx) > Math.abs(mdy) ? Math.sign(mdx) : 0);
            let nfy = food.y + (Math.abs(mdx) <= Math.abs(mdy) ? Math.sign(mdy) : 0);

            const isOcc = snake.some(s => s.x === nfx && s.y === nfy) || obstacles.some(o => o.x === nfx && o.y === nfy);
            if (!isOcc && nfx >= 0 && nfx < GRID_COUNT && nfy >= 0 && nfy < GRID_COUNT) {
                food.x = nfx;
                food.y = nfy;
            }
        }
    }

    let nextHead = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const isGhost = activePowers.ghostUntil > now;

    // Wall collision
    let hitWall = (nextHead.x < 0 || nextHead.x >= GRID_COUNT || nextHead.y < 0 || nextHead.y >= GRID_COUNT);
    if (hitWall) {
        if (isGhost) {
            if (nextHead.x < 0) nextHead.x = GRID_COUNT - 1;
            else if (nextHead.x >= GRID_COUNT) nextHead.x = 0;
            if (nextHead.y < 0) nextHead.y = GRID_COUNT - 1;
            else if (nextHead.y >= GRID_COUNT) nextHead.y = 0;
            stats.wallsPassed++;
            saveStats();
            checkMission("WALL", 1);
            if (stats.wallsPassed >= 5) triggerAchievement("ghost_walker");
        } else if (activePowers.hasShield) {
            triggerShieldBreakEffect(snake[0].x, snake[0].y);
            if (nextHead.x < 0) nextHead.x = GRID_COUNT - 1;
            else if (nextHead.x >= GRID_COUNT) nextHead.x = 0;
            if (nextHead.y < 0) nextHead.y = GRID_COUNT - 1;
            else if (nextHead.y >= GRID_COUNT) nextHead.y = 0;
        } else {
            endGame();
            return;
        }
    }

    // Obstacle collision
    const hitObstacle = obstacles.find(o => o.x === nextHead.x && o.y === nextHead.y);
    if (hitObstacle) {
        if (isGhost) {
            // pass through
        } else if (activePowers.hasShield) {
            triggerShieldBreakEffect(nextHead.x, nextHead.y);
            obstacles = obstacles.filter(o => o !== hitObstacle);
        } else {
            endGame();
            return;
        }
    }

    // Self collision
    let hitSelf = false;
    for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === nextHead.x && snake[i].y === nextHead.y) {
            hitSelf = true;
            break;
        }
    }

    if (hitSelf) {
        if (activePowers.hasShield) {
            triggerShieldBreakEffect(nextHead.x, nextHead.y);
            if (snake.length > 4) snake.pop();
        } else {
            endGame();
            return;
        }
    }

    snake.unshift(nextHead);

    if ((activePowers.speedUntil > now || (activeEvent && activeEvent.type.id === "SPEED_STORM")) && Math.random() > 0.4) {
        particles.push({
            x: snake[1].x * TILE_SIZE + 4 + Math.random() * (TILE_SIZE - 8),
            y: snake[1].y * TILE_SIZE + 4 + Math.random() * (TILE_SIZE - 8),
            vx: -dir.x * 1.5,
            vy: -dir.y * 1.5,
            size: 3,
            life: 0.6,
            decay: 0.1,
            color: "rgba(44, 51, 37, 0.5)"
        });
    }

    // Check Food
    let ateFood = false;
    if (nextHead.x === food.x && nextHead.y === food.y) {
        ateFood = true;
        const isDouble = activePowers.doubleUntil > now;
        const comboMult = Math.max(1, comboCount + 1);
        const basePts = (isDouble ? 20 : 10) * comboMult;

        score += basePts;
        scoreElement.textContent = score;
        stats.foodEaten++;
        stats.longestSnake = Math.max(stats.longestSnake, snake.length);
        saveStats();

        triggerAchievement("first_bite");
        if (snake.length >= 15) triggerAchievement("growing_up");
        if (score >= 1000) triggerAchievement("snake_god");

        checkMission("EAT", 1);
        checkMission("SCORE", score);
        registerFoodCombo();
        createParticleBurst(food.x * TILE_SIZE + TILE_SIZE / 2, food.y * TILE_SIZE + TILE_SIZE / 2, 10, "#2c3325");

        if (score > stats.highScore) {
            if (!isNewHighScore && stats.highScore > 0) {
                Sound.highScore();
                addFloatingText("★ NEW HIGH SCORE! ★", 12, 6);
            }
            stats.highScore = score;
            highScoreElement.textContent = stats.highScore;
            isNewHighScore = true;
            saveStats();
        }

        if (selectedMode.id === "ARCADE" && score % 70 === 0 && obstacles.length < 8) {
            const t = findUnoccupiedTile();
            if (t) obstacles.push(t);
        }

        if (!bossEncounterTriggered && (score >= 250 || selectedMode.id === "CHAOS")) {
            spawnBossSnake();
        }

        checkSpawnGoldenFood();
        if (!currentPowerUp && now > nextPowerSpawnTime) spawnPowerUp();

        spawnFood();
    }

    // Check Golden Food
    if (goldenFood && nextHead.x === goldenFood.x && nextHead.y === goldenFood.y) {
        ateFood = true;
        const isDouble = activePowers.doubleUntil > now;
        const goldenPts = (isDouble ? 100 : 50);
        score += goldenPts;
        scoreElement.textContent = score;
        stats.goldenEaten++;
        saveStats();

        Sound.golden();
        createParticleBurst(goldenFood.x * TILE_SIZE + TILE_SIZE / 2, goldenFood.y * TILE_SIZE + TILE_SIZE / 2, 25, "#2c3325");
        addFloatingText(isDouble ? "+100 👑!" : "+50 👑!", goldenFood.x, goldenFood.y);

        if (stats.goldenEaten >= 3) triggerAchievement("golden_hunter");
        goldenFood = null;
    }

    // Check Extra Foods
    for (let i = extraFoods.length - 1; i >= 0; i--) {
        const ef = extraFoods[i];
        if (nextHead.x === ef.x && nextHead.y === ef.y) {
            ateFood = true;
            score += 15;
            scoreElement.textContent = score;
            Sound.eat();
            createParticleBurst(ef.x * TILE_SIZE + TILE_SIZE / 2, ef.y * TILE_SIZE + TILE_SIZE / 2, 10, "#2c3325");
            addFloatingText("+15 RAIN!", ef.x, ef.y);
            extraFoods.splice(i, 1);
        }
    }

    if (!ateFood) snake.pop();

    // Check Power-Up
    if (currentPowerUp && nextHead.x === currentPowerUp.x && nextHead.y === currentPowerUp.y) {
        activatePower(currentPowerUp.type);
    }
}

// =========================
// DIFFICULTY
// =========================
function getBaseSpeedInterval() {
    if (selectedMode.id === "CHAOS") return 80;
    if (score <= 50) return 115;
    if (score <= 100) return 95;
    if (score <= 200) return 80;
    return 68;
}

function getCurrentSpeedInterval() {
    let interval = getBaseSpeedInterval();
    const now = performance.now();
    if (activePowers.speedUntil > now || (activeEvent && activeEvent.type.id === "SPEED_STORM" && activeEvent.expiresAt > now)) {
        interval = Math.floor(interval * 0.52);
    }
    return Math.max(interval, 38);
}

// =========================
// PAUSE
// =========================
function togglePause() {
    if (gameState === STATE_PLAYING) {
        gameState = STATE_PAUSED;
        pauseSoftBtn.textContent = "▶ RESUME";
        Sound.click();
    } else if (gameState === STATE_PAUSED) {
        gameState = STATE_PLAYING;
        lastTickTime = performance.now();
        pauseSoftBtn.textContent = "❚❚ PAUSE";
        Sound.click();
    }
}

// =========================
// KEYBOARD CONTROLS
// =========================
document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    const code = event.keyCode;

    if (key === ' ' || code === 32 || key === 'enter') {
        event.preventDefault();
        if (gameState === STATE_INTRO || gameState === STATE_GAME_OVER) {
            resetGame();
            return;
        } else if (gameState === STATE_MODE_SELECT) {
            selectedMode = MODES[MODE_KEYS[currentModeIndex]];
            resetGame();
            return;
        } else if (gameState === STATE_SKINS) {
            const skin = SKINS[skinSelectIndex];
            if (isSkinUnlocked(skin.id)) {
                currentSkinId = skin.id;
                localStorage.setItem("nokia_snake_skin", currentSkinId);
                Sound.click();
            }
            return;
        } else if (gameState === STATE_STATS) {
            gameState = STATE_ACHIEVEMENTS;
            Sound.click();
            return;
        }
    }

    if (key === 'escape' || key === 'backspace') {
        event.preventDefault();
        if (gameState === STATE_MODE_SELECT || gameState === STATE_SKINS || gameState === STATE_STATS) {
            gameState = STATE_INTRO;
            Sound.click();
            return;
        } else if (gameState === STATE_ACHIEVEMENTS) {
            gameState = STATE_STATS;
            Sound.click();
            return;
        } else if (gameState === STATE_PLAYING || gameState === STATE_PAUSED) {
            togglePause();
            return;
        }
    }

    if (key === 'p') {
        event.preventDefault();
        togglePause();
        return;
    }

    if (key === 'm') {
        event.preventDefault();
        if (gameState === STATE_INTRO || gameState === STATE_GAME_OVER) {
            gameState = STATE_MODE_SELECT;
            Sound.click();
            return;
        }
    }

    if (key === 's' && gameState !== STATE_PLAYING) {
        event.preventDefault();
        gameState = STATE_SKINS;
        Sound.click();
        return;
    }

    if (gameState === STATE_MODE_SELECT) {
        if (key === 'arrowup' || key === 'w') {
            currentModeIndex = (currentModeIndex - 1 + MODE_KEYS.length) % MODE_KEYS.length;
            Sound.click();
        } else if (key === 'arrowdown' || key === 's') {
            currentModeIndex = (currentModeIndex + 1) % MODE_KEYS.length;
            Sound.click();
        }
        return;
    }

    if (gameState === STATE_SKINS) {
        if (key === 'arrowleft' || key === 'a') {
            skinSelectIndex = (skinSelectIndex - 1 + SKINS.length) % SKINS.length;
            Sound.click();
        } else if (key === 'arrowright' || key === 'd') {
            skinSelectIndex = (skinSelectIndex + 1) % SKINS.length;
            Sound.click();
        }
        return;
    }

    if (gameState === STATE_INTRO || gameState === STATE_GAME_OVER) {
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 'd'].includes(key)) {
            resetGame();
            return;
        }
    }

    if (key === 'arrowleft' || key === 'a') { event.preventDefault(); goLeft(); }
    if (key === 'arrowup' || key === 'w') { event.preventDefault(); goUp(); }
    if (key === 'arrowright' || key === 'd') { event.preventDefault(); goRight(); }
    if (key === 'arrowdown' || key === 's') { event.preventDefault(); goDown(); }
});

// Soft buttons
modeSoftBtn.addEventListener("click", () => {
    Sound.click();
    gameState = gameState === STATE_MODE_SELECT ? STATE_INTRO : STATE_MODE_SELECT;
});

skinSoftBtn.addEventListener("click", () => {
    Sound.click();
    gameState = gameState === STATE_SKINS ? STATE_INTRO : STATE_SKINS;
});

statsSoftBtn.addEventListener("click", () => {
    Sound.click();
    if (gameState === STATE_STATS) gameState = STATE_ACHIEVEMENTS;
    else if (gameState === STATE_ACHIEVEMENTS) gameState = STATE_INTRO;
    else gameState = STATE_STATS;
});

pauseSoftBtn.addEventListener("click", () => togglePause());

// =========================
// MOBILE CONTROLS & GESTURES
// =========================
function attachButtonListener(id, action) {
    const btn = document.getElementById(id);
    if (!btn) return;

    const trigger = (e) => {
        e.preventDefault();
        btn.classList.add("pressed");

        if (gameState === STATE_INTRO || gameState === STATE_GAME_OVER) {
            resetGame();
        } else if (gameState === STATE_MODE_SELECT) {
            if (id === "upBtn") currentModeIndex = (currentModeIndex - 1 + MODE_KEYS.length) % MODE_KEYS.length;
            else if (id === "downBtn") currentModeIndex = (currentModeIndex + 1) % MODE_KEYS.length;
            else if (id === "actionBtn") {
                selectedMode = MODES[MODE_KEYS[currentModeIndex]];
                resetGame();
            }
            Sound.click();
        } else if (gameState === STATE_SKINS) {
            if (id === "leftBtn") skinSelectIndex = (skinSelectIndex - 1 + SKINS.length) % SKINS.length;
            else if (id === "rightBtn") skinSelectIndex = (skinSelectIndex + 1) % SKINS.length;
            else if (id === "actionBtn") {
                const skin = SKINS[skinSelectIndex];
                if (isSkinUnlocked(skin.id)) {
                    currentSkinId = skin.id;
                    localStorage.setItem("nokia_snake_skin", currentSkinId);
                }
            }
            Sound.click();
        } else if (gameState === STATE_STATS) {
            if (id === "actionBtn") gameState = STATE_ACHIEVEMENTS;
            else gameState = STATE_INTRO;
            Sound.click();
        } else if (gameState === STATE_ACHIEVEMENTS) {
            gameState = STATE_STATS;
            Sound.click();
        } else if (gameState === STATE_PAUSED) {
            togglePause();
        } else {
            action();
        }
    };

    const release = () => btn.classList.remove("pressed");

    btn.addEventListener("touchstart", trigger, { passive: false });
    btn.addEventListener("touchend", release);
    btn.addEventListener("mousedown", trigger);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
}

attachButtonListener("upBtn", goUp);
attachButtonListener("leftBtn", goLeft);
attachButtonListener("rightBtn", goRight);
attachButtonListener("downBtn", goDown);
attachButtonListener("actionBtn", () => {
    if (gameState === STATE_PLAYING) togglePause();
    else if (gameState === STATE_INTRO || gameState === STATE_GAME_OVER) resetGame();
    else if (gameState === STATE_MODE_SELECT) {
        selectedMode = MODES[MODE_KEYS[currentModeIndex]];
        resetGame();
    } else if (gameState === STATE_SKINS) {
        const skin = SKINS[skinSelectIndex];
        if (isSkinUnlocked(skin.id)) {
            currentSkinId = skin.id;
            localStorage.setItem("nokia_snake_skin", currentSkinId);
        }
        Sound.click();
    } else if (gameState === STATE_STATS) {
        gameState = STATE_ACHIEVEMENTS;
        Sound.click();
    } else if (gameState === STATE_ACHIEVEMENTS) {
        gameState = STATE_INTRO;
        Sound.click();
    }
});

canvas.addEventListener("click", () => {
    if (gameState === STATE_INTRO || gameState === STATE_GAME_OVER) {
        resetGame();
    } else if (gameState === STATE_MODE_SELECT) {
        selectedMode = MODES[MODE_KEYS[currentModeIndex]];
        resetGame();
    } else if (gameState === STATE_SKINS) {
        const skin = SKINS[skinSelectIndex];
        if (isSkinUnlocked(skin.id)) {
            currentSkinId = skin.id;
            localStorage.setItem("nokia_snake_skin", currentSkinId);
        }
        Sound.click();
    } else if (gameState === STATE_STATS) {
        gameState = STATE_ACHIEVEMENTS;
        Sound.click();
    } else if (gameState === STATE_ACHIEVEMENTS) {
        gameState = STATE_INTRO;
        Sound.click();
    } else {
        togglePause();
    }
});

// Touch Swipe Handling
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = performance.now();
    }
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const distance = Math.hypot(dx, dy);
        const timeDiff = performance.now() - touchStartTime;

        if (distance > 24 && timeDiff < 500) {
            if (gameState === STATE_INTRO || gameState === STATE_GAME_OVER) {
                resetGame();
                return;
            }
            if (gameState === STATE_PAUSED) {
                togglePause();
                return;
            }
            if (gameState === STATE_MODE_SELECT) {
                if (dy < 0) currentModeIndex = (currentModeIndex - 1 + MODE_KEYS.length) % MODE_KEYS.length;
                else if (dy > 0) currentModeIndex = (currentModeIndex + 1) % MODE_KEYS.length;
                Sound.click();
                return;
            }
            if (gameState === STATE_SKINS) {
                if (dx < 0) skinSelectIndex = (skinSelectIndex + 1) % SKINS.length;
                else if (dx > 0) skinSelectIndex = (skinSelectIndex - 1 + SKINS.length) % SKINS.length;
                Sound.click();
                return;
            }

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) goRight();
                else goLeft();
            } else {
                if (dy > 0) goDown();
                else goUp();
            }
        }
    }
}, { passive: true });

// =========================
// GAME OVER
// =========================
function endGame() {
    gameState = STATE_GAME_OVER;
    Sound.die();
    screenGlass.classList.remove("blackout-active");
    createParticleBurst(snake[0].x * TILE_SIZE + TILE_SIZE / 2, snake[0].y * TILE_SIZE + TILE_SIZE / 2, 30, "#2c3325");

    const timeElapsed = Math.floor((performance.now() - gameStartTime) / 1000);
    stats.timePlayed += timeElapsed;
    saveStats();

    if (selectedMode.id === "SURVIVAL" && timeElapsed >= 60) {
        triggerAchievement("survivor");
    }
    checkMission("TIME", timeElapsed);
}
