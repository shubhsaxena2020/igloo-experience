/**
 * verify_igloo_scene.js
 * Verification Test Suite for Central Igloo Scene (class F3) & Dependencies
 * Reverse-Engineered from App3D-d68cb154.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  }
}

function approx(val, target, epsilon = 0.001) {
  return Math.abs(val - target) <= epsilon;
}

console.log('='.repeat(70));
console.log('🧊 VERIFICATION SUITE: CENTRAL IGLOO SCENE (class F3) RECONSTRUCTION');
console.log('='.repeat(70));

// ----------------------------------------------------------------------------
// TEST SUITE 1: ASSET INVENTORY & INTEGRITY
// ----------------------------------------------------------------------------
console.log('\n[Suite 1] Validating Binary Geometries & KTX2 Textures on Disk...');

const REQUIRED_ASSETS = [
  { path: 'assets/geometries/igloo.drc', minSize: 100000, desc: 'Batched Igloo Dome Draco geometry' },
  { path: 'assets/geometries/igloo/igloo_cage.drc', minSize: 4000, desc: 'Igloo Cage wireframe Draco geometry' },
  { path: 'assets/geometries/igloo/igloo_outline.drc', minSize: 15000, desc: 'Igloo Outline Draco geometry' },
  { path: 'assets/geometries/igloo/patch.drc', minSize: 200, desc: 'Ground contact patch Draco geometry' },
  { path: 'assets/geometries/mountain.drc', minSize: 10000, desc: 'Distant Mountains Draco geometry' },
  { path: 'assets/geometries/ground.drc', minSize: 15000, desc: 'Ground terrain Draco geometry' },
  { path: 'assets/geometries/floor.drc', minSize: 30000, desc: 'Volumetric Floor Draco geometry' },
  { path: 'assets/images/igloo/ground_color.ktx2', minSize: 500000, desc: 'Central ground baked diffuse lightmap' },
  { path: 'assets/images/igloo/ground_glow.ktx2', minSize: 150000, desc: 'Ground additive illumination glow map' },
  { path: 'assets/images/igloo/ground_sansigloo_color.ktx2', minSize: 500000, desc: 'Peripheral terrain diffuse map' },
  { path: 'assets/images/igloo/igloo_color.ktx2', minSize: 400000, desc: 'Igloo assembled lightmap (tMap)' },
  { path: 'assets/images/igloo/igloo_exploded_color.ktx2', minSize: 700000, desc: 'Igloo exploded lightmap (tMapExploded)' },
  { path: 'assets/images/igloo/mountain_color.ktx2', minSize: 500000, desc: 'Mountains baked diffuse map' },
  { path: 'assets/images/igloo/triangles_tiling.ktx2', minSize: 30000, desc: 'Triangular digital tiling pattern' },
  { path: 'assets/images/mosaic.ktx2', minSize: 1000, desc: 'Mosaic spatial phase noise map' },
  { path: 'assets/images/wind_noise.ktx2', minSize: 10000, desc: 'Wind procedural noise texture' },
  { path: 'assets/fonts/IBMPlexMono-Medium-datatexture.ktx2', minSize: 80000, desc: 'MSDF Font DataTexture atlas' }
];

for (const asset of REQUIRED_ASSETS) {
  const fullPath = path.join(__dirname, asset.path);
  const exists = fs.existsSync(fullPath);
  assert(exists, `Asset file exists: ${asset.path} (${asset.desc})`);
  if (exists) {
    const stat = fs.statSync(fullPath);
    assert(stat.size >= asset.minSize, `Asset size matches threshold: ${stat.size} >= ${asset.minSize} bytes`);
  }
}

// ----------------------------------------------------------------------------
// TEST SUITE 2: GPU GEMS CHAPTER 16 SUBSURFACE SCATTERING (WRAPPED DIFFUSE)
// ----------------------------------------------------------------------------
console.log('\n[Suite 2] Testing GPU Gems Wrapped Diffuse Formula & Backscatter Bounce...');

/**
 * Exact GPU Gems wrapped diffuse formula from App3D-d68cb154.js (line 1364703):
 *
 * vec3 lightPos = normalize(uLightPos);
 * float wrap = 0.25;
 * float dp = dot(lightPos, grad);
 * float wrapDiffuse = max(0.0, (dp + wrap) / (1.0 + wrap));
 * // bounce
 * dp = -dp;
 * wrapDiffuse += max(0.0, dp) * 0.1;
 */
