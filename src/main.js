/**
 * main.js — MushakGame orchestrator (clean rewrite)
 * ════════════════════════════════════════════════════════════════
 * One file, one game class, one state machine.
 * Every system is wired through callbacks — no circular imports.
 * ════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

// Core
import { SceneManager }      from './core/SceneManager.js';
import { InputController }   from './core/InputController.js';
import { ObjectPoolManager } from './core/ObjectPoolManager.js';
import { SaveManager }       from './core/SaveManager.js';
import { AudioManager }      from './audio/AudioManager.js';

// Gameplay
import { LaneController }          from './gameplay/LaneController.js';
import { ObstacleSpawner }         from './gameplay/ObstacleSpawner.js';
import { CollectibleManager }      from './gameplay/CollectibleManager.js';
import { TrainSequenceController } from './gameplay/TrainSequenceController.js';
import { BossSequenceController }  from './gameplay/BossSequenceController.js';

// Entities
import { Mushak }     from './entities/Mushak.js';
import { Demon  }     from './entities/Demon.js';
import { Trolley }    from './entities/Trolley.js';
import { RailsTrack } from './entities/RailsTrack.js';

// Biomes
import { HimalayaBiome, HIMALAYA_CFG } from './biomes/himalaya.js';
import { JungleBiome,   JUNGLE_CFG   } from './biomes/jungle.js';

// UI
import { UIManager } from './ui/UIManager.js';
import { HUD }       from './ui/HUD.js';

// Config
import levelConfigRaw from './config/levelConfig.json';

// ── Game States ────────────────────────────────────────────────────────────
export const GS = {
  LOADING:    'LOADING',
  MENU:       'MENU',
  PLAYING:    'PLAYING',
  PAUSED:     'PAUSED',
  LANE_SPLIT: 'LANE_SPLIT',
  TRAIN_RIDE: 'TRAIN_RIDE',
  BOSS_SEQ:   'BOSS_SEQ',
  VICTORY:    'VICTORY',
  GAME_OVER:  'GAME_OVER',
};

// ── Difficulty modifiers ────────────────────────────────────────────────────
const DIFF_MODS = {
  easy:   { speedBase: 8,  speedInc: 0.01, spawnMult: 1.6 },
  normal: { speedBase: 11, speedInc: 0.018, spawnMult: 1.0 },
  hard:   { speedBase: 14, speedInc: 0.028, spawnMult: 0.7 },
};

// ── Fresh session ───────────────────────────────────────────────────────────
function newSession() {
  return {
    score: 0, distance: 0, modaks: 0, ladoos: 0,
    lives: 3, devotion: 0, gameSpeed: 10, currentBiome: 'himalaya',
  };
}

// ── Main Game Class ─────────────────────────────────────────────────────────
class MushakGame {
  constructor() {
    this.state      = GS.LOADING;
    this.clock      = new THREE.Clock(false);
    this.difficulty = 'easy';
    this.session    = newSession();

    // Systems
    this.save    = new SaveManager();
    this.audio   = new AudioManager();
    this.sceneMgr = new SceneManager();
    this.input   = new InputController();
    this.pool    = new ObjectPoolManager(this.sceneMgr.scene);

    // Biome instances (persist across sessions)
    this.biomes = {
      himalaya: new HimalayaBiome(this.sceneMgr.scene),
      jungle:   new JungleBiome(this.sceneMgr.scene),
    };

    // Gameplay entities (null until startGame)
    this.mushak       = null;
    this.lanes        = null;
    this.obstacles    = null;
    this.collectibles = null;
    this.trainSeq     = null;
    this.bossSeq      = null;
    this.demons       = [];
    this.activeBiome  = null;

    // Flags
    this._trainDone  = false;
    this._bossDone   = false;
    this._prevState  = null;

    // UI (created last so it can reference `this`)
    this.ui  = new UIManager(this);
    this.hud = new HUD();

    this._rafLoop = this._loop.bind(this);
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  async init() {
    // Show loading screen immediately
    this.ui.showScreen('loading');

    // Apply menu atmosphere to 3D scene
    this.sceneMgr.setBiome('himalaya', HIMALAYA_CFG);
    this.sceneMgr.applyBiomeLighting(HIMALAYA_CFG, true);

    // Fake load progress
    await this._fakeLoad();

    // Start the RAF loop
    this.clock.start();
    requestAnimationFrame(this._rafLoop);

    // Show menu
    this.ui.showScreen('menu');
    this.state = GS.MENU;
  }

  _fakeLoad() {
    const bar = document.getElementById('load-bar');
    if (!bar) return Promise.resolve();
    return new Promise(resolve => {
      let p = 0;
      const tick = setInterval(() => {
        p = Math.min(100, p + Math.random() * 22 + 6);
        bar.style.width = p + '%';
        if (p >= 100) { clearInterval(tick); setTimeout(resolve, 300); }
      }, 80);
    });
  }

  // ── Game start ──────────────────────────────────────────────────────────────
  startGame(difficulty = 'easy') {
    this.difficulty = difficulty;
    this.session    = newSession();
    const mod       = DIFF_MODS[difficulty] ?? DIFF_MODS.normal;
    this.session.gameSpeed = mod.speedBase;
    this._diffMod   = mod;
    this._trainDone = false;
    this._bossDone  = false;

    this._buildGameplay();

    // Camera
    this.sceneMgr.resetCamera();

    // HUD
    this.hud.update(this.session);
    this.hud.updateLives(this.session.lives);
    this.hud.setBiome('himalaya');
    this.hud.show();

    // Show HUD (transparent overlay) + let screen-hud be the active one
    this.ui.showScreen('hud');

    // Audio
    this.audio.startMusic();

    this.state = GS.PLAYING;
    this.clock.getDelta(); // flush
  }

  _buildGameplay() {
    this._teardown();

    this.mushak       = new Mushak(this.sceneMgr.scene);
    this.trolley      = new Trolley(this.sceneMgr.scene);
    this.railsTrack   = new RailsTrack(this.sceneMgr.scene);

    this.lanes        = new LaneController(this.mushak, this.input, this.audio);
    this.lanes.setTrolley(this.trolley);

    this.obstacles    = new ObstacleSpawner(this.sceneMgr.scene, this.pool);
    this.collectibles = new CollectibleManager(this.sceneMgr.scene, this.pool);

    this.demons = [
      new Demon(this.sceneMgr.scene, 0),
    ];

    this.trainSeq = new TrainSequenceController(this.sceneMgr.scene, this.mushak, this.sceneMgr);
    this.bossSeq  = new BossSequenceController(
      this.sceneMgr.scene, this.mushak, this.demons, this.sceneMgr, this.audio
    );

    this._switchBiome('himalaya', true);
  }

  _teardown() {
    this.mushak?.dispose();
    this.trolley?.dispose();
    this.railsTrack?.dispose();
    this.obstacles?.clear();
    this.collectibles?.clear();
    this.trainSeq?.dispose();
    this.bossSeq?.dispose();
    this.demons.forEach(d => d.dispose());
    this.demons = [];
    this.pool.clearAll?.();
    this.sceneMgr.clearBiomeProps();
    this.activeBiome?.deactivate?.();
    this.activeBiome = null;
    this.mushak = this.trolley = this.railsTrack = this.lanes = this.obstacles
      = this.collectibles = this.trainSeq = this.bossSeq = null;
  }

  // ── Biome switching ─────────────────────────────────────────────────────────
  _switchBiome(name, instant = false) {
    this.activeBiome?.deactivate?.();
    this.sceneMgr.clearBiomeProps();

    const biome  = this.biomes[name];
    const cfgMap = { himalaya: HIMALAYA_CFG, jungle: JUNGLE_CFG };
    const cfg    = cfgMap[name];

    this.sceneMgr.applyBiomeLighting(cfg, instant);
    biome.activate(mesh => this.sceneMgr.addBiomeProp(mesh));
    this.activeBiome = biome;

    this.session.currentBiome = name;
    this.hud.setBiome(name);
    this.audio.transitionMusic(name);
    this.save.markBiomeReached?.(name);
  }

  // ── Pause / Resume / Quit ──────────────────────────────────────────────────
  pause() {
    if (this.state !== GS.PLAYING && this.state !== GS.LANE_SPLIT) return;
    this._prevState = this.state;
    this.state = GS.PAUSED;
    this.audio.pauseMusic();
    this.ui.showScreen('pause');
    this.clock.getDelta();
  }

  resume() {
    if (this.state !== GS.PAUSED) return;
    this.state = this._prevState ?? GS.PLAYING;
    this.audio.resumeMusic();
    this.ui.showScreen('hud');
    this.clock.getDelta();
  }

  restart() {
    this.startGame(this.difficulty);
  }

  quitToMenu() {
    this._teardown();
    this.audio.stopMusic();
    this.state = GS.MENU;
    this.sceneMgr.resetToMenuView();
    this.sceneMgr.applyBiomeLighting(HIMALAYA_CFG, false);
    this.ui.showScreen('menu');
  }

  // ── Events: hit + collect ──────────────────────────────────────────────────
  _onHit() {
    if (this.mushak?.isInvincible) return;
    this.session.lives = Math.max(0, this.session.lives - 1);
    this.hud.updateLives(this.session.lives);
    this.audio.playSFX('hit');
    this.sceneMgr.screenShake(0.4);

    if (this.session.lives <= 0) {
      this._endGame(false);
    } else {
      this.mushak?.triggerHitEffect();
    }
  }

  _onCollect(type, value) {
    this.session.score    += value;
    this.session.devotion  = Math.min(100, this.session.devotion + value * 0.4);
    if (type === 'modak') this.session.modaks++;
    if (type === 'ladoo') this.session.ladoos++;

    this.hud.update(this.session);
    this.hud.showScorePopup(value);
    this.audio.playSFX('collect');

    if (this.session.devotion >= 100) this.hud.devotionFull();
  }

  // ── Game End ────────────────────────────────────────────────────────────────
  _endGame(victory) {
    if (this.state === GS.VICTORY || this.state === GS.GAME_OVER) return;
    this.state = victory ? GS.VICTORY : GS.GAME_OVER;

    this.audio.stopMusic();
    this.audio.playSFX(victory ? 'victory' : 'gameover');

    const saves = this.save.load();
    const prev  = saves.highScore ?? 0;
    const isNew = this.session.score > prev;
    if (isNew) this.save.setHighScore(this.session.score);
    this.save.addModaks?.(this.session.modaks);

    setTimeout(() => {
      if (victory) {
        this.ui.showVictory(this.session, prev, isNew);
      } else {
        this.ui.showGameOver(this.session, prev, isNew);
      }
    }, victory ? 600 : 900);
  }

  triggerVictory() { this._endGame(true); }

  // ── Game Loop ───────────────────────────────────────────────────────────────
  _loop() {
    requestAnimationFrame(this._rafLoop);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.input.update();
    this.sceneMgr.update(delta);

    switch (this.state) {
      case GS.PLAYING:
      case GS.LANE_SPLIT:
        this._tickPlaying(delta);
        break;
      case GS.TRAIN_RIDE:
        this._tickTrain(delta);
        break;
      case GS.BOSS_SEQ:
        this._tickBoss(delta);
        break;
      default:
        // MENU, PAUSED, etc. — still render the 3D background
        break;
    }

    this.sceneMgr.render();
  }

  // ── Playing tick ────────────────────────────────────────────────────────────
  _tickPlaying(delta) {
    const s = this.session;

    // Advance distance & speed
    s.distance  += s.gameSpeed * delta;
    s.gameSpeed += (this._diffMod?.speedInc ?? 0.015) * delta;

    // Biome transitions
    this._checkBiomeTransition(s.distance);

    // Scroll world
    const scroll = s.gameSpeed * delta;
    this.sceneMgr.scrollTrack(scroll);
    this.activeBiome?.update(delta, scroll);

    // Mushak
    this.mushak?.update(delta);

    // Trolley & Rails
    if (this.trolley?.active && this.mushak) {
      this.trolley.update(delta, this.mushak.mesh.position.x, s.gameSpeed);
    }
    if (this.railsTrack?.active) {
      this.railsTrack.update(delta, scroll);
    }

    // Lane / jump / slide input
    this.lanes?.update(delta, this.state);

    // Pause shortcut
    if (this.input.consume('pause')) { this.pause(); return; }

    // Obstacles
    if (this.obstacles && this.mushak) {
      // Reduce obstacle density heavily during the rails sequence
      const mod = { ...(this._diffMod ?? {}) };
      if (this.state === GS.LANE_SPLIT) {
        mod.spawnIntervalMult = (mod.spawnIntervalMult || 1) * 3.5; // Far fewer traps!
      }
      this.obstacles.update(
        delta, s, mod,
        s.currentBiome, levelConfigRaw,
        this.mushak.getBounds(),
        () => this._onHit()
      );
    }

    // Collectibles
    if (this.collectibles && this.mushak) {
      this.collectibles.update(
        delta, s, levelConfigRaw,
        s.currentBiome,
        this.mushak.mesh.position,
        (type, val) => this._onCollect(type, val)
      );
    }

    // Demons
    this.demons.forEach(d => d.update(delta, s.gameSpeed));

    // Camera
    this.sceneMgr.updateCamera(this.mushak?.mesh.position.x ?? 0, delta);

    // HUD
    this.hud.update(s);

    // Special triggers
    this._checkTriggers(s);
  }

  // ── Train tick ──────────────────────────────────────────────────────────────
  _tickTrain(delta) {
    const s = this.session;
    s.distance  += s.gameSpeed * delta;
    const scroll = s.gameSpeed * delta;
    this.sceneMgr.scrollTrack(scroll);
    this.activeBiome?.update(delta, scroll);
    this.mushak?.update(delta);
    this.sceneMgr.updateCamera(this.mushak?.mesh.position.x ?? 0, delta);
    this.hud.update(s);
    this.trainSeq?.update(delta, s);
  }

  // ── Boss tick ───────────────────────────────────────────────────────────────
  _tickBoss(delta) {
    this.session.gameSpeed = Math.max(0, this.session.gameSpeed - 14 * delta);
    if (this.session.gameSpeed > 0) {
      const scroll = this.session.gameSpeed * delta;
      this.sceneMgr.scrollTrack(scroll);
      this.activeBiome?.update(delta, scroll);
    }
    this.mushak?.update(delta);
    this.bossSeq?.update(delta);
  }

  // ── Biome transition check ──────────────────────────────────────────────────
  _checkBiomeTransition(distance) {
    const s = this.session;
    let target = 'himalaya';
    if (distance >= 700)  target = 'jungle';
    if (target !== s.currentBiome) this._switchBiome(target, false);
  }

  // ── Special triggers ────────────────────────────────────────────────────────
  _checkTriggers(s) {
    // Lane split / Temple Trolley Rails Level
    const splitStart = levelConfigRaw.laneSplitDistance    ?? 800;
    const splitEnd   = splitStart + (levelConfigRaw.laneSplitDuration ?? 140);

    // Show rails 80 units BEFORE the split so player sees them coming
    const railsPreview = splitStart - 80;
    if (s.distance >= railsPreview && !this._railsShown) {
      this._railsShown = true;
      this.railsTrack?.activate();  // rails visible early
    }

    if (s.distance >= splitStart && s.distance < splitEnd && this.state === GS.PLAYING) {
      this.state = GS.LANE_SPLIT;
      this.lanes?.startLaneSplit();
      this.ui.showLaneSplitWarning();
    } else if (s.distance >= splitEnd && this.state === GS.LANE_SPLIT) {
      this.state = GS.PLAYING;
      this.lanes?.endLaneSplit();
      // Deactivate rails 40 units after section ends
      setTimeout(() => {
        this.railsTrack?.deactivate();
        this._railsShown = false;
      }, 2000);
    }

    // Train sequence has been removed to reduce confusion and streamline the flow directly into the Jungle / Boss sequence.

    // Boss
    const bossDist = levelConfigRaw.bossTriggerDistance ?? 2000;
    if (s.distance >= bossDist && !this._bossDone
      && (this.state === GS.PLAYING || this.state === GS.LANE_SPLIT)) {
      this._bossDone = true;
      this.state     = GS.BOSS_SEQ;
      this.obstacles?.clear();
      this.collectibles?.clear();
      this.ui.showScreen('boss');
      this.bossSeq?.start(() => this.triggerVictory());
    }
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const game = new MushakGame();
window.game = game;
game.init();
export { game };
