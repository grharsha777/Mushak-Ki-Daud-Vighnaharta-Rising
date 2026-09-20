/**
 * ObjectPoolManager.js
 * Generic object pool — reuses Three.js meshes instead of create/destroy.
 * Prevents garbage-collection stutter that causes frame drops mid-run.
 *
 * Usage:
 *   pool.get('rock', createFn)   → returns an inactive mesh, activates it
 *   pool.release('rock', mesh)   → deactivates mesh, returns it to pool
 *   pool.clearAll()              → release all active objects to their pools
 */

export class ObjectPoolManager {
  /**
   * @param {THREE.Scene} scene  The Three.js scene to add/remove objects from
   */
  constructor(scene) {
    this.scene = scene;
    // pools: Map<string, { active: Set<Mesh>, inactive: Mesh[] }>
    this.pools = new Map();
    // Track all objects ever created, keyed by mesh object
    this.meshToType = new Map();
  }

  /**
   * Get an object from the pool (or create a new one if pool is empty).
   * @param {string}   type       Pool key (e.g., 'rock', 'modak')
   * @param {Function} createFn   Factory function — returns a new THREE.Object3D
   * @returns {THREE.Object3D}
   */
  get(type, createFn) {
    if (!this.pools.has(type)) {
      this.pools.set(type, { active: new Set(), inactive: [] });
    }
    const pool = this.pools.get(type);

    let obj;
    if (pool.inactive.length > 0) {
      obj = pool.inactive.pop();
    } else {
      obj = createFn();
      this.scene.add(obj);
      this.meshToType.set(obj, type);
    }

    obj.visible = true;
    pool.active.add(obj);
    return obj;
  }

  /**
   * Return an object to its pool.
   * @param {string}          type
   * @param {THREE.Object3D}  obj
   */
  release(type, obj) {
    if (!this.pools.has(type)) return;
    const pool = this.pools.get(type);
    if (!pool.active.has(obj)) return;

    obj.visible = false;
    obj.position.set(0, -100, 0); // move out of view
    pool.active.delete(obj);
    pool.inactive.push(obj);
  }

  /**
   * Release all currently active objects of a given type.
   * @param {string} type
   */
  releaseAll(type) {
    if (!this.pools.has(type)) return;
    const pool = this.pools.get(type);
    pool.active.forEach(obj => {
      obj.visible = false;
      obj.position.set(0, -100, 0);
      pool.inactive.push(obj);
    });
    pool.active.clear();
  }

  /**
   * Release ALL active objects across all pools.
   * Call this between game sessions to reset the world.
   */
  clearAll() {
    this.pools.forEach((pool, type) => this.releaseAll(type));
  }

  /**
   * Get the set of all currently active objects for a pool type.
   * Used by spawners to check/update active objects each frame.
   * @param {string} type
   * @returns {Set<THREE.Object3D>}
   */
  getActive(type) {
    if (!this.pools.has(type)) return new Set();
    return this.pools.get(type).active;
  }

  /**
   * Get count of active objects for a pool.
   * @param {string} type
   * @returns {number}
   */
  activeCount(type) {
    return this.getActive(type).size;
  }
}
