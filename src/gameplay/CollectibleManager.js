/**
 * CollectibleManager.js
 * Spawns and manages modaks + ladoos using object pooling.
 * Handles pickup detection (sphere-sphere distance check — forgiving).
 * Updates score + devotion meter via callback.
 */

import * as THREE from 'three';
import { DESPAWN_Z } from '../core/SceneManager.js';

const LANE_X      = [-3, 0, 3];
const SPAWN_DEPTH = -70;
const PICKUP_DIST = 1.4; // units — forgiving pickup radius

// ── Collectible Mesh Factories ────────────────────────────────────────────────

/** Modak — characteristic dumpling shape: flattened sphere with a tapered top */
function makeModak() {
  const group = new THREE.Group();
  group.userData.type  = 'modak';
  group.userData.value = 10;

  // Body
  const bodyGeo = new THREE.SphereGeometry(0.3, 7, 6);
  const body    = new THREE.Mesh(bodyGeo,
    new THREE.MeshLambertMaterial({ color: 0xFF8C42, flatShading: true })
  );
  body.scale.y = 1.0;
  body.position.y = 0.3;
  group.add(body);

  // Top pleats (cone)
  const topGeo = new THREE.ConeGeometry(0.15, 0.3, 7);
  const top    = new THREE.Mesh(topGeo,
    new THREE.MeshLambertMaterial({ color: 0xFFAA66, flatShading: true })
  );
  top.position.y = 0.68;
  group.add(top);

  // Faint yellow inner glow suggestion (inner sphere, slightly smaller, lighter)
  const glowGeo = new THREE.SphereGeometry(0.2, 5, 4);
  const glow    = new THREE.Mesh(glowGeo,
    new THREE.MeshLambertMaterial({ color: 0xFFCC88, flatShading: true })
  );
  glow.position.y = 0.28;
  group.add(glow);

  return group;
}

/** Ladoo — round golden-yellow sphere */
function makeLadoo() {
  const group = new THREE.Group();
  group.userData.type  = 'ladoo';
  group.userData.value = 15;

  // Main ball
  const geo = new THREE.SphereGeometry(0.28, 7, 6);
  const mat = new THREE.MeshLambertMaterial({ color: 0xFFD700, flatShading: true });
  const ball = new THREE.Mesh(geo, mat);
  ball.position.y = 0.28;
  group.add(ball);

  // Surface bumps for texture interest
  const bumpGeo = new THREE.SphereGeometry(0.06, 4, 3);
  const bumpMat = new THREE.MeshLambertMaterial({ color: 0xFFEE88, flatShading: true });
  const bumpPositions = [
    [0.15, 0.4, 0.15],
    [-0.15, 0.35, 0.1],
    [0.1, 0.45, -0.15],
    [0, 0.5, 0.1],
  ];
  bumpPositions.forEach(([x, y, z]) => {
    const bump = new THREE.Mesh(bumpGeo, bumpMat);
    bump.position.set(x, y, z);
    group.add(bump);
  });

  return group;
}

const FACTORIES = {
  modak: makeModak,
  ladoo: makeLadoo,
};

// ── CollectibleManager ───────────────────────────────────────────────────────
export class CollectibleManager {
  /**
   * @param {THREE.Scene}       scene
   * @param {ObjectPoolManager} pool
   */
  constructor(scene, pool) {
    this.scene   = scene;
    this.pool    = pool;
    this._active = [];

    this._spawnTimer    = 0;
    this._spawnInterval = 1.2; // seconds between spawns
    this._bobTime       = 0;   // drives collectible bobbing animation
  }

  /**
   * @param {number}   delta
   * @param {object}   session         Current session data
   * @param {object}   levelCfg        Level config
   * @param {string}   biome
   * @param {object}   mushakPos       {x, y, z}
   * @param {Function} onCollect       (type, value) callback
   */
  update(delta, session, levelCfg, biome, mushakPos, onCollect) {
    this._bobTime += delta * 3;

    for (let i = this._active.length - 1; i >= 0; i--) {
      const col = this._active[i];

      // Move toward camera
      col.position.z += session.gameSpeed * delta;

      // Bob animation
      col.position.y = col.userData.baseY + Math.sin(this._bobTime + i * 0.8) * 0.18;
      col.rotation.y += delta * 1.5;

      // Pickup check
      const dx = col.position.x - mushakPos.x;
      const dy = col.position.y - mushakPos.y - 0.8; // approx center of Mushak
      const dz = col.position.z - mushakPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy * 0.5 + dz * dz);

      if (dist < PICKUP_DIST) {
        onCollect(col.userData.type, col.userData.value);
        this._despawn(i);
        continue;
      }

      // Despawn behind player
      if (col.position.z > DESPAWN_Z) {
        this._despawn(i);
      }
    }

    // Spawn timer
    this._spawnTimer += delta;
    const cfg      = levelCfg?.biomes?.[biome];
    const interval = this._spawnInterval / (session.gameSpeed / 12);

    if (this._spawnTimer >= Math.max(0.6, interval)) {
      this._spawnTimer = 0;
      this._spawnCollectible(biome, levelCfg);
    }
  }

  _spawnCollectible(biome, levelCfg) {
    const cfg   = levelCfg?.biomes?.[biome];
    const table = cfg?.collectibleSpawnTable || [{ type: 'modak', weight: 1, value: 10 }];
    const type  = this._weightedRandom(table, 'type') || 'modak';
    const value = table.find(e => e.type === type)?.value || 10;

    // Pattern: single, line of 3 in same lane, or arc across 3 lanes
    const patternRoll = Math.random();
    const patterns    = [];

    if (patternRoll < 0.5) {
      // Single
      const lane = Math.floor(Math.random() * 3);
      patterns.push({ lane, z: 0 });
    } else if (patternRoll < 0.8) {
      // Row of 3 in different lanes at same Z
      patterns.push({ lane: 0, z: 0 }, { lane: 1, z: 0 }, { lane: 2, z: 0 });
    } else {
      // Arc: staggered across lanes
      const base = Math.floor(Math.random() * 2); // 0 or 1
      patterns.push(
        { lane: base,     z:  0 },
        { lane: base + 1, z: -6 },
        { lane: base,     z: -12 }
      );
    }

    patterns.forEach(({ lane, z }) => {
      const factory = FACTORIES[type];
      if (!factory) return;
      const col = this.pool.get(type, factory);
      col.userData.type  = type;
      col.userData.value = value;
      const baseY = (type === 'demonThrow') ? 1.5 : 0.9;
      col.userData.baseY = baseY;
      col.position.set(LANE_X[lane], baseY, SPAWN_DEPTH + z);
      col.visible = true;
      this._active.push(col);
    });
  }

  _despawn(index) {
    const col = this._active[index];
    this.pool.release(col.userData.type, col);
    this._active.splice(index, 1);
  }

  _weightedRandom(table, key) {
    const total = table.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const entry of table) {
      r -= entry.weight;
      if (r <= 0) return entry[key];
    }
    return table[0]?.[key];
  }

  clear() {
    this._active.forEach(col => this.pool.release(col.userData.type, col));
    this._active = [];
    this._spawnTimer = 0;
  }
}
