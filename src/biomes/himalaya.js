/**
 * himalaya.js
 * Himalaya biome — opening third of the run.
 * Uses the actual snowy_mountain_road_scene GLB as the tiled background.
 * Prayer flags and ice stupas remain as foreground side-props.
 */

import * as THREE from 'three';
import { makeSnowPeak, makePineTree, makePrayerFlags, makeIceStupa, makeIceBlock, makeCloud, makeBird } from '../entities/EnvironmentProps.js';

// ── Biome Lighting Config ────────────────────────────────────────────────────
export const HIMALAYA_CFG = {
  skyColor:          0x8FB8D9,
  fogColor:          0xC4D8E2,
  fogNear:           80,
  fogFar:            350,
  ambientColor:      0xFFFFFF,
  ambientIntensity:  0.8,
  sunColor:          0xFFFAEE,
  sunIntensity:      2.2,
  groundColor:       0xDBE5EC,
  trackColor:        0x8C9AA3,
  railColor:         0x6B7B87,
  lineColor:         0xFFFFFF,
  lineEmissive:      0x444444,
};

const PROP_INTERVAL  = 26; // foreground prop spacing

export class HimalayaBiome {
  constructor(scene, pool) {
    this.scene          = scene;
    this.pool           = pool;
    this.active         = false;
    this._props         = [];
    this._skyProps      = [];
    this._nextZ         = -40;
    this._snowParticles = null;
  }

  get lightConfig() { return HIMALAYA_CFG; }

  activate(addPropFn) {
    this.active    = true;
    this.addPropFn = addPropFn;
    this._nextZ    = -40;
    this._props    = [];
    this._skyProps = [];

    this._spawnInitialProps();
    this._createSnowParticles();
  }

  deactivate() {
    this.active = false;
    this._disposeParticles();
    this._props.forEach(prop => {
      this.pool.release(prop.userData.poolType, prop);
    });
    this._skyProps.forEach(prop => {
      this.pool.release(prop.userData.poolType, prop);
    });
    this._props = [];
    this._skyProps = [];
  }

  _spawnInitialProps() {
    for (let i = 0; i < 9; i++) {
      this._spawnPropPair(-40 - i * PROP_INTERVAL);
    }
  }

  _spawnPropPair(z) {
    const r = Math.random();
    let left, right;

    if (r < 0.25) {
      left  = this.pool.get('snowPeak', () => makeSnowPeak());
      right = this.pool.get('snowPeak', () => makeSnowPeak());
      left.userData.poolType = 'snowPeak';
      right.userData.poolType = 'snowPeak';
      left.position.set(-28, 0, z);
      right.position.set(28, 0, z);
    } else if (r < 0.5) {
      left  = this.pool.get('pineTree', () => makePineTree());
      right = this.pool.get('pineTree', () => makePineTree());
      left.userData.poolType = 'pineTree';
      right.userData.poolType = 'pineTree';
      left.position.set(-20, 0, z);
      right.position.set(20, 0, z);
    } else if (r < 0.75) {
      left  = this.pool.get('prayerFlags', () => makePrayerFlags());
      right = this.pool.get('prayerFlags', () => makePrayerFlags());
      left.userData.poolType = 'prayerFlags';
      right.userData.poolType = 'prayerFlags';
      left.position.set(-18, 0, z);
      right.position.set(18, 0, z);
    } else {
      left  = this.pool.get('iceStupa', () => makeIceStupa());
      right = this.pool.get('iceStupa', () => makeIceStupa());
      left.userData.poolType = 'iceStupa';
      right.userData.poolType = 'iceStupa';
      left.position.set(-18, 0, z);
      right.position.set(18, 0, z);
    }

    if (left.rotation.y === 0) left.rotation.y = Math.random() * Math.PI;
    if (right.rotation.y === 0) right.rotation.y = Math.random() * Math.PI;

    this._props.push(left, right);

    // Sky Elements (Clouds and Birds)
    if (Math.random() < 0.4) {
      const cloud = this.pool.get('cloud', () => makeCloud());
      cloud.userData.poolType = 'cloud';
      cloud.position.set((Math.random() - 0.5) * 80, 25 + Math.random() * 15, z - Math.random() * 20);
      this._skyProps.push(cloud);
    }
    if (Math.random() < 0.3) {
      const bird = this.pool.get('bird', () => makeBird());
      bird.userData.poolType = 'bird';
      bird.position.set((Math.random() - 0.5) * 40, 15 + Math.random() * 10, z - Math.random() * 10);
      this._skyProps.push(bird);
    }

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

    this._props = this._props.filter(prop => {
      if (prop.position.z > 28) {
        this.pool.release(prop.userData.poolType, prop);
        return false;
      }
      return true;
    });

    // Scroll, animate, and recycle sky props
    this._skyProps.forEach(prop => { 
      prop.position.z += worldAmount; 
      if (prop.userData.poolType === 'bird') {
        prop.userData.time += delta * 15;
        prop.userData.wing1.rotation.y = -0.3 + Math.sin(prop.userData.time) * 0.4;
        prop.userData.wing2.rotation.y = 0.3 - Math.sin(prop.userData.time) * 0.4;
        prop.position.x += Math.sin(prop.userData.time * 0.1) * delta * 2;
      }
    });
    this._skyProps = this._skyProps.filter(prop => {
      if (prop.position.z > 40) {
        this.pool.release(prop.userData.poolType, prop);
        return false;
      }
      return true;
    });

    // Spawn new props
    const furthestZ = this._props.reduce((min, p) => Math.min(min, p.position.z), 0);
    if (furthestZ > -180) {
      this._spawnPropPair(furthestZ - PROP_INTERVAL);
    }
  }
}
