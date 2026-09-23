/**
 * EnvironmentProps.js — Rich procedural 3D scenery assets.
 * Inspired by EndlessRunnerSampleGame and Subway Surfers aesthetics:
 * bold silhouettes, rich palettes, low-poly geometry, and unmistakable biome identity.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ── Shared material helpers ──────────────────────────────────────────────────
const std = (color, roughness = 0.8, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

const glow = (color, emissive, intensity = 0.35) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.5, flatShading: true });

// ── Asset Managers ───────────────────────────────────────────────────────
let cachedTreeModel = null;
let cachedCountrysideScene = null;
let cachedSnowyScene = null;

let isLoadingTree = false;
let isLoadingCountryside = false;
let isLoadingSnowy = false;

const pendingTrees = [];
const pendingCountryside = [];
const pendingSnowy = [];

function loadLargeScenes() {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  loader.setDRACOLoader(dracoLoader);

  if (!cachedCountrysideScene && !isLoadingCountryside) {
    isLoadingCountryside = true;
    loader.load('/models/countryside_draco.glb', (gltf) => {
      cachedCountrysideScene = gltf.scene;
      cachedCountrysideScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      pendingCountryside.forEach(({ group, scale }) => {
        populateSceneGroup(group, cachedCountrysideScene, scale);
      });
      pendingCountryside.length = 0;
    });
  }

  if (!cachedSnowyScene && !isLoadingSnowy) {
    isLoadingSnowy = true;
    loader.load('/models/snowy_mountain_draco.glb', (gltf) => {
      cachedSnowyScene = gltf.scene;
      cachedSnowyScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      pendingSnowy.forEach(({ group, scale }) => {
        populateSceneGroup(group, cachedSnowyScene, scale);
      });
      pendingSnowy.length = 0;
    });
  }
}

function populateSceneGroup(group, cachedScene, scale) {
  // Remove placeholders
  for (let i = group.children.length - 1; i >= 0; i--) {
    if (group.children[i].userData.isPlaceholder) {
      group.remove(group.children[i]);
    }
  }

  if (cachedScene) {
    const sceneClone = cachedScene.clone();
    
    // Disable frustum culling to prevent it disappearing if its center is off-camera
    sceneClone.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = false;
      }
    });

    sceneClone.position.set(0, 0, 0); // No extra offset
    // If the scene is a chunk, adjust scale so it spans ~50 units in Z for example
    // The snowy mountain is ~2 units wide. A scale of 30 makes it 60 units wide.
    const baseScale = 30.0 * scale; 
    sceneClone.scale.set(baseScale, baseScale, baseScale);
    group.add(sceneClone);
  }
}

export function makeCountrysideScene(scale = 1) {
  loadLargeScenes();
  const group = new THREE.Group();
  if (cachedCountrysideScene) {
    populateSceneGroup(group, cachedCountrysideScene, scale);
  } else {
    pendingCountryside.push({ group, scale });
    const placeholder = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({visible: false}));
    placeholder.userData.isPlaceholder = true;
    group.add(placeholder);
  }
  return group;
}

export function makeSnowyMountainScene(scale = 1) {
  loadLargeScenes();
  const group = new THREE.Group();
  if (cachedSnowyScene) {
    populateSceneGroup(group, cachedSnowyScene, scale);
  } else {
    pendingSnowy.push({ group, scale });
    const placeholder = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({visible: false}));
    placeholder.userData.isPlaceholder = true;
    group.add(placeholder);
  }
  return group;
}

// ── Shared Materials for Procedural Flora ──
const trunkMat = std(0x5C4033, 0.9);
const pineMat  = std(0x2E4A35, 0.8);
const snowMat  = std(0xFFFAFA, 0.5);
const jungleMat1 = std(0x2d5a27, 0.8);
const jungleMat2 = std(0x1e4620, 0.9);
const palmTrunkMat = std(0x8B7355, 0.9);

/** Helper: stacked cone pine tree */
function build3DPineTree(scale = 1) {
  const group = new THREE.Group();
  
  // Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 3 * scale, 5), trunkMat);
  trunk.position.y = 1.5 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // 3 stacked cones for foliage
  for (let i = 0; i < 3; i++) {
    const h = (4 - i * 0.8) * scale;
    const r = (2.5 - i * 0.5) * scale;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), pineMat);
    cone.position.y = (3 + i * 2.5) * scale;
    cone.castShadow = true;
    
    // Add snow cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.8, h * 0.6, 6), snowMat);
    cap.position.y = cone.position.y + h * 0.25;
    group.add(cone, cap);
  }
  
  return group;
}