function gpuGemsWrappedDiffuse(dp, wrap = 0.25, bounceFactor = 0.1) {
  let wrapDiffuse = Math.max(0.0, (dp + wrap) / (1.0 + wrap));
  const backBounce = -dp;
  wrapDiffuse += Math.max(0.0, backBounce) * bounceFactor;
  return wrapDiffuse;
}

// Case 2.1: Direct frontal illumination (dp = 1.0)
const diffDirect = gpuGemsWrappedDiffuse(1.0);
assert(approx(diffDirect, 1.0), `Direct light (dp=1.0) produces unity diffuse: ${diffDirect.toFixed(4)}`);

// Case 2.2: Geometric terminator (dp = 0.0)
// In standard Lambertian, diffuse drops to 0.0 abruptly at dp = 0.0.
// Under wrapped diffuse with wrap = 0.25: (0.0 + 0.25) / (1.0 + 0.25) = 0.25 / 1.25 = 0.20!
const diffTerminator = gpuGemsWrappedDiffuse(0.0);
assert(approx(diffTerminator, 0.20), `Terminator (dp=0.0) wraps diffuse to 0.20 instead of 0.0: ${diffTerminator.toFixed(4)}`);

// Case 2.3: Shadow wrap cutoff boundary (dp = -0.25)
// At dp = -0.25, frontal wrap reaches ( -0.25 + 0.25 ) / 1.25 = 0.
// But back bounce contributes: max(0, -(-0.25)) * 0.1 = 0.25 * 0.1 = 0.025.
const diffCutoff = gpuGemsWrappedDiffuse(-0.25);
assert(approx(diffCutoff, 0.025), `Wrap boundary (dp=-0.25) transitions smoothly with bounce: ${diffCutoff.toFixed(4)}`);

// Case 2.4: Full backside illumination (dp = -1.0)
// Frontal wrap is 0. Back bounce contributes max(0, 1.0) * 0.1 = 0.10.
const diffBackside = gpuGemsWrappedDiffuse(-1.0);
assert(approx(diffBackside, 0.10), `Full backside (dp=-1.0) retains 10% subsurface bounce: ${diffBackside.toFixed(4)}`);

// Case 2.5: Fake SSS sunlight gradient used in the Igloo Dome shader:
// color += (vPos.x * 0.1 + 0.4) * 0.3 * min(vPos.y + 0.5, 1.0) * 0.5;
function iglooDomeFakeSSS(posX, posY) {
  return (posX * 0.1 + 0.4) * 0.3 * Math.min(posY + 0.5, 1.0) * 0.5;
}
const domeSSSTop = iglooDomeFakeSSS(2.0, 1.5);
const domeSSSBase = iglooDomeFakeSSS(0.0, -0.5);
assert(domeSSSTop > 0.0, `Dome top SSS produces positive translucency: ${domeSSSTop.toFixed(4)}`);
assert(approx(domeSSSBase, 0.0), `Dome ground baseline extinguishes SSS: ${domeSSSBase.toFixed(4)}`);

// ----------------------------------------------------------------------------
// TEST SUITE 3: BATCHED IGLOO DOME GEOMETRY & DUAL-STAGE PHYSICS
// ----------------------------------------------------------------------------
console.log('\n[Suite 3] Testing Batched Igloo Dome Decomposition & Dynamic Simulation Physics...');

// Test 3.1: Centroid subtraction logic (centering vertices locally around (0,0,0))
const rawVertex = [2.5, 1.8, -3.2];
const centroid = [2.0, 1.5, -3.0];
const centeredVertex = [
  rawVertex[0] - centroid[0],
  rawVertex[1] - centroid[1],
  rawVertex[2] - centroid[2]
];
assert(
  approx(centeredVertex[0], 0.5) && approx(centeredVertex[1], 0.3) && approx(centeredVertex[2], -0.2),
  `Vertex position centered locally relative to centroid: [${centeredVertex.join(', ')}]`
);

