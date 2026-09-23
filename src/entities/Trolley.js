/**
 * Trolley.js — Royal Temple Minecart / Trolley
 * ═══════════════════════════════════════════════════════════════════════
 * Temple Run / Subway Surfers style interactive Minecart for Sri Mushak:
 * - Ornate sacred brass/gold chassis with engraved lotus emblems & rivets.
 * - Glowing jewel lantern headlight casting light onto the rails ahead.
 * - 4 spinning flanged steel wheels on axles that emit dynamic spark particles.
 * - Dynamic banking/tilting into curves during sideways track crossing.
 * - High-flying trolley leaps when jumping over track fire.
 * - Low ducking slide when clearing low overhead stone block beams.
 * ═══════════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

export class Trolley {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    scene.add(this.mesh);

    this.active = false;
    this.tiltAngle = 0;
    this.wheelRotation = 0;
    this.isJumping = false;
    this.isSliding = false;

    this.wheels = [];
    this._sparks = [];

    this._buildTrolley();
    this._buildSparkEmitter();

    this.mesh.visible = false;
  }

  _buildTrolley() {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.25,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xB8860B,
      metalness: 0.75,
      roughness: 0.35,
    });

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x2A2E33,
      metalness: 0.9,
      roughness: 0.2,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5C3A21,
      roughness: 0.8,
    });

    this.cartBody = new THREE.Group();
    this.mesh.add(this.cartBody);
    
    // Scale up the trolley to make it bigger for Mushak
    this.mesh.scale.set(1.5, 1.5, 1.5);

    // 1. Wooden plank floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 2.0), woodMat);
    floor.position.y = 0.45;
    floor.castShadow = true;
    this.cartBody.add(floor);

    // 2. Brass paneled walls with golden reinforced corners
    // Front & Back
    [1.0, -1.0].forEach(z => {
      const endWall = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.85, 0.12), brassMat);
      endWall.position.set(0, 0.85, z);
      endWall.castShadow = true;
      this.cartBody.add(endWall);

      // Gold top rim
      const rim = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.16), goldMat);
      rim.position.set(0, 1.28, z);
      this.cartBody.add(rim);
    });

    // Left & Right Sides
    [-0.82, 0.82].forEach(x => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 2.0), brassMat);
      sideWall.position.set(x, 0.85, 0);
      sideWall.castShadow = true;
      this.cartBody.add(sideWall);

      // Gold side rim
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 2.08), goldMat);
      rim.position.set(x, 1.28, 0);
      this.cartBody.add(rim);
    });

    // 3. Ornate Carved Lotus Emblem on front plate
    const lotusGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 8);
    const lotus = new THREE.Mesh(lotusGeo, goldMat);
    lotus.rotation.x = Math.PI / 2;
    lotus.position.set(0, 0.85, -1.08);
    this.cartBody.add(lotus);

    // 4. Glowing Jewel Lantern Headlight
    const lanternGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xFFEA70,
      emissive: 0xFFC107,
      emissiveIntensity: 3.0,
      roughness: 0.1,
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0, 0.95, -1.18);
    this.cartBody.add(lantern);

    // Headlight beam spotlight
    this.headlight = new THREE.SpotLight(0xFFE57F, 3.5, 30, Math.PI / 6, 0.4, 1.5);
    this.headlight.position.set(0, 0.95, -1.2);
    this.headlight.target.position.set(0, 0, -15);
    this.cartBody.add(this.headlight);
    this.cartBody.add(this.headlight.target);

    // 5. Four Flanged Steel Wheels & Heavy Axles
    [[-0.88, -0.65], [0.88, -0.65], [-0.88, 0.65], [0.88, 0.65]].forEach(([x, z], idx) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, 0.35, z);
      this.mesh.add(wheelGroup);

      // Outer rim
      const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.14, 12), ironMat);
      rimMesh.rotation.z = Math.PI / 2;
      wheelGroup.add(rimMesh);

      // Flange (inner guide ridge)
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12), ironMat);
      flange.rotation.z = Math.PI / 2;
      flange.position.x = (x > 0) ? -0.06 : 0.06;
      wheelGroup.add(flange);

      // Brass hubcap
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), goldMat);
      hub.position.x = (x > 0) ? 0.08 : -0.08;
      wheelGroup.add(hub);

      this.wheels.push(wheelGroup);
    });

    // Axles connecting left and right wheels
    [-0.65, 0.65].forEach(z => {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.76, 6), ironMat);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, 0.35, z);
      this.mesh.add(axle);
    });
  }

  _buildSparkEmitter() {
    const sparkCount = 40;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(sparkCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xFFDD44,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sparkPoints = new THREE.Points(geo, mat);
    this.mesh.add(this.sparkPoints);

    for (let i = 0; i < sparkCount; i++) {
      this._sparks.push({
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0,
        maxLife: 1,
      });
    }
  }

  /** Mount Mushak into the Trolley */
  mount(mushak) {
    this.active = true;
    this.mesh.visible = true;
    this.mushakRef = mushak;
    this._mounting = true;

    // Position trolley at Mushak's lane
    this.mesh.position.copy(mushak.mesh.position);
    this.mesh.position.y = 0;

    // Animate Mushak boarding the trolley smoothly
    gsap.to(mushak.mesh.position, {
      y: 1.0,
      duration: 0.35,
      ease: 'power2.out',
      onComplete: () => {
        this._mounting = false;
      }
    });
  }

  /** Dismount Mushak and hide trolley */
  dismount() {
    this._dismounting = true;
    if (this.mushakRef) {
      gsap.to(this.mushakRef.mesh.position, {
        y: 0.1, // Ground level
        duration: 0.35,
        ease: 'power2.in',
      });
    }
    gsap.to(this.mesh.position, {
      z: this.mesh.position.z - 30, // Drop behind
      opacity: 0,
      duration: 0.6,
      onComplete: () => {
        this.active = false;
        this.mesh.visible = false;
        this._dismounting = false;
        this.mushakRef = null;
      }
    });
  }

  /** Jump the trolley over fire */
  jump() {
    if (this.isJumping || this.isSliding) return;
    this.isJumping = true;

    gsap.to(this.mesh.position, {
      y: 3.0,
      duration: 0.36,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this.mesh.position, {
          y: 0,
          duration: 0.34,
          ease: 'power2.in',
          onComplete: () => {
            this.isJumping = false;
            this.triggerWheelImpactSparks();
          }
        });
      }
    });

    // Pitch leap up and level out
    gsap.to(this.cartBody.rotation, { x: -0.22, duration: 0.22, yoyo: true, repeat: 1 });
  }

  /** Slide/duck the trolley under overhead obstacle blocks */
  slide() {
    if (this.isJumping || this.isSliding) return;
    this.isSliding = true;

    // Duck trolley profile down with bright rail scraping sparks!
    gsap.to(this.cartBody.scale, {
      y: 0.45,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this.cartBody.scale, {
          y: 1.0,
          duration: 0.25,
          delay: 0.35,
          ease: 'back.out(1.5)',
          onComplete: () => { this.isSliding = false; }
        });
      }
    });

    if (this.mushakRef) {
      gsap.to(this.mushakRef.mesh.position, {
        y: 0.2,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        delay: 0.05,
      });
    }
  }

  triggerWheelImpactSparks() {
    for (let i = 0; i < 20; i++) {
      const sp = this._sparks[i];
      sp.x = (Math.random() - 0.5) * 1.8;
      sp.y = 0.15;
      sp.z = (Math.random() - 0.5) * 1.6;
      sp.vx = (Math.random() - 0.5) * 6.0;
      sp.vy = 2.0 + Math.random() * 4.0;
      sp.vz = 2.0 + Math.random() * 5.0;
      sp.life = 0;
      sp.maxLife = 0.3 + Math.random() * 0.25;
    }
  }

  /**
   * Update trolley position, banking, and wheels every frame
   */
  update(delta, mushakX, gameSpeed = 16) {
    if (!this.active) return;

    // Follow Mushak's X position with smooth banking tilt
    const dx = mushakX - this.mesh.position.x;
    this.mesh.position.x += dx * Math.min(delta * 12, 1.0);

    // Dynamic banking into lane turns (tilt up to ±0.22 rad)
    const targetTilt = -dx * 0.28;
    this.tiltAngle += (targetTilt - this.tiltAngle) * Math.min(delta * 10, 1.0);
    this.cartBody.rotation.z = this.tiltAngle;

    // Follow Mushak along Z
    if (this.mushakRef && !this._dismounting) {
      this.mesh.position.z = this.mushakRef.mesh.position.z;
      // Keep Mushak inside the cart once mounted
      if (!this.isSliding && !this._mounting) {
        this.mushakRef.mesh.position.y = this.mesh.position.y + 1.0;
        this.mushakRef.mesh.rotation.z = this.tiltAngle * 0.7;
      }
    }

    // Spin wheels according to speed
    this.wheelRotation -= delta * gameSpeed * 2.5;
    this.wheels.forEach(w => {
      w.rotation.x = this.wheelRotation;
    });

    // Continuous track spark generation
    const pos = this.sparkPoints.geometry.attributes.position.array;
    for (let i = 0; i < this._sparks.length; i++) {
      const s = this._sparks[i];
      if (s.life < s.maxLife) {
        s.life += delta;
        s.x += s.vx * delta;
        s.y += s.vy * delta;
        s.z += s.vz * delta;
        s.vy -= 9.8 * delta; // gravity
      } else if (Math.random() < 0.25) {
        // Spawn fresh spark at a wheel
        const side = Math.random() < 0.5 ? -0.88 : 0.88;
        const front = Math.random() < 0.5 ? -0.65 : 0.65;
        s.x = side;
        s.y = 0.1;
        s.z = front;
        s.vx = (Math.random() - 0.5) * 2.0;
        s.vy = 0.8 + Math.random() * 2.0;
        s.vz = 2.0 + Math.random() * 4.0;
        s.life = 0;
        s.maxLife = 0.2 + Math.random() * 0.2;
      }

      pos[i * 3]     = s.x;
      pos[i * 3 + 1] = s.y;
      pos[i * 3 + 2] = s.z;
    }
    this.sparkPoints.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.wheels = [];
    this._sparks = [];
  }
}