/** Helper: lush, clean, clustered jungle tree */
function build3DJungleTree(scale = 1, isBanyan = false) {
  const group = new THREE.Group();
  
  // Trunk: nicely tapered
  const trunkR = isBanyan ? 0.6 : 0.35;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.6 * scale, trunkR * scale, 5 * scale, 6), trunkMat);
  trunk.position.y = 2.5 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Canopy: A clean cluster of spheres instead of one jagged icosahedron
  const canopyGroup = new THREE.Group();
  canopyGroup.position.y = 5 * scale; // Exactly at the top of the trunk
  
  const canopyGeo = new THREE.SphereGeometry(1, 8, 8); // Smoother geometry
  const mat = isBanyan ? jungleMat2 : jungleMat1;

  // Center large foliage puff
  const centerPuff = new THREE.Mesh(canopyGeo, mat);
  const r = isBanyan ? 3.0 : 2.2;
  centerPuff.scale.set(r * scale, (r * 0.8) * scale, r * scale);
  centerPuff.castShadow = true;
  canopyGroup.add(centerPuff);

  // Smaller surrounding puffs for a classic organic tree shape
  const puffCount = isBanyan ? 6 : 4;
  for (let i = 0; i < puffCount; i++) {
    const puff = new THREE.Mesh(canopyGeo, mat);
    const pr = r * (0.6 + Math.random() * 0.3);
    const angle = (i / puffCount) * Math.PI * 2;
    const dist = r * 0.6;
    puff.scale.set(pr * scale, pr * 0.8 * scale, pr * scale);
    puff.position.set(
      Math.cos(angle) * dist * scale,
      (Math.random() - 0.2) * 0.5 * scale,
      Math.sin(angle) * dist * scale
    );
    puff.castShadow = true;
    canopyGroup.add(puff);
  }

  canopyGroup.rotation.y = Math.random() * Math.PI;
  group.add(canopyGroup);

  return group;
}

/** Helper: neat curved palm tree */
function build3DPalmTree(scale = 1) {
  const group = new THREE.Group();
  
  // Create a sub-group for the entire tree so we can curve it together
  const treeBody = new THREE.Group();
  
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 6 * scale, 5), palmTrunkMat);
  trunk.position.y = 3 * scale;
  trunk.castShadow = true;
  treeBody.add(trunk);

  // Neatly attached Palm Leaves at the exact top center of the trunk
  const topY = 6 * scale;
  for (let i = 0; i < 6; i++) {
    const leafGeo = new THREE.ConeGeometry(0.7 * scale, 3.5 * scale, 4);
    const leaf = new THREE.Mesh(leafGeo, jungleMat1);
    
    // Create a pivot exactly at the top of the trunk
    const pivot = new THREE.Group();
    pivot.position.set(0, topY - 0.2 * scale, 0); // slightly embedded into the trunk top
    
    // Shift the leaf so it grows outward from the pivot
    // Using z instead of y to avoid shifting the leaf UP before it gets rotated, which causes the floating gap.
    leaf.position.set(0, 0, 1.75 * scale);
    leaf.rotation.x = -Math.PI / 2; // flatten it outwards
    
    pivot.add(leaf);
    pivot.rotation.y = (i / 6) * Math.PI * 2; // fan them out radially
    pivot.rotation.x = 0.6; // arch them downwards neatly
    treeBody.add(pivot);
  }

  // Now apply the slight curve to the entire tree, ensuring leaves stay attached
  treeBody.rotation.z = 0.15; 
  group.add(treeBody);

  return group;
}

// ── Clouds & Birds ──
export function makeCloud() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1.0, flatShading: true, transparent: true, opacity: 0.85 });
  
  for (let i = 0; i < 4; i++) {
    const r = 2 + Math.random() * 2;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
    mesh.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 3);
    group.add(mesh);
  }
  return group;
}

