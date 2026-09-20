# 🐭 Mushak Ki Daud: Vighnaharta Rising 🕉️

> **A fast-paced, mythological 3D endless lane runner celebrating Ganesh Chaturthi.**  
> Guide Mushak, Lord Ganesha’s noble vahana, on a sacred journey across mystical realms to collect sacred offerings, evade obstacles, ride mine trolleys, and summon the divine grace of Vighnaharta!

---

## 🎮 Game Overview & Lore

In **Mushak Ki Daud: Vighnaharta Rising**, players step into the paws of **Mushak**—Lord Ganesha's loyal mouse mount. Your mission is to dash through treacherous terrains, gathering sacred **Modaks** and **Ladoos** to charge your divine **Devotion Meter**. Along the way, mischievous demons and environmental perils attempt to hinder your quest. Reach the sacred destination to trigger a divine darshan where Lord Ganapathi materializes in radiant golden light to banish all demons into sparkling dust!

---

## ✨ Key Features

### 🏔️ Dynamic Biomes
- **Himalayan Pass**: Snowy peaks, icy tracks, falling rocks, and ice block obstacles.
- **Enchanted Jungle**: Dense foliage, overhead barricades, and spiked obstacles with escalating speed.

### 🕹️ Dynamic Gameplay Mechanics
- **3-Lane Running & Transitions**: Smooth lateral lane changes, responsive jumping, and crouch-sliding.
- **Forking Paths & Lane Splits**: Dynamic bifurcations at key distances (400m+), offering risk-vs-reward route choices.
- **Mine Trolley & Rail Ride**: At 700m, jump into an authentic wooden mine trolley on procedural tracks for high-speed rail action.
- **Cinematic Boss & Divine Encounter**: At 1000m, witness the cinematic transition where Lord Ganapathi appears, filling the screen with golden radiance and dispelling all demonic forces.

### 👹 Playful Demon Adversaries
- **Impling**: Sneaky green imp that hurls boulders across lanes.
- **Bumbler**: Clumsy purple demon causing chaos and sudden obstacles.
- **Prankster**: Quick-witted trickster spewing fire bursts into center lanes.

### 🍬 Collectibles & Divine Devotion
- **Modak**: Sacred sweet granting +10 points and filling the Devotion Meter.
- **Ladoo**: Golden delicacy granting +15 to +20 points.
- **Devotion Meter**: Collect sweets to unleash divine protection and score multipliers.
- **Lives & Persistence**: 3 lives per run with local storage high score tracking and session stats.

### ⚡ 3D Graphics & Engine Optimization
- **WebGL via Three.js (r165)**: Custom lighting, fog, bloom, and shadow mapping.
- **Draco Compression**: High-fidelity 3D assets compressed with Google Draco for instant loading and 60+ FPS smooth rendering.
- **Object Pooling**: Memory-efficient spawner recycling for obstacles, collectibles, and terrain chunks.
- **GSAP Animations**: Fluid camera choreography and UI transitions.

---

## 🕹️ Controls

| Action | Keyboard Controls | Touch / Mobile Gestures |
| :--- | :--- | :--- |
| **Move Left** | <kbd>←</kbd> or <kbd>A</kbd> | Swipe Left |
| **Move Right** | <kbd>→</kbd> or <kbd>D</kbd> | Swipe Right |
| **Jump** | <kbd>↑</kbd> or <kbd>W</kbd> or <kbd>Space</kbd> | Swipe Up |
| **Slide / Crouch** | <kbd>↓</kbd> or <kbd>S</kbd> | Swipe Down |
| **Pause / Resume** | <kbd>Esc</kbd> or <kbd>P</kbd> | Pause Button (HUD) |

---

## 🛠️ Tech Stack

- **Runtime & Bundler**: [Vite 5](https://vitejs.dev/)
- **3D Graphics Engine**: [Three.js (v0.165.0)](https://threejs.org/)
- **Animation Suite**: [GSAP (GreenSock Animation Platform 3.12.5)](https://greensock.com/gsap/)
- **Data Validation**: [Zod (v3.23.8)](https://zod.dev/)
- **Audio Engine**: Custom Web Audio API synthesizer with fallback HTML5 audio channels

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/) and [Git LFS](https://git-lfs.com/) (for handling large 3D assets)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/grharsha777/Mushak-Ki-Daud-Vighnaharta-Rising.git
   cd Mushak-Ki-Daud-Vighnaharta-Rising
   ```

2. **Pull Large Files (Git LFS)**:
   ```bash
   git lfs pull
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser to play the game!

5. **Build for production**:
   ```bash
   npm run build
   npm run preview
   ```

---

## 📂 Project Structure

```
Mushakruner/
├── public/                     # Static assets served directly
│   ├── models/                 # Draco-compressed GLB models (Mushak, tracks, biomes)
│   ├── godzilla_optimized.glb  # Optimized boss/demon asset
│   └── audio/                  # Sound effects & festive background music
├── src/
│   ├── audio/
│   │   └── AudioManager.js     # Web Audio API procedural & audio playback controller
│   ├── biomes/
│   │   ├── himalaya.js         # Snowy mountain environment generator
│   │   ├── jungle.js           # Forest vegetation and barricade setup
│   │   └── HimalayaBackground.js # Background panorama renderer
│   ├── config/
│   │   ├── levelConfig.json    # Speed ramps, spawn tables & difficulty settings
│   │   ├── demonTypes.json     # Demon stats, scales, colors, and attack cooldowns
│   │   └── bossSequence.json   # Timeline sequence for Ganapathi's divine arrival
│   ├── core/
│   │   ├── InputController.js  # Unified keyboard & touch gesture mapper
│   │   ├── ObjectPoolManager.js# High-performance entity recycling
│   │   ├── SaveManager.js      # LocalStorage persistence for high scores
│   │   └── SceneManager.js     # Three.js scene, camera, lights, and renderer setup
│   ├── entities/
│   │   ├── Mushak.js           # Player character model, animations & states
│   │   ├── Demon.js            # Demon AI and projectile behaviors
│   │   ├── Ganapathi.js        # Divine entity with particle aura and blessing effects
│   │   ├── Trolley.js          # Interactive mine trolley entity
│   │   └── RailsTrack.js       # Procedural dual-rail system
│   ├── gameplay/
│   │   ├── LaneController.js   # 3-lane positioning & lane split math
│   │   ├── ObstacleSpawner.js  # Obstacle wave spawning and collision hitboxes
│   │   ├── CollectibleManager.js# Modaks, ladoos and magnet mechanics
│   │   ├── TrainSequenceController.js # Minecart sequence manager
│   │   └── BossSequenceController.js  # 1000m climax sequence controller
│   ├── ui/
│   │   ├── HUD.js              # In-game score, devotion meter, and life hearts
│   │   └── UIManager.js        # Main menu, pause modal, victory & game-over screens
│   ├── schemas/
│   │   └── zodSchemas.js       # Configuration validation schemas
│   └── main.js                 # Central game loop, state machine & orchestrator
├── package.json
├── vite.config.js
└── README.md
```

---

## 🎨 Credits & Acknowledgments

- **Divine Inspiration**: Dedicated to Lord Ganesha, the remover of obstacles (Vighnaharta).
- **3D Assets & Models**: Optimized low-poly and Draco-compressed assets for web performance.
- Built with ❤️ using modern web standards and Three.js.
# Mushak-Ki-Daud-Vighnaharta-Rising
# Mushak-Ki-Daud-Vighnaharta-Rising
