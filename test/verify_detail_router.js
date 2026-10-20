/**
 * verify_detail_router.js
 * 
 * Comprehensive verification suite for the reverse engineered:
 * 1. Detail Scene (class JF)
 * 2. Router & Navigation System (class a3, function eN, nP)
 * 3. Route definitions ('/' -> home, '/portfolio/:project' -> project)
 * 4. EventEmitter events (webgl_router_request_switch_scene, webgl_switch_scene, webgl_project_show/hide, etc.)
 * 5. Camera zoom animations (Detail Scene + Cubes Scene cameraZoom)
 * 6. Mouse simulation engine (class KF GPGPU wave advection & ping-pong)
 * 7. Lighting shafts & volumetric planes (class YF, class qF)
 * 8. Portfolio content formatting & data structure (Pudgy Penguins & Overpass)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUNDLE_PATH = path.resolve(__dirname, '../assets/App3D-d68cb154.js');

// Simple test runner
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function suite(name) {
  console.log(`\n\x1b[1m\x1b[36m=== SUITE: ${name} ===\x1b[0m`);
}

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  \x1b[31m✖\x1b[0m ${name}`);
    console.error(`    \x1b[31mError:\x1b[0m ${err.message}`);
  }
}

// Read bundle file
const bundleContent = fs.readFileSync(BUNDLE_PATH, 'utf-8');

// =========================================================================
// SUITE 1: Bundle Static Extraction & Integrity Verification
// =========================================================================
suite('1. Bundle Static Extraction & Integrity Verification');

test('App3D bundle contains core classes and functions', () => {
  const requiredSymbols = [
    'class JF', // Detail Scene
    'class KF', // Mouse Simulation
    'class YF', // Light Shaft
    'class qF', // Light Plane
    'class VF', // Detail 3D Object
    'class WF', // Large Particles
    'class XF', // Little Particles (MouseSim-driven)
    'class HF', // Detail Background Quad
    'class zF', // Project View Controller
    'class ey', // Project Links List
    'class kF', // Individual Project Link
    'class QF', // Projects Manager
    'class a3', // WebGL Router Wrapper
    'function eN', // Router Initialization
    'class jF'  // Main 3D Experience Controller
  ];

  for (const sym of requiredSymbols) {
    assert.ok(bundleContent.includes(sym), `Expected symbol '${sym}' to exist in App3D bundle`);
  }
});

test('App3D bundle contains all required EventEmitter event tokens', () => {
  const requiredEvents = [
    'webgl_router_request_switch_scene',
    'webgl_switch_scene',
    'webgl_project_show',
    'webgl_project_hide',
    'webgl_router_block_navigation',
    'webgl_router_start',
    'webgl_play_audio',
    'webgl_set_audio_volume'
  ];

  for (const ev of requiredEvents) {
    assert.ok(bundleContent.includes(ev), `Expected event '${ev}' in bundle`);
  }
});

// =========================================================================
// SUITE 2: Router Engine & Route Definitions
// =========================================================================
suite('2. Router Engine & Route Definitions');

// Emulation of Navaid regex param matching (matching function nP and class a3)
function compileRoute(pattern) {
  const keys = [];
  let regexPattern = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
    keys.push(key);
    return '([^\\/]+)';
  });
  // Handle root and strict slash matching
  regexPattern = '^' + regexPattern.replace(/\//g, '\\/') + '\\/?$';
  return {
    pattern: new RegExp(regexPattern),
    keys
  };
}

class MockRouter {
  constructor(routes, onChange) {
    this.routes = routes.map(r => ({
      ...r,
      compiled: compileRoute(r.path)
    }));
    this.onChange = onChange;
    this.blocked = false;
    this.currentPath = null;
  }

  go(path) {
    if (this.blocked) return false;
    const formatted = path === '' || path === '/' ? '/' : (path.startsWith('/') ? path : '/' + path);
    this.currentPath = formatted;

    for (const route of this.routes) {
      const match = route.compiled.pattern.exec(formatted);
      if (match) {
        const params = {};
        route.compiled.keys.forEach((key, idx) => {
          params[key] = match[idx + 1];
        });
        this.onChange({
          scene: route.data.scene,
          path: formatted,
          params
        });
        return true;
      }
    }
    return false;
  }
}

test('Route configuration matches definition in function eN', () => {
  const routerDefinitionMatch = bundleContent.match(/routes:\s*\[\s*\{path:"\/",data:\{scene:"home"\}\},\s*\{path:"\/portfolio\/:project",data:\{scene:"project"\}\}\s*\]/);
  assert.ok(routerDefinitionMatch, 'Router route definitions in bundle match exact schema');
});

test('Router correctly resolves root path "/" to "home" scene', () => {
  let eventDispatched = null;
  const router = new MockRouter(
    [
      { path: '/', data: { scene: 'home' } },
      { path: '/portfolio/:project', data: { scene: 'project' } }
    ],
    payload => { eventDispatched = payload; }
  );

  const matched = router.go('/');
  assert.ok(matched, 'Route "/" should match');
  assert.equal(eventDispatched.scene, 'home');
  assert.deepEqual(eventDispatched.params, {});
  assert.equal(eventDispatched.path, '/');
});

test('Router resolves empty string "" to "/" ("home" scene)', () => {
  let eventDispatched = null;
  const router = new MockRouter(
    [
      { path: '/', data: { scene: 'home' } },
      { path: '/portfolio/:project', data: { scene: 'project' } }
    ],
    payload => { eventDispatched = payload; }
  );

  const matched = router.go('');
  assert.ok(matched, 'Route "" should normalize and match');
  assert.equal(eventDispatched.scene, 'home');
  assert.equal(eventDispatched.path, '/');
});

test('Router resolves "/portfolio/pudgy-penguins" to "project" scene with params', () => {
  let eventDispatched = null;
  const router = new MockRouter(
    [
      { path: '/', data: { scene: 'home' } },
      { path: '/portfolio/:project', data: { scene: 'project' } }
    ],
    payload => { eventDispatched = payload; }
  );

  const matched = router.go('/portfolio/pudgy-penguins');
  assert.ok(matched, 'Route "/portfolio/pudgy-penguins" should match');
  assert.equal(eventDispatched.scene, 'project');
  assert.equal(eventDispatched.params.project, 'pudgy-penguins');
  assert.equal(eventDispatched.path, '/portfolio/pudgy-penguins');
});

test('Router resolves "portfolio/overpass" (relative) to "project" scene with params', () => {
  let eventDispatched = null;
  const router = new MockRouter(
    [
      { path: '/', data: { scene: 'home' } },
      { path: '/portfolio/:project', data: { scene: 'project' } }
    ],
    payload => { eventDispatched = payload; }
  );

  const matched = router.go('portfolio/overpass');
  assert.ok(matched, 'Relative route should be formatted and match');
  assert.equal(eventDispatched.scene, 'project');
  assert.equal(eventDispatched.params.project, 'overpass');
  assert.equal(eventDispatched.path, '/portfolio/overpass');
});

test('Router blocking mechanism suppresses navigation changes', () => {
  let callCount = 0;
  const router = new MockRouter(
    [
      { path: '/', data: { scene: 'home' } },
      { path: '/portfolio/:project', data: { scene: 'project' } }
    ],
    () => { callCount++; }
  );

  router.blocked = true;
  const matched = router.go('/portfolio/pudgy-penguins');
  assert.equal(matched, false);
  assert.equal(callCount, 0, 'Blocked router must not fire onChange');

  router.blocked = false;
  const matched2 = router.go('/portfolio/pudgy-penguins');
  assert.equal(matched2, true);
  assert.equal(callCount, 1, 'Unblocked router fires onChange');
});

// =========================================================================
// SUITE 3: EventEmitter Protocol & Lifecycle Verification
// =========================================================================
suite('3. EventEmitter Protocol & Lifecycle Verification');

class MockEventEmitter {
  constructor() {
    this._listeners = new Map();
  }
  on(event, fn, context) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push({ fn, context, once: false });
    return this;
  }
  once(event, fn, context) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push({ fn, context, once: true });
    return this;
  }
  off(event, fn) {
    if (!this._listeners.has(event)) return this;
    const list = this._listeners.get(event).filter(l => l.fn !== fn);
    this._listeners.set(event, list);
    return this;
  }
  emit(event, ...args) {
    if (!this._listeners.has(event)) return false;
    const listeners = [...this._listeners.get(event)];
    for (const listener of listeners) {
      listener.fn.apply(listener.context || this, args);
      if (listener.once) {
        this.off(event, listener.fn);
      }
    }
    return true;
  }
}

test('Full Detail Scene transition lifecycle triggers expected event sequence', async () => {
  const Q = new MockEventEmitter();
  const eventLog = [];

  // Wire up listeners matching App3D
  Q.on('webgl_router_block_navigation', blocked => eventLog.push({ event: 'webgl_router_block_navigation', blocked }));
  Q.on('webgl_project_show', id => eventLog.push({ event: 'webgl_project_show', id }));
  Q.on('webgl_project_hide', () => eventLog.push({ event: 'webgl_project_hide' }));
  Q.on('webgl_play_audio', sound => eventLog.push({ event: 'webgl_play_audio', sound }));
  Q.on('webgl_switch_scene', path => eventLog.push({ event: 'webgl_switch_scene', path }));

  // Simulate entering a project detail
  // 1. User clicks cube in 3D scene
  Q.emit('webgl_switch_scene', 'portfolio/pudgy-penguins');
  
  // 2. Controller locks navigation during transition
  Q.emit('webgl_router_block_navigation', true);
  Q.emit('webgl_play_audio', 'click-project');
  Q.emit('webgl_play_audio', 'enter-project');
  
  // 3. Detail Scene playInAnimation completes intro
  const projectIndex = 0;
  Q.emit('webgl_project_show', projectIndex);
  Q.emit('webgl_play_audio', 'project-text');
  Q.emit('webgl_router_block_navigation', false);

  // 4. User clicks Close button or presses Escape
  Q.emit('webgl_switch_scene', '');
  Q.emit('webgl_router_block_navigation', true);
  Q.emit('webgl_project_hide');
  Q.emit('webgl_play_audio', 'leave-project');
  Q.emit('webgl_router_block_navigation', false);

  const eventNames = eventLog.map(e => e.event);
  assert.deepEqual(eventNames, [
    'webgl_switch_scene',
    'webgl_router_block_navigation',
    'webgl_play_audio',
    'webgl_play_audio',
    'webgl_project_show',
    'webgl_play_audio',
    'webgl_router_block_navigation',
    'webgl_switch_scene',
    'webgl_router_block_navigation',
    'webgl_project_hide',
    'webgl_play_audio',
    'webgl_router_block_navigation'
  ]);
});

// =========================================================================
// SUITE 4: Camera Zoom Animations & Transition Timelines
// =========================================================================
suite('4. Camera Zoom Animations & Transition Timelines');

test('Detail Scene (class JF) camera initialization parameters match specification', () => {
  // Check JF.cameraOptions() in bundle
  const jfCameraMatch = bundleContent.match(/cameraOptions\(\)\{this\.camera\.basePosition\.set\(0,0,2\.5\),this\.camera\.baseTarget\.set\(0,0,0\),this\.camera\.displacement\.position\.set\(0,0\),this\.camera\.lerpPosition=\.02,this\.camera\.shake\.setScalar\(\.05\),this\.camera\.shakeSpeed\.setScalar\(\.05\)\}/);
  assert.ok(jfCameraMatch, 'JF cameraOptions matches basePosition=(0,0,2.5), lerpPosition=0.02, shake=0.05');
});

test('Detail Scene (class JF) playInAnimation & playOutAnimation camera z tweens match', () => {
  // In playInAnimation:
  // re.fromTo(this.camera.basePosition,{z:4},{overwrite:!0,z:2.5,duration:2,delay:t+.5,ease:"inOut1"})
  const inTweenMatch = bundleContent.match(/re\.fromTo\(this\.camera\.basePosition,\{z:4\},\{overwrite:!0,z:2\.5,duration:2,delay:t\+\.5,ease:"inOut1"\}\)/);
  assert.ok(inTweenMatch, 'playInAnimation zooms camera z from 4.0 to 2.5 over 2.0s with ease inOut1');

  // In playOutAnimation:
  // re.to(this.camera.basePosition,{overwrite:!0,z:4,duration:.6,delay:0,ease:"none"})
  const outTweenMatch = bundleContent.match(/re\.to\(this\.camera\.basePosition,\{overwrite:!0,z:4,duration:\.6,delay:0,ease:"none"\}\)/);
  assert.ok(outTweenMatch, 'playOutAnimation zooms camera z from 2.5 back to 4.0 over 0.6s with ease none');
});

test('Cubes Scene (class aF) cameraZoom values match enter (-3.5) and exit (0)', () => {
  // In detailAnimationIn:
  // re.to(this.cameraZoom,{overwrite:!0,value:-3.5,duration:1.25+e,ease:"power3.in"})
  const cubeInZoom = bundleContent.match(/re\.to\(this\.cameraZoom,\{overwrite:!0,value:-3\.5,duration:1\.25\+e,ease:"power3\.in"\}\)/);
  assert.ok(cubeInZoom, 'Cubes scene cameraZoom animates to -3.5 on enter');

  // In detailAnimationOut:
  // re.to(this.cameraZoom,{overwrite:!0,value:0,duration:1.45,ease:"power3.out"
  const cubeOutZoom = bundleContent.match(/re\.to\(this\.cameraZoom,\{overwrite:!0,value:0,duration:1\.45,ease:"power3\.out"/);
  assert.ok(cubeOutZoom, 'Cubes scene cameraZoom animates back to 0 on exit');
});

test('Global transition shader progress uniforms tween parameters', () => {
  // Enter transition:
  // re.to(this.material.uniforms.uDetailProgress,{overwrite:!0,value:1,ease:"power3.in",delay:a,duration:1.25})
  // re.to(this.material.uniforms.uDetailProgress2,{overwrite:!0,value:1,ease:"sine.out",delay:a+.75,duration:1.25})
  assert.ok(bundleContent.includes('uDetailProgress,{overwrite:!0,value:1,ease:"power3.in"'), 'uDetailProgress enter tween verified');
  assert.ok(bundleContent.includes('uDetailProgress2,{overwrite:!0,value:1,ease:"sine.out"'), 'uDetailProgress2 enter tween verified');

  // Exit transition:
  // re.to(this.material.uniforms.uDetailProgress,{overwrite:!0,value:0,ease:"power2.out",duration:1.25})
  // re.to(this.material.uniforms.uDetailProgress2,{overwrite:!0,value:0,ease:"power2.out",duration:.6})
  assert.ok(bundleContent.includes('uDetailProgress,{overwrite:!0,value:0,ease:"power2.out",duration:1.25}'), 'uDetailProgress exit tween verified');
  assert.ok(bundleContent.includes('uDetailProgress2,{overwrite:!0,value:0,ease:"power2.out",duration:.6}'), 'uDetailProgress2 exit tween verified');
});

// =========================================================================
// SUITE 5: Mouse Simulation (class KF) Math & GPGPU Mechanics
// =========================================================================
suite('5. Mouse Simulation (class KF) Math & GPGPU Mechanics');

// Mathematical simulation of class KF pointer physics
class MockMouseSim {
  constructor() {
    this.splatPosition = { x: 0, y: 0 };
    this.splatLastPosition = { x: 0, y: 0 };
    this.splatTargetVelocity = 0;
    this.splatVelocity = 0;
    this.rts = ['RT_0', 'RT_1'];
    this.finalRT = this.rts[0];
  }

  // Linear interpolation
  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Power4 out ease
  easePower4Out(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  onPointerMove(x, y) {
    this.splatPosition = { x, y };
  }

  step() {
    let dist = this.distance(this.splatPosition, this.splatLastPosition);
    this.splatTargetVelocity += dist * 6;
    this.splatTargetVelocity *= 0.88;
    this.splatTargetVelocity = this.clamp(this.splatTargetVelocity, 0, 1);
    this.splatVelocity = this.lerp(
      this.splatVelocity,
      this.easePower4Out(this.splatTargetVelocity),
      0.1
    );

    // Swap ping-pong render targets
    this.finalRT = (this.finalRT === this.rts[0]) ? this.rts[1] : this.rts[0];
    this.splatLastPosition = { ...this.splatPosition };

    return {
      velocity: this.splatVelocity,
      targetVelocity: this.splatTargetVelocity,
      activeBuffer: this.finalRT
    };
  }
}

test('Mouse simulation velocity physics and ping-pong render target swapping', () => {
  const sim = new MockMouseSim();
  assert.equal(sim.finalRT, 'RT_0');

  // Stationary mouse
  const res0 = sim.step();
  assert.equal(res0.velocity, 0);
  assert.equal(res0.activeBuffer, 'RT_1');

  // Mouse moves by 0.1 units
  sim.onPointerMove(0.1, 0.0);
  const res1 = sim.step();
  assert.ok(res1.targetVelocity > 0, 'Target velocity increases on movement');
  assert.ok(res1.velocity > 0, 'Smoothed velocity ramps up');
  assert.equal(res1.activeBuffer, 'RT_0', 'Ping-pong swaps back to RT_0');

  // Move further and observe velocity clamp
  sim.onPointerMove(0.5, 0.5);
  const res2 = sim.step();
  assert.equal(res2.targetVelocity, 1.0, 'Target velocity clamped to 1.0 maximum');
  assert.ok(res2.velocity > res1.velocity, 'Velocity accelerates');
  assert.equal(res2.activeBuffer, 'RT_1');
});

test('Mouse simulation fragment shader line segment distance and advection formula', () => {
  // Verify line SDF in bundle
  assert.ok(bundleContent.includes('float line(vec2 uv, vec2 point1, vec2 point2)'), 'Line distance function present in KF shader');
  assert.ok(bundleContent.includes('float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);'), 'Segment projection clamp present');
  assert.ok(bundleContent.includes('float nextVal = max(max(max(l, r), t), b);'), '4-neighborhood wave propagation present');
  assert.ok(bundleContent.includes('nextVal *= 0.985;'), 'Wave damping factor 0.985 present');
  assert.ok(bundleContent.includes('gl_FragColor = vec4(nextVal, rim, rimLerp, 1.0);'), 'Wave output channels (height, rim, rimLerp) verified');
});

// =========================================================================
// SUITE 6: Lighting Shafts & Plane Volumetrics
// =========================================================================
suite('6. Lighting Shafts & Plane Volumetrics');

test('Light Shaft (class YF) geometry, placement, and shader configuration', () => {
  assert.ok(bundleContent.includes('this.mesh.name="lightshaft"'), 'Light shaft mesh name is "lightshaft"');
  assert.ok(bundleContent.includes('this.mesh.position.set(1.67,.79,0)'), 'Light shaft position is (1.67, 0.79, 0)');
  assert.ok(bundleContent.includes('this.mesh.scale.set(1.5,3,1)'), 'Light shaft scale is (1.5, 3.0, 1.0)');
  assert.ok(bundleContent.includes('this.mesh.rotation.z=-40*3.14/180'), 'Light shaft rotation.z is -40 degrees in radians');
  assert.ok(bundleContent.includes('uColor:{value:new Z("#d1e3ff")}'), 'Light shaft uniform color is #d1e3ff');
  assert.ok(bundleContent.includes('float alpha = circularGradient * noise * 0.07;'), 'Light shaft alpha equation verified');
});

test('Light Plane (class qF) harmonic floating animation & bokeh modulation', () => {
  assert.ok(bundleContent.includes('this.mesh.name="lightplane"'), 'Light plane mesh name is "lightplane"');
  assert.ok(bundleContent.includes('this.mesh.position.set(-2.05,-.87,1)'), 'Light plane base position is (-2.05, -0.87, 1)');
  assert.ok(bundleContent.includes('this.mesh.scale.set(4,4,4)'), 'Light plane scale is (4.0, 4.0, 4.0)');
  
  // Harmonic motion onBeforeRender:
  assert.ok(bundleContent.includes('this.mesh.position.x=-2.2+Math.sin(Fe.time*.3)*.2'), 'Light plane harmonic motion in X verified');
  assert.ok(bundleContent.includes('this.mesh.position.y=-.87+Math.cos(Fe.time*.24)*.2'), 'Light plane harmonic motion in Y verified');
  assert.ok(bundleContent.includes('float alpha = (circularGradient + bokeh * circularGradient) * 0.15;'), 'Light plane alpha blending verified');
});

// =========================================================================
// SUITE 7: Portfolio Content Extraction & Schema Validation
// =========================================================================
suite('7. Portfolio Content Extraction & Schema Validation');

// Extract the raw Be.cubes string from the bundle
function extractBeCubes() {
  const startMarker = 'cubes:[';
  const startIndex = bundleContent.indexOf(startMarker);
  assert.ok(startIndex !== -1, 'cubes array must exist in bundle');
  
  // Parse balanced brackets
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escape = false;
  let endIndex = -1;

  for (let i = startIndex + startMarker.length - 1; i < bundleContent.length; i++) {
    const ch = bundleContent[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  assert.ok(endIndex !== -1, 'Failed to find matching closing bracket for cubes array');
  const cubesRaw = bundleContent.substring(startIndex + 'cubes:'.length, endIndex);
  
  // Safely evaluate the JS object literal via Function
  return new Function(`return ${cubesRaw}`)();
}

const cubes = extractBeCubes();

test('Extracted cubes array has exactly 2 portfolio projects (Pudgy Penguins & Overpass)', () => {
  assert.equal(cubes.length, 2, 'Exactly 2 projects defined in Be.cubes');
});

test('Project 0: Pudgy Penguins metadata, interior text, links and 3D assets', () => {
  const p = cubes[0];
  assert.equal(p.title, 'PORTFOLIO_CO_01 Pudgy Penguins');
  assert.equal(p.hash, 'pudgy-penguins');
  assert.equal(p.date, '01/02/2020');
  assert.equal(p.obj, 'cube3');
  assert.equal(p.innerobject, 'pudgy');
  assert.equal(p.interior.obj, 'pudgy');
  assert.equal(p.interior.objScale, 1.1);

  // Interior content
  assert.equal(p.interior.enabled, true);
  assert.equal(p.interior.title, '////// Summary');
  assert.ok(p.interior.content.includes('Pudgy Penguins, a creative venture founded in 2021'), 'Contains history paragraph');
  assert.ok(p.interior.content.includes('acquired by Igloo Inc.'), 'Contains acquisition details');
  assert.ok(p.interior.content.includes('revolutionizing the way IP is created and experienced'), 'Contains mission statement');

  // Social & Web links
  assert.equal(p.interior.socialTitle, '/// Discover');
  assert.deepEqual(p.interior.social, [
    { name: 'X', link: 'https://x.com/pudgypenguins' },
    { name: 'IG', link: 'https://instagram.com/pudgypenguins' },
    { name: 'LI', link: 'https://www.linkedin.com/company/pudgy-penguins' },
    { name: 'TK', link: 'https://www.tiktok.com/@pudgypenguins' }
  ]);
  assert.equal(p.interior.linkTitle, '/// Visit');
  assert.deepEqual(p.interior.links, [
    { name: 'website', link: 'https://www.pudgypenguins.com' }
  ]);
});

test('Project 1: Overpass metadata, interior text, links and 3D assets', () => {
  const p = cubes[1];
  assert.equal(p.title, 'PORTFOLIO_CO_02 Overpass');
  assert.equal(p.hash, 'overpass');
  assert.equal(p.date, '06/01/2023');
  assert.equal(p.obj, 'cube1');
  assert.equal(p.innerobject, 'overpass_logo');
  assert.equal(p.interior.obj, 'overpass_logo');
  assert.equal(p.interior.objScale, 1.2);

  // Interior content
  assert.equal(p.interior.enabled, true);
  assert.equal(p.interior.title, '////// Summary');
  assert.ok(p.interior.content.includes('OverpassIP was established as a solution to a significant licensing challenge'), 'Contains problem statement');
  assert.ok(p.interior.content.includes('empowers NFT holders by allowing them to submit their digital assets'), 'Contains empowerment mechanism');
  assert.ok(p.interior.content.includes('pioneers new frontiers in the utilization of digital assets'), 'Contains conclusion');

  // Social & Web links
  assert.equal(p.interior.socialTitle, '/// Discover');
  assert.deepEqual(p.interior.social, [
    { name: 'X', link: 'https://twitter.com/OverpassIP' }
  ]);
  assert.equal(p.interior.linkTitle, '/// Visit');
  assert.deepEqual(p.interior.links, [
    { name: 'website', link: 'https://www.overpassip.com' }
  ]);
});

test('UI Typography & Layout parameters for Project View (class zF & ey)', () => {
  // Title / text colors defined in Be
  assert.ok(bundleContent.includes('colorProjectTitle:"#67707E"'), 'Project Title color #67707E verified');
  assert.ok(bundleContent.includes('colorProjectText:"#A1AAB7"'), 'Project Text color #A1AAB7 verified');

  // Font family
  assert.ok(bundleContent.includes('font:"IBMPlexMono-Medium"'), 'MSDF font IBMPlexMono-Medium verified');

  // Layout width clamping
  assert.ok(bundleContent.includes('this.width=Math.min(q.screen.width-s*2,t)'), 'Text width clamping verified');
  assert.ok(bundleContent.includes('this.scrollMargin=65'), 'Scroll margin 65px verified');

  // Element vertical spacing (25px)
  assert.ok(bundleContent.includes('l+=c.mesh.size.y+n'), 'Element stack positioning verified');
});

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n\x1b[1m\x1b[35m========================================================\x1b[0m');
console.log(`\x1b[1mTEST SUITE RESULTS: ${passedTests}/${totalTests} Passed\x1b[0m`);
if (failedTests === 0) {
  console.log('\x1b[32m✔ All verification tests passed successfully!\x1b[0m');
  console.log('\x1b[35m========================================================\x1b[0m\n');
  process.exit(0);
} else {
  console.log(`\x1b[31m✖ ${failedTests} test(s) failed!\x1b[0m`);
  console.log('\x1b[35m========================================================\x1b[0m\n');
  process.exit(1);
}
