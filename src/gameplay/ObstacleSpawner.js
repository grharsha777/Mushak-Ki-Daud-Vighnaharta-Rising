/**
 * ObstacleSpawner.js
 * Reads level config to spawn and pool obstacles.
 * Runs AABB collision detection against Mushak each frame.
 *
 * Obstacle types:
 *   rock       — IcosahedronGeometry, gray, must jump or switch lanes
 *   fireBurst  — CylinderGeometry with cone top, orange, must slide or switch lanes
 *   iceBlock   — BoxGeometry, blue-white, must jump or switch
 *   demonThrow — sphere thrown by demon, must dodge any direction
 */

import * as THREE from 'three';
import { SPAWN_Z, DESPAWN_Z } from '../core/SceneManager.js';

const LANE_X       = [-3, 0, 3];
const SPAWN_DEPTH  = -75;

// ── Obstacle mesh factories ───────────────────────────────────────────────────

/** High-visibility fallen temple pillar with glowing golden sacred glyphs (replaces small rocks) */
function makeTemplePillar() {
  const group = new THREE.Group();
  group.userData.type  = 'rock'; // keeps compatibility with config & collision system
  group.userData.halfH = 0.55;  // jumpable!
  group.userData.halfW = 1.15;

  const stoneMat = new THREE.MeshStandardMaterial({
    color:       0x8A8072,
    roughness:   0.8,
    metalness:   0.1,
    flatShading: true,
  });

  // Main horizontal fallen column shaft
  const shaftGeo = new THREE.CylinderGeometry(0.42, 0.42, 2.3, 7);
  const shaft    = new THREE.Mesh(shaftGeo, stoneMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.y = 0.42;
  shaft.castShadow = true;
  group.add(shaft);

  // Carved stone capitals on both ends
  [-1.15, 1.15].forEach(x => {
    const capGeo = new THREE.BoxGeometry(0.25, 0.95, 0.95);
    const cap    = new THREE.Mesh(capGeo, stoneMat);
    cap.position.set(x, 0.47, 0);
    cap.castShadow = true;
    group.add(cap);
  });

  // Glowing golden rune rings (makes the obstacle instantly visible from afar!)
  const runeMat = new THREE.MeshStandardMaterial({
    color:             0xFFD700,
    emissive:          0xFFAA00,
    emissiveIntensity: 0.7,
    roughness:         0.3,
  });
  [-0.5, 0.5].forEach(x => {
    const rGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.15, 8);
    const ring = new THREE.Mesh(rGeo, runeMat);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(x, 0.42, 0);
    group.add(ring);
  });

  return group;
}

/** Tall royal spiked roadblock barricade — unmistakable Subway Surfers style hazard */
function makeSpikedBarricade() {
  const group = new THREE.Group();
  group.userData.type  = 'spikedBarricade';
  group.userData.halfH = 1.35; // tall, must switch lanes!
  group.userData.halfW = 1.25;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x54361C, roughness: 0.9, flatShading: true });
  const redMat  = new THREE.MeshStandardMaterial({ color: 0xD82424, emissive: 0x660000, emissiveIntensity: 0.3, roughness: 0.7 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 0.5, roughness: 0.3 });

  // Flanking vertical support posts
  [-1.1, 1.1].forEach(x => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.28), woodMat);
    post.position.set(x, 1.3, 0);
    post.castShadow = true;
    group.add(post);

    // Brass cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 5), goldMat);
    cap.position.set(x, 2.7, 0);
    group.add(cap);
  });

  // Horizontal warning crossbeams with red/white hazard pattern
  const beam1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.18), redMat);
  beam1.position.set(0, 1.8, 0);
  beam1.castShadow = true;
  group.add(beam1);

  const beam2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.18), woodMat);
  beam2.position.set(0, 0.9, 0);
  beam2.castShadow = true;
  group.add(beam2);

  // Top brass spikes
  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 4), goldMat);
    spike.position.set(-0.9 + i * 0.45, 2.2, 0);
    group.add(spike);
  }

  return group;
}

