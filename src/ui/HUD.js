/**
 * HUD.js — In-game overlay that syncs with session each frame.
 * All DOM-based (zero Three.js texture overhead).
 */
import { gsap } from 'gsap';

const BIOME_LABELS = {
  himalaya: '🏔️ Himalaya',
  jungle:   '🌿 Jungle',
};

export class HUD {
  constructor() {
    this._scoreEl   = document.getElementById('hud-score');
    this._distEl    = document.getElementById('hud-dist');
    this._devFill   = document.getElementById('devotion-fill');
    this._livesEl   = document.getElementById('hud-lives');
    this._biomeEl   = document.getElementById('hud-biome');
    this._screenEl  = document.getElementById('screen-hud');
  }

  show() {
    if (!this._screenEl) return;
    gsap.killTweensOf(this._screenEl);
    gsap.set(this._screenEl, { display: 'flex' });
    gsap.to(this._screenEl, { opacity: 1, duration: 0.4 });
    this._screenEl.style.pointerEvents = 'none'; // gameplay overlay
  }

  hide() {
    if (!this._screenEl) return;
    gsap.to(this._screenEl, {
      opacity: 0, duration: 0.3,
      onComplete: () => gsap.set(this._screenEl, { display: 'none' })
    });
  }

  /** Called every frame — cheap DOM updates only */
  update(session) {
    if (this._scoreEl) this._scoreEl.textContent = session.score.toLocaleString();
    if (this._distEl)  this._distEl.textContent  = Math.floor(session.distance) + 'm';
    if (this._devFill) this._devFill.style.width  = Math.min(100, session.devotion) + '%';
  }

  updateLives(lives) {
    if (!this._livesEl) return;
    const spans = this._livesEl.querySelectorAll('span');
    spans.forEach((span, i) => span.classList.toggle('alive', i < lives));
    // Shake
    gsap.fromTo(this._livesEl,
      { x: -8 },
      { x: 0, duration: 0.4, ease: 'elastic.out(2, 0.4)' }
    );
  }

  setBiome(biome) {
    if (!this._biomeEl) return;
    gsap.to(this._biomeEl, {
      opacity: 0, duration: 0.25,
      onComplete: () => {
        this._biomeEl.textContent = BIOME_LABELS[biome] || biome;
        gsap.to(this._biomeEl, { opacity: 1, duration: 0.35 });
      }
    });
  }

  showScorePopup(value) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${value}`;
    popup.style.left = (42 + (Math.random() - 0.5) * 18) + '%';
    popup.style.top  = (44 + (Math.random() - 0.5) * 14) + '%';
    document.body.appendChild(popup);

    gsap.fromTo(popup,
      { opacity: 1, y: 0, scale: 0.9 },
      { opacity: 0, y: -55, scale: 1.3, duration: 0.85,
        ease: 'power2.out', onComplete: () => popup.remove() }
    );
  }

  devotionFull() {
    if (!this._devFill) return;
    gsap.to(this._devFill, {
      boxShadow: '0 0 30px rgba(255,215,0,0.9)',
      duration: 0.3, yoyo: true, repeat: 4,
    });
  }
}
