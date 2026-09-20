/**
 * HimalayaBackground.js
 * Dedicated scrolling background for the Himalaya biome.
 * Places the snowy mountain GLB far behind and to the sides of the track
 * as pure background scenery — never touching the playground.
 */

import * as THREE from 'three';
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let _cachedScene = null;
let _loadPromise = null;

/** Names of nodes we HIDE so they don't cover the game track */
const HIDE_NODES = ['SNOW_FLOOR', 'SNOWY_ROAD', 'ROAD_MARKING', 'ROAD_SNOW_OVERLAY_TILING',
                    'MESSY_SNOW_DECAL', 'DIRTY_SNOW_DECAL', 'SNOW_EDGE', 'ROAD_POLE', 'MIST'];

function loadSnowyScene() {
  if (_cachedScene) return Promise.resolve(_cachedScene);
  if (_loadPromise) return _loadPromise;

  const loader      = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  loader.setDRACOLoader(dracoLoader);

  _loadPromise = new Promise((resolve, reject) => {
    loader.load('/models/snowy_mountain_draco.glb', (gltf) => {
      const root = gltf.scene;

      // Hide road/floor nodes so only mountains + trees + cliff remain
      root.traverse((child) => {
        // Hide by node name
        const n = child.name || '';
        for (const hide of HIDE_NODES) {
          if (n.includes(hide)) { child.visible = false; break; }
        }

        if (child.isMesh) {
          child.frustumCulled = false;
          child.castShadow    = false;  // background doesn't need shadows
          child.receiveShadow = false;
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => { m.side = THREE.DoubleSide; });
          }
        }
      });

      // Compute bounding box of what's left visible
      const box    = new THREE.Box3().setFromObject(root);
      const center = new THREE.Vector3();
      const size   = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);

      console.log(`[HimalayaBG] Filtered scene size: ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)}`);
      console.log(`[HimalayaBG] box min Y: ${box.min.y}, max Y: ${box.max.y}, center: ${center.y}`);
      console.log(`[HimalayaBG] root position: ${root.position.toArray()}, rotation: ${root.rotation.toArray()}, scale: ${root.scale.toArray()}`);

      // Wrap the root so we don't destroy its baked blender transforms (like X rotation)
      const wrapper = new THREE.Group();
      wrapper.add(root);

      // Scale so mountains are 60 units TALL (Y is key, not max dim)
      const targetHeight = 60;
      // We know size.y is around 298. scaleF will be ~0.2.
      const scaleF = targetHeight / Math.max(size.y, 0.001);

      // Do not shift Y by box.min.y! The original model likely has its surface at Y=0.
      // If we shift by min.y, we pull the underground up to the player's level, making them walk under the mesh!
      wrapper.position.set(
        -center.x * scaleF,
        -15,  // Drop it down a bit so the track sits nicely on the snow
        -center.z * scaleF
      );
      wrapper.scale.setScalar(scaleF);

      _cachedScene = wrapper;
      resolve(wrapper);
    }, undefined, (err) => {
      console.error('[HimalayaBG] Load error', err);
      reject(err);
    });
  });

  return _loadPromise;
}

// ── Tile system ───────────────────────────────────────────────────────────────
const TILE_DEPTH = 200;

export class HimalayaBackground {
  constructor(scene, tileCount = 3) {
    this._scene     = scene;
    this._tileCount = tileCount;
    this._tiles     = [];
    this._active    = false;
    this._ready     = false;
    this._headZ     = 0;

    loadSnowyScene()
      .then(() => { this._ready = true; if (this._active) this._buildInitialTiles(); })
      .catch(() => {});
  }

  activate() {
    this._active = true;
    this._headZ  = 0;
    this._clearTiles();
    if (this._ready) this._buildInitialTiles();
  }

  deactivate() {
    this._active = false;
    this._clearTiles();
  }

  update(worldScroll) {
    if (!this._active || !this._ready) return;

    for (const tile of this._tiles) {
      tile.group.position.z += worldScroll;
      tile.z                += worldScroll;
    }

    for (let i = this._tiles.length - 1; i >= 0; i--) {
      const tile = this._tiles[i];
      if (tile.z > TILE_DEPTH * 0.6) {
        const newZ = this._headZ - TILE_DEPTH;
        tile.group.position.z = newZ;
        tile.z                = newZ;
        this._headZ           = newZ;
      }
    }
  }

  _buildInitialTiles() {
    for (let i = 0; i < this._tileCount; i++) {
      const z = -i * TILE_DEPTH;
      this._spawnTile(z);
      this._headZ = z;
    }
  }

  _spawnTile(z) {
    if (!_cachedScene) return;

    const group = new THREE.Group();

    // LEFT mountain backdrop
    const leftWrap = new THREE.Group();
    const left = _cachedScene.clone(true);
    left.traverse(c => { if (c.isMesh) c.frustumCulled = false; });
    leftWrap.add(left);
    // Push it far to the left so the 165-unit wide mountain doesn't cover the track
    leftWrap.position.set(-100, 0, 0);
    group.add(leftWrap);

    // RIGHT mountain backdrop (mirrored)
    const rightWrap = new THREE.Group();
    const right = _cachedScene.clone(true);
    right.traverse(c => { if (c.isMesh) c.frustumCulled = false; });
    rightWrap.add(right);
    rightWrap.scale.set(-1, 1, 1);  // mirror X only
    // Push it far to the right
    rightWrap.position.set(100, 0, 0);
    group.add(rightWrap);

    group.position.set(0, 0, z);

    this._scene.add(group);
    this._tiles.push({ group, z });
  }

  _clearTiles() {
    for (const tile of this._tiles) {
      this._scene.remove(tile.group);
      tile.group.traverse(c => { if (c.isMesh) c.geometry?.dispose(); });
    }
    this._tiles = [];
  }
}