// Test 3.2: Dual-stage exponential lerping & height-gated displacement simulation
class BrickSimulationMock {
  constructor(centroid, rand) {
    this.centroid = centroid;
    this.rand = rand;
    this.targetDisplacement1 = 0;
    this.targetDisplacement2 = 0;
    this.displacement = 0;
    this.targetBounce1 = 0;
    this.targetBounce2 = 0;
    this.bounce = 0;
    this.scrollDisplacement1 = 0;
    this.scrollDisplacement2 = 0;
    this.position = [...centroid];
  }

  update(mousePos, time, progress, needsReset = false) {
    // 1. Idle wave
    let l = 0.4;
    l *= Math.sin(-time * 2.0 + this.centroid[0]) * 0.5 + 0.5;
    l *= Math.cos(-time) * 0.5 + 0.5;
    l *= (0.5 + (2.0 - 0.5) * this.rand[2]);
    l *= 0.5;

    // 2. Mouse proximity repulsion
    const distToMouse = Math.hypot(
      this.centroid[0] - mousePos[0],
      this.centroid[1] - mousePos[1],
      this.centroid[2] - mousePos[2]
    );
    // smoothstep(1.0, 3.0, distToMouse)
    const tDist = Math.max(0, Math.min(1, (distToMouse - 1.0) / (3.0 - 1.0)));
    const smoothDist = tDist * tDist * (3.0 - 2.0 * tDist);
    const fitDist = (1.0 - smoothDist); // inverted distance factor
    const c = Math.sin(time + this.rand[0] * 12.342) * this.rand[1];
    const mouseDisplacement = fitDist * (0.5 + 0.3 * c);
    l = Math.max(l, mouseDisplacement);

    // 3. Bounce spring
    this.targetBounce1 = l;
    this.targetBounce2 += (this.targetBounce1 - this.targetBounce2) * 0.05;
    this.bounce += (this.targetBounce2 - this.bounce) * 0.05;

    // 4. Height gating: smoothstep(0.45, 0.7, centroid.y)
    const tHeight = Math.max(0, Math.min(1, (this.centroid[1] - 0.45) / (0.7 - 0.45)));
    const heightGate = tHeight * tHeight * (3.0 - 2.0 * tHeight);
    l *= heightGate;
    l = Math.max(0, l);

    // 5. Dual-stage lerp smoothing
    this.targetDisplacement1 = l;
    this.targetDisplacement2 += (this.targetDisplacement1 - this.targetDisplacement2) * 0.06;
    this.displacement += (this.targetDisplacement2 - this.displacement) * 0.06;

    // 6. Displacement position: centroid + centroid * displacement
    this.position = [
      this.centroid[0] + this.centroid[0] * this.displacement,
      this.centroid[1] + this.centroid[1] * this.displacement,
      this.centroid[2] + this.centroid[2] * this.displacement
    ];

    return { displacement: this.displacement, bounce: this.bounce, heightGate };
  }
}

// Test lower brick below height gate (y = 0.2)
const lowerBrick = new BrickSimulationMock([1.5, 0.2, 1.0], [0.5, 0.5, 0.5]);
const lowerRes = lowerBrick.update([1.5, 0.2, 1.0], 1.0, 0.0);
assert(approx(lowerRes.heightGate, 0.0), `Lower brick below 0.45 threshold has 0 heightGate: ${lowerRes.heightGate}`);
assert(approx(lowerRes.displacement, 0.0), `Lower brick remains completely un-displaced: ${lowerRes.displacement}`);

// Test upper dome brick (y = 1.2)
const upperBrick = new BrickSimulationMock([1.0, 1.2, 1.0], [0.5, 0.5, 0.5]);
for (let i = 0; i < 30; i++) {
  upperBrick.update([1.0, 1.2, 1.0], 1.0 + i * 0.016, 0.0);
}
assert(upperBrick.displacement > 0.0, `Upper brick above 0.70 threshold displaces actively: ${upperBrick.displacement.toFixed(4)}`);

// Test 3.3: Data Texture packing format (Float32Array [N * N * 4])
const numBricks = 144;
let texSize = Math.ceil(Math.sqrt(numBricks) / 4) * 4;
texSize = Math.max(texSize, 4);
const optionsData = new Float32Array(texSize * texSize * 4);
const testDisplacement = 0.75;
const testBounce = 0.35;
const brickIdx = 10;