export function makeBird() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
  
  // V-shape bird
  const wing1 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), mat);
  wing1.position.set(0.6, 0, 0);
  wing1.rotation.x = -Math.PI / 2;
  wing1.rotation.y = -0.3;
  
  const wing2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), mat);
  wing2.position.set(-0.6, 0, 0);
  wing2.rotation.x = -Math.PI / 2;
  wing2.rotation.y = 0.3;

  group.add(wing1, wing2);
  group.userData = { wing1, wing2, time: Math.random() * 10 };
  return group;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. HIMALAYA PROPS (Crisp snow peaks, frosted pines, prayer flag shrines)
// ══════════════════════════════════════════════════════════════════════════════

/** High-poly realistic snow-capped mountain using displacement */
export function makeSnowPeak(scale = 1) {
  const group = new THREE.Group();

  // Create a jagged mountain base using an Icosahedron with random displacement
  const rockGeo = new THREE.IcosahedronGeometry(7 * scale, 3);
  const pos = rockGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // Stretch vertically
    pos.setY(i, y * 1.8);
    // Add noise based on height
    const noise = Math.random() * 1.5 * scale;
    pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * noise);
    pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * noise);
  }
  rockGeo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x4B5D6B,
    roughness: 1.0,
    metalness: 0.1,
    flatShading: true,
  });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.y = 8 * scale;
  group.add(rock);

  // Snow cap using a slightly smaller but higher geometry
  const snowGeo = new THREE.IcosahedronGeometry(6.5 * scale, 2);
  const sPos = snowGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const y = sPos.getY(i);
    // Only keep the top half for snow
    sPos.setY(i, y > 0 ? y * 1.9 : 0);
    const noise = Math.random() * 0.8 * scale;
    sPos.setX(i, sPos.getX(i) + (Math.random() - 0.5) * noise);
    sPos.setZ(i, sPos.getZ(i) + (Math.random() - 0.5) * noise);
  }
  snowGeo.computeVertexNormals();

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.4,
    metalness: 0.1,
    flatShading: true,
  });
  const snow = new THREE.Mesh(snowGeo, snowMat);
  snow.position.y = 9.5 * scale;
  group.add(snow);

  group.castShadow = true;
  group.receiveShadow = true;
  return group;
}

/** Realistic Pine/Spruce tree with dense foliage layers from asset pack */
export function makePineTree() {
  return build3DPineTree(1.2);
}

/** Fluttering prayer flags strung between wooden sacred poles */
export function makePrayerFlags() {
  const group = new THREE.Group();

  const colors = [0xEE3322, 0xFFDD22, 0xFFFFFF, 0x22AA44, 0x2288EE];
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.07, 4.8, 6);
  const poleMat = std(0x7A5633, 0.85);

  const lPole = new THREE.Mesh(poleGeo, poleMat);
  lPole.position.set(-2.2, 2.4, 0);
  lPole.castShadow = true;
  group.add(lPole);

  const rPole = new THREE.Mesh(poleGeo, poleMat);
  rPole.position.set(2.2, 2.4, 0);
  rPole.castShadow = true;
  group.add(rPole);

  // Flags along sag curve
  colors.forEach((col, i) => {
    const flagGeo = new THREE.PlaneGeometry(0.65, 0.45);
    const flagMat = new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.7 });
    const flag    = new THREE.Mesh(flagGeo, flagMat);
    const t       = i / (colors.length - 1);
    const sag     = Math.sin(t * Math.PI) * 0.45;
    flag.position.set(-2.0 + t * 4.0, 4.5 - sag, 0);
    flag.rotation.y = 0.15;
    group.add(flag);
  });

  return group;
}

