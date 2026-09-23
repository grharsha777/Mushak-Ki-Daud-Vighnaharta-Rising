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
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700, emissive: 0xCC8800, emissiveIntensity: 0.2,
      metalness: 0.9, roughness: 0.2, flatShading: true
    });
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xFF69B4, emissive: 0xFF1493, emissiveIntensity: 0.4,
      metalness: 0.1, roughness: 0.8, flatShading: true
    });

    const bodyGroup = new THREE.Group();

    // ── 1. Lotus Base ──
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.5, 4), lotusMat);
      petal.position.set(Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2);
      petal.rotation.z = Math.cos(angle) * 1.2;
      petal.rotation.x = Math.sin(angle) * 1.2;
      petal.rotation.y = -angle;
      bodyGroup.add(petal);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 0.4, 16), goldMat);
    bodyGroup.add(base);

    // ── 2. Torso (Belly) ──
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), goldMat);
    belly.scale.set(1, 0.9, 1);
    belly.position.y = 1.2;
    bodyGroup.add(belly);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), goldMat);
    chest.position.y = 2.2;
    bodyGroup.add(chest);

    // ── 3. Head & Trunk ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), goldMat);
    head.position.y = 3.2;
    bodyGroup.add(head);

    // Curve trunk using multiple overlapping spheres
    for (let i = 0; i < 8; i++) {
      const trunkSeg = new THREE.Mesh(new THREE.SphereGeometry(0.3 - i*0.02, 12, 12), goldMat);
      // Curve down and to the left (sweet tooth side)
      trunkSeg.position.set(Math.sin(i*0.4)*0.2, 3.2 - i*0.25, 0.7 + Math.sin(i*0.3)*0.3);
      bodyGroup.add(trunkSeg);
    }

    // Big Ears
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16), goldMat);
    earL.rotation.x = Math.PI / 2;
    earL.rotation.y = -0.3;
    earL.position.set(-1.0, 3.2, 0.2);
    bodyGroup.add(earL);
    
    const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16), goldMat);
    earR.rotation.x = Math.PI / 2;
    earR.rotation.y = 0.3;
    earR.position.set(1.0, 3.2, 0.2);
    bodyGroup.add(earR);

    // Crown (Mukut)
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), goldMat);
    crown.position.y = 4.3;
    bodyGroup.add(crown);

    // ── 4. Arms (4 Arms) ──
    const armGeo = new THREE.CapsuleGeometry(0.25, 1.2, 4, 8);
    // Back Left (holding axe/lotus)
    const armBL = new THREE.Mesh(armGeo, goldMat);
    armBL.rotation.z = Math.PI / 3;
    armBL.position.set(-1.4, 2.6, -0.2);
    bodyGroup.add(armBL);
    // Back Right
    const armBR = new THREE.Mesh(armGeo, goldMat);
    armBR.rotation.z = -Math.PI / 3;
    armBR.position.set(1.4, 2.6, -0.2);
    bodyGroup.add(armBR);
    // Front Left (Modak bowl)
    const armFL = new THREE.Mesh(armGeo, goldMat);
    armFL.rotation.x = -Math.PI / 3;
    armFL.position.set(-0.9, 1.8, 0.8);
    bodyGroup.add(armFL);
    // Front Right (Blessing mudra)
    const armFR = new THREE.Mesh(armGeo, goldMat);
    armFR.rotation.x = -Math.PI / 3;
    armFR.position.set(0.9, 1.8, 0.8);
    bodyGroup.add(armFR);

    // ── 5. Legs (Seated) ──
    const legGeo = new THREE.CapsuleGeometry(0.35, 1.5, 8, 8);
    const legL = new THREE.Mesh(legGeo, goldMat);
    legL.rotation.z = Math.PI / 2;
    legL.position.set(-0.8, 0.6, 0.8);
    bodyGroup.add(legL);
    const legR = new THREE.Mesh(legGeo, goldMat);
    legR.rotation.z = -Math.PI / 2;
    legR.position.set(0.8, 0.6, 0.8);
    bodyGroup.add(legR);

    bodyGroup.position.y = 0;
    this.mesh.add(bodyGroup);
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
