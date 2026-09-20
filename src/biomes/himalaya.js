/**
 * himalaya.js
 * Himalaya biome — opening third of the run.
 * Uses the actual snowy_mountain_road_scene GLB as the tiled background.
 * Prayer flags and ice stupas remain as foreground side-props.
 */

import * as THREE from 'three';
import { HimalayaBackground } from './HimalayaBackground.js';
import { makePineTree } from '../entities/EnvironmentProps.js';

// ── Biome Lighting Config ────────────────────────────────────────────────────
export const HIMALAYA_CFG = {
  skyColor:          0x8BA9D1,
  fogColor:          0x97BEE8,
  fogNear:           120,
  fogFar:            500,
  ambientColor:      0xE6F0FF,
  ambientIntensity:  0.9,
  sunColor:          0xFFFAEE,
  sunIntensity:      2.1,
  groundColor:       0xDBE7F5,
  trackColor:        0x8E9CA6,
  railColor:         0x9BBBD4,
  lineColor:         0xFFFFFF,
  lineEmissive:      0x88AAFF,
};

const PROP_INTERVAL  = 30; // foreground prop spacing
const PROP_BUDGET    = 16; // max foreground side-props

export class HimalayaBiome {
  constructor(scene) {
    this.scene          = scene;
    this.active         = false;
    this._props         = [];
    this._nextZ         = -40;
    this._snowParticles = null;
    this._propBudget    = PROP_BUDGET;

    // Background system — pre-loads immediately on construction
    this._bg = new HimalayaBackground(scene, 4);
  }

  get lightConfig() { return HIMALAYA_CFG; }

  activate(addPropFn) {
    this.active    = true;
    this.addPropFn = addPropFn;
    this._nextZ    = -40;
    this._props    = [];

    this._bg.activate();
    this._spawnInitialProps();
    this._createSnowParticles();
  }

  deactivate() {
    this.active = false;
    this._bg.deactivate();
    this._disposeParticles();
    this._props.forEach(prop => {
      this.scene.remove(prop);
      prop.traverse(c => {
        if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }
      });
    });
    this._props = [];
  }

  _spawnInitialProps() {
    for (let i = 0; i < 6; i++) {
      this._spawnSideProps(-40 - i * PROP_INTERVAL);
    }
  }

  /** Side-props: big pine trees beside the track — clean and neat */
  _spawnSideProps(z) {
    // Big pine trees on both sides — uniform and clean
    const left  = makePineTree(3.5);  // big tree
    const right = makePineTree(3.5);

    left.position.set(-7.5, 0, z);
    right.position.set(7.5, 0, z);

    // Slight variation in rotation for natural look but still neat
    left.rotation.y  = Math.PI * 0.3;
    right.rotation.y = -Math.PI * 0.3;

    this.addPropFn(left);
    this.addPropFn(right);
    this._props.push(left, right);

    return [left, right];
  }

  _createSnowParticles() {
    const count = 600;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const circleCanvas = document.createElement('canvas');
    circleCanvas.width  = 32;
    circleCanvas.height = 32;
    const ctx = circleCanvas.getContext('2d');
    const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    const circleTexture = new THREE.CanvasTexture(circleCanvas);

    const mat = new THREE.PointsMaterial({
      color:       0xEEF6FF,
      size:        0.28,
      map:         circleTexture,
      transparent: true,
      alphaTest:   0.1,
      opacity:     0.85,
      depthWrite:  false,
      sizeAttenuation: true,
    });

    this._snowParticles = new THREE.Points(geo, mat);
    this._snowParticles.userData.isSnow = true;
    this.addPropFn(this._snowParticles);
  }

  _disposeParticles() {
    if (this._snowParticles) {
      this._snowParticles.geometry?.dispose();
      this._snowParticles.material?.dispose();
      this._snowParticles = null;
    }
  }

  update(delta, worldAmount) {
    if (!this.active) return;

    // Feed scroll amount into the background tiling system
    this._bg.update(worldAmount);

    // Snow particle drift
    if (this._snowParticles) {
      const pos = this._snowParticles.geometry.attributes.position;
      const t   = Date.now() * 0.001;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, pos.getY(i) - delta * 3.0);
        pos.setX(i, pos.getX(i) + Math.sin(t + i * 0.5) * delta * 0.4);
        if (pos.getY(i) < -1) {
          pos.setY(i, 22);
          pos.setX(i, (Math.random() - 0.5) * 30);
        }
      }
      pos.needsUpdate = true;
    }

    // Scroll foreground props
    this._props.forEach(prop => {
      prop.position.z += worldAmount;
    });

    // Recycle foreground props
    this._props = this._props.filter(prop => {
      if (prop.position.z > 30) {
        this.scene.remove(prop);
        prop.traverse(c => {
          if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }
        });
        return false;
      }
      return true;
    });

    // Spawn new foreground props if needed
    while (this._props.length < this._propBudget) {
      this._spawnSideProps(this._nextZ);
      this._nextZ -= PROP_INTERVAL;
    }
  }
}