/** Sacred stone mountain stupa shrine */
export function makeIceStupa(scale = 1) {
  const group = new THREE.Group();

  // Tiered base
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(2.4 * scale, 0.5 * scale, 2.4 * scale), std(0x8A9BB0, 0.8));
  b1.position.y = 0.25 * scale;
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.8 * scale, 0.5 * scale, 1.8 * scale), std(0x9EAEBF, 0.8));
  b2.position.y = 0.75 * scale;
  group.add(b1, b2);

  // Main dome (anda)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.0 * scale, 7, 6), std(0xCAD5E2, 0.7));
  dome.position.y = 1.7 * scale;
  group.add(dome);

  // Golden spire / finial
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35 * scale, 1.4 * scale, 6), glow(0xDAA520, 0xFFAA00, 0.4));
  spire.position.y = 3.0 * scale;
  group.add(spire);

  group.castShadow = true;
  return group;
}

export function makeIceBlock() {
  return makeIceStupa(0.7);
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. JUNGLE PROPS (Banyan trees, tropical palms, mossy temple ruins, lotus pools)
// ══════════════════════════════════════════════════════════════════════════════

/** Sprawling Banyan Tree with massive canopy & aerial roots */
export function makeBanyanTree() {
  return build3DJungleTree(1.4, true);
}

/** Towering curved Tropical Palm tree */
export function makeTropicalPalm() {
  return build3DPalmTree(1.3);
}

export function makeJungleTree1() {
  return build3DJungleTree(1.2, false);
}

/** Ancient carved stone temple torana / ruined gateway */
export function makeTempleArch(scale = 1) {
  const group = new THREE.Group();
  const stone = std(0x4F5C4A, 0.9); // mossy ancient stone

  // Left & right carved pillars
  [-1.6, 1.6].forEach(x => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 4.2 * scale, 0.7 * scale), stone);
    col.position.set(x * scale, 2.1 * scale, 0);
    col.castShadow = true;
    group.add(col);

    // Pillar base
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1 * scale, 0.5 * scale, 1.1 * scale), std(0x424E3E, 0.9));
    base.position.set(x * scale, 0.25 * scale, 0);
    group.add(base);
  });

  // Carved crossbeam lintel
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.2 * scale, 0.8 * scale, 0.9 * scale), stone);
  lintel.position.set(0, 4.4 * scale, 0);
  lintel.castShadow = true;
  group.add(lintel);

  // Golden medallion on arch center
  const med = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * scale, 0.4 * scale, 0.15 * scale, 8), glow(0xDAA520, 0xFFA500, 0.4));
  med.rotation.x = Math.PI / 2;
  med.position.set(0, 4.4 * scale, 0.5 * scale);
  group.add(med);

  return group;
}

/** Blooming Sacred Lotus pool */
export function makeLotusFountain(scale = 1) {
  const group = new THREE.Group();

  // Stone circular basin
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * scale, 1.2 * scale, 0.45 * scale, 8), std(0x566050, 0.85));
  basin.position.y = 0.22 * scale;
  group.add(basin);

  // Still water surface
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.25 * scale, 1.25 * scale, 0.05 * scale, 8), glow(0x228899, 0x116677, 0.3));
  water.position.y = 0.42 * scale;
  group.add(water);

  // Pink blooming lotus flower
  const petColors = [0xFF69B4, 0xFF1493, 0xFFB6C1];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.4 * scale, 4), std(petColors[i % 3], 0.6));
    petal.position.set(Math.cos(angle) * 0.35 * scale, 0.55 * scale, Math.sin(angle) * 0.35 * scale);
    petal.rotation.z = Math.cos(angle) * 0.4;
    petal.rotation.x = Math.sin(angle) * 0.4;
    group.add(petal);
  }

  // Golden lotus center
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 6, 5), glow(0xFFD700, 0xFFAA00, 0.6));
  center.position.y = 0.58 * scale;
  group.add(center);

  return group;
}

export function makeJungleTree(scale = 1) {
  return makeJungleTree1(scale);
}

export function makeStoneRuin(scale = 1) {
  return makeTempleArch(scale);
}

export function makeGrassTuft() {
  const group = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8 + Math.random() * 0.5, 4), std(0x2E8B38, 0.8));
    blade.position.set((Math.random() - 0.5) * 0.6, 0.4, (Math.random() - 0.5) * 0.6);
    blade.rotation.x = (Math.random() - 0.5) * 0.4;
    group.add(blade);
  }
  return group;
}