/** Flaming Demon Brazier with blazing fire leaping upward */
function makeFireBurst() {
  const group = new THREE.Group();
  group.userData.type  = 'fireBurst';
  group.userData.halfH = 1.3;
  group.userData.halfW = 0.65;

  // Ornate bronze cauldron base
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x8C5020, metalness: 0.4, roughness: 0.6, flatShading: true });
  const baseGeo   = new THREE.CylinderGeometry(0.55, 0.35, 0.7, 7);
  const base      = new THREE.Mesh(baseGeo, bronzeMat);
  base.position.y = 0.35;
  base.castShadow = true;
  group.add(base);

  // Leaping fire flames (bright emissive radiant glow)
  const flameTiers = [
    { r: 0.52, h: 1.1, y: 0.9,  c: 0xFF2200, e: 0xFF1100, i: 1.2 },
    { r: 0.38, h: 0.9, y: 1.45, c: 0xFF7700, e: 0xFF5500, i: 1.5 },
    { r: 0.22, h: 0.7, y: 1.95, c: 0xFFEE00, e: 0xFFCC00, i: 1.8 },
  ];

  flameTiers.forEach(f => {
    const geo = new THREE.ConeGeometry(f.r, f.h, 6);
    const mat = new THREE.MeshStandardMaterial({
      color:             f.c,
      emissive:          f.e,
      emissiveIntensity: f.i,
      roughness:         0.2,
      flatShading:       true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = f.y;
    group.add(mesh);
  });

  return group;
}

/** Mystic Ice Obelisk with glowing cyan crystalline facets */
function makeIceBlockObstacle() {
  const group = new THREE.Group();
  group.userData.type  = 'iceBlock';
  group.userData.halfH = 0.85;
  group.userData.halfW = 0.75;

  const iceMat = new THREE.MeshStandardMaterial({
    color:             0x80D8FF,
    emissive:          0x0091EA,
    emissiveIntensity: 0.4,
    roughness:         0.2,
    metalness:         0.1,
    flatShading:       true,
  });

  const geo  = new THREE.BoxGeometry(1.2, 1.2, 1.1);
  const mesh = new THREE.Mesh(geo, iceMat);
  mesh.position.y = 0.6;
  mesh.rotation.y = 0.35;
  mesh.castShadow = true;
  group.add(mesh);

  // Sharp frosted ice pinnacle on top
  const shardGeo = new THREE.ConeGeometry(0.35, 0.9, 5);
  const shardMat = new THREE.MeshStandardMaterial({
    color:             0xE1F5FE,
    emissive:          0x40C4FF,
    emissiveIntensity: 0.6,
    roughness:         0.1,
    flatShading:       true,
  });
  const shard = new THREE.Mesh(shardGeo, shardMat);
  shard.position.y = 1.55;
  shard.rotation.y = 0.6;
  group.add(shard);

  return group;
}

/** Glowing flaming projectile launched by the chasing demon */
function makeDemonThrow() {
  const group = new THREE.Group();
  group.userData.type  = 'demonThrow';
  group.userData.halfH = 0.4;
  group.userData.halfW = 0.4;

  const orbMat = new THREE.MeshStandardMaterial({
    color:             0xFF4400,
    emissive:          0xFF2200,
    emissiveIntensity: 1.4,
    roughness:         0.3,
    flatShading:       true,
  });
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), orbMat);
  orb.position.y = 1.0; // mid-height
  group.add(orb);

  // Trailing flame spikes
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), orbMat);
    spike.position.set(Math.cos(ang) * 0.25, 1.0, Math.sin(ang) * 0.25);
    spike.rotation.z = Math.cos(ang) * 0.5;
    group.add(spike);
  }

  return group;
}

/** Low overhead temple stone crossbeam lintel — requires sliding down underneath! */
function makeOverheadBarricade() {
  const group = new THREE.Group();
  group.userData.type       = 'overheadBarricade';
  group.userData.halfH      = 0.55;
  group.userData.halfW      = 1.25;
  group.userData.isOverhead = true;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4A5546, roughness: 0.85, flatShading: true });
  const goldMat  = new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 0.7, roughness: 0.25 });

  // Flanking pillars
  [-1.25, 1.25].forEach(x => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), stoneMat);
    col.position.set(x, 1.6, 0);
    group.add(col);
  });

  // Low overhead crossbeam lintel at Y=1.75 (hangs down to Y=1.35)
  // Upright player (height 1.85) hits it! Sliding player (height 0.83) ducks under!
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 0.5), stoneMat);
  lintel.position.set(0, 1.75, 0);
  lintel.castShadow = true;
  group.add(lintel);

  // Glowing golden warning emblem
  const glyph = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.55), goldMat);
  glyph.position.set(0, 1.75, 0);
  group.add(glyph);

  return group;
}

const FACTORIES = {
  rock:              makeTemplePillar,    // Replaced small stone with grand fallen temple pillar!
  templePillar:      makeTemplePillar,
  spikedBarricade:   makeSpikedBarricade,
  fireBurst:         makeFireBurst,
  overheadBarricade: makeOverheadBarricade,
  iceBlock:          makeIceBlockObstacle,
  demonThrow:        makeDemonThrow,
};

