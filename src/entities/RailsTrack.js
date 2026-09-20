/**
 * RailsTrack.js — 3D High-Graphics Interactive Rail Track System
 * ══════════════════════════════════════════════════════════════════════
 * Sub-level rail network overlaid onto the 3 lanes (X = -3, 0, +3):
 * - Dual gleaming steel rails with metallic reflections.
 * - Heavy weathered wooden cross-ties (railroad sleepers) with iron plates.
 * - Dynamic railroad track-switch crossings connecting lanes.
 * - Grand carved timber temple mine arches with glowing lantern posts.
 * ══════════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

const LANE_X = [-3, 0, 3];
const SEGMENT_LENGTH = 120;

export class RailsTrack {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    scene.add(this.mesh);

    this.active = false;
    this.segments = [];

    this._buildMaterials();
    this._buildSegments();

    this.mesh.visible = false;
  }

  _buildMaterials() {
    // Gleaming polished steel rail
    this.steelMat = new THREE.MeshStandardMaterial({
      color: 0x8899AA,
      metalness: 0.95,
      roughness: 0.15,
    });

    // Dark oiled railroad sleeper wood
    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x3E2714,
      roughness: 0.85,
      metalness: 0.1,
    });

    // Iron fasteners & plates
    this.ironMat = new THREE.MeshStandardMaterial({
      color: 0x22262B,
      metalness: 0.8,
      roughness: 0.4,
    });

    // Glowing track lantern
    this.lanternMat = new THREE.MeshStandardMaterial({
      color: 0xFFD54F,
      emissive: 0xFFA000,
      emissiveIntensity: 2.8,
      roughness: 0.2,
    });
  }

  _buildSegments() {
    // Build 2 long scrolling rail segments (spanning 240 units along Z)
    for (let s = 0; s < 2; s++) {
      const segGroup = new THREE.Group();
      segGroup.position.z = -s * SEGMENT_LENGTH;
      this.mesh.add(segGroup);

      // For each of the 3 lanes
      LANE_X.forEach(lx => {
        // Dual steel rails
        [-1.0, 1.0].forEach(rx => {
          const railGeo = new THREE.BoxGeometry(0.25, 0.35, SEGMENT_LENGTH);
          const rail = new THREE.Mesh(railGeo, this.steelMat);
          rail.position.set(lx + rx, 0.28, -SEGMENT_LENGTH / 2);
          rail.castShadow = true;
          segGroup.add(rail);
        });

        // Wooden cross-ties (sleepers) spaced out for better performance
        const sleeperCount = Math.floor(SEGMENT_LENGTH / 3.6);
        const sleeperGeo = new THREE.BoxGeometry(3.0, 0.2, 0.5);
        for (let i = 0; i < sleeperCount; i++) {
          const sleeper = new THREE.Mesh(sleeperGeo, this.woodMat);
          sleeper.position.set(lx, 0.1, -i * 3.6);
          sleeper.receiveShadow = true;
          segGroup.add(sleeper);
        }
      });

      // Railroad track-switch crossings connecting Lane 0 -> 1 and Lane 1 -> 2
      const switchGeo = new THREE.BoxGeometry(0.12, 0.20, 18);
      // Diagonal crossing left to center
      const diagLeft = new THREE.Mesh(switchGeo, this.steelMat);
      diagLeft.position.set(-1.5, 0.18, -35);
      diagLeft.rotation.y = 0.17;
      segGroup.add(diagLeft);

      // Diagonal crossing center to right
      const diagRight = new THREE.Mesh(switchGeo, this.steelMat);
      diagRight.position.set(1.5, 0.18, -75);
      diagRight.rotation.y = -0.17;
      segGroup.add(diagRight);

      // Overhead Carved Timber Temple Arches every 60 units (performance)
      for (let a = 15; a < SEGMENT_LENGTH; a += 60) {
        const arch = this._buildOverheadArch();
        arch.position.set(0, 0, -a);
        segGroup.add(arch);
      }

      this.segments.push(segGroup);
    }
  }

  _buildOverheadArch() {
    const arch = new THREE.Group();
    arch.scale.set(1.3, 1.3, 1.3); // Scale up arch

    // Side pillars
    [-5.0, 5.0].forEach(x => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.2, 0.6), this.woodMat);
      post.position.set(x, 2.6, 0);
      post.castShadow = true;
      arch.add(post);

      // Lantern on each post
      const lantern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), this.lanternMat);
      lantern.position.set(x + (x > 0 ? -0.4 : 0.4), 4.2, 0);
      arch.add(lantern);
    });

    // Crossbeam across all 3 lanes
    const beam = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.7, 0.8), this.woodMat);
    beam.position.set(0, 5.0, 0);
    beam.castShadow = true;
    arch.add(beam);

    // Hanging sacred temple brass bell in center
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.4, 8), this.steelMat);
    bell.position.set(0, 4.4, 0);
    arch.add(bell);

    return arch;
  }

  activate() {
    if (this.active) return;
    this.active = true;
    this.mesh.visible = true;
    this.mesh.position.y = -6; // Start below ground
    gsap.to(this.mesh.position, {
      y: 0,
      duration: 1.5,
      ease: 'power2.out'
    });
    
    this.segments.forEach((seg, i) => {
      seg.position.z = -i * SEGMENT_LENGTH;
    });
  }

  deactivate() {
    if (!this.active) return;
    gsap.to(this.mesh.position, {
      y: -6,
      duration: 1.5,
      ease: 'power2.in',
      onComplete: () => {
        this.active = false;
        this.mesh.visible = false;
      }
    });
  }

  update(delta, scrollAmount) {
    if (!this.active) return;

    this.segments.forEach(seg => {
      seg.position.z += scrollAmount;
      // Recycle when scrolled past camera
      if (seg.position.z > SEGMENT_LENGTH) {
        seg.position.z -= SEGMENT_LENGTH * 2;
      }
    });
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.segments = [];
  }
}
