/**
 * BossSequenceController.js
 * Scripted finale timeline — Ganapathi appears, demons dispel, victory plays.
 *
 * Timeline (from bossSequence.json):
 *   t=0.0  stopRunning          — world slows to halt
 *   t=0.5  cameraPullBack       — camera zooms out
 *   t=1.5  ganapathiFadeIn      — Ganapathi materializes
 *   t=2.5  divineLightBurst     — golden light explosion
 *   t=3.5  demonsDispelParticles— demons sparkle away
 *   t=5.0  mushakoBelow         — Mushak bows
 *   t=6.0  screenFadeGold       — screen fades to gold
 *   t=7.0  transitionToVictory  — callback fires → victory screen
 *
 * Ganapathi is ALWAYS dignified and undamaged. Demons sparkle away harmlessly.
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { Ganapathi } from '../entities/Ganapathi.js';
import bossSeqData from '../config/bossSequence.json';

export class BossSequenceController {
  /**
   * @param {THREE.Scene}    scene
   * @param {Mushak}         mushak
   * @param {Demon[]}        demons
   * @param {SceneManager}   sceneManager
   * @param {AudioManager}   audio
   */
  constructor(scene, mushak, demons, sceneManager, audio) {
    this.scene        = scene;
    this.mushak       = mushak;
    this.demons       = demons;
    this.sceneManager = sceneManager;
    this.audio        = audio;

    this.ganapathi  = null;
    this._active    = false;
    this._time      = 0;
    this._steps     = bossSeqData.steps || [];
    this._doneSteps = new Set();
    this._onVictory = null;

    // Particle system for divine light burst
    this._divineParticles = null;
    this._divineLightEl   = document.getElementById('divine-light-overlay');
  }

  /**
   * Start the boss sequence.
   * @param {Function} onVictory  Called when sequence is complete
   */
  start(onVictory) {
    this._active    = true;
    this._time      = 0;
    this._doneSteps = new Set();
    this._onVictory = onVictory;

    // Spawn Ganapathi far ahead on center lane
    this.ganapathi = new Ganapathi(this.scene);
    this.ganapathi.mesh.visible = false;
  }

  /**
   * Per-frame update during boss sequence.
   * @param {number} delta
   */
  update(delta) {
    if (!this._active) return;
    this._time += delta;

    // Execute scripted steps at their timestamps
    this._steps.forEach((step, idx) => {
      if (this._doneSteps.has(idx)) return;
      if (this._time >= step.t) {
        this._doneSteps.add(idx);
        this._executeStep(step.action);
      }
    });

    // Update Ganapathi aura pulse
    if (this.ganapathi) {
      this.ganapathi.update(delta);
    }

    // Update divine particles
    if (this._divineParticles) {
      this._updateDivineParticles(delta);
    }
  }

  _executeStep(action) {
    switch (action) {
      case 'stopRunning':          this._doStopRunning();          break;
      case 'cameraPullBack':       this._doCameraPullBack();       break;
      case 'ganapathiFadeIn':      this._doGanapathiFadeIn();      break;
      case 'divineLightBurst':     this._doDivineLightBurst();     break;
      case 'demonsDispelParticles':this._doDemonsDispel();         break;
      case 'mushakoBelow':         this._doMushakBow();            break;
      case 'screenFadeGold':       this._doScreenFadeGold();       break;
      case 'transitionToVictoryScreen': this._doVictory();         break;
      default: break;
    }
  }

  _doStopRunning() {
    // World gradually slows — handled by main.js setting gameSpeed to 0
    // We simulate by killing Mushak's run animation
    this.mushak.mesh.rotation.x = 0;
  }

  _doCameraPullBack() {
    gsap.to(this.sceneManager.camera.position, {
      x: 0, y: 14, z: 30,
      duration: 2.0,
      ease: 'power2.inOut',
    });
  }

  _doGanapathiFadeIn() {
    if (!this.ganapathi) return;
    this.ganapathi.mesh.visible   = true;
    this.ganapathi.mesh.position.set(0, 0, -30);
    this.ganapathi.reveal(() => {
      // After reveal, drift forward slowly
      gsap.to(this.ganapathi.mesh.position, { z: -12, duration: 3, ease: 'power1.out' });
    });
    this.audio.playSFX('divine');
  }

  _doDivineLightBurst() {
    // Flash the divine light overlay
    if (this._divineLightEl) {
      gsap.to(this._divineLightEl, {
        opacity: 0.95,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(this._divineLightEl, {
            opacity: 0.2,
            duration: 1.5,
            ease: 'power2.inOut',
          });
        },
      });
    }
    this._createDivineParticles();
  }

  _doDemonsDispel() {
    this.demons.forEach((demon, i) => {
      setTimeout(() => {
        if (typeof demon?.dispel === 'function') {
          demon.dispel(() => {
            if (demon.mesh) demon.mesh.visible = false;
          });
        } else if (demon?.mesh) {
          demon.mesh.visible = false;
        }
      }, i * 300);
    });
  }

  _doMushakBow() {
    if (typeof this.mushak?.bow === 'function') {
      this.mushak.bow();
    } else {
      this.mushak?.idle?.();
    }
  }

  _doScreenFadeGold() {
    if (this._divineLightEl) {
      gsap.to(this._divineLightEl, {
        opacity: 1.0,
        duration: 1.5,
        ease: 'power2.in',
      });
    }
  }

  _doVictory() {
    this._active = false;
    setTimeout(() => {
      if (this._divineLightEl) gsap.set(this._divineLightEl, { opacity: 0 });
      this._onVictory?.();
    }, 300);
  }

  // ── Divine Particle System ────────────────────────────────────────────────
  _createDivineParticles() {
    const count = 200;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const vel   = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * 3;
      pos[i*3]     = Math.cos(angle) * r;
      pos[i*3+1]   = Math.random() * 5;
      pos[i*3+2]   = Math.sin(angle) * r - 20;

      vel[i*3]     = (Math.random() - 0.5) * 5;
      vel[i*3+1]   = 1 + Math.random() * 4;
      vel[i*3+2]   = (Math.random() - 0.5) * 3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(vel, 3));

    const mat = new THREE.PointsMaterial({
      color:       0xFFD700,
      size:        0.25,
      transparent: true,
      opacity:     1.0,
      depthWrite:  false,
    });

    this._divineParticles = new THREE.Points(geo, mat);
    this.scene.add(this._divineParticles);
    this._particleAge = 0;
  }

  _updateDivineParticles(delta) {
    if (!this._divineParticles) return;
    this._particleAge += delta;

    const pos = this._divineParticles.geometry.attributes.position;
    const vel = this._divineParticles.geometry.attributes.velocity;

    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + vel.getX(i) * delta);
      pos.setY(i, pos.getY(i) + vel.getY(i) * delta);
      pos.setZ(i, pos.getZ(i) + vel.getZ(i) * delta);
      // Gravity
      vel.setY(i, vel.getY(i) - 2 * delta);
    }
    pos.needsUpdate = true;

    // Fade out
    this._divineParticles.material.opacity = Math.max(0, 1 - this._particleAge / 3);

    // Cleanup
    if (this._particleAge > 4) {
      this.scene.remove(this._divineParticles);
      this._divineParticles.geometry.dispose();
      this._divineParticles.material.dispose();
      this._divineParticles = null;
    }
  }

  dispose() {
    this._active = false;
    if (this.ganapathi) this.ganapathi.dispose();
    if (this._divineParticles) {
      this.scene.remove(this._divineParticles);
      this._divineParticles.geometry?.dispose();
      this._divineParticles.material?.dispose();
      this._divineParticles = null;
    }
    if (this._divineLightEl) gsap.set(this._divineLightEl, { opacity: 0 });
  }
}
