/**
 * AudioManager.js
 * Procedural audio via Web Audio API — zero external files.
 * All sounds are synthesized: dhol-style beat, pickup chimes, SFX.
 *
 * This avoids any licensing risk and has zero load time.
 */

export class AudioManager {
  constructor() {
    this._ctx       = null;   // AudioContext (lazy-init on first user gesture)
    this._masterGain = null;
    this._musicGain  = null;
    this._sfxGain    = null;
    this._beatIntervalId = null;
    this._currentBiome = 'himalaya';
    this._soundOn = true;
    this._tempo = 120; // BPM

    // Biome tempo settings
    this._biomeTempos = { himalaya: 110, jungle: 130 };

    // Looping background music (Ekadantaya Vakratundaya Instrumental)
    this._bgm = new Audio('/audio/bgm.mp3');
    this._bgm.loop = true;
    this._bgm.volume = 0.65;
    this._musicOn = true;
    this._hasStarted = false;

    // Initialize context on first interaction
    const onFirstUserGesture = () => {
      this._initContext();
      if (this._hasStarted && this._musicOn && this._bgm && this._bgm.paused) {
        this._bgm.play().catch(() => {});
      }
    };
    document.addEventListener('pointerdown', onFirstUserGesture);
    document.addEventListener('keydown',     onFirstUserGesture);
  }

  // ── Context Init ─────────────────────────────────────────────────────────
  _initContext() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0.7;
    this._masterGain.connect(this._ctx.destination);

    this._musicGain = this._ctx.createGain();
    this._musicGain.gain.value = 0.5;
    this._musicGain.connect(this._masterGain);

