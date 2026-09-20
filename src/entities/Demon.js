/**
 * Demon.js — Authentic 3D Godzilla 2024 Titan Chaser (Temple Run Style)
 * ══════════════════════════════════════════════════════════════════════
 * - Uses the authentic Godzilla 2024 3D Model (/godzilla_optimized.glb)
 * - Orientation: Faces FORWARD (-Z), charging after Sri Mushak!
 * - Temple Run Framing: Anchored at the bottom-most area of the viewport.
 *   • Massive upper torso, neck, snarling head, reaching claws, and
 *     undulating dorsal fins rise up from the bottom of the screen.
 *   • Sri Mushak is 100% visible, centered, and unobstructed at Z = 0.
 *   • All upcoming obstacles and roadway remain clearly visible.
 * - Dynamic Animation:
 *   • Hands/Arms: Alternate predatory lunging/reaching along the track edges.
 *   • Head: Ferocious lunging, swaying, and snapping jaw toward Mushak.
 *   • Dorsal Fins: Wave-like undulation and pulsing cyan atomic energy.
 * - Fast, smooth 60 FPS performance with pre-compressed, lightweight assets.
 * ══════════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';

let sharedGltf = null;
let gltfLoadingPromise = null;

function loadGodzillaGLTF() {
  if (sharedGltf) return Promise.resolve(sharedGltf);
  if (gltfLoadingPromise) return gltfLoadingPromise;

  const loader = new GLTFLoader();
  gltfLoadingPromise = new Promise((resolve, reject) => {
    loader.load(
      '/godzilla_optimized.glb',
      (gltf) => {
        sharedGltf = gltf;
        resolve(gltf);
      },
      undefined,
      (err) => {
        console.warn('Could not load /godzilla_optimized.glb:', err);
        resolve(null);
      }
    );
  });
  return gltfLoadingPromise;
}

export class Demon {
  constructor(scene, index = 0) {
    this.scene = scene;
    this.index = index;

    this.mesh = new THREE.Group();
    scene.add(this.mesh);

    // Temple Run Placement:
    // Placed at the bottom-most area of the viewport (Z=12.5, Y=-1.8) so Godzilla
    // looms right at the bottom screen border without covering Mushak.
    this.baseZ = 12.5 + index * 2.5;
    this.baseY = -1.8;
    this.mesh.position.set(0, this.baseY, this.baseZ);

    // Animation state
    this._strideCycle  = 0;
    this._neckCycle    = 0;
    this._atomicCycle  = 0;
    this.isLoaded      = false;

    // Bone / mesh references
    this.bones = {};
    this.scalesMesh = null;
    this.finMaterials = [];

    // Ambient atomic glow light (subtle, soft cyan, no laser beams)
    this.atomicLight = new THREE.PointLight(0x00D5FF, 2.2, 14, 2.0);
    this.atomicLight.position.set(0, 3.5, -0.5);
    this.mesh.add(this.atomicLight);

    this._initModel();
  }

  async _initModel() {
    try {
      const gltf = await loadGodzillaGLTF();
      if (!gltf) return;

      const model = gltf.scene;

      // Model orientation:
      // Model native facing is +Z. Rotating by Math.PI makes Godzilla face FORWARD (-Z) chasing Mushak!
      const SCALE = 900; // 1.25 lane size
      model.scale.set(SCALE, SCALE, SCALE);
      model.rotation.y = Math.PI;
      // Precise centering along X (adjust for new scale)
      model.position.x = -1.806 * (900 / 700);

      // Setup materials and cache bones
      model.traverse((child) => {
        if (child.isBone) {
          this.bones[child.name] = child;
        }

        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            const mat = child.material;

            if (child.name.includes('Scales') || mat.name === 'GZ_Scales') {
              this.scalesMesh = child;
              mat.emissive = new THREE.Color(0x00D5FF);
              mat.emissiveIntensity = 3.5;
              this.finMaterials.push(mat);
            } else if (child.name.includes('Body') || mat.name === 'GZ_Body') {
              mat.roughness = 0.85;
            }
          }
        }
      });

      this.titanModel = model;
      this.mesh.add(model);
      this.isLoaded = true;
    } catch (e) {
      console.warn('Godzilla init error:', e);
    }
  }

  /**
   * Called every frame from main game loop
   * @param {number} delta
   * @param {number} gameSpeed
   */
  update(delta, gameSpeed = 16) {
    const rate = Math.max(1, gameSpeed * 0.08);
    this._strideCycle += delta * rate * 3.8;
    this._neckCycle   += delta * 2.6;
    this._atomicCycle += delta * 3.2;

    // 1. Predatory footfall thud at bottom of screen
    const footfallBounce = Math.abs(Math.sin(this._strideCycle)) * 0.16;
    const swayX = Math.sin(this._strideCycle * 0.5) * 0.20;
    this.mesh.position.y = this.baseY + footfallBounce;
    this.mesh.position.x = swayX;

    // 2. Animate authentic Godzilla bones
    if (this.isLoaded && this.bones) {
      // Reaching clawed arms
      const lArm = this.bones['CATRigLArm003_033'] || this.bones['CATRigLArm2_034'];
      const rArm = this.bones['CATRigRArm003_060'] || this.bones['CATRigRArm004_061'];
      if (lArm) {
        lArm.rotation.x = 0.25 + Math.sin(this._strideCycle) * 0.40;
        lArm.rotation.z = 0.10 + Math.cos(this._strideCycle) * 0.18;
      }
      if (rArm) {
        rArm.rotation.x = 0.25 - Math.sin(this._strideCycle) * 0.40;
        rArm.rotation.z = -0.10 - Math.cos(this._strideCycle) * 0.18;
      }

      // Hands clawing / flexing
      const lPalm = this.bones['CATRigLArmPalm001_035'];
      const rPalm = this.bones['CATRigRArmPalm001_00'];
      if (lPalm) lPalm.rotation.y = Math.sin(this._strideCycle) * 0.25;
      if (rPalm) rPalm.rotation.y = -Math.sin(this._strideCycle) * 0.25;

      // Head lunging forward toward Mushak
      const neck1 = this.bones['CATRigNeck1_048'];
      const neck2 = this.bones['CATRigNeck2_049'];
      if (neck1) {
        neck1.rotation.x = -0.12 + Math.sin(this._neckCycle) * 0.10;
        neck1.rotation.y = Math.cos(this._neckCycle * 0.7) * 0.08;
      }
      if (neck2) {
        neck2.rotation.x = -0.18 + Math.sin(this._neckCycle + 0.4) * 0.12;
      }

      // Spine wave undulation
      const spine1 = this.bones['CATRigSpine1_026'];
      const spine3 = this.bones['CATRigSpine3_028'];
      const spine5 = this.bones['CATRigSpine5_030'];
      if (spine1) spine1.rotation.x = 0.08 + Math.sin(this._strideCycle) * 0.06;
      if (spine3) spine3.rotation.x = 0.10 + Math.sin(this._strideCycle + 0.4) * 0.06;
      if (spine5) spine5.rotation.x = 0.12 + Math.sin(this._strideCycle + 0.8) * 0.06;
    }

    // 3. Dynamic Backside Fin Movement & Glowing Atomic Energy
    const atomicPulse = 2.6 + Math.sin(this._atomicCycle) * 1.4;
    this.finMaterials.forEach((mat) => {
      mat.emissiveIntensity = atomicPulse;
    });

    if (this.scalesMesh) {
      // Dynamic moving ripple along the dorsal fins
      this.scalesMesh.rotation.x = Math.sin(this._atomicCycle * 0.7) * 0.03;
    }

    // Atomic point light pulse
    if (this.atomicLight) {
      this.atomicLight.intensity = 1.6 + Math.sin(this._atomicCycle) * 0.8;
    }
  }

  dispel(cb) {
    if (!this.mesh) {
      cb?.();
      return;
    }
    gsap.to(this.mesh.position, {
      y: -6,
      duration: 1.4,
      ease: 'power2.in',
      onComplete: () => {
        this.mesh.visible = false;
        cb?.();
      }
    });
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.bones = {};
    this.finMaterials = [];
  }
}
