/**
 * InputController.js
 * Unified input abstraction — maps keyboard (arrows/WASD) and touch/swipe
 * to the same 5 abstract actions: moveLeft, moveRight, jump, slide, pause.
 *
 * Consumers call input.consume(action) which returns true once and clears
 * the flag, preventing double-triggers on the same press.
 */

export class InputController {
  constructor() {
    // Abstract action flags
    this._actions = {
      moveLeft:  false,
      moveRight: false,
      jump:      false,
      slide:     false,
      pause:     false,
    };

    // Key state tracking
    this._keys = new Set();
    this._justPressed = new Set();

    // Touch tracking
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;
    this._swipeThreshold = 40;   // px minimum for a swipe
    this._tapThreshold   = 200;  // ms maximum for a tap (vs hold)

    this._bindEvents();
  }

  _bindEvents() {
    // ── Keyboard ────────────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      const key = e.key;
      if (code && !this._keys.has(code)) {
        this._justPressed.add(code);
        this._keys.add(code);
      }
      if (key && !this._keys.has(key)) {
        this._justPressed.add(key);
        this._keys.add(key);
      }

      // Prevent arrow key page scroll
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.code);
      this._keys.delete(e.key);
    });

    // ── Touch / Swipe ────────────────────────────────────────────
    window.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this._touchStartX    = t.clientX;
      this._touchStartY    = t.clientY;
      this._touchStartTime = performance.now();
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - this._touchStartX;
      const dy = t.clientY - this._touchStartY;
      const dt = performance.now() - this._touchStartTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Tap zones: left third = left, right third = right, center top = jump, center bottom = slide
      const W = window.innerWidth;
      const H = window.innerHeight;
      const startX = this._touchStartX;
      const startY = this._touchStartY;

      if (absDx < 15 && absDy < 15 && dt < this._tapThreshold) {
        // Tap — use zone
        if (startX < W * 0.33) {
          this._actions.moveLeft = true;
        } else if (startX > W * 0.66) {
          this._actions.moveRight = true;
        } else if (startY < H * 0.5) {
          this._actions.jump = true;
        } else {
          this._actions.slide = true;
        }
        return;
      }

      // Swipe direction
      if (absDx > absDy && absDx > this._swipeThreshold) {
        // Horizontal swipe
        if (dx < 0) this._actions.moveLeft  = true;
        else         this._actions.moveRight = true;
      } else if (absDy > absDx && absDy > this._swipeThreshold) {
        // Vertical swipe
        if (dy < 0) this._actions.jump  = true;
        else         this._actions.slide = true;
      }
    }, { passive: true });
  }

  /**
   * Called every frame to translate key state → action flags.
   * Called before any gameplay system reads input.
   */
  update() {
    // Map keys to actions (only on just-pressed, not held)
    const pressed = (k1, k2) => this._justPressed.has(k1) || this._justPressed.has(k2);
    
    if (pressed('ArrowLeft', 'KeyA') || this._justPressed.has('a')) this._actions.moveLeft  = true;
    if (pressed('ArrowRight', 'KeyD') || this._justPressed.has('d')) this._actions.moveRight = true;
    if (pressed('ArrowUp', 'KeyW') || pressed('Space', 'w')) this._actions.jump = true;
    if (pressed('ArrowDown', 'KeyS') || this._justPressed.has('s')) this._actions.slide = true;
    if (pressed('Escape', 'KeyP') || this._justPressed.has('p')) this._actions.pause = true;

    // Clear just-pressed after processing
    this._justPressed.clear();
  }

  /**
   * Consume an action: returns true once, then clears the flag.
   * @param {string} action  One of: moveLeft, moveRight, jump, slide, pause
   * @returns {boolean}
   */
  consume(action) {
    if (this._actions[action]) {
      this._actions[action] = false;
      return true;
    }
    return false;
  }

  /**
   * Peek at an action without consuming it.
   * @param {string} action
   * @returns {boolean}
   */
  peek(action) {
    return this._actions[action] === true;
  }

  /** Clear all pending actions. */
  clearAll() {
    Object.keys(this._actions).forEach(k => { this._actions[k] = false; });
    this._justPressed.clear();
  }
}
