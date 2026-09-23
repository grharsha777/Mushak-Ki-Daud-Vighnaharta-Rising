/**
 * SceneManager.js — Premium Three.js scene with beautiful visuals.
 * MeshStandardMaterial throughout for PBR lighting.
 * Hemisphere + directional + fill lights for rich ambiance.
 * Smooth biome lighting transitions via GSAP.
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

// ── Constants ─────────────────────────────────────────────────────────────────
export const SPAWN_Z    = -75;   // spawn point for forward-scrolling entities
export const DESPAWN_Z  =  25;   // objects beyond this Z (behind camera) are recycled
const TRACK_WIDTH       =  9;
const TRACK_LENGTH      =  80;   // length of each tile
const TILE_COUNT        =  6;    // 6 tiles span Z=+80 to Z=-400 for infinite seamless track

// Lane divider X positions (3 lanes centered on X=0)
const LANE_W = 3;

export class SceneManager {
  constructor() {
    // ── Renderer ──────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas:    document.getElementById('game-canvas'),
      antialias: window.innerWidth > 768, // disable antialias on mobile for performance
      alpha:     false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Capped at 1.5 for performance
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace;

    // ── Scene ─────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8AB4F0);
    this.scene.fog = new THREE.FogExp2(0x8AB4F0, 0.0025);

    // ── Camera ────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      65,                                           // FOV
      window.innerWidth / window.innerHeight,
      0.1, 400
    );
    this._setCameraDefault();

    // Camera smooth follow
    this._camTargetX = 0;

    // ── Lights ────────────────────────────────────────────────────
    this._buildLights();

    // ── Infinite Ground Terrain ───────────────────────────────────
    this._buildGround();

    // ── Track ─────────────────────────────────────────────────────
    this._trackTiles = [];
    this._tileOffset = 0;
    this._buildTrack();

    // ── Biome prop storage ─────────────────────────────────────────
    this._biomeProps = [];

    // ── Shake state ───────────────────────────────────────────────
    this._shakeAmt    = 0;
    this._shakeDecay  = 0.92;

    // ── Resize ────────────────────────────────────────────────────
    window.addEventListener('resize', () => this._onResize());
  }

  // ── Camera positions ──────────────────────────────────────────────────────
  _setCameraDefault() {
    this.camera.position.set(0, 8, 18);
    this.camera.lookAt(0, 0, -15);
  }

  resetCamera() {
    gsap.to(this.camera.position, {
      x: 0, y: 8, z: 18,
      duration: 0.8, ease: 'power2.inOut',
    });
  }

  resetToMenuView() {
    gsap.to(this.camera.position, {
      x: 0, y: 9, z: 20,
      duration: 1.0, ease: 'power2.inOut',
    });
  }

  // ── Lights ────────────────────────────────────────────────────────────────
  _buildLights() {
    // Hemisphere: sky/ground ambient gradient
    this.hemiLight = new THREE.HemisphereLight(0xCCDDFF, 0x8B7355, 0.9);
    this.scene.add(this.hemiLight);

    // Main sun directional
    this.sunLight = new THREE.DirectionalLight(0xFFEEDD, 2.2);
    this.sunLight.position.set(12, 24, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far  = 250;
    this.sunLight.shadow.camera.left = this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.camera.right = this.sunLight.shadow.camera.top  =  50;
    this.sunLight.shadow.bias         = -0.0005;
    this.scene.add(this.sunLight);

    // Soft fill from opposite side
    this.fillLight = new THREE.DirectionalLight(0x8899FF, 0.85);
    this.fillLight.position.set(-10, 6, -10);
    this.scene.add(this.fillLight);
  }

  // ── Infinite Ground Terrain ────────────────────────────────────────────────
  _buildGround() {
    const groundGeo = new THREE.PlaneGeometry(2000, 2000, 1, 1);
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x90A8C0,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, this.groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(0, -0.22, -60);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  // ── Track ─────────────────────────────────────────────────────────────────
  _buildTrack() {
    // Main track surface material
    this.trackMat = new THREE.MeshStandardMaterial({
      color:     0xC8BFA8,
      roughness: 0.8,
      metalness: 0.05,
      flatShading: false,
    });
    const trackGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.35, TRACK_LENGTH);

    // Edge rails / curbs
    this.railMat = new THREE.MeshStandardMaterial({
      color:     0x9E9080,
      roughness: 0.6,
      metalness: 0.1,
    });
    const railGeo = new THREE.BoxGeometry(0.35, 0.48, TRACK_LENGTH);

    // Lane divider lines
    this.lineMat = new THREE.MeshStandardMaterial({
      color:     0xEEE5C8,
      roughness: 0.4,
      emissive:  0xCCBB88,
      emissiveIntensity: 0.25,
    });
    const lineGeo = new THREE.BoxGeometry(0.12, 0.38, TRACK_LENGTH);

    // Generate 6 tiles spanning Z=+80 back to Z=-320 (never empty behind player)
    for (let i = 0; i < TILE_COUNT; i++) {
      const tileGroup = new THREE.Group();

      const surface = new THREE.Mesh(trackGeo, this.trackMat);
      surface.receiveShadow = true;
      tileGroup.add(surface);

      // Left/right curbs
      [-TRACK_WIDTH / 2, TRACK_WIDTH / 2].forEach(x => {
        const rail = new THREE.Mesh(railGeo, this.railMat);
        rail.position.set(x, 0.07, 0);
        rail.receiveShadow = true;
        tileGroup.add(rail);
      });

      // Lane divider lines
      [-LANE_W, LANE_W].forEach(x => {
        const line = new THREE.Mesh(lineGeo, this.lineMat);
        line.position.set(x, 0.02, 0);
        tileGroup.add(line);
      });

      // Offset starting tile so tile 0 is well behind the camera (+80)
      tileGroup.position.set(0, -0.18, 80 - TRACK_LENGTH * i);
      this.scene.add(tileGroup);
      this._trackTiles.push(tileGroup);
    }
  }

  // ── Biome ─────────────────────────────────────────────────────────────────
  /**
   * Instantly apply a biome's visual config (background, fog).
   */
  setBiome(name, cfg) {
    if (!cfg) return;
    this.scene.background?.set?.(cfg.skyColor ?? 0x8AB4F0);
    if (this.scene.fog) {
      this.scene.fog.color.set(cfg.fogColor ?? cfg.skyColor ?? 0x8AB4F0);
      this.scene.fog.density = cfg.fogDensity ?? 0.0025;
    }
    if (cfg.groundColor && this.groundMat) this.groundMat.color.set(cfg.groundColor);
    if (cfg.trackColor && this.trackMat)   this.trackMat.color.set(cfg.trackColor);
    if (cfg.railColor && this.railMat)     this.railMat.color.set(cfg.railColor);
    if (cfg.lineColor && this.lineMat)     this.lineMat.color.set(cfg.lineColor);
    if (cfg.lineEmissive && this.lineMat)  this.lineMat.emissive.set(cfg.lineEmissive);
  }

  /**
   * Smoothly tween all lights and environment materials to a new biome config.
   */
  applyBiomeLighting(cfg, instant = false) {
    if (!cfg) return;
    const dur = instant ? 0 : 2.5;

    // Background color
    gsap.to(this.scene.background, {
      r: new THREE.Color(cfg.skyColor ?? 0x8AB4F0).r,
      g: new THREE.Color(cfg.skyColor ?? 0x8AB4F0).g,
      b: new THREE.Color(cfg.skyColor ?? 0x8AB4F0).b,
      duration: dur, ease: 'power2.inOut',
    });

    // Fog
    if (this.scene.fog) {
      const fogCol = new THREE.Color(cfg.fogColor ?? cfg.skyColor);
      gsap.to(this.scene.fog.color, {
        r: fogCol.r, g: fogCol.g, b: fogCol.b,
        duration: dur, ease: 'power2.inOut',
      });
      gsap.to(this.scene.fog, {
        density: cfg.fogDensity ?? 0.0025,
        duration: dur,
      });
    }

    // Hemisphere sky
    if (cfg.ambientColor !== undefined) {
      const a = new THREE.Color(cfg.ambientColor);
      gsap.to(this.hemiLight.color, {
        r: a.r, g: a.g, b: a.b, duration: dur,
      });
      gsap.to(this.hemiLight, {
        intensity: cfg.ambientIntensity ?? 0.9,
        duration: dur,
      });
    }

    // Sun
    if (cfg.sunColor !== undefined) {
      const s = new THREE.Color(cfg.sunColor);
      gsap.to(this.sunLight.color, {
        r: s.r, g: s.g, b: s.b, duration: dur,
      });
      gsap.to(this.sunLight, {
        intensity: cfg.sunIntensity ?? 2.2,
        duration: dur,
      });
    }

    // Infinite Ground color
    if (cfg.groundColor !== undefined && this.groundMat) {
      const gc = new THREE.Color(cfg.groundColor);
      gsap.to(this.groundMat.color, {
        r: gc.r, g: gc.g, b: gc.b,
        duration: dur,
      });
    }

    // Track roadway color
    if (cfg.trackColor !== undefined && this.trackMat) {
      const tc = new THREE.Color(cfg.trackColor);
      gsap.to(this.trackMat.color, {
        r: tc.r, g: tc.g, b: tc.b,
        duration: dur,
      });
    }

    // Edge rails / curbs
    if (cfg.railColor !== undefined && this.railMat) {
      const rc = new THREE.Color(cfg.railColor);
      gsap.to(this.railMat.color, {
        r: rc.r, g: rc.g, b: rc.b,
        duration: dur,
      });
    }

    // Lane divider lines
    if (cfg.lineColor !== undefined && this.lineMat) {
      const lc = new THREE.Color(cfg.lineColor);
      gsap.to(this.lineMat.color, {
        r: lc.r, g: lc.g, b: lc.b,
        duration: dur,
      });
    }
    if (cfg.lineEmissive !== undefined && this.lineMat) {
      const le = new THREE.Color(cfg.lineEmissive);
      gsap.to(this.lineMat.emissive, {
        r: le.r, g: le.g, b: le.b,
        duration: dur,
      });
    }
  }

  // ── Track scrolling ────────────────────────────────────────────────────────
  scrollTrack(amount) {
    this._tileOffset += amount;
    const totalSpan = TRACK_LENGTH * TILE_COUNT;
    this._trackTiles.forEach((tile) => {
      // Move tiles toward camera
      tile.position.z += amount;
      // Recycle tile once it is far behind the camera (+100)
      if (tile.position.z > 100) {
        tile.position.z -= totalSpan;
      }
    });
  }

  // ── Biome props ────────────────────────────────────────────────────────────
  addBiomeProp(mesh) {
    this.scene.add(mesh);
    this._biomeProps.push(mesh);
  }

  clearBiomeProps() {
    this._biomeProps.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.traverse(c => {
        if (c.isMesh) {
          c.geometry?.dispose();
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material?.dispose();
        }
      });
    });
    this._biomeProps = [];
  }

  // ── Camera follow ──────────────────────────────────────────────────────────
  updateCamera(mushakX, delta) {
    this._camTargetX += (mushakX * 0.35 - this._camTargetX) * Math.min(delta * 5, 1);
    this.camera.position.x = this._camTargetX;
    this.camera.lookAt(this._camTargetX * 0.5, 0, -15);
  }

  // ── Screen shake ───────────────────────────────────────────────────────────
  screenShake(amount = 0.5) {
    this._shakeAmt = amount;
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // ── Per-frame update ────────────────────────────────────────────────────────
  update(delta) {
    // Screen shake decay
    if (this._shakeAmt > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmt * 0.5;
      this._shakeAmt *= this._shakeDecay;
    } else {
      this._shakeAmt = 0;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