// ── ObstacleSpawner ──────────────────────────────────────────────────────────
export class ObstacleSpawner {
  /**
   * @param {THREE.Scene}       scene
   * @param {ObjectPoolManager} pool
   */
  constructor(scene, pool) {
    this.scene = scene;
    this.pool  = pool;

    this._spawnTimer      = 0;
    this._spawnInterval   = 2.5; // seconds between spawns
    this._active          = [];  // currently active obstacles

    // Invincibility window: obstacles don't kill after a hit
    this._hitCooldown     = 0;
  }

  /**
   * @param {number} delta
   * @param {object} session         Game session data
   * @param {object} diffMod         Difficulty modifier
   * @param {string} biome           Current biome name
   * @param {object} levelCfg        Level config biome data
   * @param {object} mushakBounds    From mushak.getBounds()
   * @param {Function} onHit         Called when Mushak is hit
   */
  update(delta, session, diffMod, biome, levelCfg, mushakBounds, onHit) {
    this._hitCooldown = Math.max(0, this._hitCooldown - delta);

    // Move all active obstacles toward camera
    for (let i = this._active.length - 1; i >= 0; i--) {
      const obs = this._active[i];
      obs.position.z += session.gameSpeed * delta;

      // Rotate rocks for visual interest
      if (obs.userData.type === 'rock' || obs.userData.type === 'demonThrow') {
        obs.rotation.x += delta * 2;
        obs.rotation.y += delta * 1.5;
      }

      // Collision check (AABB)
      if (this._hitCooldown <= 0 && this._collides(obs, mushakBounds)) {
        this._hitCooldown = 2.0; // 2s invincibility window
        onHit(obs.userData.type);
      }

      // Despawn behind player
      if (obs.position.z > DESPAWN_Z) {
        this._despawn(i);
      }
    }

    // Spawn timer
    this._spawnTimer += delta;
    const cfg      = levelCfg?.biomes?.[biome];
    const interval = (cfg?.obstacleSpawnInterval || 2.5) * (diffMod?.spawnIntervalMult || 1.0);

    if (this._spawnTimer >= interval) {
      this._spawnTimer = 0;
      this._spawnObstacle(biome, levelCfg, diffMod);
    }
  }

  _spawnObstacle(biome, levelCfg, diffMod) {
    const cfg = levelCfg?.biomes?.[biome];
    if (!cfg) return;

    // Weighted random obstacle type
    const table  = cfg.obstacleSpawnTable || [];
    const type   = this._weightedRandom(table, 'type') || 'rock';
    const lanes  = table.find(e => e.type === type)?.lanes || [0, 1, 2];
    const lane   = lanes[Math.floor(Math.random() * lanes.length)];

    // Decide pattern: single obstacle, pair, or triple gap
    const patternRoll = Math.random();
    const lanesToSpawn = [lane];

    if (patternRoll > 0.75) {
      // Two adjacent lanes blocked (one escape route)
      const alt = lane === 1 ? 0 : lane === 0 ? 1 : 1;
      lanesToSpawn.push(alt);
    }
    // patternRoll <= 0.75: single lane (easiest)

    lanesToSpawn.forEach(l => {
      const factory = FACTORIES[type];
      if (!factory) return;

      const obs = this.pool.get(type, factory);
      obs.position.set(LANE_X[l], 0, SPAWN_DEPTH);
      obs.visible = true;
      this._active.push(obs);
    });
  }

  _despawn(index) {
    const obs = this._active[index];
    this.pool.release(obs.userData.type, obs);
    this._active.splice(index, 1);
  }

  /**
   * Simple AABB collision check.
   */
  _collides(obs, mb) {
    const ox  = obs.position.x;
    const oy  = obs.position.y;
    const oz  = obs.position.z;
    const hw  = obs.userData.halfW || 0.5;
    const hh  = obs.userData.halfH || 0.6;

    // Only check if obstacle is near player (within ±2.5 units on Z)
    if (Math.abs(oz - mb.z) > 2.5) return false;

    const xOverlap = ox - hw < mb.maxX && ox + hw > mb.minX;

    // If it's a low overhead obstacle, player ducks safely underneath if sliding!
    if (obs.userData.isOverhead) {
      const hitsOverhead = mb.maxY > 1.25;
      return xOverlap && hitsOverhead;
    }

    const yOverlap = oy < mb.maxY && oy + hh * 2 > mb.minY;
    return xOverlap && yOverlap;
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

  /** Remove and pool all active obstacles (call on session reset). */
  clear() {
    this._active.forEach(obs => {
      this.pool.release(obs.userData.type, obs);
    });
    this._active = [];
    this._spawnTimer = 0;
  }
}
