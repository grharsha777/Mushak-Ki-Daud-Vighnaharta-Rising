/**
 * jungle.js
 * Jungle biome — middle third of the run.
 * Visual: Dense lush tropical foliage, ancient stone temple arches,
 *         golden fireflies, rich atmospheric tropical dawn lighting.
 */

import * as THREE from 'three';
import { makeBanyanTree, makeTropicalPalm, makeTempleArch, makeLotusFountain, makeCountrysideScene } from '../entities/EnvironmentProps.js';

export const JUNGLE_CFG = {
  skyColor:          0x2D5446,  // Tropical dawn canopy sky
  fogColor:          0x3D6354,  // Soft atmospheric mist (NOT dark murky swamp green)
  fogNear:           80,        // Pushed back so road is clear and bright
  fogFar:            260,
  ambientColor:      0xCCE8BE,  // Warm ambient daylight
  ambientIntensity:  0.85,
  sunColor:          0xFFF3C4,  // Golden tropical sun
  sunIntensity:      1.95,
  groundColor:       0x243B26,  // Rich tropical forest floor
  trackColor:        0x455646,  // Weathered ancient mossy temple stone road
  railColor:         0x2E6B48,  // Jade-emerald stone curbs
  lineColor:         0xFFD700,  // Radiant golden lane markings
  lineEmissive:      0xBB8800,
};

const PROP_INTERVAL = 26;

export class JungleBiome {
  constructor(scene) {
    this.scene       = scene;
    this.active      = false;
    this._props      = [];
    this._nextZ      = -40;
    this._fireflies  = null;
  }

  get lightConfig() { return JUNGLE_CFG; }

  activate(addPropFn) {
    this.active    = true;
    this.addPropFn = addPropFn;
    this._nextZ    = -40;
    this._props    = [];
    this._spawnInitialProps();
    this._createFireflies(addPropFn);
  }

  deactivate() {
    this.active = false;
    this._disposeFireflies();
    this._props.forEach(prop => {
      this.scene.remove(prop);
      prop.traverse(c => {
        if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }
      });
    });
    this._props = [];
  }

  _spawnInitialProps() {
    for (let i = 0; i < 9; i++) {
      this._spawnPropPair(-40 - i * PROP_INTERVAL);
    }
  }

  _spawnPropPair(z) {
    const r = Math.random();
    let left, right;

    // Use the massive countryside scene for the forest background
    // To prevent massive overlapping, we randomly choose smaller props or the big scene
    if (r < 0.4) {
      // Spawn massive countryside scene chunk
      left  = makeCountrysideScene(1.2);
      right = makeCountrysideScene(1.2);
      left.position.set(-15.0, 0, z);
      right.position.set(15.0, 0, z);
      // Face them towards the track
      left.rotation.y = Math.PI / 2;
      right.rotation.y = -Math.PI / 2;
    } else if (r < 0.7) {
      // Ancient carved temple arch on one side, fountain on other
      left  = makeTempleArch(0.9);
      right = makeLotusFountain(0.85);
      left.position.set(-8.0, 0, z);
      right.position.set(8.2, 0, z);
    } else {
      // Smaller props or fallback
      left  = makeTempleArch(1.0);
      right = makeTempleArch(1.0);
      left.position.set(-8.8, 0, z);
      right.position.set(8.8, 0, z);
    }

    if (left.rotation.y === 0) left.rotation.y = Math.random() * Math.PI;
    if (right.rotation.y === 0) right.rotation.y = Math.random() * Math.PI;

    this.addPropFn(left);
    this.addPropFn(right);
    this._props.push(left, right);
    return [left, right];
  }

  _createFireflies(addPropFn) {
    const count = 180;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = 0.5 + Math.random() * 5.0; // close to ground
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70 - 25;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color:       0xFFEE66,
      size:        0.18,
      transparent: true,
      opacity:     0.75,
      depthWrite:  false,
    });

    this._fireflies = new THREE.Points(geo, mat);
    addPropFn(this._fireflies);
  }

  _disposeFireflies() {
    if (this._fireflies) {
      this._fireflies.geometry?.dispose();
      this._fireflies.material?.dispose();
      this.scene.remove(this._fireflies);
      this._fireflies = null;
    }
  }

  update(delta, worldAmount) {
    if (!this.active) return;

    // Gentle floating fireflies animation
    if (this._fireflies) {
      const pos = this._fireflies.geometry.attributes.position.array;
      const t   = Date.now() * 0.0015;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += Math.sin(t + pos[i]) * 0.006;
        pos[i + 2] += worldAmount;
        if (pos[i + 2] > 25) pos[i + 2] -= 70;
      }
      this._fireflies.geometry.attributes.position.needsUpdate = true;
    }

    // Scroll and recycle props
    this._props.forEach(prop => { prop.position.z += worldAmount; });

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

    // Spawn new props at the horizon
    const furthestZ = this._props.reduce((min, p) => Math.min(min, p.position.z), 0);
    if (furthestZ > -180) {
      this._spawnPropPair(furthestZ - PROP_INTERVAL);
    }
  }
}
