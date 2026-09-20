/**
 * LaneController.js
 * Manages Mushak's lane position, input routing for movement,
 * jump, slide, and the Royal Temple Trolley Rails mechanics.
 */

const LANE_COUNT = 3;

export class LaneController {
  /**
   * @param {Mushak}          mushak
   * @param {InputController} input
   * @param {AudioManager}    audio
   */
  constructor(mushak, input, audio) {
    this.mushak       = mushak;
    this.input        = input;
    this.audio        = audio;
    this.trolley      = null;

    this.currentLane  = 1; // Start in center lane
    this.isSwitching  = false;

    // Lane split / Rails level state
    this.laneSplitActive = false;
    this.splitPath       = null;
    this.splitCommitted  = false;
  }

  setTrolley(trolley) {
    this.trolley = trolley;
  }

  /**
   * Process input and update Mushak's lane/jump/slide each frame.
   * @param {number} delta
   * @param {string} gameState  Current GameState constant
   */
  update(delta, gameState) {
    // ── Sideways Lane Switch & Rail Crossing ─────────────────────
    if (this.input.consume('moveLeft') && !this.isSwitching) {
      const target = this.currentLane - 1;
      if (target >= 0) {
        this.splitPath = 'left';
        this._switchLane(target);
      }
    }

    if (this.input.consume('moveRight') && !this.isSwitching) {
      const target = this.currentLane + 1;
      if (target < LANE_COUNT) {
        this.splitPath = 'right';
        this._switchLane(target);
      }
    }

    // ── Jump (or Trolley Leap over Fire) ────────────────────────
    if (this.input.consume('jump')) {
      if (this.trolley?.active) {
        this.trolley.jump();
        this.audio.playSFX('jump');
      } else if (this.mushak.jump()) {
        this.audio.playSFX('jump');
      }
    }

    // ── Slide (or Duck under Overhead Block Barricades) ──────────
    if (this.input.consume('slide')) {
      if (this.trolley?.active) {
        this.trolley.slide();
        this.audio.playSFX('slide');
      } else if (this.mushak.slide()) {
        this.audio.playSFX('slide');
      }
    }
  }

  _switchLane(targetLane) {
    if (targetLane === this.currentLane) return;
    this.currentLane = targetLane;
    this.isSwitching = true;
    this.audio.playSFX('lanswitch');
    this.mushak.setLane(targetLane, () => {
      this.isSwitching = false;
    });
  }

  // ── Temple Trolley Rails Level ──────────────────────────────────
  /** Begin the rails level: Mushak mounts the trolley on 3D rails! */
  startLaneSplit() {
    this.laneSplitActive = true;
    this.splitCommitted  = false;
    this.splitPath       = null;

    if (this.trolley) {
      this.trolley.mount(this.mushak);
      this.mushak.idle(); // Sit/ride instead of running
    }
  }

  /** End the rails level: Mushak leaps off trolley, resuming run */
  endLaneSplit() {
    this.laneSplitActive = false;
    this.splitCommitted  = false;
    this.splitPath       = null;

    if (this.trolley) {
      this.trolley.dismount(this.mushak);
      this.mushak.run(); // Resume running animation
    }
  }

  getSplitPath() {
    return this.splitPath;
  }

  getLane() {
    return this.currentLane;
  }
}
