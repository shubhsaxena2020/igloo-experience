/**
 * Verification Test Suite for the Cubes Scene (class aF)
 * Reverse Engineered from assets/App3D-d68cb154.js
 * Igloo Inc. WebGL2 Experience
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const BUNDLE_PATH = path.join(ROOT_DIR, 'assets', 'App3D-d68cb154.js');

console.log('================================================================');
console.log('🧊 CUBES SCENE (class aF) VERIFICATION & RECONSTRUCTION TEST');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

// -------------------------------------------------------------
// Test 1: Physical Asset Audit for Cubes Scene
// -------------------------------------------------------------
console.log('--- TEST SUITE 1: Physical Asset Audit ---');

const REQUIRED_ASSETS = [
  // Geometries
  'assets/geometries/cubes/cube3.drc',
  'assets/geometries/cubes/cube1.drc',
  'assets/geometries/pudgy.drc',
  'assets/geometries/overpass_logo.drc',
  'assets/geometries/cubes/background_shapes.drc',
  'assets/geometries/blurrytext.drc',
  // Textures & Maps
  'assets/images/cubes/cube3_roughness.ktx2',
  'assets/images/cubes/cube3_normal.ktx2',
  'assets/images/cubes/pudgy_color.ktx2',
  'assets/images/cubes/cube1_roughness.ktx2',
  'assets/images/cubes/cube1_normal.ktx2',
  'assets/images/cubes/overpass_logo_color.ktx2',
  'assets/images/cubes/advect.png',
  'assets/images/cubes/bg.png',
  'assets/images/shapes_blurred.ktx2',
  'assets/images/wind_noise.ktx2',
  'assets/images/cubes_env.exr',
  'assets/images/cubes/cube_scene.ktx2',
  'assets/images/noises/blue-8-128-rgb.ktx2',
  'assets/images/igloo/triangles_tiling.ktx2',
  // Audio
  'assets/audio/shard.ogg',
  'assets/audio/beeps.ogg',
  'assets/audio/click-project.ogg',
  'assets/audio/enter-project.ogg'
];

let assetsMissing = 0;
for (const rel of REQUIRED_ASSETS) {
  const full = path.join(ROOT_DIR, rel);
  const exists = fs.existsSync(full);
  if (exists) {
    const size = fs.statSync(full).size;
    assert(size > 0, `Asset ${rel} exists (${size.toLocaleString()} bytes)`);
  } else {
    assert(false, `Asset ${rel} missing on disk`);
    assetsMissing++;
  }
}

// -------------------------------------------------------------
// Test 2: Bundle Code Extraction & Structural Integrity
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 2: Core Class Extraction from Bundle ---');

assert(fs.existsSync(BUNDLE_PATH), `Bundle file exists at ${BUNDLE_PATH}`);
const bundleContent = fs.readFileSync(BUNDLE_PATH, 'utf8');

const REQUIRED_CLASSES = [
  { name: 'class aF (Cubes Scene)', signature: 'class aF extends Jo' },
  { name: 'class nF (Cube Entity)', signature: 'class nF extends Gi' },
  { name: 'class WL (Custom Ice PBR Material)', signature: 'class WL extends Ys' },
  { name: 'class jL (Mouse Frost Controller)', signature: 'class jL' },
  { name: 'class JL (Fluid Advection Shader)', signature: 'class JL extends fe' },
  { name: 'class rF (Background Shapes)', signature: 'class rF' },
  { name: 'class k3 (Background Plane)', signature: 'class k3' },
  { name: 'class z3 (Blurry Text Layer)', signature: 'class z3' },
  { name: 'class sF (Plexus Network)', signature: 'class sF' },
  { name: 'class KL (Cube HUD Manager)', signature: 'class KL' }
];

for (const cls of REQUIRED_CLASSES) {
  assert(bundleContent.includes(cls.signature), `Detected ${cls.name}`);
}

// -------------------------------------------------------------
// Test 3: Portfolio Cubes Data Model Extraction
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 3: Portfolio Cubes Configuration Extraction ---');

const cubesIdx = bundleContent.indexOf('cubes:[{title:"PORTFOLIO_CO_01 Pudgy Penguins"');
assert(cubesIdx !== -1, 'Found Be.cubes array in bundle');

// Extract individual portfolio cube configs
assert(bundleContent.includes('title:"PORTFOLIO_CO_01 Pudgy Penguins"'), 'Cube 0: Title matches');
assert(bundleContent.includes('hash:"pudgy-penguins"'), 'Cube 0: Hash matches pudgy-penguins');
assert(bundleContent.includes('obj:"cube3"'), 'Cube 0: Outer geometry matches cube3');
assert(bundleContent.includes('innerobject:"pudgy"'), 'Cube 0: Inner object matches pudgy');
assert(bundleContent.includes('objScale:1.1'), 'Cube 0: Inner object scale matches 1.1');

assert(bundleContent.includes('title:"PORTFOLIO_CO_02 Overpass"'), 'Cube 1: Title matches');
assert(bundleContent.includes('hash:"overpass"'), 'Cube 1: Hash matches overpass');
assert(bundleContent.includes('obj:"cube1"'), 'Cube 1: Outer geometry matches cube1');
assert(bundleContent.includes('innerobject:"overpass_logo"'), 'Cube 1: Inner object matches overpass_logo');
assert(bundleContent.includes('objScale:1.2'), 'Cube 1: Inner object scale matches 1.2');

// -------------------------------------------------------------
// Test 4: Volumetric Transmission & Refraction Shader Verification (WL)
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 4: Ice Refraction Shader Pipeline (WL) ---');

assert(bundleContent.includes('AWESOME_SAMPLES=e'), 'WL defines multi-sampling parameter');
assert(bundleContent.includes('uChromaticAberration:{value:.1}'), 'WL defines chromatic aberration = 0.1');
assert(bundleContent.includes('uColorFrost:{value:new Z("#83a1c5")}'), 'WL defines ice frost glow color #83a1c5');
assert(bundleContent.includes('uTransmission:{value:1}'), 'WL defines transmission = 1');
assert(bundleContent.includes('uThickness:{value:2}'), 'WL defines thickness = 2');
assert(bundleContent.includes('textureBicubic( tTransmissionSamplerMap, fragCoord.xy, lod )'), 'WL employs N8 Bicubic Texture Filtering');
assert(bundleContent.includes('totalEmissiveRadiance += triangles * mousefrostrim * 10.0'), 'WL adds micro-crystal sparkling to fluid rim');
assert(bundleContent.includes('roughnessFactor *= 1.0 - mousefrost'), 'WL dynamic roughness modulation from fluid splat');
assert(bundleContent.includes('mapN.xy *= 1.0 - mousefrost'), 'WL normal map flattening from fluid splat');

// -------------------------------------------------------------
// Test 5: Fluid Simulation Overlay & Advection Math (JL & jL)
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 5: Fluid Simulation Advection & Splat Math ---');

assert(bundleContent.includes('tAdvect:{value:le.load("cubes/advect.png","colordata-repeat")}'), 'JL loads advect.png as repeating colordata vector field');
assert(bundleContent.includes('nextVal *= 0.985'), 'JL applies 0.985 damping factor per simulation step');
assert(bundleContent.includes('float rim = nextVal - texture2D(tBuffer, uv).r'), 'JL computes wave rim differential');
assert(bundleContent.includes('this.rts=[s,s.clone()]'), 'jL instantiates ping-pong render targets');

// Fluid simulation mathematical verification
function simulateFluidStep(currentVal, neighbors, advectDelta, isSplat, splatDistance, radius) {
  let uvVal = currentVal;
  // 4-neighbor max propagation
  const maxNeighbor = Math.max(...neighbors);
  let nextVal = maxNeighbor;

  if (isSplat && splatDistance < radius) {
    const t = Math.max(0, Math.min(1, 1 - splatDistance / radius));
    const splatIntensity = t * t * t; // cubicIn
    nextVal += splatIntensity;
  }

  // Damping and clamp
  nextVal *= 0.985;
  nextVal = Math.min(nextVal, 1.0);
  const rim = nextVal - currentVal;
  return { nextVal, rim };
}

// Test splat impulse calculation
const splatStep = simulateFluidStep(0.0, [0, 0, 0, 0], 0, true, 0.02, 0.05);
assert(splatStep.nextVal > 0.2, `Fluid splat impulse generates energy (${splatStep.nextVal.toFixed(4)})`);
assert(splatStep.rim > 0.2, `Fluid rim wave crest generated (${splatStep.rim.toFixed(4)})`);

// Test decay
let decayedVal = 1.0;
for (let i = 0; i < 100; i++) {
  decayedVal = simulateFluidStep(decayedVal, [decayedVal * 0.99, 0, 0, 0], 0, false, 0, 0).nextVal;
}
assert(decayedVal < 0.3, `Fluid decay properly dissipates over 100 steps (${decayedVal.toFixed(4)})`);

// -------------------------------------------------------------
// Test 6: Floating Background Shapes Shader & Transform (rF)
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 6: Floating Background Shapes Transform (rF) ---');

assert(bundleContent.includes('zt.load("cubes/background_shapes.drc")'), 'rF loads cubes/background_shapes.drc');
assert(bundleContent.includes('tMap:{value:le.load("shapes_blurred.ktx2","srgb")}'), 'rF binds shapes_blurred.ktx2');
assert(bundleContent.includes('viewMatrixCopy[3] = vec4(0.0, 0.0, -5.0, 1.0)'), 'rF reconstructs static camera view matrix at z=-5');
assert(bundleContent.includes('customPos.y += uProgress * 10.0'), 'rF translates vertically with scroll progress');

// -------------------------------------------------------------
// Test 7: Cube Motion & Temperature Readout Mathematics
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 7: Motion Dynamics & Temperature Math ---');

function computeCubeRotation(progress, centeredProgress, index, rand) {
  const a = centeredProgress - progress;
  const o = (index + rand) * 242.45353 % 1 < 0.5 ? -1 : 1;
  const l = o, c = -o, h = o;
  const d = 0.1 + (rand * 12.3423 % 1) * 0.1;
  const u = 0.1 + (rand * 123.5343 % 1) * 0.2;
  const f = 0.1 + (rand * 54.654 % 1) * 0.15;
  const p = 11 * l * (1 - d);
  const A = 14 * c * (1 - u);
  const m = 6 * h * (1 - f);
  return { rotY: p * a, rotX: A * a, rotZ: m * a };
}

const rotCube0 = computeCubeRotation(0.3333, 0.3333, 0, 0.42);
assert(Math.abs(rotCube0.rotX) < 1e-4 && Math.abs(rotCube0.rotY) < 1e-4, 'Cube 0 rotation is zero at centered progress');

function formatTemperature(baseTemp, timeSec, rand) {
  const temp = baseTemp + Math.sin(timeSec * 0.05 + rand) * 2.0;
  const fahr = temp * 1.8 + 32.0;
  return {
    celsius: (temp >= 0 ? '+' : '') + temp.toFixed(2) + '°C',
    fahrenheit: fahr.toFixed(2) + '°F'
  };
}

const pudgyTemp = formatTemperature(0.0, 0, 1.23);
const overpassTemp = formatTemperature(-3.0, 0, 1.23);

assert(pudgyTemp.celsius.includes('°C') && pudgyTemp.fahrenheit.includes('°F'), `Pudgy Penguins Temp formatted: ${pudgyTemp.celsius} / ${pudgyTemp.fahrenheit}`);
assert(overpassTemp.celsius.includes('°C') && overpassTemp.fahrenheit.includes('°F'), `Overpass Temp formatted: ${overpassTemp.celsius} / ${overpassTemp.fahrenheit}`);

// -------------------------------------------------------------
// Final Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`RESULTS: ${passedTests} OF ${totalTests} CHECKS PASSED`);
if (passedTests === totalTests) {
  console.log('STATUS: ALL VERIFICATION CHECKS SUCCEEDED');
} else {
  console.error(`STATUS: ${totalTests - passedTests} CHECKS FAILED`);
  process.exitCode = 1;
}
console.log('================================================================\n');
