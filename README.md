# Nokia Snake

A modern retro remake of the classic Nokia Snake game built with pure HTML5, CSS3, and Vanilla JavaScript.

Features the authentic Nokia 3310 monochrome LCD aesthetic, a responsive expanded square game board, touch and swipe controls, arcade super powers, combo chains, unlockable skins, and an autonomous AI Giant Boss Snake.

---

## Features

* **Classic Nokia LCD Design**: Authentic two-tone monochrome green palette (`#9ead86` / `#2c3325`), scanline overlay, dot-matrix grid, and beveled Nokia 3310 chassis.
* **Responsive Game Board**: Automatically calculates the largest square game board fitting on desktop (550–640px) or mobile without clipping controls (`100dvh`).
* **4 Game Modes**:
  * **Classic**: Traditional Snake without power-ups or hazards.
  * **Arcade**: Flagship mode with powers, combos, golden food, missions, events, and the Boss Snake.
  * **Survival**: Scattered obstacles and survival clock.
  * **Chaos**: Hyper-speed, dense hazards, rapid item spawns, and frequent events.
* **5 Collectible Super Powers**:
  * ⚡ **Speed Boost**: Accelerates snake for 5 seconds with speed trail particles.
  * 🛡️ **Shield**: Absorbs ONE collision (wall or self) with a screen shake and shockwave.
  * 👻 **Ghost Mode**: Enables wall wrapping and obstacle phasing for 5 seconds.
  * ✦ **Magnet**: Attracts nearby food toward the snake's head for 5 seconds.
  * ×2 **Double Score**: Food awards double points (+20) for 8 seconds.
* **Combo System**: Chained food consumption within 4.5 seconds multiplies score (`x2`, `x3`, `x4`, `x5+`) with an LCD decay meter and escalating pitch audio.
* **Special Golden Food**: Rare sparkling pixel crown awarding **+50 points** before disappearing after 5 seconds.
* **Dangerous Obstacles**: Beveled pixel rocks (`■`) that must be avoided or smashed with a Shield.
* **7 Unlockable Snake Skins**: Classic, Shadow, Golden, Neon, Pixel, Ghost, and Diamond unlocked via achievements.
* **Achievement System**: 9 persistent achievements with real-time in-game banner alerts.
* **Random World Events**: Speed Storm, Blackout, Food Rain, and Ghost Invasion.
* **Final Boss Snake Event**: Autonomous 14-segment AI Giant Snake that must be survived for 20 seconds for a **+500 point** bonus.
* **Career Statistics**: Tracks high score, longest snake, best combo, total food eaten, and playtime in `localStorage`.
* **8-Bit Synthesizer Sound**: Built-in square-wave sound effects via the Web Audio API with a top softkey mute toggle (`🔊 ON` / `🔇 OFF`).
* **Zero External Dependencies**: Pure native web code ready to host on GitHub Pages or run locally offline.

---

## Controls

### Desktop Keyboard

| Key | Action |
| :--- | :--- |
| **Arrow Keys / WASD** | Move Snake (Up, Down, Left, Right) |
| **Space / Enter** | Start Game / Confirm Menu / Retry |
| **P** | Pause / Resume Game |
| **M** | Open Mode Selection Menu |
| **S** | Open Snake Skins Gallery |
| **Escape / Backspace** | Back to Title / Resume Game |

### Mobile Touch & Gestures

* **On-Screen D-Pad**: Tactile raised buttons (▲, ◀, OK, ▶, ▼) with active press states.
* **Swipe Gestures**: Swipe directly on the game board in any direction to turn.
* **Softkeys**: Tap `🌌 MODE`, `🐍 SKINS`, `🏆 STATS`, `❚❚ PAUSE`, or `🔊 SOUND`.
* **Tap Screen**: Start game, resume from pause, or retry after game over.

---

## How to Play

1. Eat the pixel food (🍎) to grow longer and increase your score.
2. Build combos by eating food in rapid succession before the combo decay meter runs out.
3. Collect super powers (⚡, 🛡️, 👻, ✦, ×2) when they appear on the board.
4. Grab rare Golden Food (👑) quickly for a massive +50 bonus.
5. Avoid running into walls, obstacles, your own tail, or the Giant Boss Snake.
6. Check the top HUD for active missions and complete them for extra points!

---

## Run Locally

No installations, servers, or build tools are required.

1. Download or clone this repository to your computer:
   ```bash
   git clone https://github.com/your-username/nokia-snake.git
   ```
2. Navigate to the `nokia-snake` folder:
   ```bash
   cd nokia-snake
   ```
3. Double-click `index.html` to open and play directly in any web browser (Chrome, Firefox, Safari, Edge).

---

## Deploy to GitHub Pages

Deploying your game online takes less than a minute:

1. **Create a GitHub Repository**:
   * Go to [GitHub](https://github.com) and click **New Repository**.
   * Name your repository `Nokia-Snake-Game` (or any name you prefer) and set it to **Public**.
2. **Push or Upload the Files**:
   * Upload the 4 files directly from the `nokia-snake/` folder into your repository root:
     - `index.html`
     - `style.css`
     - `game.js`
     - `README.md`
   * Or via Git:
     ```bash
     git init
     git add .
     git commit -m "Deploy Nokia Snake"
     git branch -M main
     git remote add origin https://github.com/your-username/Nokia-Snake-Game.git
     git push -u origin main
     ```
3. **Enable GitHub Pages**:
   * In your GitHub repository, go to **Settings > Pages**.
   * Under **Branch**, select `main` (or `master`) and root `/`.
   * Click **Save**.
4. **Play Online**:
   * Your game is immediately live at:
     `https://your-username.github.io/Nokia-Snake-Game/`

---

## Project Structure

```text
nokia-snake/
├── index.html          # Main HTML entry point
├── style.css           # Complete Nokia 3310 LCD styling & media queries
├── game.js             # Modular game engine & state management
└── README.md           # Documentation & instructions
```

---

## License

MIT License. Free to use, modify, and distribute.
