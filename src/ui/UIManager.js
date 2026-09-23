/**
 * UIManager.js — Completely rewritten screen system.
 * Uses display:none / display:flex toggling with GSAP opacity animations.
 * ONLY ONE screen is ever visible at a time.
 */
import { gsap } from 'gsap';

const ALL_SCREENS = [
  'loading','menu','howtoplay','difficulty',
  'hud','pause','boss','victory','gameover','settings'
];

export class UIManager {
  constructor(game) {
    this.game     = game;
    this._current = null;

    // Cache all screen elements
    this._el = {};
    ALL_SCREENS.forEach(id => {
      this._el[id] = document.getElementById(`screen-${id}`);
    });

    this._setupButtons();
    this._spawnMenuPetals();
  }

  // ── Core: show exactly one screen at a time ────────────────────────────────
  showScreen(name) {
    const target = this._el[name];
    if (!target) { console.warn(`UIManager: no screen "${name}"`); return; }

    // Immediately hide ALL other screens (no outgoing animation for speed)
    ALL_SCREENS.forEach(id => {
      if (id === name) return;
      const el = this._el[id];
      if (!el) return;
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 0, display: 'none' });
    });

    // Show the target
    this._current = name;
    const isGameplay = (name === 'hud' || name === 'boss');

    gsap.killTweensOf(target);
    gsap.set(target, { opacity: 0, display: 'flex' });

    // Gameplay screens have pointer-events: none (they're overlays)
    target.style.pointerEvents = isGameplay ? 'none' : 'all';

    gsap.to(target, { opacity: 1, duration: 0.4, ease: 'power2.out' });

    // Update best score when menu shows
    if (name === 'menu') {
      const saves = this.game.save?.load();
      const el    = document.getElementById('menu-best');
      if (el && saves) el.textContent = (saves.highScore || 0).toLocaleString();
    }
  }

  // ── Show HUD alongside (layered over canvas) ───────────────────────────────
  showHUD() {
    const el = this._el['hud'];
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.set(el, { display: 'flex' });
    gsap.to(el, { opacity: 1, duration: 0.4 });
  }

  hideHUD() {
    const el = this._el['hud'];
    if (!el) return;
    gsap.to(el, {
      opacity: 0, duration: 0.3,
      onComplete: () => gsap.set(el, { display: 'none' })
    });
  }

  // ── Results ────────────────────────────────────────────────────────────────
  showVictory(session, prevBest, isNewBest) {
    this.hideHUD();
    this.showScreen('victory');

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const dist = session.distance || 0;
    const miles = (dist * 0.000621371).toFixed(2);
    const ladoos = session.ladoos || 0;
    const modaks = session.modaks || 0;
    const xp = Math.floor(dist * 1.5 + ladoos * 50 + modaks * 25 + 500);

    set('v-miles', `${miles} mi`);
    set('v-dist-sub', `${Math.floor(dist).toLocaleString()}m distance`);
    set('v-xp', `+${xp.toLocaleString()} XP`);
    set('v-xp-rank', this._getXPRank(xp));
    set('v-ladoos', ladoos.toLocaleString());
    set('v-modaks', modaks.toLocaleString());

    const badge = document.getElementById('v-best-badge');
    if (badge) badge.innerHTML = isNewBest
      ? '<span class="new-best">🏆 NEW BEST!</span>'
      : `Best: ${Math.max(prevBest, session.score).toLocaleString()}`;

    this._countUp('v-score', 0, session.score, 1.4);
  }

  showGameOver(session, prevBest, isNewBest) {
    this.hideHUD();
    this.showScreen('gameover');

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const dist = session.distance || 0;
    const miles = (dist * 0.000621371).toFixed(2);
    const ladoos = session.ladoos || 0;
    const modaks = session.modaks || 0;
    const xp = Math.floor(dist * 1.5 + ladoos * 50 + modaks * 25);

    set('go-score', session.score.toLocaleString());
    set('go-miles', `${miles} mi`);
    set('go-dist-sub', `${Math.floor(dist).toLocaleString()}m distance`);
    set('go-xp', `+${xp.toLocaleString()} XP`);
    set('go-xp-rank', this._getXPRank(xp));
    set('go-ladoos', ladoos.toLocaleString());
    set('go-modaks', modaks.toLocaleString());

    const badge = document.getElementById('go-best-badge');
    if (badge) badge.innerHTML = isNewBest
      ? '<span class="new-best">🏆 NEW BEST!</span>'
      : `Best: ${Math.max(prevBest, session.score).toLocaleString()}`;
      
    // Devotion meter update
    const devotionFill = document.getElementById('go-devotion-fill');
    const devotionText = document.getElementById('go-devotion-text');
    const devAmount = Math.min(100, Math.max(0, session.devotion || 0));
    if (devotionFill) devotionFill.style.width = devAmount + '%';
    if (devotionText) devotionText.textContent = Math.floor(devAmount) + '% Filled';
  }

  _getXPRank(xp) {
    if (xp >= 3000) return '🌟 Divine Legend';
    if (xp >= 2000) return '✨ Sacred Champion';
    if (xp >= 1200) return '⚡ Royal Vahana';
    if (xp >= 600)  return '🌸 Swift Devotee';
    return '🌱 Humble Seeker';
  }

  // ── Lane split flash ───────────────────────────────────────────────────────
  showLaneSplitWarning() {
    const el = document.getElementById('lane-split-warning');
    if (!el) return;
    gsap.killTweensOf(el);
    el.style.display = 'block';
    gsap.fromTo(el,
      { opacity: 0, scale: 0.75 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)',
        onComplete: () => gsap.to(el, { opacity: 0, duration: 0.6, delay: 0, onComplete: () => { el.style.display = 'none'; } }) }
    );
  }

  // ── Button wiring ──────────────────────────────────────────────────────────
  _setupButtons() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    // Menu
    on('btn-play',         () => this.showScreen('difficulty'));
    on('btn-howtoplay',    () => this.showScreen('howtoplay'));
    on('btn-settings',     () => this.showScreen('settings'));

    // How To Play
    on('btn-htp-back',     () => this.showScreen('menu'));

    // Difficulty
    let selectedDiff = 'easy';
    document.querySelectorAll('.diff-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedDiff = card.dataset.diff;
      });
    });
    on('btn-diff-back',    () => this.showScreen('menu'));
    on('btn-diff-start',   () => this.game.startGame(selectedDiff));

    // Pause
    on('btn-pause',        () => this.game.pause());
    on('btn-resume',       () => this.game.resume());
    on('btn-restart',      () => { this.game.restart(); });
    on('btn-quit',         () => this.game.quitToMenu());

    // Boss
    on('btn-boss-skip',    () => this.game.triggerVictory());

    // Victory
    on('btn-v-again',      () => this.game.restart());
    on('btn-v-menu',       () => this.game.quitToMenu());

    // Game Over
    on('btn-go-again',     () => this.game.restart());
    on('btn-go-menu',      () => this.game.quitToMenu());

    // Settings
    on('btn-settings-back',() => this.showScreen('menu'));

    // Sound toggle
    const sndBtn = document.getElementById('toggle-sound');
    if (sndBtn) {
      const soundOn = this.game.save?.getSetting?.('soundOn', true) ?? true;
      this._setToggle(sndBtn, soundOn);
      sndBtn.addEventListener('click', () => {
        const isOn  = sndBtn.classList.contains('on');
        const newOn = !isOn;
        this._setToggle(sndBtn, newOn);
        this.game.audio?.setMute(!newOn);
        this.game.save?.setSetting?.('soundOn', newOn);
      });
    }
    const musBtn = document.getElementById('toggle-music');
    if (musBtn) {
      const musicOn = this.game.save?.getSetting?.('musicOn', true) ?? true;
      this._setToggle(musBtn, musicOn);
      this.game.audio?.setMusicMute(!musicOn);
      musBtn.addEventListener('click', () => {
        const isOn  = musBtn.classList.contains('on');
        const newOn = !isOn;
        this._setToggle(musBtn, newOn);
        this.game.audio?.setMusicMute(!newOn);
        this.game.save?.setSetting?.('musicOn', newOn);
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.code === 'Escape' || e.code === 'KeyP') && this.game.state === 'PLAYING') {
        this.game.pause();
      } else if (e.code === 'Escape' && this.game.state === 'PAUSED') {
        this.game.resume();
      }
    });
  }

  _setToggle(btn, isOn) {
    btn.classList.toggle('on',  isOn);
    btn.classList.toggle('off', !isOn);
  }

  // ── Score count-up ─────────────────────────────────────────────────────────
  _countUp(id, from, to, duration) {
    const el = document.getElementById(id);
    if (!el) return;
    const obj = { v: from };
    gsap.to(obj, {
      v: to, duration, ease: 'power2.out',
      onUpdate: () => { el.textContent = Math.floor(obj.v).toLocaleString(); }
    });
  }

  // ── Floating petals on menu background ────────────────────────────────────
  _spawnMenuPetals() {
    const menuEl = this._el['menu'];
    if (!menuEl) return;
    const colors = ['#FF9944','#FFB830','#FF6677','#FFD700','#FF8844'];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'menu-petal';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${-5 - Math.random() * 10}%;
        background: ${colors[i % colors.length]};
        opacity: 0;
        animation-duration: ${6 + Math.random() * 8}s;
        animation-delay: ${Math.random() * 8}s;
        border-radius: 50% 50% 50% 0;
        transform: rotate(${Math.random()*360}deg);
      `;
      menuEl.appendChild(p);
    }
  }
}
