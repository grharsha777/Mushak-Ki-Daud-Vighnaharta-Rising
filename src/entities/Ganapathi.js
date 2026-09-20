/**
 * Ganapathi.js
 * Sri Ganapathi — the divine resolution of the game.
 * Always dignified, serene, and radiant. Never in distress. Never harmed.
 *
 * Low-poly procedural mesh: seated pose on a lotus, golden materials,
 * soft aura light. Appears at the boss finale sequence.
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

export class Ganapathi {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.mesh  = new THREE.Group();
    this._build();

    // Aura point light
    this.auraLight = new THREE.PointLight(0xFFD700, 0, 20, 1.5);
    this.auraLight.position.set(0, 5, 0);
    this.mesh.add(this.auraLight);

    // Initially invisible — revealed in boss sequence
    this.mesh.visible = false;
    this.mesh.position.set(0, 0, -55);
    scene.add(this.mesh);

    this._pulseTime = 0;
  }

  _build() {
    const gold     = new THREE.MeshStandardMaterial({ color: 0xFFD060, flatShading: true, roughness: 0.4, metalness: 0.3 });
    const deepGold = new THREE.MeshStandardMaterial({ color: 0xCC9900, flatShading: true, roughness: 0.4, metalness: 0.4 });
    const ivory    = new THREE.MeshStandardMaterial({ color: 0xFFFAE0, flatShading: true, roughness: 0.5, metalness: 0.0 });
    const saffron  = new THREE.MeshStandardMaterial({ color: 0xFF8C00, flatShading: true, roughness: 0.65, metalness: 0.0 });
    const red      = new THREE.MeshStandardMaterial({ color: 0xCC2200, flatShading: true, roughness: 0.7, metalness: 0.0 });

    // ── Lotus Seat ────────────────────────────────────────────────
    // Multi-layered lotus (stacked flattened cylinders)
    const lotusColors = [0xFF6699, 0xFF99BB, 0xFFBBCC];
    const lotusYs     = [0.05, 0.2, 0.32];
    const lotusRadii  = [2.0, 1.6, 1.2];
    lotusColors.forEach((col, i) => {
      const geo  = new THREE.CylinderGeometry(lotusRadii[i], lotusRadii[i] + 0.2, 0.18, 12);
      const mat  = new THREE.MeshLambertMaterial({ color: col, flatShading: true });
      const petal = new THREE.Mesh(geo, mat);
      petal.position.y = lotusYs[i];
      this.mesh.add(petal);
    });

    // ── Torso / Body ──────────────────────────────────────────────
    // Seated, large rounded torso
    const torsoGeo = new THREE.SphereGeometry(1.0, 7, 6);
    const torso    = new THREE.Mesh(torsoGeo, gold);
    torso.scale.set(1.2, 1.0, 0.85);
    torso.position.y = 1.5;
    torso.castShadow = true;
    this.mesh.add(torso);

    // ── Dhoti (lower clothing) ────────────────────────────────────
    const dhotiGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.8, 8);
    const dhoti    = new THREE.Mesh(dhotiGeo, saffron);
    dhoti.position.y = 0.85;
    this.mesh.add(dhoti);

    // ── Elephant Head ─────────────────────────────────────────────
    const headGeo = new THREE.SphereGeometry(0.78, 7, 6);
    this.head     = new THREE.Mesh(headGeo, gold);
    this.head.scale.set(1.1, 1.05, 0.95);
    this.head.position.y = 2.85;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // ── Large Elephant Ears ───────────────────────────────────────
    const earGeo = new THREE.SphereGeometry(0.62, 6, 5);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, gold);
      ear.scale.set(0.35, 0.7, 0.8);
      ear.position.set(side * 0.88, 2.8, 0);
      ear.rotation.z = side * 0.2;
      this.mesh.add(ear);
    }

    // ── Trunk (curved — series of decreasing spheres) ──────────────
    const trunkPoints = [
      [0,  2.25, 0.7],
      [0,  2.0,  0.9],
      [0.15, 1.75, 0.95],
      [0.3,  1.55, 0.85],
      [0.35, 1.4,  0.7],
    ];
    trunkPoints.forEach(([x, y, z], i) => {
      const r   = 0.2 - i * 0.025;
      const geo = new THREE.SphereGeometry(Math.max(r, 0.08), 5, 4);
      const seg = new THREE.Mesh(geo, deepGold);
      seg.position.set(x, y, z);
      this.mesh.add(seg);
    });

    // ── Single Tusk (dignified — one tusk shown) ──────────────────
    const tuskGeo = new THREE.ConeGeometry(0.08, 0.65, 5);
    const tusk    = new THREE.Mesh(tuskGeo, ivory);
    tusk.position.set(-0.3, 2.4, 0.72);
    tusk.rotation.x =  0.6;
    tusk.rotation.z = -0.2;
    this.mesh.add(tusk);

    // ── Crown (elaborate, layered cones) ──────────────────────────
    const crownBase = new THREE.CylinderGeometry(0.55, 0.65, 0.22, 8);
    const cb        = new THREE.Mesh(crownBase, deepGold);
    cb.position.y   = 3.55;
    this.mesh.add(cb);

    const crownSpire = new THREE.ConeGeometry(0.35, 0.8, 8);
    const cs         = new THREE.Mesh(crownSpire, gold);
    cs.position.y    = 4.1;
    this.mesh.add(cs);

    // Crown jewels (small spheres)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const jewel = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 5, 4),
        new THREE.MeshLambertMaterial({ color: 0xFF2244, flatShading: true })
      );
      jewel.position.set(
        Math.cos(angle) * 0.55, 3.58,
        Math.sin(angle) * 0.55
      );
      this.mesh.add(jewel);
    }

    // ── Four Arms (simplified — box sticks at cardinal angles) ────
    const armPositions = [
      { pos: [-1.1, 2.1, 0.2], rot: [0, 0,  0.6] },  // upper-left
      { pos: [ 1.1, 2.1, 0.2], rot: [0, 0, -0.6] },  // upper-right
      { pos: [-0.9, 1.4, 0.3], rot: [0, 0,  0.3] },  // lower-left
      { pos: [ 0.9, 1.4, 0.3], rot: [0, 0, -0.3] },  // lower-right
    ];
    const armGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    armPositions.forEach(({ pos, rot }) => {
      const arm = new THREE.Mesh(armGeo, gold);
      arm.position.set(...pos);
      arm.rotation.set(...rot);
      this.mesh.add(arm);
    });

    // ── Modak in hand (small, upper right arm) ────────────────────
    const modakGeo = new THREE.SphereGeometry(0.2, 5, 4);
    const modak    = new THREE.Mesh(modakGeo, saffron);
    modak.scale.y  = 1.3;
    modak.position.set(1.45, 2.6, 0.4);
    this.mesh.add(modak);

    // Scale up to be imposing but not overwhelming
    this.mesh.scale.setScalar(1.6);
  }

  /**
   * Fade Ganapathi in with a divine light burst.
   */
  reveal(onComplete) {
    this.mesh.visible = true;
    this.mesh.scale.setScalar(0.01);
    this.mesh.traverse(child => {
      if (child.isMesh) child.material.transparent = true;
    });

    // Scale in
    gsap.to(this.mesh.scale, {
      x: 1.6, y: 1.6, z: 1.6,
      duration: 1.5,
      ease: 'elastic.out(1, 0.6)',
    });

    // Fade aura light in
    gsap.to(this.auraLight, {
      intensity: 3,
      duration: 1.5,
      ease: 'power2.out',
      onComplete,
    });

    // Slow serene rotation
    gsap.to(this.mesh.rotation, {
      y: Math.PI * 0.05,
      duration: 6,
      ease: 'power1.inOut',
      repeat: -1,
      yoyo: true,
    });
  }

  /**
   * Per-frame update — gentle aura pulse.
   * @param {number} delta
   */
  update(delta) {
    this._pulseTime += delta;
    // Gentle aura pulse
    if (this.auraLight.intensity > 0) {
      this.auraLight.intensity = 3 + Math.sin(this._pulseTime * 2) * 0.6;
    }
  }

  dispose() {
    gsap.killTweensOf(this.mesh.scale);
    gsap.killTweensOf(this.mesh.rotation);
    gsap.killTweensOf(this.auraLight);
    this.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });
  }
}
