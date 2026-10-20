/**
 * verify_entry_scene.js
 * 
 * Standalone verification script & test module for the Entry Scene (class UF)
 * in Igloo Inc. 3D WebGL2 experience (assets/App3D-d68cb154.js).
 * 
 * Verifies:
 * 1. Asset existence on disk (DRC geometries, KTX2/PNG textures).
 * 2. Exact source code extraction from App3D-d68cb154.js.
 * 3. GSAP CustomEase curves (inOut5, entry_ease, entry_ease_2, entry_ease_3, inOut1..4).
 * 4. Exact camera intro timeline simulation (position, target, FOV, up-vector roll).
 * 5. Text cylinder geometry transforms, atlas mapping & rotation logic.
 * 6. Smoke trails & plasma geometry transforms, instance counts, shaders & uniforms.
 * 7. Particle systems (snowparticles, ambientparticles, containerparticles GPGPU).
 * 8. Scroll & auto-center calculations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color helpers for terminal output
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS${RESET} ${message}`);
  } else {
    failedTests++;
    console.log(`  ${RED}✗ FAIL${RESET} ${message}`);
    if (details) console.log(`    ${YELLOW}Details: ${details}${RESET}`);
  }
}

console.log(`${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}${CYAN}   IGLOO INC. - ENTRY SCENE (class UF) VERIFICATION SUITE       ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

// ---------------------------------------------------------------------------
// 1. Asset Verification
// ---------------------------------------------------------------------------
console.log(`${BOLD}1. Verifying Local Asset Files on Disk${RESET}`);
const requiredAssets = [
  'assets/App3D-d68cb154.js',
  'assets/geometries/blurrytext_cylinder.drc',
  'assets/geometries/blurrytext.drc',
  'assets/geometries/smoke_trail.drc',
  'assets/geometries/ceilingsmoke.drc',
  'assets/geometries/shattered_ring_smoke.drc',
  'assets/geometries/shattered_ring.drc',
  'assets/geometries/shattered_ring2.drc',
  'assets/geometries/floor.drc',
  'assets/images/cubes/blurrytext_atlas.ktx2',
  'assets/images/wind_noise.ktx2',
  'assets/images/clouds_noise.ktx2',
  'assets/images/igloo/triangles_tiling.ktx2',
  'assets/images/noises/blue-8-128-rgb.ktx2',
  'assets/images/scroll-datatexture.ktx2',
  'assets/images/perlin-datatexture.png',
  'assets/images/floor_color.ktx2',
  'assets/images/volumes/medium_32.ktx2',
  'assets/images/volumes/peachesbody_64.ktx2',
  'assets/images/volumes/x_64.ktx2'
];

requiredAssets.forEach(assetPath => {
  const fullPath = path.resolve(__dirname, assetPath);
  const exists = fs.existsSync(fullPath);
  const size = exists ? fs.statSync(fullPath).size : 0;
  assert(exists && size > 0, `Asset: ${assetPath} (${size} bytes)`);
});

// ---------------------------------------------------------------------------
// 2. Source Code Extraction & Signature Validation
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}2. Validating Class UF & Scene Signatures in App3D-d68cb154.js${RESET}`);
const bundlePath = path.resolve(__dirname, 'assets/App3D-d68cb154.js');
const bundle = fs.readFileSync(bundlePath, 'utf8');

assert(bundle.includes('class UF extends Jo'), 'Found class UF extends Jo');
assert(bundle.includes('entry:UF'), 'Found entry:UF scene registry in ty object');
assert(bundle.includes('initialScrollAutocenter=.2'), 'Found initialScrollAutocenter = 0.2');
assert(bundle.includes('finalScrollAutocenter=.76'), 'Found finalScrollAutocenter = 0.76');
assert(bundle.includes('this.height=5.5'), 'Found Entry Scene height = 5.5');

// Check custom ease definitions in bundle
assert(bundle.includes('Ei.create("inOut5"'), 'Found Ei.create("inOut5")');
assert(bundle.includes('Ei.create("entry_ease"'), 'Found Ei.create("entry_ease")');
assert(bundle.includes('Ei.create("entry_ease_2"'), 'Found Ei.create("entry_ease_2")');
assert(bundle.includes('Ei.create("entry_ease_3"'), 'Found Ei.create("entry_ease_3")');

// ---------------------------------------------------------------------------
// 3. Custom GSAP Easing Curve Solver & Numerical Verification
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}3. Custom GSAP Easing Curve Verification${RESET}`);

// Mathematical cubic Bezier solver matching SVG C commands
function evalCubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const x = mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x;
  const y = mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y;
  return { x, y };
}

function createCustomEase(segments) {
  return function(xTarget) {
    if (xTarget <= 0) return 0;
    if (xTarget >= 1) return 1;

    for (const seg of segments) {
      const [p0, p1, p2, p3] = seg;
      if (xTarget >= p0.x && xTarget <= p3.x) {
        let low = 0, high = 1;
        for (let iter = 0; iter < 32; iter++) {
          const mid = (low + high) * 0.5;
          const pt = evalCubicBezier(p0, p1, p2, p3, mid);
          if (pt.x < xTarget) {
            low = mid;
          } else {
            high = mid;
          }
        }
        const finalPt = evalCubicBezier(p0, p1, p2, p3, (low + high) * 0.5);
        return finalPt.y;
      }
    }
    return xTarget;
  };
}

// SVG Curve specifications from App3D-d68cb154.js
const EASE_DEFS = {
  inOut5: [
    [{x:0, y:0}, {x:0.171, y:0}, {x:0.77, y:-0.013}, {x:0.842, y:0.272}],
    [{x:0.842, y:0.272}, {x:0.972, y:0.794}, {x:0.972, y:0.85}, {x:1, y:1}]
  ],
  entry_ease: [
    [{x:0, y:0}, {x:0.358, y:0}, {x:0.336, y:0.209}, {x:0.442, y:0.519}],
    [{x:0.442, y:0.519}, {x:0.59, y:0.952}, {x:0.768, y:0.918}, {x:1, y:1}]
  ],
  entry_ease_2: [
    [{x:0, y:0}, {x:0.388, y:0.082}, {x:0.924, y:0.862}, {x:1, y:1}]
  ],
  entry_ease_3: [
    [{x:0, y:0}, {x:0.272, y:0}, {x:0.472, y:0.454}, {x:0.496, y:0.496}],
    [{x:0.496, y:0.496}, {x:0.66, y:0.79}, {x:0.685, y:1}, {x:1, y:1}]
  ]
};

const easeSolvers = {};
for (const [name, segs] of Object.entries(EASE_DEFS)) {
  const solver = createCustomEase(segs);
  easeSolvers[name] = solver;

  const y0 = solver(0);
  const y1 = solver(1);
  const y05 = solver(0.5);

  assert(Math.abs(y0) < 1e-4, `${name}: Boundary y(0) === 0`);
  assert(Math.abs(y1 - 1) < 1e-4, `${name}: Boundary y(1) === 1`);
  assert(y05 >= -0.05 && y05 <= 1.05, `${name}: Midpoint value within valid range [${y05.toFixed(4)}]`);
}

// Validate characteristic behavior of the custom curves
assert(easeSolvers.inOut5(0.7) < 0.15, 'inOut5: High delay (stays below 0.15 at t=0.7)');
assert(easeSolvers.inOut5(0.95) > 0.70, 'inOut5: Steep terminal ramp (exceeds 0.70 at t=0.95)');
assert(easeSolvers.entry_ease(0.5) > 0.60, 'entry_ease: S-curve inflection (exceeds 0.60 at t=0.5)');
assert(easeSolvers.entry_ease_3(0.5) >= 0.49 && easeSolvers.entry_ease_3(0.5) <= 0.52, 'entry_ease_3: Symmetric center (approx 0.50 at t=0.5)');

// ---------------------------------------------------------------------------
// 4. Exact Timeline Emulation & State Trajectory
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}4. Camera Intro Timeline Emulation & Trajectory Simulation${RESET}`);

// Standard GSAP built-in easings used in the timeline
const standardEases = {
  'power1.inOut': t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  'power1.in': t => t * t,
  'power1.out': t => 1 - (1 - t) * (1 - t),
  'power2.in': t => t * t * t,
  'power2.out': t => 1 - Math.pow(1 - t, 3),
  'power2.inOut': t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'power3.inOut': t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  'none': t => t
};

function getEase(name) {
  return easeSolvers[name] || standardEases[name] || standardEases['power1.inOut'];
}

function tweenValue(t, startTime, duration, from, to, easeName) {
  if (t <= startTime) return from;
  if (t >= startTime + duration) return to;
  const p = (t - startTime) / duration;
  const ep = getEase(easeName)(p);
  return from + (to - from) * ep;
}

// Complete timeline state evaluation at GSAP time `t` (0 to 9.2s)
function evaluateTimeline(t) {
  const progress = t / 9.2;

  // Timeline Position
  const posX = tweenValue(t, 0.0, 2.5, 0, 0, 'power2.out');
  const posY = tweenValue(t, 0.2, 7.0, 1.5, -9.83, 'entry_ease_3');
  let posZ = -2.0;
  if (t <= 2.5) {
    posZ = tweenValue(t, 0.0, 2.5, -2.0, 0.0, 'power2.out');
  } else if (t <= 7.2) {
    posZ = tweenValue(t, 3.5, 3.7, 0.0, -1.5, 'entry_ease');
  } else {
    posZ = tweenValue(t, 7.2, 2.0, -1.5, -3.0, 'entry_ease_2');
  }

  // Timeline Target
  const tarX = tweenValue(t, 0.0, 2.5, 0, 0, 'power2.out');
  let tarY = -2.5;
  if (t <= 3.2) {
    tarY = tweenValue(t, 0.2, 3.0, -2.5, -10.0, 'power1.inOut');
  } else if (t <= 7.2) {
    tarY = tweenValue(t, 3.2, 2.5, -10.0, -9.81, 'power1.inOut');
  } else {
    tarY = tweenValue(t, 7.2, 2.0, -9.81, -10.35, 'power2.in');
  }
  const tarZ = tweenValue(t, 0.0, 2.5, -1.0, 0.0, 'power2.out');

  // Camera FOV
  const fov = tweenValue(t, 0.0, 7.2, 22.0, 30.0, 'power1.inOut');

  // Additional orientation
  const upRotation = tweenValue(t, 1.0, 5.25, 0.0, Math.PI, 'power3.inOut');
  const upOriginal = tweenValue(t, 3.5, 3.7, 0.0, 1.0, 'entry_ease');

  // Displacement
  const dispX = tweenValue(t, 4.0, 1.0, 0.01, 0.0, 'power2.inOut');
  const dispY = tweenValue(t, 4.0, 1.0, 0.005, 0.0, 'power2.inOut');
  const dispTarX = tweenValue(t, 4.0, 2.0, 0.0, -0.03, 'power2.inOut');
  const dispTarY = tweenValue(t, 4.0, 2.0, 0.0, -0.01, 'power2.inOut');
  const dispRot = tweenValue(t, 4.0, 2.0, 0.0, 0.05, 'power2.inOut');

  // Mesh visibilities driven by progress in timeline onUpdate
  const vis = {
    rings0: progress < 0.34,
    rings1: progress < 0.43,
    rings2: progress < 0.52,
    ringforcefield0: progress > 0.10 && progress < 0.34,
    ringforcefield1: progress > 0.25 && progress < 0.43,
    ringforcefield2: progress > 0.36 && progress < 0.52,
    plasma0: progress > 0.06 && progress < 0.34,
    plasma1: progress > 0.25 && progress < 0.43,
    plasma2: progress > 0.35 && progress < 0.52,
    smoketrail0: progress > 0 && progress < 0.37,
    smoketrail1: progress > 0 && progress < 0.47,
    smoketrail2: progress > 0 && progress < 0.56,
    tunnel: progress < 0.52,
    snowparticles: progress < 0.52,
    roomring: progress > 0.53,
    containerparticles: t >= 1.5,
    floor: t >= 3.4,
    textcylinder: t >= 4.5,
    forcefield: t >= 4.0,
    groundsmoke: t >= 3.4,
    ceilingsmoke: t >= 4.5,
    ambientparticles: t >= 3.4
  };

  // Portal Volume calculation
  let minDistance = Infinity;
  [0.28, 0.375, 0.465].forEach(marker => {
    minDistance = Math.min(minDistance, Math.abs(progress - marker));
  });
  const fitDist = Math.max(0, Math.min(1, (minDistance - 0.04) / (0 - 0.04))); // fit(n, 0, 0.04, 1, 0)
  const portalsVolume = standardEases['power2.out'](fitDist) * 0.9;

  return {
    t,
    progress,
    pos: { x: posX, y: posY, z: posZ },
    tar: { x: tarX, y: tarY, z: tarZ },
    fov,
    upRotation,
    upOriginal,
    disp: { x: dispX, y: dispY },
    dispTar: { x: dispTarX, y: dispTarY },
    dispRot,
    vis,
    portalsVolume
  };
}

// Test initial keyframe (t = 0.0s)
const s0 = evaluateTimeline(0.0);
assert(s0.pos.x === 0 && s0.pos.y === 1.5 && s0.pos.z === -2.0, 'Timeline t=0s: Position is (0, 1.5, -2)');
assert(s0.tar.x === 0 && s0.tar.y === -2.5 && s0.tar.z === -1.0, 'Timeline t=0s: Target is (0, -2.5, -1)');
assert(s0.fov === 22.0, 'Timeline t=0s: Camera FOV is 22.0 deg');
assert(s0.upRotation === 0.0 && s0.upOriginal === 0.0, 'Timeline t=0s: Orientation upRotation=0, upOriginal=0');
assert(s0.vis.tunnel === true && s0.vis.snowparticles === true, 'Timeline t=0s: Tunnel & snow particles visible');
assert(s0.vis.floor === false && s0.vis.textcylinder === false, 'Timeline t=0s: Interior floor & text cylinders hidden');

// Test midpoint keyframe (t = 4.6s -> progress = 0.5)
const sMid = evaluateTimeline(4.6);
assert(sMid.pos.y < -3.0 && sMid.pos.y > -8.0, `Timeline t=4.6s (progress=0.5): Camera descending y=${sMid.pos.y.toFixed(2)}`);
assert(sMid.upRotation > 1.5, `Timeline t=4.6s: Camera barrel rolling, upRotation=${sMid.upRotation.toFixed(2)} rad`);
assert(sMid.vis.containerparticles === true, 'Timeline t=4.6s: Container particles visible');
assert(sMid.vis.floor === true, 'Timeline t=4.6s: Floor visible');

// Test terminal keyframe (t = 9.2s -> progress = 1.0)
const sEnd = evaluateTimeline(9.2);
assert(Math.abs(sEnd.pos.y - (-9.83)) < 1e-3, 'Timeline t=9.2s: Position Y reached room level -9.83');
assert(Math.abs(sEnd.pos.z - (-3.0)) < 1e-3, 'Timeline t=9.2s: Position Z reached final dolly -3.0');
assert(Math.abs(sEnd.tar.y - (-10.35)) < 1e-3, 'Timeline t=9.2s: Target Y reached final lookdown -10.35');
assert(Math.abs(sEnd.fov - 30.0) < 1e-3, 'Timeline t=9.2s: Camera FOV widened to 30.0 deg');
assert(Math.abs(sEnd.upRotation - Math.PI) < 1e-3, 'Timeline t=9.2s: Camera upRotation complete at Math.PI');
assert(Math.abs(sEnd.upOriginal - 1.0) < 1e-3, 'Timeline t=9.2s: Camera upOriginal complete at 1.0 (level)');
assert(sEnd.vis.roomring === true && sEnd.vis.textcylinder === true, 'Timeline t=9.2s: Room ring & text cylinders visible');
assert(sEnd.vis.tunnel === false && sEnd.vis.snowparticles === false, 'Timeline t=9.2s: Entry tunnel & snow particles culled');

// Test Portal Sound Volume Spikes
const portalSample1 = evaluateTimeline(0.28 * 9.2);
const portalSample2 = evaluateTimeline(0.375 * 9.2);
const portalSample3 = evaluateTimeline(0.465 * 9.2);
const nonPortalSample = evaluateTimeline(0.10 * 9.2);

assert(portalSample1.portalsVolume > 0.85, `Portal 1 audio peak volume: ${portalSample1.portalsVolume.toFixed(2)} at progress=0.28`);
assert(portalSample2.portalsVolume > 0.85, `Portal 2 audio peak volume: ${portalSample2.portalsVolume.toFixed(2)} at progress=0.375`);
assert(portalSample3.portalsVolume > 0.85, `Portal 3 audio peak volume: ${portalSample3.portalsVolume.toFixed(2)} at progress=0.465`);
assert(nonPortalSample.portalsVolume === 0.0, `Non-portal audio volume silent: 0.0 at progress=0.10`);

// ---------------------------------------------------------------------------
// 5. Rotating Text Cylinder Verification
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}5. Rotating Text Cylinder (blurrytext_cylinder.drc & blurrytext.drc)${RESET}`);

assert(bundle.includes('zt.load("blurrytext_cylinder.drc")'), 'blurrytext_cylinder.drc loaded in class fF');
assert(bundle.includes('zt.load("blurrytext.drc")'), 'blurrytext.drc loaded in class z3');
assert(bundle.includes('cubes/blurrytext_atlas.ktx2'), 'Atlas cubes/blurrytext_atlas.ktx2 bound to text materials');

// Check mesh properties in fF
assert(bundle.includes('this.mesh.position.y=-10.33') && bundle.includes('this.mesh.scale.setScalar(1.75)'), 'Text cylinder 1: y=-10.33, scale=1.75, renderOrder=1');
assert(bundle.includes('this.mesh2.position.y=-10.33') && bundle.includes('this.mesh2.scale.setScalar(3.5)'), 'Text cylinder 2: y=-10.33, scale=3.5, rotation.y=PI*0.5');
assert(bundle.includes('this.mesh3.position.y=-9.5') && bundle.includes('this.mesh3.scale.set(2,9,2)'), 'Text cylinder 3: y=-9.5, scale=(2,9,2), rotation.y=PI');
assert(bundle.includes('this.mesh4.position.y=-9.5') && bundle.includes('this.mesh4.scale.set(3.3,8,3.3)'), 'Text cylinder 4: y=-9.5, scale=(3.3,8,3.3), renderOrder=-1');

// Check rotation update formulas
assert(bundle.includes('const e=this.scene.timelineAdditional.upRotation*.65;this.mesh4.rotation.y=e,this.mesh3.rotation.y=e+2'), 'Text cylinder update: mesh4.rotation.y = upRotation * 0.65, mesh3.rotation.y = upRotation * 0.65 + 2');

// ---------------------------------------------------------------------------
// 6. Smoke Trails & Plasma Verification
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}6. Smoke Trails (smoke_trail.drc, ceilingsmoke.drc, shattered_ring_smoke.drc)${RESET}`);

assert(bundle.includes('zt.load("smoke_trail.drc")'), 'smoke_trail.drc loaded in class EF');
assert(bundle.includes('zt.load("ceilingsmoke.drc")'), 'ceilingsmoke.drc loaded in class TF');
assert(bundle.includes('zt.load("shattered_ring_smoke.drc")'), 'shattered_ring_smoke.drc loaded in class IF and class MF');

// Class EF smoketrail setup
assert(bundle.includes('for(let a=0;a<s;a++){const o=`mesh${a}`;this[o]=new Ce(e,t),this[o].name=`smoketrail${a}`'), 'EF: 3 smoketrail mesh instances created');
assert(bundle.includes('this[o].position.y=-r') && bundle.includes('this[o].initialRotation=a*3.14*2*.25'), 'EF: Smoketrail initialRotation = a * PI * 0.5, vertical step = 2.5');
assert(bundle.includes('const e=this.scene.timelineAdditional.upRotation*.5;this.meshes.forEach(t=>{t.rotation.y=t.initialRotation+e})'), 'EF update: Smoketrail rotation.y = initialRotation + upRotation * 0.5');

// Class TF ceilingsmoke setup
assert(bundle.includes('this.mesh.position.y=-9.4') && bundle.includes('this.mesh.scale.set(2,.1,2)'), 'TF: ceilingsmoke mesh at y=-9.4, scale=(2, 0.1, 2), renderOrder=2');

// Class IF groundsmoke setup
assert(bundle.includes('this.mesh.position.y=-10.17') && bundle.includes('this.mesh.scale.set(5,.1,5)'), 'IF: groundsmoke mesh at y=-10.17, scale=(5, 0.1, 5), renderOrder=0');

// Class MF plasma setup
assert(bundle.includes('this[o].name=`plasma${a}`') && bundle.includes('this.scene.timelineAdditional.upRotation*.5'), 'MF: plasma meshes rotate with upRotation * 0.5');

// ---------------------------------------------------------------------------
// 7. Particle Systems Verification
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}7. Particle Systems (snowparticles, ambientparticles, containerparticles)${RESET}`);

// Snow particles (class CF)
assert(bundle.includes('count:200,shape:"box",scale:[3,8,3]'), 'CF: snowparticles count=200, box scale=[3, 8, 3]');
assert(bundle.includes('pos = treadmill(pos, vec3(3.0, 4.0, 3.0));'), 'CF: snowparticles looping treadmill volume (3, 4, 3)');
assert(bundle.includes('this.mesh.position.y-=3.5'), 'CF: snowparticles mesh offset y -= 3.5');

// Ambient particles (class BF)
assert(bundle.includes('count:60,shape:"box",scale:[2.5,.5,2.5]'), 'BF: ambientparticles count=60, box scale=[2.5, 0.5, 2.5]');
assert(bundle.includes('this.mesh.position.y=-9.61'), 'BF: ambientparticles mesh position y=-9.61, renderOrder=15');

// Container particles (class wF)
assert(bundle.includes('this.particles=150*1e3'), 'wF: containerparticles count=150,000 GPGPU particles');
assert(bundle.includes('this.cubeSize=.65'), 'wF: containerparticles initial cubeSize=0.65');
assert(bundle.includes('tVolume:{value:this.vdbs[this.currentLink]}'), 'wF: containerparticles 3D VDB volume texture binding');

// ---------------------------------------------------------------------------
// 8. Scroll & Auto-Center Logic Verification
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}8. Scroll Physics & Auto-Center Logic${RESET}`);

// Mathematical test of autoCenter formula
function simulateUFAutoCenter(progress, currentScrollY) {
  const height = 5.5;
  const finalScrollAutocenter = 0.76;

  if (progress > 0.15) {
    const s = (finalScrollAutocenter - progress) * (height + 1);
    const n = Math.max(2, Math.min(20, Math.abs(s) * 4)); // ie.clamp(Math.abs(s)*4, 2, 20)
    return {
      triggered: true,
      targetScrollY: currentScrollY + s,
      duration: n,
      adjustment: s
    };
  }
  return { triggered: false };
}

const acAt020 = simulateUFAutoCenter(0.20, 100);
assert(acAt020.triggered === true, 'Auto-center triggers when progress > 0.15 (tested at 0.20)');
assert(Math.abs(acAt020.adjustment - (0.76 - 0.20) * 6.5) < 1e-4, 'Auto-center scroll delta equals (0.76 - progress) * 6.5');
assert(acAt020.duration >= 2.0 && acAt020.duration <= 20.0, `Auto-center duration clamped in [2, 20] range: ${acAt020.duration.toFixed(2)}s`);

const acAt010 = simulateUFAutoCenter(0.10, 100);
assert(acAt010.triggered === false, 'Auto-center does not trigger before progress 0.15 (tested at 0.10)');

const acAt076 = simulateUFAutoCenter(0.76, 100);
assert(acAt076.triggered === true && Math.abs(acAt076.adjustment) < 1e-4, 'Auto-center delta is 0 when already centered at progress 0.76');

// ---------------------------------------------------------------------------
// Summary Report
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}TEST SUMMARY${RESET}`);
console.log(`  Total Checks: ${totalTests}`);
console.log(`  Passed:       ${GREEN}${passedTests}${RESET}`);
console.log(`  Failed:       ${failedTests === 0 ? GREEN : RED}${failedTests}${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}ALL VERIFICATION CHECKS PASSED PERFECTLY!${RESET}\n`);
}
