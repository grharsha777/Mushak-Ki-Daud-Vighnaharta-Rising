/**
 * jungle.js
 * Jungle biome — middle third of the run.
 * Visual: Dense lush tropical foliage, ancient stone temple arches,
 *         golden fireflies, rich atmospheric tropical dawn lighting.
 */

import * as THREE from 'three';
import { makeJungleTree1, makeBanyanTree, makeTropicalPalm, makeCloud, makeBird } from '../entities/EnvironmentProps.js';

export const JUNGLE_CFG = {
  skyColor:          0x87CEEB,  // Clear blue sky
  fogColor:          0xA0D6E8,  // Clear atmospheric mist
  fogNear:           120,       // Pushed back
  fogFar:            400,
  ambientColor:      0xFFFFFF,  // Bright natural light
  ambientIntensity:  0.9,
  sunColor:          0xFFF3C4,  // Golden sun
  sunIntensity:      2.0,
  groundColor:       0x4A6B46,  // Green grass only on ground
  trackColor:        0x5A6A5A,  
  railColor:         0x3E5B48,  
  lineColor:         0xFFFFFF,  
  lineEmissive:      0x888888,
};

const PROP_INTERVAL = 26;

export class JungleBiome {
  constructor(scene, pool) {
    this.scene       = scene;
    this.pool        = pool;
    this.active      = false;
    this._props      = [];
    this._skyProps   = [];
    this._nextZ      = -40;
  }

  get lightConfig() { return JUNGLE_CFG; }

  activate(addPropFn) {
    this.active    = true;
    this.addPropFn = addPropFn;
    this._nextZ    = -40;
    this._props    = [];
    this._skyProps = [];
    this._spawnInitialProps();
  }

  deactivate() {
    this.active = false;
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

    // Trees
    if (r < 0.33) {
      left  = this.pool.get('jungleTree1', () => makeJungleTree1());
      right = this.pool.get('jungleTree1', () => makeJungleTree1());
      left.userData.poolType = 'jungleTree1';
      right.userData.poolType = 'jungleTree1';
      left.position.set(-22.0, 0, z); 
      right.position.set(22.0, 0, z); 
    } else if (r < 0.66) {
      left  = this.pool.get('banyanTree', () => makeBanyanTree());
      right = this.pool.get('banyanTree', () => makeBanyanTree());
      left.userData.poolType = 'banyanTree';
      right.userData.poolType = 'banyanTree';
      left.position.set(-24.0, 0, z); 
      right.position.set(24.0, 0, z);
    } else {
      left  = this.pool.get('tropicalPalm', () => makeTropicalPalm());
      right = this.pool.get('tropicalPalm', () => makeTropicalPalm());
      left.userData.poolType = 'tropicalPalm';
      right.userData.poolType = 'tropicalPalm';
      left.position.set(-20.0, 0, z); 
      right.position.set(20.0, 0, z);
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

  update(delta, worldAmount) {
    if (!this.active) return;

    // Scroll and recycle ground props
    this._props.forEach(prop => { prop.position.z += worldAmount; });
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

    // Spawn new props at the horizon
    const furthestZ = this._props.reduce((min, p) => Math.min(min, p.position.z), 0);
    if (furthestZ > -180) {
      this._spawnPropPair(furthestZ - PROP_INTERVAL);
    }
  }
}