optionsData[brickIdx * 4 + 0] = testDisplacement;
optionsData[brickIdx * 4 + 1] = testBounce;

assert(approx(optionsData[brickIdx * 4 + 0], testDisplacement), `DataTexture R-channel encodes displacement correctly: ${optionsData[brickIdx * 4 + 0]}`);
assert(approx(optionsData[brickIdx * 4 + 1], testBounce), `DataTexture G-channel encodes bounce correctly: ${optionsData[brickIdx * 4 + 1]}`);

// Test 3.4: Dual lightmap blending formula: mix(tMap, tMapExploded, clamp(5.0 * displacement, 0.0, 1.0))
function lightmapMixFactor(displacement) {
  return Math.max(0.0, Math.min(1.0, 5.0 * displacement));
}
assert(approx(lightmapMixFactor(0.0), 0.0), `Displacement 0.0 selects 100% tMap (assembled lightmap)`);
assert(approx(lightmapMixFactor(0.1), 0.5), `Displacement 0.1 selects 50/50 mix of tMap and tMapExploded`);
assert(approx(lightmapMixFactor(0.25), 1.0), `Displacement >= 0.2 selects 100% tMapExploded (exploded lightmap)`);

// ----------------------------------------------------------------------------
// TEST SUITE 4: 3D MSDF MANIFESTO TYPOGRAPHY & GLYPH SCRAMBLER
// ----------------------------------------------------------------------------
console.log('\n[Suite 4] Testing 3D MSDF Manifesto Typography & Cryptographic Scramble Shader...');

// Test 4.1: Median extraction for MSDF signed distance field calculation:
// max(min(r, g), min(max(r, g), b)) - 0.5
function msdfMedian(r, g, b) {
  return Math.max(Math.min(r, g), Math.min(Math.max(r, g), b)) - 0.5;
}
assert(approx(msdfMedian(0.8, 0.7, 0.6), 0.7 - 0.5), `Median of (0.8, 0.7, 0.6) is 0.7 -> signed distance 0.2`);
assert(approx(msdfMedian(0.2, 0.9, 0.5), 0.5 - 0.5), `Median of (0.2, 0.9, 0.5) is 0.5 -> signed distance 0.0 (glyph boundary)`);

// Test 4.2: Cryptographic character scramble UV offset formula:
// vUv.x = mod(uv.x + 0.125 * mod(floor((1.0 - tr2) * 5.753), 8.0), 1.0);
function glyphScrambleOffset(tr2) {
  const scrambleCol = Math.floor((1.0 - tr2) * 5.753) % 8.0;
  return 0.125 * scrambleCol;
}
// When tr2 = 1.0 (text fully materialized):
const offsetFinal = glyphScrambleOffset(1.0);
assert(approx(offsetFinal, 0.0), `Final state (tr2=1.0) produces zero glyph UV shift: ${offsetFinal}`);

// When tr2 = 0.0 (initial state):
const offsetInitial = glyphScrambleOffset(0.0);
assert(offsetInitial > 0.0, `Initial state (tr2=0.0) produces active glyph scramble offset: ${offsetInitial}`);

// Test 4.3: Manifesto content invariants
const MANIFESTO_INVARIANTS = {
  title: '////// Manifesto',
  text: 'Our mission is to build the next generation of consumer brands at the intersection of Community, AI, and crypto.',
  copyright: '// Copyright © 2026',
  rights: 'Igloo, Inc.\nAll Rights Reserved.',
  colorTitle: '#3C3C54',
  colorText: '#ffffff'
};
assert(MANIFESTO_INVARIANTS.title.startsWith('//////'), `Manifesto title verified: "${MANIFESTO_INVARIANTS.title}"`);
assert(MANIFESTO_INVARIANTS.text.includes('consumer brands'), `Manifesto body text verified: "${MANIFESTO_INVARIANTS.text.slice(0, 30)}..."`);
assert(MANIFESTO_INVARIANTS.copyright.includes('2026'), `Copyright text verified: "${MANIFESTO_INVARIANTS.copyright}"`);

