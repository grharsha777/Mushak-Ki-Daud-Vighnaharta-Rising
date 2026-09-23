/**
 * Mushak.js — Sri Ganapathi's Divine Vahana (Mount)
 * ════════════════════════════════════════════════════════════════
 * High-performance optimized GLB model with full skeletal animations
 * and divine royal accessories (Mukut, Vastra, Kundal, Ghungroos)!
 * ════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const LANE_X   = [-3, 0, 3];
const GROUND_Y = 0;
const JUMP_H   = 3.2;

export class Mushak {
  constructor(scene) {
    this.scene = scene;

    this.mesh = new THREE.Group();
    
    // Gameplay state
    this.currentLane  = 1;
    this.isJumping    = false;
    this.isSliding    = false;
    this.isInvincible = false;
    this._invTimer    = 0;
    this._blinkTimer  = 0;
    this.currentSpeed = 10; // Will be set by game

    // Animation drivers
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;

    this._build();
    scene.add(this.mesh);

    this.mesh.position.set(LANE_X[1], GROUND_Y, 0);
  }

  _build() {
    this.modelRoot = new THREE.Group();
    // Face away from camera (-Z). Math.PI rotates it 180 degrees.
    this.modelRoot.rotation.y = Math.PI; 
    this.mesh.add(this.modelRoot);

    // Build Royal Accessories
    this._buildAccessories();

    // Load optimized GLB
    const loader = new GLTFLoader();
    loader.load('/models/mushak_optimized.glb', (gltf) => {
      const model = gltf.scene;
      
      // Setup scale and position (decrease size slightly as requested)
      const desiredHeight = 1.75;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = desiredHeight / size.y;
      model.scale.set(scale, scale, scale);
      
      const center = box.getCenter(new THREE.Vector3());
      model.position.x = -center.x * scale;
      model.position.y = -box.min.y * scale;
      model.position.z = -center.z * scale;

      // Enhance materials, shadows, and disable culling to prevent glitching
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false; // Prevent disappearing at screen edge
          if (child.material) {
            child.material.roughness = 0.7;
            child.material.metalness = 0.1;
          }
        }
      });

      this.modelRoot.add(model);
      this.loadedObj = model;

      // Setup Animation Mixer
      this.mixer = new THREE.AnimationMixer(model);
      
      const clipIdle = gltf.animations.find(a => a.name.includes('idol') || a.name.includes('idle'));
      const clipRun = gltf.animations.find(a => a.name.includes('run'));
      const clipJump = gltf.animations.find(a => a.name.includes('jump'));

      if (clipIdle) {
        this.actions.idle = this.mixer.clipAction(clipIdle);
        this.actions.idle.setLoop(THREE.LoopRepeat);
      }
      if (clipRun) {
        this.actions.run = this.mixer.clipAction(clipRun);
        this.actions.run.setLoop(THREE.LoopRepeat);
      }
      if (clipJump) {
        this.actions.jump = this.mixer.clipAction(clipJump);
        this.actions.jump.setLoop(THREE.LoopOnce);
        this.actions.jump.clampWhenFinished = true;
      }

      // Counteract the model scale so accessories are normal size, but make them 1.5x bigger for visibility!
      const invScale = (1 / scale) * 1.5;
      this.mukutGroup.scale.set(invScale, invScale, invScale);
      this.vastraGroup.scale.set(invScale, invScale, invScale);
      
      // Adjust positions slightly to account for the larger size
      this.mukutGroup.position.set(0, 0.15 * (1/scale), 0);
      this.vastraGroup.position.set(0, 0.25 * (1/scale), 0);

      // Attach Accessories to Bones
      let headBone = model.getObjectByName('head_0164') || model.getObjectByName('head');
      let spineBone = model.getObjectByName('DEF-spine.004_05') || model.getObjectByName('spine');

      if (!headBone || !spineBone) {
        model.traverse((child) => {
          if (child.isBone) {
            const name = child.name.toLowerCase();
            if (!headBone && name.includes('head')) headBone = child;
            if (!spineBone && (name.includes('spine') || name.includes('chest') || name.includes('back') || name.includes('torso') || name.includes('body') || name.includes('pelvis') || name.includes('root'))) spineBone = child;
          }
        });
        
        // Final fallback: if no spine bone is found by name, just pick any bone that isn't the head
        if (!spineBone) {
          model.traverse((child) => {
            if (child.isBone && child !== headBone && !spineBone) {
              spineBone = child;
            }
          });
        }
      }
      headBone = headBone || model;
      spineBone = spineBone || model;

      const earL = model.getObjectByName('ear.L_017');
      const earR = model.getObjectByName('ear.R_014');

      if (headBone) headBone.add(this.mukutGroup);
      if (spineBone) spineBone.add(this.vastraGroup);
      
      if (earL) {
        const ringL = this.earRingGroup.clone();
        ringL.scale.set(invScale, invScale, invScale);
        ringL.position.set(0.15 * invScale, -0.15 * invScale, 0); 
        earL.add(ringL);
      }
      if (earR) {
        const ringR = this.earRingGroup.clone();
        ringR.scale.set(invScale, invScale, invScale);
        ringR.position.set(-0.15 * invScale, -0.15 * invScale, 0);
        earR.add(ringR);
      }

      // Start running
      this._fadeToAction('run', 0.2);
    });
  }

  _buildAccessories() {
    // ── Divine Mukut (Golden Royal Crown) ──
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700, emissive: 0xCC8800, emissiveIntensity: 0.4,
      metalness: 0.85, roughness: 0.12, flatShading: true,
    });

    this.mukutGroup = new THREE.Group();
    // Crown base ring
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.1, 16), goldMat);
    crownBase.frustumCulled = false;
    crownBase.castShadow = false;
    this.mukutGroup.add(crownBase);

    // 5 royal crown peaks
    [-0.1, -0.05, 0, 0.05, 0.1].forEach((px, idx) => {
      const h = idx === 2 ? 0.25 : 0.15;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(0.035, h, 6), goldMat);
      peak.position.set(px, 0.05 + h * 0.5, 0);
      peak.frustumCulled = false;
      peak.castShadow = false;
      this.mukutGroup.add(peak);
    });

    // Centre ruby
    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xE00000, emissive: 0x880000, emissiveIntensity: 0.3,
      roughness: 0.15, metalness: 0.2
    });
    const ruby = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), rubyMat);
    ruby.position.set(0, 0.1, 0.14);
    ruby.frustumCulled = false;
    ruby.castShadow = false;
    this.mukutGroup.add(ruby);

    this.mukutGroup.rotation.x = -0.2;

    // ── Royal Vastra (Red + Gold Draped Robe / Saddle Cloth) ──
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700, roughness: 0.2, metalness: 0.8, skinning: true,
      side: THREE.DoubleSide
    });
    this.vastraGroup = new THREE.Group();
    
    // Instead of a flat plane, make it a little curved saddle cloth (half cylinder)
    const vastraMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, 0.5, 16, 1, true, Math.PI, Math.PI), 
      clothMat
    );
    // Rotate to fit over the back
    vastraMesh.rotation.z = Math.PI / 2;
    vastraMesh.rotation.y = Math.PI / 2;
    vastraMesh.frustumCulled = false;
    vastraMesh.castShadow = false;
    vastraMesh.receiveShadow = false;

    // Golden border (zari trim) using slightly larger cylinder
    const zariMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700, emissive: 0xAA7700, emissiveIntensity: 0.2,
      metalness: 0.85, roughness: 0.15,
      side: THREE.DoubleSide
    });
    const border = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.37, 0.52, 16, 1, true, Math.PI, Math.PI), 
      zariMat
    );
    border.rotation.z = Math.PI / 2;
    border.rotation.y = Math.PI / 2;
    border.frustumCulled = false;
    border.castShadow = false;

    this.vastraGroup.add(vastraMesh);
    this.vastraGroup.add(border);
    
    // Position it slightly above the origin so it sits on the back
    this.vastraGroup.position.set(0, 0.2, 0);

    // Removed dots for now since it's a cylinder

    // ── Ear Rings (golden hoops) ──
    this.earRingGroup = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16), goldMat);
    this.earRingGroup.frustumCulled = false;
    this.earRingGroup.castShadow = false;
  }

  run() {
    this._fadeToAction('run', 0.2);
  }

  idle() {
    this._fadeToAction('idle', 0.2);
  }

  bow() {
    this.idle();
    if (this.modelRoot) {
      gsap.to(this.modelRoot.rotation, { x: -0.35, duration: 1.0, ease: 'power2.out' });
      gsap.to(this.modelRoot.position, { y: -0.15, duration: 1.0, ease: 'power2.out' });
    }
  }

  _fadeToAction(name, duration) {
    const action = this.actions[name];
    if (!action || action === this.activeAction) return;
    
    if (this.activeAction) {
      this.activeAction.fadeOut(duration);
    }
    
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
    this.activeAction = action;
  }

  // ── Lane Movement ──────────────────────────────────────────────────────────
  setLane(lane, onComplete) {
    this.currentLane = lane;
    gsap.to(this.mesh.position, {
      x: LANE_X[lane],
      duration: 0.18,
      ease: 'power2.out',
      onComplete,
    });
    const tilt = (lane === 0 ? 0.25 : (lane === 2 ? -0.25 : 0));
    gsap.to(this.mesh.rotation, {
      z: tilt,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    });
  }

  // ── Jump ───────────────────────────────────────────────────────────────────
  jump() {
    if (this.isJumping || this.isSliding) return false;
    this.isJumping = true;

    this._fadeToAction('jump', 0.1);

    gsap.to(this.mesh.position, {
      y: GROUND_Y + JUMP_H,
      duration: 0.38,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this.mesh.position, {
          y: GROUND_Y,
          duration: 0.35,
          ease: 'power2.in',
          onComplete: () => {
            this.isJumping = false;
            this._fadeToAction('run', 0.2);
          },
        });
      },
    });

    return true;
  }

  // ── Slide ──────────────────────────────────────────────────────────────────
  slide() {
    if (this.isJumping || this.isSliding) return false;
    this.isSliding = true;

    gsap.to(this.mesh.scale, {
      y: 0.45,
      x: 1.25,
      duration: 0.12,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this.mesh.scale, {
          y: 1,
          x: 1,
          duration: 0.25,
          delay: 0.3,
          ease: 'back.out(1.5)',
          onComplete: () => { this.isSliding = false; },
        });
      },
    });
    return true;
  }

  triggerHitEffect() {
    this.isInvincible = true;
    this._invTimer    = 2.0;
  }

  bow() {
    this._fadeToAction('idle', 0.3);
    gsap.to(this.mesh.rotation, { x: 0.75, duration: 0.6, ease: 'power2.out' });
    gsap.to(this.mesh.position, { y: 0, duration: 0.4 });
  }

  update(delta) {
    if (this.mixer) {
      if (this.activeAction === this.actions.run) {
        // Adjust animation speed based on game speed
        this.mixer.timeScale = this.currentSpeed / 10; 
      } else {
        this.mixer.timeScale = 1.0;
      }
      this.mixer.update(delta);
    }

    if (this.isInvincible) {
      this._invTimer   -= delta;
      this._blinkTimer += delta;
      this.mesh.visible = Math.sin(this._blinkTimer * 24) > 0;
      if (this._invTimer <= 0) {
        this.isInvincible = false;
        this.mesh.visible = true;
        this._blinkTimer  = 0;
      }
    }
  }

  getBounds() {
    const x = this.mesh.position.x;
    const y = this.mesh.position.y;
    const slideScale = this.isSliding ? 0.45 : 1;
    return {
      minX: x - 0.5,
      maxX: x + 0.5,
      minY: y,
      maxY: y + 1.85 * slideScale,
      z:    this.mesh.position.z,
    };
  }

  dispose() {
    gsap.killTweensOf(this.mesh.position);
    gsap.killTweensOf(this.mesh.rotation);
    gsap.killTweensOf(this.mesh.scale);
    this.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });
  }
}
