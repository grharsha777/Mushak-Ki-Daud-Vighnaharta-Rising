/**
 * TrainSequenceController.js
 * Scripted "Modak Train" sub-level:
 *   1. Train appears alongside track
 *   2. Mushak leaps aboard (camera shift)
 *   3. Player collects bonus modaks on train cars
 *   4. Mushak leaps off, run resumes
 *
 * Uses GSAP for smooth camera/character transitions.
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

const LANE_X     = [-3, 0, 3];
const TRAIN_Y    = 0.8;  // Height of train cars
const NUM_CARS   = 6;
const CAR_LENGTH = 5;

// ── Train Car Factory ────────────────────────────────────────────────────────
function makeTrainCar(color = 0xFF6600) {
  const group = new THREE.Group();

  // Car body
  const bodyGeo = new THREE.BoxGeometry(2.8, 1.4, CAR_LENGTH - 0.4);
  const body    = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 }));
  body.position.y = 1.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Roof
  const roofGeo = new THREE.BoxGeometry(2.8, 0.3, CAR_LENGTH - 0.4);
  const roof    = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0xFFAA44, roughness: 0.8 }));
  roof.position.y = 2.28;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Windows (recessed planes)
  for (let w = 0; w < 3; w++) {
    const winGeo = new THREE.PlaneGeometry(0.55, 0.45);
    const winMat = new THREE.MeshStandardMaterial({ color: 0xAADDFF, roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide });
    const win    = new THREE.Mesh(winGeo, winMat);
    win.position.set(1.42, 1.7, -1.5 + w * 1.5);
    win.rotation.y = Math.PI / 2;
    group.add(win);
    const win2 = win.clone();
    win2.position.x = -1.42;
    win2.rotation.y = -Math.PI / 2;
    group.add(win2);
  }

  // Wheels (cylinders)
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.2, 8);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, flatShading: true });
  [[-1, -1.8], [1, -1.8]].forEach(([side, z]) => {
    for (const wz of [-1.5, 1.5]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(side * 1.2, 0.38, wz);
      w.rotation.z = Math.PI / 2;
      group.add(w);
    }
  });

  group.castShadow = true;
  group.receiveShadow = true;
  return group;
}

// ── TrainSequenceController ──────────────────────────────────────────────────
export class TrainSequenceController {
  /**
   * @param {THREE.Scene}    scene
   * @param {Mushak}         mushak
   * @param {SceneManager}   sceneManager
   */
  constructor(scene, mushak, sceneManager) {
    this.scene        = scene;
    this.mushak       = mushak;
    this.sceneManager = sceneManager;

    this.started   = false;
    this.active    = false;
    this._cars     = [];
    this._modaks   = []; // bonus modak pickups on train
    this._time     = 0;
    this._duration = 8.0; // seconds on train
    this._onEnd    = null;
    this._onCollect = null;
  }

  /**
   * Trigger the train sequence.
   * @param {Function} onCollect  (type, value) callback for pickups
   * @param {Function} onEnd      Called when sequence finishes, game resumes
   */
  start(onCollect, onEnd) {
    if (this.started) return;
    this.started    = true;
    this.active     = true;
    this._time      = 0;
    this._onEnd     = onEnd;
    this._onCollect = onCollect;

    this._buildTrain();
    this._animateLeapOn();
  }

  _buildTrain() {
    const carColors = [0xFF6600, 0xFF8800, 0xFFAA00, 0xFF6600, 0xFF8800, 0xFFAA00];

    for (let i = 0; i < NUM_CARS; i++) {
      const car = makeTrainCar(carColors[i]);
      // Align train perfectly with where Mushak jumps (x = 3.8)
      car.position.set(3.8, 0, -10 - i * CAR_LENGTH);
      this.scene.add(car);
      this._cars.push(car);
    }

    // Place bonus modaks on top of each car
    carColors.forEach((_, i) => {
      const geo   = new THREE.SphereGeometry(0.3, 6, 5);
      const mat   = new THREE.MeshStandardMaterial({ color: 0xFF8C42, roughness: 0.4, emissive: 0x331100 });
      const modak = new THREE.Mesh(geo, mat);
      modak.position.set(3.8, 3.0, -10 - i * CAR_LENGTH);
      modak.userData = { active: true, type: 'modak', value: 25 };
      this.scene.add(modak);
      this._modaks.push(modak);
    });
  }

  _animateLeapOn() {
    // Move Mushak to the right and up onto the train (landing exactly on roof at x=3.8)
    gsap.to(this.mushak.mesh.position, {
      x: 3.8, y: 3.2,
      duration: 0.6,
      ease: 'power2.out',
    });
    // Camera pull right to follow
    gsap.to(this.sceneManager.camera.position, {
      x: 2.5,
      duration: 0.8,
      ease: 'power2.inOut',
    });
  }

  _animateLeapOff() {
    // Leap back to center lane
    gsap.to(this.mushak.mesh.position, {
      x: 0, y: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        this.active = false;
        this._cleanup();
        this._onEnd?.();
      },
    });
    // Camera back to center
    gsap.to(this.sceneManager.camera.position, {
      x: 0,
      duration: 0.8,
      ease: 'power2.inOut',
    });
  }

  /**
   * @param {number}   delta
   * @param {object}   session       Game session
   */
  update(delta, session) {
    if (!this.active) return;
    this._time += delta;

    const speed = session.gameSpeed;

    // Scroll train cars with the world
    this._cars.forEach(car => { car.position.z += speed * delta; });
    this._modaks.forEach(m => {
      if (!m.userData.active) return;
      m.position.z += speed * delta;
      m.rotation.y += delta * 2;

      // Pickup check
      const dx = m.position.x - this.mushak.mesh.position.x;
      const dy = m.position.y - this.mushak.mesh.position.y;
      const dz = m.position.z - this.mushak.mesh.position.z;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 1.5) {
        m.userData.active = false;
        m.visible = false;
        session.score += 25;
        session.modaks++;
        this._onCollect?.('modak', 25);
      }
    });

    // End sequence after duration
    if (this._time >= this._duration) {
      this._animateLeapOff();
    }
  }

  _cleanup() {
    this._cars.forEach(car => {
      this.scene.remove(car);
      car.traverse(c => {
        if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }
      });
    });
    this._modaks.forEach(m => {
      this.scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    });
    this._cars   = [];
    this._modaks = [];
  }

  dispose() {
    gsap.killTweensOf(this.mushak.mesh.position);
    gsap.killTweensOf(this.sceneManager.camera.position);
    this._cleanup();
  }
}