    this._sfxGain = this._ctx.createGain();
    this._sfxGain.gain.value = 0.8;
    this._sfxGain.connect(this._masterGain);
  }

  _ensureContext() {
    if (!this._ctx) return false;
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return true;
  }

  // ── Generic Synth Helpers ────────────────────────────────────────────────
  /** Play a single oscillator note with envelope */
  _playTone(freq, type, duration, gainVal, dest, startDelay = 0, decayRatio = 0.8) {
    const now = this._ctx.currentTime + startDelay;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(dest || this._sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /** Play a noise burst (for percussion) */
  _playNoise(duration, gainVal, lowFreq = 200, highFreq = 1000, dest = null) {
    const bufSize = this._ctx.sampleRate * duration;
    const buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src    = this._ctx.createBufferSource();
    const filter = this._ctx.createBiquadFilter();
    const gain   = this._ctx.createGain();

    src.buffer  = buf;
    filter.type = 'bandpass';
    filter.frequency.value = (lowFreq + highFreq) / 2;
    filter.Q.value = 0.5;
    gain.gain.setValueAtTime(gainVal, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest || this._sfxGain);
    src.start();
    src.stop(this._ctx.currentTime + duration + 0.01);
  }

  // ── Dhol Beat Pattern ────────────────────────────────────────────────────
  /** Kick drum (deep dhol hit) */
  _playDholKick(time) {
    const now = time ?? this._ctx.currentTime;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this._musicGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /** Snare-like dhol treble hit */
  _playDholSnare(time) {
    const now = time ?? this._ctx.currentTime;
    // Noise component
    const bufSize = Math.floor(this._ctx.sampleRate * 0.15);
    const buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src    = this._ctx.createBufferSource();
    const filter = this._ctx.createBiquadFilter();
    const gain   = this._ctx.createGain();
    src.buffer = buf;
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._musicGain);
    src.start(now);
    src.stop(now + 0.15);
    // Tone component
    const osc  = this._ctx.createOscillator();
    const og   = this._ctx.createGain();
    osc.frequency.value = 280;
    og.gain.setValueAtTime(0.3, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(og);
    og.connect(this._musicGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /** High-pitched metallic tick (tabla-ish) */
  _playTick(time) {
    const now = time ?? this._ctx.currentTime;
    this._playTone(1200, 'sine', 0.05, 0.25, this._musicGain, time - this._ctx.currentTime);
  }

  /**
   * Start the looping dhol beat.
   * Pattern (in 16th notes at 4/4): K . . S . K . S | K . S . K . S .
   */
  startMusic() {
    this._hasStarted = true;
    this._ensureContext();
    if (this._musicOn && this._bgm) {
      this._bgm.currentTime = 0;
      this._bgm.play().catch(e => {
        console.warn('[AudioManager] BGM playback deferred until gesture:', e);
      });
    }
  }

  stopMusic() {
    this._hasStarted = false;
    if (this._bgm) {
      this._bgm.pause();
      this._bgm.currentTime = 0;
    }
  }

  pauseMusic() {
    if (this._bgm) {
      this._bgm.pause();
    }
  }

  resumeMusic() {
    this._ensureContext();
    if (this._musicOn && this._bgm) {
      this._bgm.play().catch(e => console.warn(e));
    }
  }

  transitionMusic(biome) {
    this._currentBiome = biome;
    const target = this._biomeTempos[biome] || 120;
    // Ramp tempo gradually over 2 seconds
    const start = this._tempo;
    const steps = 20;
    let i = 0;
    const interval = setInterval(() => {
      this._tempo = start + (target - start) * (i / steps);
      i++;
      if (i >= steps) { this._tempo = target; clearInterval(interval); }
    }, 100);
  }

  // ── SFX ─────────────────────────────────────────────────────────────────
  playSFX(name) {
    if (!this._soundOn || !this._ensureContext()) return;

    switch (name) {
      case 'collect': this._sfxCollect();   break;
      case 'hit':     this._sfxHit();       break;
      case 'gameover':this._sfxGameOver();  break;
      case 'victory': this._sfxVictory();   break;
      case 'jump':    this._sfxJump();      break;
      case 'slide':   this._sfxSlide();     break;
      case 'divine':  this._sfxDivine();    break;
      case 'lanswitch': this._sfxLaneSwitch(); break;
      default: break;
    }
  }

  _sfxCollect() {
    // Bright chime — two sine harmonics with quick decay
    this._playTone(880, 'sine',     0.35, 0.4, this._sfxGain);
    this._playTone(1320, 'sine',    0.25, 0.25, this._sfxGain);
    this._playTone(1760, 'triangle',0.15, 0.12, this._sfxGain);
  }

  _sfxHit() {
    // Dull thud + noise
    this._playTone(80, 'sawtooth', 0.2, 0.6, this._sfxGain);
    this._playNoise(0.15, 0.4, 100, 500, this._sfxGain);
  }

  _sfxJump() {
    const now = this._ctx.currentTime;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  _sfxSlide() {
    this._playTone(200, 'sawtooth', 0.1, 0.3, this._sfxGain);
    this._playNoise(0.08, 0.2, 300, 800, this._sfxGain);
  }

  _sfxLaneSwitch() {
    this._playTone(440, 'sine', 0.08, 0.2, this._sfxGain);
  }

  _sfxGameOver() {
    // Descending sad tone
    const now = this._ctx.currentTime;
    [440, 330, 220].forEach((freq, i) => {
      this._playTone(freq, 'sine', 0.6, 0.4, this._sfxGain, i * 0.3);
    });
  }

  _sfxVictory() {
    // Ascending triumphant arpeggio
    const notes = [261.6, 329.6, 392, 523.3, 659.3, 783.9];
    notes.forEach((freq, i) => {
      this._playTone(freq, 'sine',     0.5, 0.5, this._sfxGain, i * 0.1);
      this._playTone(freq * 2, 'sine', 0.3, 0.3, this._sfxGain, i * 0.1);
    });
  }

  _sfxDivine() {
    // Warm reverb-like swell — stacked sine harmonics with slow attack
    const now = this._ctx.currentTime;
    [261.6, 392, 523.3, 659.3, 783.9].forEach((freq, i) => {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15 - i * 0.02, now + 1.5);
      gain.gain.linearRampToValueAtTime(0, now + 4);
      osc.connect(gain);
      gain.connect(this._sfxGain);
      osc.start(now);
      osc.stop(now + 4.5);
    });
  }

  // ── Controls ─────────────────────────────────────────────────────────────
  setMute(muted) {
    this._soundOn = !muted;
    if (this._masterGain) {
      this._masterGain.gain.value = muted ? 0 : 0.7;
    }
    if (this._bgm) {
      this._bgm.muted = muted;
    }
  }

  setMusicMute(muted) {
    this._musicOn = !muted;
    if (this._bgm) {
      if (muted) {
        this._bgm.pause();
      } else if (this._hasStarted) {
        this._bgm.play().catch(() => {});
      }
    }
  }

  isSoundOn() { return this._soundOn; }
}