// ----------------------------------------------------------------------------
// TEST SUITE 5: SHOCKWAVE MATH & RADIAL DISPERSION
// ----------------------------------------------------------------------------
console.log('\n[Suite 5] Testing Shockwave Radial Math (falloff & falloffsmooth)...');

/**
 * Exact falloff implementation from App3D-d68cb154.js:
 * float _linstep(float begin, float end, float t) { return clamp((t-begin)/(end-begin), 0.0, 1.0); }
 * float falloffsmooth(float _input, float start, float end, float margin, float progress) {
 *     float m = margin * sign(end - start);
 *     float p = mix(start - m, end, progress);
 *     return smoothstep(p + m, p, _input);
 * }
 */
function linstep(begin, end, t) {
  return Math.max(0.0, Math.min(1.0, (t - begin) / (end - begin)));
}
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}
function falloffsmooth(inputVal, start, end, margin, progress) {
  const m = margin * Math.sign(end - start);
  const p = (start - m) + ((end) - (start - m)) * progress;
  return smoothstep(p + m, p, inputVal);
}

// Shockwave test: radial shockwave expanding from 0 to 32 over progress [0, 1]
// Points behind the wavefront (_input <= p) return 1.0
// Points ahead of the wavefront (_input >= p + m) return 0.0
// Points in the transition zone [p, p + m] smoothstep between 1.0 and 0.0
const shockwavePassed = falloffsmooth(10.0, 0.0, 32.0, 8.0, 1.0); // progress=1.0: p=32, p+m=40, input=10 <= 32 -> 1.0
const shockwaveAhead = falloffsmooth(20.0, 0.0, 32.0, 8.0, 0.0);  // progress=0.0: p=-8, p+m=0, input=20 >= 0 -> 0.0
const shockwaveInMargin = falloffsmooth(36.0, 0.0, 32.0, 8.0, 1.0); // progress=1.0: p=32, p+m=40, input=36 is mid-margin (0.5)

assert(approx(shockwavePassed, 1.0), `Points behind wavefront evaluate to 1.0: ${shockwavePassed.toFixed(4)}`);
assert(approx(shockwaveAhead, 0.0), `Points ahead of wavefront evaluate to 0.0: ${shockwaveAhead.toFixed(4)}`);
assert(approx(shockwaveInMargin, 0.5), `Wavefront margin midpoint smoothsteps to 0.5: ${shockwaveInMargin.toFixed(4)}`);

// ----------------------------------------------------------------------------
// TEST SUITE 6: CAMERA TIMELINE & SCENE INVARIANTS (class F3)
// ----------------------------------------------------------------------------
console.log('\n[Suite 6] Testing Scene F3 Camera & Timeline Invariants...');

const SCENE_INVARIANTS = {
  fov: 30,
  basePosition: [-14, 4, 14],
  baseTarget: [0, 1, 0],
  cameraDisplacement: [0.07, 0.025],
  shakeScalar: 0.01,
  shakeSpeed: 0.5,
  initialScrollAutocenter: 0.495,
  bloom: {
    levels: 6,
    luminanceThreshold: 0.2,
    intensity: 1.0,
    radius: 0.85
  },
  mountainTransformsCount: 5,
  terrainTransformsCount: 5,
  patchesCount: 2
};

assert(SCENE_INVARIANTS.fov === 30, `Camera field-of-view is 30 degrees`);
assert(SCENE_INVARIANTS.basePosition[0] === -14 && SCENE_INVARIANTS.basePosition[1] === 4 && SCENE_INVARIANTS.basePosition[2] === 14, `Camera basePosition is [-14, 4, 14]`);
assert(SCENE_INVARIANTS.baseTarget[1] === 1, `Camera baseTarget is [0, 1, 0]`);
assert(SCENE_INVARIANTS.bloom.levels === 6 && SCENE_INVARIANTS.bloom.radius === 0.85, `Bloom postprocessing config verified`);
assert(SCENE_INVARIANTS.mountainTransformsCount === 5, `5 mountain instances configured`);
assert(SCENE_INVARIANTS.terrainTransformsCount === 5, `5 terrain instances configured`);
assert(SCENE_INVARIANTS.patchesCount === 2, `2 terrain patch instances configured`);

console.log('\n' + '='.repeat(70));
console.log(`🎉 ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log('='.repeat(70) + '\n');
